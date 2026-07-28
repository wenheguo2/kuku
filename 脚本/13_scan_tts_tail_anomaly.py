"""
脚本13：TTS幻觉尾巴扫描
=============================================================================
功能：扫描 production/audio/ 下所有分段MP3，筛出疑似"幻觉尾巴"的文件。

背景：TTS 偶发在正文结束后续生成一段失控内容（如笑声/哼鸣），
      特征 = 尾段持续大音量且峰值顶满幅（参考案例 sp_01915：
      正文4.8s结束，5.45s后接3.8s满幅噪音，tail_mean=-8.4dB, tail_max=0.0dB）。

判定规则（对每个MP3只解码最后 TAIL_SEC 秒，volumedetect）：
  疑似 = tail_max >= TAIL_MAX_DB (默认-1.0) 且 tail_mean >= TAIL_MEAN_DB (默认-12.0)
  （正常语音结尾收音+静音，尾段mean通常 <= -15dB）

断点续扫：
  - 以"目录"为断点单位，已扫完的目录记录在 logs/13_tail_scan_done_dirs.txt
  - 疑似文件实时追加到 logs/13_tail_scan_flagged.jsonl（含text）
  - 全部扫完后汇总生成 logs/13_tail_scan_flagged.json + 13_tail_scan.log

使用方式：
  python 脚本/13_scan_tts_tail_anomaly.py                  # 全量（断点续扫）
  python 脚本/13_scan_tts_tail_anomaly.py --test 20        # 只扫前20个目录
  python 脚本/13_scan_tts_tail_anomaly.py --workers 8      # 并行数
  python 脚本/13_scan_tts_tail_anomaly.py --tail-sec 2.5 --tail-max-db -1.0 --tail-mean-db -12.0
  python 脚本/13_scan_tts_tail_anomaly.py --restart        # 忽略断点全部重扫
"""
import sys
import json
import time
import argparse
import subprocess
import threading
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.path.insert(0, str(Path(__file__).parent))
from common import AUDIO_DIR, LOGS_DIR, get_segments_json, banner

TAIL_SEC = 2.5
TAIL_MAX_DB = -1.0
TAIL_MEAN_DB = -12.0

DONE_FILE = LOGS_DIR / "13_tail_scan_done_dirs.txt"
FLAGGED_JSONL = LOGS_DIR / "13_tail_scan_flagged.jsonl"
FLAGGED_JSON = LOGS_DIR / "13_tail_scan_flagged.json"

_write_lock = threading.Lock()

CREATE_NO_WINDOW = 0x08000000 if sys.platform == "win32" else 0


def tail_volume(mp3_path, tail_sec):
    """只解码最后 tail_sec 秒，返回 (mean_db, max_db)；失败返回 (None, None)"""
    cmd = [
        "ffmpeg", "-hide_banner", "-nostats",
        "-sseof", f"-{tail_sec}", "-i", str(mp3_path),
        "-af", "volumedetect", "-f", "null", "-",
    ]
    try:
        r = subprocess.run(cmd, capture_output=True, text=True,
                           encoding="utf-8", errors="replace",
                           timeout=30, creationflags=CREATE_NO_WINDOW)
    except (subprocess.TimeoutExpired, OSError):
        return None, None
    mean_db = max_db = None
    for line in (r.stderr or "").splitlines():
        if "mean_volume:" in line:
            try:
                mean_db = float(line.split("mean_volume:")[1].split("dB")[0])
            except ValueError:
                pass
        elif "max_volume:" in line:
            try:
                max_db = float(line.split("max_volume:")[1].split("dB")[0])
            except ValueError:
                pass
    return mean_db, max_db


def load_seg_texts(audio_dir):
    """读取该目录 segments.json，返回 {id: segment_dict}；没有则空"""
    seg_data = get_segments_json(audio_dir)
    if not seg_data:
        return {}
    return {s.get("id", ""): s for s in seg_data.get("segments", [])}

def scan_dir(audio_dir, tail_sec, tail_max_db, tail_mean_db):
    """扫描一个目录的所有分段MP3，返回 (扫描数, 疑似列表)"""
    mp3s = [p for p in audio_dir.glob("*.mp3")
            if p.name not in ("full.mp3",) and not p.name.startswith("norm_")]
    if not mp3s:
        return 0, []

    seg_map = load_seg_texts(audio_dir)
    flagged = []
    for p in mp3s:
        mean_db, max_db = tail_volume(p, tail_sec)
        if mean_db is None or max_db is None:
            continue
        if max_db >= tail_max_db and mean_db >= tail_mean_db:
            seg = seg_map.get(p.stem, {})
            flagged.append({
                "path": str(p),
                "id": p.stem,
                "tail_mean_db": mean_db,
                "tail_max_db": max_db,
                "character": seg.get("character", ""),
                "voice_id": seg.get("voice_id", ""),
                "text": seg.get("text", ""),
            })
    return len(mp3s), flagged


def find_leaf_audio_dirs():
    """找出所有直接包含MP3的叶子目录"""
    leaf_dirs = set()
    for p in AUDIO_DIR.rglob("*.mp3"):
        if p.name != "full.mp3" and p.parent.name != "_tmp_merge":
            leaf_dirs.add(p.parent)
    return sorted(leaf_dirs)


def main():
    parser = argparse.ArgumentParser(description="TTS幻觉尾巴扫描")
    parser.add_argument("--test", type=int, default=0, metavar="N",
                        help="只扫描前 N 个目录")
    parser.add_argument("--workers", type=int, default=8, help="并行线程数")
    parser.add_argument("--tail-sec", type=float, default=TAIL_SEC)
    parser.add_argument("--tail-max-db", type=float, default=TAIL_MAX_DB)
    parser.add_argument("--tail-mean-db", type=float, default=TAIL_MEAN_DB)
    parser.add_argument("--restart", action="store_true", help="忽略断点全部重扫")
    args = parser.parse_args()

    banner("脚本13: TTS幻觉尾巴扫描")
    print(f"  判定: 尾{args.tail_sec}s 内 max>={args.tail_max_db}dB 且 mean>={args.tail_mean_db}dB")
    print(f"  断点: 已扫目录记录在 logs/13_tail_scan_done_dirs.txt")
    print(f"  线程: {args.workers}")
    print()

    LOGS_DIR.mkdir(parents=True, exist_ok=True)

    # 断点：已完成目录集合
    done_dirs = set()
    if args.restart:
        DONE_FILE.unlink(missing_ok=True)
        FLAGGED_JSONL.unlink(missing_ok=True)
    elif DONE_FILE.exists():
        done_dirs = set(DONE_FILE.read_text(encoding="utf-8").splitlines())

    print("正在收集音频目录 ...", flush=True)
    all_dirs = find_leaf_audio_dirs()
    todo = [d for d in all_dirs if str(d) not in done_dirs]
    print(f"目录总数: {len(all_dirs)}, 已扫: {len(all_dirs)-len(todo)}, 待扫: {len(todo)}", flush=True)

    if args.test > 0:
        todo = todo[:args.test]
        print(f"测试模式: 只扫前 {args.test} 个目录")

    total = len(todo)
    scanned_files = 0
    flagged_total = 0
    start = time.time()

    done_fh = open(DONE_FILE, "a", encoding="utf-8")
    jsonl_fh = open(FLAGGED_JSONL, "a", encoding="utf-8")

    try:
        with ThreadPoolExecutor(max_workers=args.workers) as executor:
            futures = {
                executor.submit(scan_dir, d, args.tail_sec,
                                args.tail_max_db, args.tail_mean_db): d
                for d in todo
            }
            for i, future in enumerate(as_completed(futures)):
                d = futures[future]
                try:
                    n, flagged = future.result()
                except Exception as e:
                    print(f"  [ERROR] {d}: {e}", flush=True)
                    continue
                scanned_files += n
                with _write_lock:
                    for item in flagged:
                        jsonl_fh.write(json.dumps(item, ensure_ascii=False) + "\n")
                    if flagged:
                        flagged_total += len(flagged)
                        jsonl_fh.flush()
                        for item in flagged:
                            print(f"  ! 疑似: {item['id']}  "
                                  f"tail_mean={item['tail_mean_db']}dB "
                                  f"tail_max={item['tail_max_db']}dB  "
                                  f"[{Path(item['path']).parent.name}]", flush=True)
                    done_fh.write(str(d) + "\n")
                    done_fh.flush()
                if (i + 1) % 100 == 0 or (i + 1) == total:
                    rate = scanned_files / max(time.time() - start, 1)
                    print(f"[{i+1}/{total}] 已扫文件={scanned_files} "
                          f"疑似={flagged_total} 速度={rate:.0f}文件/s", flush=True)
    finally:
        done_fh.close()
        jsonl_fh.close()

    # 汇总 JSONL -> JSON（含历史断点扫出的）
    all_flagged = []
    if FLAGGED_JSONL.exists():
        for line in FLAGGED_JSONL.read_text(encoding="utf-8").splitlines():
            if line.strip():
                all_flagged.append(json.loads(line))
    with open(FLAGGED_JSON, "w", encoding="utf-8") as f:
        json.dump(all_flagged, f, ensure_ascii=False, indent=2)

    elapsed = time.time() - start
    log = (
        f"脚本13: TTS幻觉尾巴扫描\n"
        f"判定: 尾{args.tail_sec}s max>={args.tail_max_db}dB 且 mean>={args.tail_mean_db}dB\n"
        f"本次扫描目录: {total}, 文件: {scanned_files}, 耗时: {elapsed:.0f}s\n"
        f"本次新增疑似: {flagged_total}\n"
        f"累计疑似(含历史): {len(all_flagged)}\n"
    )
    (LOGS_DIR / "13_tail_scan.log").write_text(log, encoding="utf-8")

    print(f"\n完成! 本次扫 {scanned_files} 个文件, 新增疑似 {flagged_total} 个, "
          f"累计疑似 {len(all_flagged)} 个")
    print(f"疑似清单: 脚本/logs/13_tail_scan_flagged.json")


if __name__ == "__main__":
    main()
