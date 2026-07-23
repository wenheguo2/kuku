"""
脚本2：教学合并MP3 + timeline.json 生成（v6 — WPM区间归一化 + 简化timeline）
=============================================================================================
功能：遍历 production/audio/学科启蒙/ 下所有课程，
      对每个 学习1/学习2/学习3/习题/编号N 子目录：
        1. ★ 读取 segments.json，按 seq 排序，用 id 匹配音频文件
        2. ★ 完整性校验：任一段缺音频 → 跳过并记录
        3. ★★ WPM区间归一化：180-220不改，>220降速到220，<180加速到180
        4. 逐段 loudnorm 归一化
        5. 合并分段 MP3 → full.mp3（含静音间隔 + 淡入淡出）
        6. ★ 生成 timeline.json（时长=normalize后ffprobe实测，精准对齐）

★ v6 关键改进：
  1. ★★ WPM区间归一化：保留角色自然语速差异，只修正极端值
  2. ★ timeline 简化：直接用 normalize 后的 ffprobe 实测时长
  3. 输出 96kbps CBR 24kHz mono
  4. segments.json 找不到 → 跳过并报错
  5. ffprobe 超时 → 跳过并报错
  6. 2线程并行
  7. 启动时清理 _tmp_merge

timeline.json 格式：
  [
    {"seq": 1, "start_ms": 0,      "end_ms": 12500,  "duration_ms": 12500,
     "segment_id": "的_s01_q001", "character": "旁白", "text": "...", "voice_id": "V-ADW-01"},
    {"seq": 2, "start_ms": 13000, "end_ms": 17000,  "duration_ms": 4000,
     "segment_id": "的_s01_q002", "character": "桃子"},
  ]
"""
import os
import sys
import json
import time
import shutil
import subprocess
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.path.insert(0, str(Path(__file__).parent))
from common import (
    find_teaching_units, get_segments_json, get_ordered_segments,
    check_segments_completeness,
    save_log, save_failures, print_progress,
    add_merge_args, banner,
    get_duration_seconds, generate_silence_file,
    build_concat_list, normalize_segment, merge_with_ffmpeg, cleanup_temp_dirs,
    calculate_segment_speed, count_speech_units,
    DEFAULT_SPEED, WPM_LOW, WPM_HIGH, DEFAULT_WORKERS,
)

DEFAULT_GAP = 0.5


def merge_teaching_unit(audio_dir, gap=DEFAULT_GAP,
                        normalize=True, fade=True, force=False,
                        allow_incomplete=False):
    """合并一个教学单元 → full.mp3 + timeline.json（★ v5: 逐段WPM归一化）"""
    full_mp3 = audio_dir / "full.mp3"
    timeline_file = audio_dir / "timeline.json"

    if full_mp3.exists() and timeline_file.exists() and not force:
        return ("skip", str(audio_dir), "already exists")

    # ★ v5: 读取 segments.json 并按 seq 排序，找不到则跳过
    seg_data = get_segments_json(audio_dir)
    ordered, err = get_ordered_segments(audio_dir, seg_data)
    if err:
        return ("skip", str(audio_dir), err)
    if not ordered:
        return ("skip", str(audio_dir), "no matched segments")

    # 完整性校验
    is_complete, missing = check_segments_completeness(ordered)
    if not is_complete and not allow_incomplete:
        missing_ids = [f"seq{m['seq']}({m['id']})" for m in missing]
        return ("incomplete", str(audio_dir),
                f"missing {len(missing)} segments: {', '.join(missing_ids[:5])}")

    # 过滤掉没有对应音频文件的 segment
    audio_entries = [(name, seg) for name, seg in ordered if name is not None]
    if len(audio_entries) <= 1:
        return ("skip", str(audio_dir), "single file, no merge needed")

    mp3_files = [name for name, _ in audio_entries]
    segments = [seg for _, seg in audio_entries]

    # 临时工作目录
    temp_dir = audio_dir / "_tmp_merge"
    if temp_dir.exists():
        shutil.rmtree(temp_dir, ignore_errors=True)
    temp_dir.mkdir(exist_ok=True)

    try:
        # ---- Step 1: ★★ 逐段处理（ffprobe → WPM → atempo → normalize）----
        norm_files = []
        norm_durations = []  # normalize 后的实测时长
        speed_log = []

        for i, (mp3_name, seg) in enumerate(audio_entries):
            src = audio_dir / mp3_name
            dst = temp_dir / f"norm_{mp3_name}"

            # ffprobe 实测原始时长
            raw_dur = get_duration_seconds(src)
            if raw_dur is None:
                return ("fail", str(audio_dir), f"ffprobe failed: {mp3_name}")

            # ★ v5: 计算逐段 atempo
            text = seg.get("text", "") if seg else ""
            character = seg.get("character", "?") if seg else "?"
            voice_id = seg.get("voice_id", "") if seg else ""
            atempo, actual_wpm = calculate_segment_speed(text, raw_dur)

            speed_log.append({
                "mp3": mp3_name, "char": character,
                "raw_dur": round(raw_dur, 2),
                "wpm": actual_wpm, "atempo": atempo,
            })

            # 逐段 normalize（atempo + loudnorm）
            if not normalize_segment(src, dst, speed=atempo, normalize=normalize):
                return ("fail", str(audio_dir), f"normalize failed: {mp3_name}")
            norm_files.append(dst)

            # ★ v5: ffprobe 实测 normalize 后的时长（就是最终播放时长）
            norm_dur = get_duration_seconds(dst)
            if norm_dur is None:
                return ("fail", str(audio_dir), f"ffprobe norm failed: {mp3_name}")
            norm_durations.append(norm_dur)

        # ---- Step 2: 生成静音文件 + concat 列表 ----
        silence_file = None
        if gap > 0 and len(norm_files) > 1:
            silence_file = temp_dir / "silence.mp3"
            if not generate_silence_file(silence_file, gap):
                return ("fail", str(audio_dir), "silence generation failed")

        concat_list = temp_dir / "concat_list.txt"
        build_concat_list(concat_list, norm_files, silence_file, gap)

        # ---- Step 3: 计算总时长 ----
        total_duration = sum(norm_durations)
        if gap > 0 and len(norm_files) > 1:
            total_duration += gap * (len(norm_files) - 1)

        # ---- Step 4: ffmpeg 合并（纯concat + fade）----
        success, error = merge_with_ffmpeg(
            concat_list, full_mp3, total_duration, fade=fade
        )

        if not success:
            full_mp3.unlink(missing_ok=True)
            return ("fail", str(audio_dir), error)

        # ---- Step 5: ★★ 生成 timeline.json（v5 简化）----
        # timeline 时长 = normalize 后 ffprobe 实测时长（就是最终播放时长）
        # gap = 原始 gap（不受 atempo 影响，因为 atempo 在逐段中完成）
        timeline = []
        cumulative_sec = 0.0

        for i, norm_dur in enumerate(norm_durations):
            seg = segments[i] if i < len(segments) else None
            if seg:
                seg_id = seg.get("id", mp3_files[i])
                character = seg.get("character", "")
                location = seg.get("location", "")
                text = seg.get("text", "")
                seq_num = seg.get("seq", i + 1)
                voice_id = seg.get("voice_id", "")
            else:
                seg_id = mp3_files[i][:-4]
                character = ""
                location = ""
                text = ""
                seq_num = i + 1
                voice_id = ""

            entry = {
                "seq": seq_num,
                "start_ms": int(cumulative_sec * 1000),
                "end_ms": int((cumulative_sec + norm_dur) * 1000),
                "duration_ms": int(norm_dur * 1000),
                "segment_id": seg_id,
                "character": character,
            }
            if location:
                entry["location"] = location
            if text:
                entry["text"] = text
            if voice_id:
                entry["voice_id"] = voice_id
            timeline.append(entry)

            # 累加: 当前段时长 + gap（最后一段不加 gap）
            cumulative_sec += norm_dur
            if i < len(norm_durations) - 1 and gap > 0:
                cumulative_sec += gap

        with open(timeline_file, "w", encoding="utf-8") as f:
            json.dump(timeline, f, ensure_ascii=False, indent=2)

        # ---- 验证输出 ----
        actual_out_dur = get_duration_seconds(full_mp3)
        size_mb = full_mp3.stat().st_size / (1024 * 1024)

        # 统计语速信息
        wpm_before = [s["wpm"] for s in speed_log if s["wpm"] > 0]
        wpm_range = f"{min(wpm_before):.0f}-{max(wpm_before):.0f}" if wpm_before else "?"
        atempo_range = f"{min(s['atempo'] for s in speed_log):.2f}-{max(s['atempo'] for s in speed_log):.2f}"

        msg = (f"{len(timeline)} segs, out={actual_out_dur:.0f}s, "
               f"calc={cumulative_sec:.0f}s, wpm={wpm_range}, "
               f"atempo={atempo_range}, {size_mb:.1f}MB")
        if not is_complete:
            msg += f" (WARNING: {len(missing)} segments missing)"
        return ("ok", str(audio_dir), msg)

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


def main():
    args = add_merge_args("教学合并MP3 + timeline.json (v6 — WPM区间归一化+96k)").parse_args()

    gap = args.gap if args.gap is not None else DEFAULT_GAP
    fade = not args.no_fade
    normalize = not args.no_normalize

    banner("脚本2: 教学合并MP3 + timeline.json (v6)")
    print(f"  参数: gap={gap}s  normalize={normalize}  fade={fade}")
    print(f"  ★ WPM区间归一化: {WPM_LOW}-{WPM_HIGH}区间不改, >{WPM_HIGH}降速, <{WPM_LOW}加速")
    print(f"  码率: 96kbps CBR 24kHz mono")
    print(f"  排序: 按 segments.json seq 字段（找不到则跳过）")
    print(f"  timeline: normalize后ffprobe实测（精准对齐）")
    print(f"  完整性: {'允许缺段' if args.allow_incomplete else '缺段即跳过'}")
    print(f"  线程: {args.workers}")
    print()

    # ★ v5: 启动时清理临时目录
    cleanup_temp_dirs()

    units = find_teaching_units()
    print(f"找到 {len(units)} 个教学单元")

    if args.test > 0:
        units = units[:args.test]
        print(f"测试模式: 只处理前 {args.test} 个")

    if args.dry_run:
        total_mp3 = 0
        incomplete_count = 0
        for u in units:
            from common import find_all_mp3s
            mp3s = find_all_mp3s(u)
            total_mp3 += len(mp3s)
            seg = get_segments_json(u)
            ordered, err = get_ordered_segments(u, seg)
            if err:
                continue
            is_complete, missing = check_segments_completeness(ordered)
            if not is_complete:
                incomplete_count += 1
        print(f"[DRY-RUN] 总单元数: {len(units)}, 总分段MP3: {total_mp3}")
        print(f"  完整: {len(units) - incomplete_count}, 缺段: {incomplete_count}")
        for u in units[:10]:
            from common import find_all_mp3s
            mp3s = find_all_mp3s(u)
            seg = get_segments_json(u)
            ordered, err = get_ordered_segments(u, seg)
            if err:
                print(f"  {u.name} -> SKIP: {err}")
                continue
            is_complete, missing = check_segments_completeness(ordered)
            matched = sum(1 for name, _ in ordered if name is not None)
            seg_count = len(seg.get("segments", [])) if seg else 0
            # 预览语速
            wpm_samples = []
            for name, s in ordered[:5]:
                if name and s:
                    raw_dur = get_duration_seconds(u / name)
                    if raw_dur:
                        _, wpm = calculate_segment_speed(s.get("text", ""), raw_dur)
                        char = s.get("character", "?")
                        wpm_samples.append(f"{char}:{wpm:.0f}")
            status = "OK" if is_complete else f"缺{len(missing)}段"
            wpm_str = " ".join(wpm_samples) if wpm_samples else "?"
            print(f"  {u.name} -> {len(mp3s)} MP3, json{seg_count}段, 匹配{matched}  WPM:{wpm_str}  [{status}]")
        if len(units) > 10:
            print(f"  ... 还有 {len(units) - 10} 个")
        return

    results = {"ok": 0, "skip": 0, "fail": 0, "incomplete": 0}
    failures = []
    start_time = time.time()

    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        futures = {
            executor.submit(merge_teaching_unit, u, gap, normalize, fade,
                           args.force, args.allow_incomplete): u
            for u in units
        }
        for i, future in enumerate(as_completed(futures)):
            status, path, msg = future.result()
            results[status] = results.get(status, 0) + 1
            if status in ("fail", "incomplete"):
                failures.append({"path": path, "status": status, "error": msg})
            elif status == "ok":
                print(f"  OK: {Path(path).name} - {msg}")
            print_progress(i + 1, len(units), results, interval=200)

    from datetime import datetime
    log_content = (
        f"脚本2: 教学合并MP3 + timeline.json (v6)\n"
        f"时间: {datetime.now().isoformat()}\n"
        f"参数: gap={gap}s  normalize={normalize}  fade={fade}  wpm_range={WPM_LOW}-{WPM_HIGH}\n"
        f"码率: 96kbps CBR 24kHz mono\n"
        f"语速: WPM区间归一化(180-220不改, 超出修正)\n"
        f"timeline: normalize后ffprobe实测\n"
        f"线程: {args.workers}\n"
        f"总数: {len(units)}\n"
        f"结果: ok={results['ok']} skip={results['skip']} "
        f"incomplete={results.get('incomplete',0)} fail={results['fail']}\n"
    )
    save_log("02_teaching_merge", log_content)
    if failures:
        save_failures("02_teaching_merge", failures)

    elapsed = time.time() - start_time
    print(f"\n完成! ok={results['ok']} skip={results['skip']} "
          f"incomplete={results.get('incomplete',0)} fail={results['fail']}")
    print(f"耗时: {elapsed:.0f}s")
    if failures:
        print(f"失败/不完整列表: 脚本/logs/02_teaching_merge_failed.json")


if __name__ == "__main__":
    main()
