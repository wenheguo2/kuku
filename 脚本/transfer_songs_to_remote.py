"""
传输脚本A：歌曲文件传输到远端4080机器
=====================================
功能：将本机 production/generated_stories/瞎编的歌曲/ 下的 MP3+TXT
      传到远端 4080 机器 D:\\lrc_work\\songs\\（保持相对目录结构）
运行机器：本机
前置条件：远端机器在线（ssh ZD@172.30.10.30）
依赖：paramiko (pip install paramiko)

使用方式：
  python transfer_songs_to_remote.py              # 全量传输
  python transfer_songs_to_remote.py --test 10    # 只传前10首（测试）
  python transfer_songs_to_remote.py --dry-run    # 只统计不传输
  python transfer_songs_to_remote.py --lrc-only   # 只传有MP3但缺LRC的歌曲
"""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from common import SONG_ROOT, REMOTE_HOST, REMOTE_USER, REMOTE_PASS, REMOTE_LRC_WORK, banner


def collect_files(lrc_only=False):
    """收集需要传输的文件"""
    files = []
    if not SONG_ROOT.exists():
        print(f"[ERROR] 歌曲目录不存在: {SONG_ROOT}")
        return files

    for root, dirs, files_list in os.walk(SONG_ROOT):
        for f in files_list:
            if f.endswith((".mp3", ".txt")):
                local_path = Path(root) / f
                files.append(local_path)

    # 如果只传有MP3但缺LRC的歌曲
    if lrc_only:
        mp3_files = [f for f in files if f.endswith(".mp3")]
        filtered = []
        for mp3 in mp3_files:
            lrc_path = mp3.with_suffix(".lrc")
            if not lrc_path.exists():
                # 传输 MP3 和对应的 TXT
                filtered.append(mp3)
                txt_path = mp3.with_suffix(".txt")
                if txt_path in files:
                    filtered.append(txt_path)
        files = filtered

    return files


def ensure_remote_dir(sftp, ssh, remote_path):
    """递归创建远端目录"""
    parts = remote_path.replace("\\", "/").split("/")
    path_so_far = ""
    for part in parts:
        if not part:
            continue
        path_so_far = f"{path_so_far}/{part}" if path_so_far else part
        try:
            sftp.stat(path_so_far)
        except FileNotFoundError:
            try:
                sftp.mkdir(path_so_far)
            except Exception:
                pass


def main():
    import argparse
    parser = argparse.ArgumentParser(description="传输歌曲到远端4080机器")
    parser.add_argument("--test", type=int, default=0, metavar="N",
                        help="测试模式：只传前 N 个文件")
    parser.add_argument("--dry-run", action="store_true",
                        help="扫描模式：只统计不传输")
    parser.add_argument("--lrc-only", action="store_true",
                        help="只传有MP3但缺LRC的歌曲")
    args = parser.parse_args()

    banner("传输脚本A: 歌曲文件 → 远端4080")

    files = collect_files(lrc_only=args.lrc_only)
    print(f"找到 {len(files)} 个文件待传输")
    if args.lrc_only:
        print("  (仅传输缺LRC的歌曲)")

    if args.test > 0:
        files = files[:args.test]
        print(f"测试模式：只传前 {args.test} 个")

    if args.dry_run:
        total_size = sum(f.stat().st_size for f in files) / (1024 * 1024)
        print(f"[DRY-RUN] 总文件数: {len(files)}, 总大小: {total_size:.0f}MB")
        for f in files[:10]:
            print(f"  {f.relative_to(SONG_ROOT)}")
        if len(files) > 10:
            print(f"  ... 还有 {len(files) - 10} 个")
        return

    # 连接远端
    print(f"连接远端 {REMOTE_HOST}...")
    try:
        import paramiko
    except ImportError:
        print("[ERROR] paramiko 未安装！请执行: pip install paramiko")
        sys.exit(1)

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(REMOTE_HOST, username=REMOTE_USER, password=REMOTE_PASS, timeout=10)
    sftp = ssh.open_sftp()
    print("连接成功。")

    remote_base = f"{REMOTE_LRC_WORK}/songs"
    remote_output = f"{REMOTE_LRC_WORK}/output"
    ensure_remote_dir(sftp, ssh, remote_base)
    ensure_remote_dir(sftp, ssh, remote_output)

    # 传输脚本3到远端
    script_src = Path(__file__).parent / "03_generate_lrc.py"
    if script_src.exists():
        sftp.put(str(script_src), f"{REMOTE_LRC_WORK}/03_generate_lrc.py")
        print("已传输 03_generate_lrc.py 到远端")

    # 传输文件
    import time
    start_time = time.time()
    transferred = 0
    failed = 0

    for i, local_path in enumerate(files):
        rel_path = local_path.relative_to(SONG_ROOT)
        remote_dir = f"{remote_base}/{rel_path.parent}".replace("\\", "/")
        ensure_remote_dir(sftp, ssh, remote_dir)
        remote_file = f"{remote_dir}/{local_path.name}"

        try:
            sftp.put(str(local_path), remote_file)
            transferred += 1
        except Exception as e:
            print(f"  [FAIL] {local_path.name}: {e}")
            failed += 1

        if (i + 1) % 200 == 0 or (i + 1) == len(files):
            elapsed = time.time() - start_time
            speed = (i + 1) / elapsed if elapsed > 0 else 0
            print(f"  [{i+1}/{len(files)}] 传输={transferred} 失败={failed} | {speed:.1f}文件/s")

    sftp.close()
    ssh.close()

    elapsed = time.time() - start_time
    print(f"\n完成! 传输={transferred} 失败={failed}")
    print(f"耗时: {elapsed:.0f}s ({elapsed/60:.1f}min)")
    print(f"远端目录: {remote_base}")
    print(f"\n下一步: SSH到远端执行 LRC 生成:")
    print(f"  ssh {REMOTE_USER}@{REMOTE_HOST}")
    print(f"  cd D:\\lrc_work && python 03_generate_lrc.py")


if __name__ == "__main__":
    main()
