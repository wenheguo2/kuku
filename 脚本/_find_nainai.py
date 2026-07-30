"""学科启蒙 中 奶奶 角色配音问题统计
- 统计段数与当前 voice_id 分布
- 列出 (故事, seg_id, voice_id)
- 预筛：文件原始内容不含 '奶' 直接跳过，避免全量解析
"""
import json, sys
from pathlib import Path
from collections import Counter

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

BASE = Path(r"d:\work\work\code\testsuit\公司\项目\酷酷儿童故事")
PROD = BASE / "production/generated_stories"
OUT_DIR = BASE / "production"

def norm_char(c):
    return (c or "").replace(" ", "").replace("　", "")

rows = []
vid_dist = Counter()
files_scanned = 0
files_hit = 0
root = PROD / "学科启蒙"
for segf in root.rglob("segments.json"):
    files_scanned += 1
    try:
        raw = segf.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        continue
    if "奶" not in raw:
        continue
    files_hit += 1
    rel = str(segf.parent.relative_to(PROD))
    try:
        data = json.loads(raw)
    except Exception:
        continue
    for s in data.get("segments", []):
        if norm_char(s.get("character")) == "奶奶":
            vid = s.get("voice_id", "")
            rows.append((rel, s.get("id", ""), vid))
            vid_dist[vid] += 1

print(f"扫描文件: {files_scanned} | 含'奶'文件: {files_hit}")
print(f"学科启蒙 奶奶 段数: {len(rows)}")
print(f"voice_id 分布: {dict(vid_dist)}")

# 写出清单
lines = [f"学科启蒙 奶奶 配音问题清单  共 {len(rows)} 条", ""]
lines.append("voice_id 分布: " + json.dumps(dict(vid_dist), ensure_ascii=False))
lines.append("")
lines.append("故事路径 | seg_id | 当前voice_id")
for rel, seg_id, vid in rows:
    lines.append(f"{rel}\t{seg_id}\t{vid}")
txt = "\n".join(lines)
out = OUT_DIR / "学科启蒙_奶奶配音问题清单.txt"
out.write_text(txt, encoding="utf-8")
print(f"\n清单已写入: {out}")
