"""
脚本5：封面图规格化
====================
功能：将已有封面图统一缩放为 800x800px WebP（质量85），保持1:1比例不裁剪
输入：production/illustrations/covers/generated/{学科}/xxx.png
输出：同目录下 xxx.webp（原图保留不动）
运行机器：本机
前置条件：无（可立即执行）

策略：等比缩放到800x800画布内，居中放置，背景填充白色（不裁剪、不截断）

使用方式：
  python 05_normalize_covers.py              # 全量执行
  python 05_normalize_covers.py --test 5     # 只处理前5张（测试）
  python 05_normalize_covers.py --dry-run    # 只扫描统计
  python 05_normalize_covers.py --force      # 强制重新生成
  python 05_normalize_covers.py --width 800 --height 800  # 自定义尺寸
"""
import os
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from common import COVERS_DIR, save_log, save_failures, banner


def find_images():
    """找到所有封面图片"""
    images = []
    if not COVERS_DIR.exists():
        print(f"[ERROR] 封面目录不存在: {COVERS_DIR}")
        return images
    for root, dirs, files in os.walk(COVERS_DIR):
        for f in files:
            if f.lower().endswith((".png", ".jpg", ".jpeg")):
                images.append(Path(root) / f)
    return images


def process_one(src, target_w, target_h, quality, force=False):
    """处理一张封面图 — 等比缩放到目标画布内，居中放置，不裁剪"""
    dst = src.with_suffix(".webp")

    if dst.exists() and not force:
        return ("skip", str(src), "webp already exists")
    if dst == src:
        # 源文件已经是 webp，跳过
        return ("skip", str(src), "source is already webp")

    try:
        from PIL import Image

        img = Image.open(src).convert("RGB")

        # 等比缩放到目标画布内（contain模式，不裁剪）
        src_w, src_h = img.size
        scale = min(target_w / src_w, target_h / src_h)
        new_w = int(src_w * scale)
        new_h = int(src_h * scale)
        img = img.resize((new_w, new_h), Image.LANCZOS)

        # 创建目标画布（白色背景），居中放置
        canvas = Image.new("RGB", (target_w, target_h), (255, 255, 255))
        offset_x = (target_w - new_w) // 2
        offset_y = (target_h - new_h) // 2
        canvas.paste(img, (offset_x, offset_y))

        canvas.save(dst, "WEBP", quality=quality)
        return ("ok", str(src), f"{target_w}x{target_h}")
    except Exception as e:
        return ("fail", str(src), str(e)[:200])


def main():
    import argparse
    parser = argparse.ArgumentParser(description="封面图规格化")
    parser.add_argument("--test", type=int, default=0, metavar="N",
                        help="测试模式：只处理前 N 张")
    parser.add_argument("--dry-run", action="store_true",
                        help="扫描模式：只统计不执行")
    parser.add_argument("--force", action="store_true",
                        help="强制重新生成（覆盖已有WebP）")
    parser.add_argument("--width", type=int, default=800,
                        help="目标宽度 (默认800)")
    parser.add_argument("--height", type=int, default=800,
                        help="目标高度 (默认800)")
    parser.add_argument("--quality", type=int, default=85,
                        help="WebP质量 (默认85)")
    args = parser.parse_args()

    banner(f"脚本5: 封面图规格化 ({args.width}x{args.height} WebP)")

    images = find_images()
    print(f"找到 {len(images)} 张封面图")

    if args.test > 0:
        images = images[:args.test]
        print(f"测试模式：只处理前 {args.test} 张")

    if args.dry_run:
        print(f"[DRY-RUN] 总封面数: {len(images)}")
        for img in images[:10]:
            try:
                from PIL import Image
                with Image.open(img) as im:
                    print(f"  {img.name} -> {im.size[0]}x{im.size[1]} {img.suffix}")
            except Exception:
                print(f"  {img.name} -> (无法读取)")
        if len(images) > 10:
            print(f"  ... 还有 {len(images) - 10} 张")
        return

    results = {"ok": 0, "skip": 0, "fail": 0}
    failures = []
    start_time = time.time()

    for i, img in enumerate(images):
        status, path, msg = process_one(
            img, args.width, args.height, args.quality, args.force
        )
        results[status] += 1
        if status == "fail":
            failures.append({"path": path, "error": msg})
        if (i + 1) % 10 == 0 or (i + 1) == len(images):
            print(f"  [{i+1}/{len(images)}] ok={results['ok']} skip={results['skip']} fail={results['fail']}")

    from datetime import datetime
    log_content = (
        f"脚本5: 封面图规格化\n"
        f"时间: {datetime.now().isoformat()}\n"
        f"目标尺寸: {args.width}x{args.height}px WebP (quality={args.quality})\n"
        f"总数: {len(images)}\n"
        f"结果: ok={results['ok']} skip={results['skip']} fail={results['fail']}\n"
    )
    save_log("05_covers", log_content)
    if failures:
        save_failures("05_covers", failures)

    elapsed = time.time() - start_time
    print(f"\n完成! ok={results['ok']} skip={results['skip']} fail={results['fail']}")
    print(f"耗时: {elapsed:.0f}s")
    if failures:
        print(f"失败列表: 脚本/logs/05_covers_failed.json")


if __name__ == "__main__":
    main()
