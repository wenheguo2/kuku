"""
传输脚本B：LRC文件从远端传回本机
=================================
功能：将远端 4080 机器 D:\\lrc_work\\output\\ 下生成的 LRC 文件
      传回本机 production/generated_stories/瞎编的歌曲/ 对应目录
运行机器：本机
前置条件：远端 LRC 生成已完成
依赖：paramiko (pip install paramiko)

使用方式：
  python fetch_lrc_from_remote.py              # 全量传回
  python fetch_lrc_from_remote.py --dry-run    # 只统计不传输
"""
import os
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from common import SONG_ROOT, REMOTE_HOST, REMOTE_USER, REMOTE_PASS, REMOTE_LRC_WORK, banner


def main():
    import argparse
    parser = argparse.ArgumentParser(description="LRC文件从远端传回本机")
    parser.add_argument("--dry-run", action="store_true",
                        help="扫描模式：只统计不传输")
    args = parser.parse_args()

    banner("传输脚本B: LRC文件 ← 远端4080")

    remote_output = f"{REMOTE_LRC_WORK}/output"

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

    # 递归遍历远端 output 目录
    def scan_remote_dir(remote_dir):
        """递归扫描远端目录，返回 LRC 文件列表"""
        lrc_files = []
        try:
            entries = sftp.listdir_attr(remote_dir)
        except FileNotFoundError:
            print(f"  [WARN] 远端目录不存在: {remote_dir}")
            return lrc_files

        for entry in entries:
            remote_path = f"{remote_dir}/{entry.filename}"
            # SFTPAttributes 没有 is_dir 方法，用 st_mode 判断
            from stat import S_ISDIR
            if entry.st_mode and S_ISDIR(entry.st_mode):
                lrc_files.extend(scan_remote_dir(remote_path))
            elif entry.filename.endswith(".lrc"):
                lrc_files.append(remote_path)
        return lrc_files

    print("扫描远端 LRC 文件...")
    lrc_files = scan_remote_dir(remote_output)
    print(f"找到 {len(lrc_files)} 个 LRC 文件")

    if args.dry_run:
        for f in lrc_files[:10]:
            print(f"  {f}")
        if len(lrc_files) > 10:
            print(f"  ... 还有 {len(lrc_files) - 10} 个")
        sftp.close()
        ssh.close()
        return

    if not lrc_files:
        print("没有 LRC 文件需要传回。")
        sftp.close()
        ssh.close()
        return

    # 传回 LRC 文件
    start_time = time.time()
    transferred = 0
    failed = 0

    for i, remote_lrc in enumerate(lrc_files):
        # 计算本地路径
        # remote: D:/lrc_work/output/幼儿/双语歌曲/xxx.lrc
        # local:  production/generated_stories/瞎编的歌曲/幼儿/双语歌曲/xxx.lrc
        rel = remote_lrc.replace(f"{remote_output}/", "")
        local_path = SONG_ROOT / rel.replace("/", os.sep)

        try:
            local_path.parent.mkdir(parents=True, exist_ok=True)
            sftp.get(remote_lrc, str(local_path))
            transferred += 1
        except Exception as e:
            print(f"  [FAIL] {rel}: {e}")
            failed += 1

        if (i + 1) % 200 == 0 or (i + 1) == len(lrc_files):
            elapsed = time.time() - start_time
            speed = (i + 1) / elapsed if elapsed > 0 else 0
            print(f"  [{i+1}/{len(lrc_files)}] 传回={transferred} 失败={failed} | {speed:.1f}文件/s")

    sftp.close()
    ssh.close()

    elapsed = time.time() - start_time
    print(f"\n完成! 传回={transferred} 失败={failed}")
    print(f"耗时: {elapsed:.0f}s ({elapsed/60:.1f}min)")
    print(f"本地目录: {SONG_ROOT}")


if __name__ == "__main__":
    main()
