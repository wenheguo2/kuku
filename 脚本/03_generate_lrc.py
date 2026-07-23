"""
脚本3：歌曲LRC生成（Whisper强制对齐）
=====================================
功能：用 Whisper medium 模型对歌曲 MP3 进行转录，结合 TXT 歌词生成 LRC 文件
运行机器：远端 4080 SUPER（ssh ZD@172.30.10.30）
前置条件：歌曲MP3全部生成完成（测试模式可用已有数据）

⚠️ 此脚本在远端 4080 机器上运行！
   远端路径：D:\\lrc_work\\songs\\ → D:\\lrc_work\\output\\

操作流程：
  1. 本机执行 transfer_songs_to_remote.py 传歌曲到远端
  2. SSH到远端，执行此脚本
  3. 本机执行 fetch_lrc_from_remote.py 传回LRC

远端执行：
  cd D:\\lrc_work
  python 03_generate_lrc.py              # 全量执行
  python 03_generate_lrc.py --test 5     # 只处理前5首（测试）
  python 03_generate_lrc.py --dry-run    # 只扫描统计
  python 03_generate_lrc.py --model large-v3  # 用large-v3模型（精度最高）
  start /b python 03_generate_lrc.py > lrc_run.log 2>&1  # 后台运行

LRC 格式：
  [ti:歌曲名]
  [00:01.50]第一行歌词
  [00:05.20]第二行歌词
  ...
"""
import os
import sys
import json
import argparse
from pathlib import Path

# 远端路径配置
SONG_ROOT = Path("D:/lrc_work/songs")
OUTPUT_ROOT = Path("D:/lrc_work/output")
LOG_DIR = Path("D:/lrc_work/logs")


def find_songs():
    """找到所有有对应 .txt 的 .mp3 文件"""
    songs = []
    for root, dirs, files in os.walk(SONG_ROOT):
        for f in files:
            if f.endswith(".mp3"):
                mp3_path = Path(root) / f
                txt_path = mp3_path.with_suffix(".txt")
                rel_path = mp3_path.relative_to(SONG_ROOT)
                lrc_path = OUTPUT_ROOT / rel_path.parent / f"{mp3_path.stem}.lrc"
                if txt_path.exists() and not lrc_path.exists():
                    songs.append((mp3_path, txt_path, lrc_path))
    return songs


def generate_lrc(model, mp3_path, txt_path, lrc_path):
    """用 Whisper 转录并生成 LRC"""
    try:
        # 读取歌词文本
        lyrics = txt_path.read_text(encoding="utf-8").strip().split("\n")
        lyrics = [line.strip() for line in lyrics if line.strip()]

        if not lyrics:
            return ("skip", str(mp3_path), "empty lyrics")

        # Whisper 转录（带时间戳）
        result = model.transcribe(
            str(mp3_path),
            language="zh",
            word_timestamps=True,
            verbose=False
        )

        segments = result.get("segments", [])

        # 将 Whisper segments 与歌词行匹配
        # 策略：按顺序匹配，每个 Whisper segment 对应一行歌词
        lrc_lines = [f"[ti:{mp3_path.stem}]"]

        for i, seg in enumerate(segments):
            if i < len(lyrics):
                start_sec = seg["start"]
                mm = int(start_sec // 60)
                ss = start_sec % 60
                lrc_lines.append(f"[{mm:02d}:{ss:05.2f}]{lyrics[i]}")
            else:
                # Whisper segment 多于歌词行，跳过多余的
                break

        # 如果歌词行多于 Whisper segments，追加剩余歌词到最后一个时间戳
        if len(lyrics) > len(segments) and segments:
            last_start = segments[-1]["start"]
            mm = int(last_start // 60)
            ss = last_start % 60
            for j in range(len(segments), len(lyrics)):
                lrc_lines.append(f"[{mm:02d}:{ss:05.2f}]{lyrics[j]}")

        # 确保输出目录存在
        lrc_path.parent.mkdir(parents=True, exist_ok=True)
        lrc_path.write_text("\n".join(lrc_lines), encoding="utf-8")
        return ("ok", str(mp3_path), f"{len(lrc_lines)-1} lines")

    except Exception as e:
        return ("fail", str(mp3_path), str(e)[:200])


def main():
    parser = argparse.ArgumentParser(description="歌曲LRC生成 (Whisper)")
    parser.add_argument("--test", type=int, default=0, metavar="N",
                        help="测试模式：只处理前 N 首")
    parser.add_argument("--dry-run", action="store_true",
                        help="扫描模式：只统计不执行")
    parser.add_argument("--model", default="medium",
                        choices=["tiny", "base", "small", "medium", "large-v3"],
                        help="Whisper模型 (默认medium, large-v3精度最高)")
    args = parser.parse_args()

    print(f"\n{'='*60}")
    print(f"  脚本3: 歌曲LRC生成 (Whisper {args.model})")
    print(f"  输入: {SONG_ROOT}")
    print(f"  输出: {OUTPUT_ROOT}")
    print(f"{'='*60}\n")

    LOG_DIR.mkdir(parents=True, exist_ok=True)
    songs = find_songs()
    print(f"找到 {len(songs)} 首歌曲待处理")

    if args.test > 0:
        songs = songs[:args.test]
        print(f"测试模式：只处理前 {args.test} 首")

    if args.dry_run:
        print(f"[DRY-RUN] 总歌曲数: {len(songs)}")
        for mp3, txt, lrc in songs[:10]:
            print(f"  {mp3.name} -> {lrc.name}")
        if len(songs) > 10:
            print(f"  ... 还有 {len(songs) - 10} 首")
        return

    # 加载 Whisper 模型
    print(f"加载 Whisper {args.model} 模型...")
    import whisper
    model = whisper.load_model(args.model)
    print("模型加载完成。")

    results = {"ok": 0, "skip": 0, "fail": 0}
    failures = []
    start_time = __import__("time").time()

    # Whisper 不适合多线程（GPU显存限制），串行处理
    for i, (mp3_path, txt_path, lrc_path) in enumerate(songs):
        status, path, msg = generate_lrc(model, mp3_path, txt_path, lrc_path)
        results[status] += 1
        if status == "fail":
            failures.append({"path": str(path), "error": msg})

        if (i + 1) % 50 == 0 or (i + 1) == len(songs):
            elapsed = __import__("time").time() - start_time
            speed = (i + 1) / elapsed if elapsed > 0 else 0
            eta = (len(songs) - i - 1) / speed if speed > 0 else 0
            print(f"  [{i+1}/{len(songs)}] ok={results['ok']} skip={results['skip']} "
                  f"fail={results['fail']} | {speed:.1f}首/s | ETA: {eta/3600:.1f}h")

    # 保存日志
    from datetime import datetime
    log_content = (
        f"脚本3: 歌曲LRC生成\n"
        f"模型: {args.model}\n"
        f"时间: {datetime.now().isoformat()}\n"
        f"总数: {len(songs)}\n"
        f"结果: ok={results['ok']} skip={results['skip']} fail={results['fail']}\n"
    )
    log_file = LOG_DIR / "03_lrc_generation.log"
    log_file.write_text(log_content, encoding="utf-8")

    if failures:
        fail_file = LOG_DIR / "03_lrc_failed.json"
        fail_file.write_text(json.dumps(failures, ensure_ascii=False, indent=2), encoding="utf-8")

    elapsed = __import__("time").time() - start_time
    print(f"\n完成! ok={results['ok']} skip={results['skip']} fail={results['fail']}")
    print(f"耗时: {elapsed/3600:.1f}h")
    if failures:
        print(f"失败列表: {fail_file}")


if __name__ == "__main__":
    main()
