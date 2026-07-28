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
  python 01_merge_story_mp3.py --wpm-low 140 --wpm-high 260  # 自定义区间
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
    get_segments_json, save_log, save_failures, save_incomplete,
    print_progress, add_merge_args, banner,
    get_duration_seconds, generate_silence_file, build_concat_list,
    normalize_segment, merge_with_ffmpeg, cleanup_temp_dirs,
    calculate_segment_speed, count_speech_units,
    DEFAULT_SPEED, WPM_LOW, WPM_HIGH, DEFAULT_WORKERS,
    AUDIO_DIR,
)

DEFAULT_GAP = 0.3

# ★ 不做 WPM 语速归一化的学科：吟诵/韵律内容变速会破坏节奏，
# 分段什么语速就合成什么语速（loudnorm 音量归一化照常做）
NO_WPM_SUBJECTS = {"蒙学经典", "诗词天地"}


def is_no_wpm_subject(story_dir):
    """判断故事是否属于不做WPM归一化的学科（目录首层学科名）"""
    try:
        rel = story_dir.relative_to(AUDIO_DIR)
        return rel.parts[0] in NO_WPM_SUBJECTS
    except (ValueError, IndexError):
        return False


def merge_one_story(story_dir, all_mp3_names, gap=DEFAULT_GAP,
                    normalize=True, fade=True, force=False,
                    allow_incomplete=False):
    """合并一个故事的分段MP3 → full.mp3（★ v5: 逐段WPM归一化）

    ★ 缺段处理：allow_incomplete=True（故事合成默认开启）时，缺失段被跳过，
      仍用已有段合成；缺段明细通过返回的第4个元素传出，供主流程写入日志。
    """
    full_mp3 = story_dir / "full.mp3"

    if full_mp3.exists() and not force:
        return ("skip", str(story_dir), "full.mp3 already exists", None)

    # ★ v5: 按 segments.json 的 seq 排序，找不到则跳过
    ordered, err = get_ordered_segments(story_dir)
    if err:
        return ("skip", str(story_dir), err, None)
    if not ordered:
        return ("skip", str(story_dir), "no matched segments", None)

    # 完整性校验：计算缺段明细（第4元素回传，含 id/character/text 供日志记录）
    is_complete, missing = check_segments_completeness(ordered)
    missing_ids = [m.get("id", "unknown") for m in missing] if missing else []

    if not is_complete and not allow_incomplete:
        detail = ", ".join(f"seq{m.get('seq','?')}({m.get('id','?')})" for m in missing)
        return ("incomplete", str(story_dir),
                f"missing {len(missing)} segments: {detail}", missing)

    # 过滤掉没有对应音频文件的 segment
    audio_entries = [(name, seg) for name, seg in ordered if name is not None]
    if not audio_entries:
        return ("fail", str(story_dir), "no audio files matched segments", None)

    # ★ 开始合成时实时打印（skip 的不会走到这里）
    no_wpm = is_no_wpm_subject(story_dir)
    tag = " [原速]" if no_wpm else ""
    print(f"  ★ 正在合成: {story_dir.name} ({len(audio_entries)} 段){tag}", flush=True)

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
                return ("fail", str(story_dir), f"ffprobe failed: {mp3_name}", None)

            # ★ v5: 计算逐段 atempo（★ 蒙学/诗词等吟诵学科不变速，固定1.0）
            text = seg.get("text", "") if seg else ""
            character = seg.get("character", "?") if seg else "?"
            atempo, actual_wpm = calculate_segment_speed(text, raw_dur)
            if no_wpm:
                atempo = 1.0

            speed_log.append({
                "mp3": mp3_name, "char": character,
                "raw_dur": round(raw_dur, 2),
                "wpm": actual_wpm, "atempo": atempo,
                "units": count_speech_units(text),
            })

            # ★ v5: 逐段 normalize（atempo + loudnorm）
            if not normalize_segment(src, dst, speed=atempo, normalize=normalize):
                return ("fail", str(story_dir), f"normalize failed: {mp3_name}", None)
            norm_files.append(dst)

        # ---- Step 2: 用 ffprobe 实测 normalize 后的时长（用于 timeline 和总时长）----
        norm_durations = []
        for nf in norm_files:
            d = get_duration_seconds(nf)
            if d is None:
                return ("fail", str(story_dir), f"ffprobe norm failed: {nf.name}", None)
            norm_durations.append(d)

        total_duration = sum(norm_durations)
        if gap > 0 and len(norm_files) > 1:
            total_duration += gap * (len(norm_files) - 1)

        # ---- Step 3: 生成静音文件 + concat 列表 ----
        silence_file = None
        if gap > 0 and len(norm_files) > 1:
            silence_file = temp_dir / "silence.mp3"
            if not generate_silence_file(silence_file, gap):
                return ("fail", str(story_dir), "silence generation failed", None)

        concat_list = temp_dir / "concat_list.txt"
        build_concat_list(concat_list, norm_files, silence_file, gap)

        # ---- Step 4: ffmpeg 合并（纯concat + fade，atempo/loudnorm已在逐段完成）----
        success, error = merge_with_ffmpeg(
            concat_list, full_mp3, total_duration, fade=fade
        )

        if not success:
            full_mp3.unlink(missing_ok=True)
            return ("fail", str(story_dir), error, None)

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
            msg += f" (WARNING: {len(missing)} segments missing: {', '.join(missing_ids)})"
        return ("ok", str(story_dir), msg, (missing if missing else None))

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


def main():
    args = add_merge_args("故事整曲MP3合并 (v5 — 逐段WPM归一化+96k)").parse_args()

    gap = args.gap if args.gap is not None else DEFAULT_GAP
    fade = not args.no_fade
    normalize = not args.no_normalize

    # ★ 故事合成默认允许缺段：缺失段跳过，仍用已有段合成；缺段明细仅记录日志
    allow_incomplete = True

    banner("脚本1: 故事整曲MP3合并 (v6)")
    print(f"  参数: gap={gap}s  normalize={normalize}  fade={fade}")
    print(f"  ★ WPM区间归一化: {WPM_LOW}-{WPM_HIGH}区间不改, >{WPM_HIGH}降速, <{WPM_LOW}加速")
    print(f"  ★ 原速学科(不做WPM变速, loudnorm照常): {', '.join(sorted(NO_WPM_SUBJECTS))}")
    print(f"  码率: 96kbps CBR 24kHz mono")
    print(f"  排序: 按 segments.json seq 字段（找不到则跳过）")
    print(f"  完整性: 允许缺段(默认) — 缺段仅记录到 01_story_merge_incomplete.json")
    print(f"  断点: 已有 full.mp3 自动跳过")
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
    incomplete_records = []
    start_time = time.time()
    total = len(story_dirs)

    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        futures = {
            executor.submit(merge_one_story, d, fs, gap, normalize, fade,
                           args.force, allow_incomplete): d
            for d, fs in story_dirs
        }
        for i, future in enumerate(as_completed(futures)):
            status, path, msg, missing_detail = future.result()
            results[status] = results.get(status, 0) + 1
            name = Path(path).name
            if status in ("fail", "incomplete"):
                failures.append({"path": path, "status": status, "error": msg})
            if missing_detail:
                # ★ 缺段明细：X故事缺了Y id，text内容一并记录，供后续补配音
                incomplete_records.append({
                    "story": name,
                    "path": path,
                    "count": len(missing_detail),
                    "missing": [
                        {"seq": m.get("seq", "?"), "id": m.get("id", "unknown"),
                         "character": m.get("character", ""), "text": m.get("text", "")}
                        for m in missing_detail
                    ],
                })
            # ★ 实时进度: [完成X/总Y]；skip 不逐行刷屏，每200个汇总一次
            if status == "skip":
                if (i + 1) % 200 == 0 or (i + 1) == total:
                    print(f"[{i+1}/{total}] 进度: ok={results['ok']} "
                          f"skip={results['skip']} fail={results['fail']}", flush=True)
            elif status == "ok":
                print(f"[{i+1}/{total}] 完成 {name} -> OK: {msg}", flush=True)
            else:
                print(f"[{i+1}/{total}] 完成 {name} -> {status}: {msg}", flush=True)

    from datetime import datetime
    inc_count = len(incomplete_records)
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
        f"缺段故事(已合成但缺段): {inc_count}\n"
    )
    log_file = save_log("01_story_merge", log_content)
    if failures:
        fail_file = save_failures("01_story_merge", failures)
    if incomplete_records:
        inc_file = save_incomplete("01_story_merge", incomplete_records)

    elapsed = time.time() - start_time
    print(f"\n完成! ok={results['ok']} skip={results['skip']} "
          f"incomplete={results.get('incomplete',0)} fail={results['fail']}")
    print(f"耗时: {elapsed:.0f}s")
    if failures:
        print(f"失败/不完整列表: 脚本/logs/01_story_merge_failed.json")
    if incomplete_records:
        print(f"缺段记录({inc_count}个故事): 脚本/logs/01_story_merge_incomplete.json")


if __name__ == "__main__":
    main()
