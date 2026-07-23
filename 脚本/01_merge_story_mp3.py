"""
脚本1：故事整曲MP3合并（v6 — WPM区间归一化 + 逐段loudnorm + 96k）
=============================================================================
功能：遍历 production/audio/ 下所有故事目录，将分段 MP3 合并为 full.mp3

★ v6 关键改进：
  1. ★★ WPM区间归一化：180-220区间不改，>220降速到220，<180加速到180
     保留角色自然语速差异，只修正极端值
  2. 逐段 loudnorm 归一化（比整曲更精确，短段无伪影）
  3. 输出 96kbps CBR 24kHz mono
  4. segments.json 找不到 → 跳过并报错（不fallback到文件名排序）
  5. 未匹配MP3 → 告警并跳过（不追加到末尾）
  6. ffprobe 超时 → 跳过并报错（不返回0.0）
  7. 2线程并行
  8. 启动时清理 _tmp_merge 临时目录

运行机器：本机
前置条件：故事分段MP3全部生成完成（测试模式可用已有数据）

使用方式：
  python 01_merge_story_mp3.py                          # 全量执行
  python 01_merge_story_mp3.py --test 5                 # 只处理前5个故事
  python 01_merge_story_mp3.py --dry-run                # 只扫描统计
  python 01_merge_story_mp3.py --force                  # 强制重新生成
  python 01_merge_story_mp3.py --gap 0.5                # 段间静音0.5秒
  python 01_merge_story_mp3.py --wpm-low 180 --wpm-high 220  # 自定义区间
  python 01_merge_story_mp3.py --no-normalize           # 不做归一化
  python 01_merge_story_mp3.py --allow-incomplete       # 允许缺段仍合并
  python 01_merge_story_mp3.py --workers 4              # 4线程并行
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
    find_story_dirs, get_ordered_segments, check_segments_completeness,
    get_segments_json, save_log, save_failures, print_progress, add_merge_args, banner,
    get_duration_seconds, generate_silence_file, build_concat_list,
    normalize_segment, merge_with_ffmpeg, cleanup_temp_dirs,
    calculate_segment_speed, count_speech_units,
    DEFAULT_SPEED, WPM_LOW, WPM_HIGH, DEFAULT_WORKERS,
)

DEFAULT_GAP = 0.3


def merge_one_story(story_dir, all_mp3_names, gap=DEFAULT_GAP,
                    normalize=True, fade=True, force=False,
                    allow_incomplete=False):
    """合并一个故事的分段MP3 → full.mp3（★ v5: 逐段WPM归一化）"""
    full_mp3 = story_dir / "full.mp3"

    if full_mp3.exists() and not force:
        return ("skip", str(story_dir), "full.mp3 already exists")

    # ★ v5: 按 segments.json 的 seq 排序，找不到则跳过
    ordered, err = get_ordered_segments(story_dir)
    if err:
        return ("skip", str(story_dir), err)
    if not ordered:
        return ("skip", str(story_dir), "no matched segments")

    # 完整性校验
    is_complete, missing = check_segments_completeness(ordered)
    if not is_complete and not allow_incomplete:
        missing_ids = [f"seq{m['seq']}({m['id']})" for m in missing]
        return ("incomplete", str(story_dir),
                f"missing {len(missing)} segments: {', '.join(missing_ids[:5])}")

    # 过滤掉没有对应音频文件的 segment
    audio_entries = [(name, seg) for name, seg in ordered if name is not None]
    if not audio_entries:
        return ("fail", str(story_dir), "no audio files matched segments")

    # 临时工作目录
    temp_dir = story_dir / "_tmp_merge"
    if temp_dir.exists():
        shutil.rmtree(temp_dir, ignore_errors=True)
    temp_dir.mkdir(exist_ok=True)

    try:
        # ---- Step 1: ★★ 逐段处理（ffprobe测时长 → 算WPM → 算atempo → normalize）----
        norm_files = []
        speed_log = []  # 记录每段语速信息

        for mp3_name, seg in audio_entries:
            src = story_dir / mp3_name
            dst = temp_dir / f"norm_{mp3_name}"

            # ★ v5: ffprobe 实测原始时长
            raw_dur = get_duration_seconds(src)
            if raw_dur is None:
                return ("fail", str(story_dir), f"ffprobe failed: {mp3_name}")

            # ★ v5: 计算逐段 atempo
            text = seg.get("text", "") if seg else ""
            character = seg.get("character", "?") if seg else "?"
            atempo, actual_wpm = calculate_segment_speed(text, raw_dur)

            speed_log.append({
                "mp3": mp3_name, "char": character,
                "raw_dur": round(raw_dur, 2),
                "wpm": actual_wpm, "atempo": atempo,
                "units": count_speech_units(text),
            })

            # ★ v5: 逐段 normalize（atempo + loudnorm）
            if not normalize_segment(src, dst, speed=atempo, normalize=normalize):
                return ("fail", str(story_dir), f"normalize failed: {mp3_name}")
            norm_files.append(dst)

        # ---- Step 2: 用 ffprobe 实测 normalize 后的时长（用于 timeline 和总时长）----
        norm_durations = []
        for nf in norm_files:
            d = get_duration_seconds(nf)
            if d is None:
                return ("fail", str(story_dir), f"ffprobe norm failed: {nf.name}")
            norm_durations.append(d)

        total_duration = sum(norm_durations)
        if gap > 0 and len(norm_files) > 1:
            total_duration += gap * (len(norm_files) - 1)

        # ---- Step 3: 生成静音文件 + concat 列表 ----
        silence_file = None
        if gap > 0 and len(norm_files) > 1:
            silence_file = temp_dir / "silence.mp3"
            if not generate_silence_file(silence_file, gap):
                return ("fail", str(story_dir), "silence generation failed")

        concat_list = temp_dir / "concat_list.txt"
        build_concat_list(concat_list, norm_files, silence_file, gap)

        # ---- Step 4: ffmpeg 合并（纯concat + fade，atempo/loudnorm已在逐段完成）----
        success, error = merge_with_ffmpeg(
            concat_list, full_mp3, total_duration, fade=fade
        )

        if not success:
            full_mp3.unlink(missing_ok=True)
            return ("fail", str(story_dir), error)

        # ---- 验证输出 ----
        actual_out_dur = get_duration_seconds(full_mp3)
        size_mb = full_mp3.stat().st_size / (1024 * 1024)

        # 统计语速信息
        wpm_before = [s["wpm"] for s in speed_log if s["wpm"] > 0]
        wpm_range = f"{min(wpm_before):.0f}-{max(wpm_before):.0f}" if wpm_before else "?"
        atempo_range = f"{min(s['atempo'] for s in speed_log):.2f}-{max(s['atempo'] for s in speed_log):.2f}"

        msg = (f"{size_mb:.1f}MB, {len(norm_files)} segs, {actual_out_dur:.0f}s, "
               f"wpm={wpm_range}, atempo={atempo_range}")
        if not is_complete:
            msg += f" (WARNING: {len(missing)} segments missing)"
        return ("ok", str(story_dir), msg)

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


def main():
    args = add_merge_args("故事整曲MP3合并 (v5 — 逐段WPM归一化+96k)").parse_args()

    gap = args.gap if args.gap is not None else DEFAULT_GAP
    fade = not args.no_fade
    normalize = not args.no_normalize

    banner("脚本1: 故事整曲MP3合并 (v6)")
    print(f"  参数: gap={gap}s  normalize={normalize}  fade={fade}")
    print(f"  ★ WPM区间归一化: {WPM_LOW}-{WPM_HIGH}区间不改, >{WPM_HIGH}降速, <{WPM_LOW}加速")
    print(f"  码率: 96kbps CBR 24kHz mono")
    print(f"  排序: 按 segments.json seq 字段（找不到则跳过）")
    print(f"  完整性: {'允许缺段' if args.allow_incomplete else '缺段即跳过'}")
    print(f"  线程: {args.workers}")
    print()

    # ★ v5: 启动时清理临时目录
    cleanup_temp_dirs()

    story_dirs = find_story_dirs()
    print(f"找到 {len(story_dirs)} 个故事目录")

    if args.test > 0:
        story_dirs = story_dirs[:args.test]
        print(f"测试模式: 只处理前 {args.test} 个")

    if args.dry_run:
        total_segments = sum(len(fs) for _, fs in story_dirs)
        print(f"[DRY-RUN] 总故事数: {len(story_dirs)}, 总分段: {total_segments}")
        for d, fs in story_dirs[:10]:
            ordered, err = get_ordered_segments(d)
            if err:
                print(f"  {d.name} -> SKIP: {err}")
                continue
            is_complete, missing = check_segments_completeness(ordered)
            # 预览语速信息
            wpm_samples = []
            for name, seg in ordered[:5]:
                if name and seg:
                    raw_dur = get_duration_seconds(d / name)
                    if raw_dur:
                        _, wpm = calculate_segment_speed(seg.get("text", ""), raw_dur)
                        char = seg.get("character", "?")
                        wpm_samples.append(f"{char}:{wpm:.0f}")
            status = "OK" if is_complete else f"缺{len(missing)}段"
            wpm_str = " ".join(wpm_samples) if wpm_samples else "?"
            print(f"  {d.name} -> {len(fs)} segs  WPM: {wpm_str}  [{status}]")
        if len(story_dirs) > 10:
            print(f"  ... 还有 {len(story_dirs) - 10} 个")
        return

    results = {"ok": 0, "skip": 0, "fail": 0, "incomplete": 0}
    failures = []
    start_time = time.time()

    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        futures = {
            executor.submit(merge_one_story, d, fs, gap, normalize, fade,
                           args.force, args.allow_incomplete): d
            for d, fs in story_dirs
        }
        for i, future in enumerate(as_completed(futures)):
            status, path, msg = future.result()
            results[status] = results.get(status, 0) + 1
            if status in ("fail", "incomplete"):
                failures.append({"path": path, "status": status, "error": msg})
            elif status == "ok":
                print(f"  OK: {Path(path).name} - {msg}")
            print_progress(i + 1, len(story_dirs), results, interval=100)

    from datetime import datetime
    log_content = (
        f"脚本1: 故事整曲MP3合并 (v5)\n"
        f"时间: {datetime.now().isoformat()}\n"
        f"参数: gap={gap}s  normalize={normalize}  fade={fade}  wpm_range={WPM_LOW}-{WPM_HIGH}\n"
        f"码率: 96kbps CBR 24kHz mono\n"
        f"语速: WPM区间归一化(180-220不改, 超出修正)\n"
        f"线程: {args.workers}\n"
        f"总数: {len(story_dirs)}\n"
        f"结果: ok={results['ok']} skip={results['skip']} "
        f"incomplete={results.get('incomplete',0)} fail={results['fail']}\n"
    )
    log_file = save_log("01_story_merge", log_content)
    if failures:
        fail_file = save_failures("01_story_merge", failures)

    elapsed = time.time() - start_time
    print(f"\n完成! ok={results['ok']} skip={results['skip']} "
          f"incomplete={results.get('incomplete',0)} fail={results['fail']}")
    print(f"耗时: {elapsed:.0f}s")
    if failures:
        print(f"失败/不完整列表: 脚本/logs/01_story_merge_failed.json")


if __name__ == "__main__":
    main()
