"""
脚本4：立绘去白底透明化（rembg）
=================================
功能：将 1,668 张白底 PNG 去背景，输出透明底 PNG
输入：production/illustrations/characters_generated/{角色}/{服装}/{表情}/xxx.png
输出：production/illustrations/characters_transparent/{角色}/{服装}/{表情}/xxx.png
运行机器：本机（CPU模式，onnxruntime）
前置条件：无（白底立绘已全部就绪，可立即执行）

使用方式：
  python 04_rembg_transparent.py              # 全量执行
  python 04_rembg_transparent.py --test 10    # 只处理前10张（测试）
  python 04_rembg_transparent.py --dry-run    # 只扫描统计
  python 04_rembg_transparent.py --force      # 强制重新生成
"""
import os
import sys
import json
import time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.path.insert(0, str(Path(__file__).parent))
from common import (
    CHARACTERS_GENERATED, CHARACTERS_TRANSPARENT,
    save_log, save_failures, print_progress,
    add_common_args, banner
)


def find_images():
    """找到所有待处理的 PNG"""
    images = []
    if not CHARACTERS_GENERATED.exists():
        print(f"[ERROR] 立绘目录不存在: {CHARACTERS_GENERATED}")
        return images
    for root, dirs, files in os.walk(CHARACTERS_GENERATED):
        for f in files:
            if f.endswith(".png"):
                src = Path(root) / f
                rel = src.relative_to(CHARACTERS_GENERATED)
                dst = CHARACTERS_TRANSPARENT / rel
                images.append((src, dst))
    return images


def process_one(src_path, dst_path, session, force=False):
    """处理一张图片"""
    if dst_path.exists() and not force:
        return ("skip", str(src_path), "already exists")

    try:
        from rembg import remove
        from PIL import Image
        import io

        dst_path.parent.mkdir(parents=True, exist_ok=True)

        # 读取原图
        input_image = Image.open(src_path)

        # rembg 去背景 (rembg 2.x 在输入为 PIL Image 时直接返回 PIL Image)
        output_data = remove(input_image, session=session)

        # 保存透明底 PNG
        if isinstance(output_data, bytes):
            output_image = Image.open(io.BytesIO(output_data))
        else:
            output_image = output_data
        output_image.save(dst_path, "PNG")

        return ("ok", str(src_path), str(dst_path.relative_to(CHARACTERS_TRANSPARENT)))
    except Exception as e:
        return ("fail", str(src_path), str(e)[:200])


def main():
    args = add_common_args("立绘去白底透明化 (rembg)").parse_args()
    banner("脚本4: 立绘去白底透明化")

    images = find_images()
    print(f"找到 {len(images)} 张白底PNG")

    if args.test > 0:
        images = images[:args.test]
        print(f"测试模式：只处理前 {args.test} 张")

    if args.dry_run:
        # 统计角色/服装/表情分布
        characters = set()
        for src, _ in images:
            parts = src.relative_to(CHARACTERS_GENERATED).parts
            if parts:
                characters.add(parts[0])
        print(f"[DRY-RUN] 总图片数: {len(images)}")
        print(f"  角色数: {len(characters)} ({', '.join(sorted(characters)[:5])}...)")
        return

    # 初始化 rembg
    print("初始化 rembg (u2net模型, CPU模式)...")
    try:
        from rembg import new_session
        session = new_session("u2net")
        print("rembg 初始化完成。")
    except ImportError:
        print("[ERROR] rembg 未安装！请执行:")
        print('  pip install "rembg[cpu]" onnxruntime')
        sys.exit(1)

    results = {"ok": 0, "skip": 0, "fail": 0}
    failures = []
    start_time = time.time()

    # CPU 模式用 2 线程
    with ThreadPoolExecutor(max_workers=2) as executor:
        futures = {
            executor.submit(process_one, s, d, session, args.force): s
            for s, d in images
        }
        for i, future in enumerate(as_completed(futures)):
            status, path, msg = future.result()
            results[status] += 1
            if status == "fail":
                failures.append({"path": path, "error": msg})
            print_progress(i + 1, len(images), results, interval=50)

    from datetime import datetime
    log_content = (
        f"脚本4: 立绘去白底透明化\n"
        f"时间: {datetime.now().isoformat()}\n"
        f"总数: {len(images)}\n"
        f"结果: ok={results['ok']} skip={results['skip']} fail={results['fail']}\n"
        f"输出目录: {CHARACTERS_TRANSPARENT}\n"
    )
    save_log("04_rembg", log_content)
    if failures:
        save_failures("04_rembg", failures)

    elapsed = time.time() - start_time
    print(f"\n完成! ok={results['ok']} skip={results['skip']} fail={results['fail']}")
    print(f"耗时: {elapsed:.0f}s ({elapsed/60:.1f}min)")
    print(f"输出: {CHARACTERS_TRANSPARENT}")
    if failures:
        print(f"失败列表: 脚本/logs/04_rembg_failed.json")
        print("建议人工检查失败图片，用Photoshop手动去背景")


if __name__ == "__main__":
    main()
