# -*- coding: utf-8 -*-
"""
find_missing_chapter_covers.py
找出所有「章回作品」中：章节没有自己专属封面图（chapter cover 缺失 / 复用了分册封面）的作品。
输出到 脚本/logs/missing_chapter_covers.txt
"""
import json
from pathlib import Path

BASE = Path(r"d:\work\work\code\testsuit\公司\项目\酷酷儿童故事")
INDEX_ROOT = BASE / "production" / "index" / "generated_stories"
COVERS_ROOT = BASE / "production" / "illustrations" / "covers" / "generated"

results = []  # (work_path, work_cover, total, missing_count, missing_names)

for idx_file in sorted(INDEX_ROOT.rglob("_index.json")):
    data = json.loads(idx_file.read_text(encoding="utf-8"))
    if data.get("structure_type") != "chaptered_work":
        continue
    work_rel = data.get("path", "")
    work_cover = (data.get("cover") or {}).get("cover_image_url", "")
    chapters = data.get("chapters", [])
    if not chapters:
        continue

    missing = []
    for ch in chapters:
        ch_name = ch.get("chapter_id") or ch.get("title") or ch.get("entry_id") or ""
        # 期望的章节专属封面路径
        expected = COVERS_ROOT / work_rel / ch_name / f"{ch_name}.webp"
        if not expected.exists():
            missing.append(ch_name)

    if missing:
        results.append((work_rel, work_cover, len(chapters), len(missing), missing))

# 输出
out = []
out.append(f"缺失章节封面的章回作品数: {len(results)}")
out.append("=" * 80)
for work_rel, work_cover, total, mc, missing in results:
    out.append(f"\n作品: {work_rel}")
    out.append(f"  分册封面: {work_cover}")
    out.append(f"  章节总数: {total}  缺失专属封面: {mc}")
    for n in missing:
        out.append(f"    - {n}")

text = "\n".join(out)
log_dir = BASE / "脚本" / "logs"
log_dir.mkdir(parents=True, exist_ok=True)
log_file = log_dir / "missing_chapter_covers.txt"
log_file.write_text(text, encoding="utf-8")
print(text)
print(f"\n已写入: {log_file}")
