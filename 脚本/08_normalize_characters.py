"""
脚本8：透明底立绘规格化
========================
功能：将透明底角色立绘统一缩放为 1024x1024px PNG，保持1:1比例不裁剪
输入：production/illustrations/characters_transparent/{角色}/{服装}/{表情}/xxx.png
输出：同目录下 xxx.png（原图保留不动，保留RGBA透明通道）
⚠ 2026-07-29 全端通用格式决策：产出由 WebP 改为 PNG（微信开发者工具模拟器不解码 webp；透明图用 PNG）
注：若源已是 png 且同名，会因 dst==src 跳过，不会覆盖原图
运行机器：本机
前置条件：无（可立即执行，依赖rembg透明化已完成）

策略：等比缩放到1024x1024画布内，居中放置，背景保持透明（不裁剪、不截断）
用途：横屏教学三面板/故事播放器中角色立绘叠加在场景背景上

使用方式：
  python 07_normalize_characters.py              # 全量执行
  python 07_normalize_characters.py --test 5     # 只处理前5张（测试）
  python 07_normalize_characters.py --dry-run    # 只扫描统计
  python 07_normalize_characters.py --force      # 强制重新生成
"""
import os
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from common import CHARACTERS_TRANSPARENT, save_log, save_failures, banner


def find_images():
    """找到所有透明底立绘图片"""
    images = []
    if not CHARACTERS_TRANSPARENT.exists():
        print(f"[ERROR] 透明底立绘目录不存在: {CHARACTERS_TRANSPARENT}")
        return images
    for root, dirs, files in os.walk(CHARACTERS_TRANSPARENT):
        for f in files:
            if f.lower().endswith((".png", ".jpg", ".jpeg")):
                images.append(Path(root) / f)
    return images


def process_one(src, target_w, target_h, quality, force=False):
    """处理一张透明底立绘 — 等比缩放到目标画布内，居中放置，保留透明通道"""
    dst = src.with_suffix(".png")

    if dst.exists() and not force:
        return ("skip", str(src), "png already exists")
    if dst == src:
        return ("skip", str(src), "source is already png")

    try:
        from PIL import Image

        img = Image.open(src)

        # 确保是RGBA模式（保留透明通道）
        if img.mode != "RGBA":
            img = img.convert("RGBA")

        src_w, src_h = img.size
        scale = min(target_w / src_w, target_h / src_h)
        new_w = int(src_w * scale)
        new_h = int(src_h * scale)
        img = img.resize((new_w, new_h), Image.LANCZOS)

        # 创建目标画布（透明背景），居中放置
        canvas = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
        offset_x = (target_w - new_w) // 2
        offset_y = (target_h - new_h) // 2
        canvas.paste(img, (offset_x, offset_y), img)  # 用img自身做mask保留透明

        canvas.save(dst, "PNG")
        return ("ok", str(src), f"{target_w}x{target_h}")
    except Exception as e:
        return ("fail", str(src), str(e)[:200])


def main():
    import argparse
    parser = argparse.ArgumentParser(description="透明底立绘规格化")
    parser.add_argument("--test", type=int, default=0, metavar="N",
                        help="测试模式：只处理前 N 张")
    parser.add_argument("--dry-run", action="store_true",
                        help="扫描模式：只统计不执行")
    parser.add_argument("--force", action="store_true",
                        help="强制重新生成（覆盖已有WebP）")
    parser.add_argument("--width", type=int, default=1024,
                        help="目标宽度 (默认1024)")
    parser.add_argument("--height", type=int, default=1024,
                        help="目标高度 (默认1024)")
    parser.add_argument("--quality", type=int, default=90,
                        help="WebP质量 (默认90)")
    args = parser.parse_args()

    banner(f"脚本8: 透明底立绘规格化 ({args.width}x{args.height} WebP RGBA)")

    images = find_images()
    print(f"找到 {len(images)} 张透明底立绘")

    if args.test > 0:
        images = images[:args.test]
        print(f"测试模式：只处理前 {args.test} 张")

    if args.dry_run:
        print(f"[DRY-RUN] 总立绘数: {len(images)}")
        for img in images[:10]:
            try:
                from PIL import Image
                with Image.open(img) as im:
                    print(f"  {img.name} -> {im.size[0]}x{im.size[1]} {im.mode} {img.suffix}")
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
        if (i + 1) % 100 == 0 or (i + 1) == len(images):
            print(f"  [{i+1}/{len(images)}] ok={results['ok']} skip={results['skip']} fail={results['fail']}")

    from datetime import datetime
    log_content = (
        f"脚本8: 透明底立绘规格化\n"
        f"时间: {datetime.now().isoformat()}\n"
        f"目标尺寸: {args.width}x{args.height}px WebP RGBA (quality={args.quality})\n"
        f"总数: {len(images)}\n"
        f"结果: ok={results['ok']} skip={results['skip']} fail={results['fail']}\n"
    )
    save_log("08_characters", log_content)
    if failures:
        save_failures("08_characters", failures)

    elapsed = time.time() - start_time
    print(f"\n完成! ok={results['ok']} skip={results['skip']} fail={results['fail']}")
    print(f"耗时: {elapsed:.0f}s")
    if failures:
        print(f"失败列表: 脚本/logs/08_characters_failed.json")


if __name__ == "__main__":
    main()
