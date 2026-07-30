"""排查奶奶类角色的正确音色 & V-ELD-* 音色性别画像"""
import json, sys
from pathlib import Path
from collections import defaultdict, Counter

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

BASE = Path(r"d:\work\work\code\testsuit\公司\项目\酷酷儿童故事")
PROD = BASE / "production/generated_stories"

GRANDMA = {"奶奶", "外婆", "姥姥", "老奶奶", "祖母", "奶奶外婆"}
def norm_char(c):
    return (c or "").replace(" ", "").replace("　", "")

grandma_vids = defaultdict(Counter)   # 角色 -> voice_id -> count
eld_chars = defaultdict(Counter)       # V-ELD-x -> 角色 -> count
scanned = 0

for segf in PROD.rglob("segments.json"):
    scanned += 1
    try:
        raw = segf.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        continue
    if not ("奶" in raw or "婆" in raw or "姥" in raw or "V-ELD-" in raw):
        continue
    try:
        data = json.loads(raw)
    except Exception:
        continue
    for s in data.get("segments", []):
        vid = s.get("voice_id", "")
        c = norm_char(s.get("character"))
        if c in GRANDMA:
            grandma_vids[c][vid] += 1
        if vid.startswith("V-ELD-"):
            eld_chars[vid][s.get("character", "")] += 1

print(f"扫描文件: {scanned}\n")
print("=== 奶奶类角色 -> voice_id 分布 ===")
for c in sorted(grandma_vids):
    print(f"  {c}: {dict(grandma_vids[c])}")

print("\n=== V-ELD-* 现有音色 -> 使用角色(前12) ===")
for v in sorted(eld_chars):
    top = ", ".join(f"{k}({n})" for k, n in eld_chars[v].most_common(12))
    print(f"  {v}: {top}")
