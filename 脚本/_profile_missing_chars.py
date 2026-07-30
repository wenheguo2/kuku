"""逐个分析 27 个缺失音色：到底用在哪些角色(判性别年龄) + 同角色在别处用的正确现有音色"""
import json, re, sys
from pathlib import Path
from collections import defaultdict, Counter

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

BASE = Path(r"d:\work\work\code\testsuit\公司\项目\酷酷儿童故事")
PROD = BASE / "production/generated_stories"
VOICE_BANK = BASE / "voice_bank" / "samples"

MISSING = ["V-CG-01","V-DFT-01","V-CG-07","V-CG-16","V-ELD-07","V-ELD-12",
           "V-ADW-15","V-ADM-18","V-ADW-16","V-MAG-04","V-TN-13","V-MAG-11",
           "V-ADM-17","V-MAG-13","V-ADM-20","V-ADM-00","V-ADM-38","V-ADW-00",
           "V-ADW-18","V-TB-03","V-ELD-11","V-CB-15","V-ELD-00","V-CG-00",
           "V-ELD-13","V-CB-16","V-GRP-01"]
missing_set = set(MISSING)

base_re = re.compile(r"^V-[A-Z]+-\d+\.mp3$")
existing = set(f.stem for f in VOICE_BANK.glob("*.mp3") if base_re.match(f.name))

# 扫描
vid_chars = defaultdict(Counter)      # 缺失音色 -> 角色
char_existing = defaultdict(Counter)  # 角色 -> 现有音色
for segf in PROD.rglob("segments.json"):
    try:
        data = json.load(open(segf, "r", encoding="utf-8"))
    except Exception:
        continue
    for s in data.get("segments", []):
        vid = s.get("voice_id", "")
        if not vid: continue
        c = s.get("character", "")
        if vid in missing_set:
            vid_chars[vid][c] += 1
        else:
            char_existing[c][vid] += 1

print(f"现有基础音色: {len(existing)}\n")
for vid in MISSING:
    chars = vid_chars.get(vid, Counter())
    total = sum(chars.values())
    line = f"\n{'='*64}\n【{vid}】 共 {total} 段 | 涉及角色 {len(chars)} 个"
    print(line)
    print("  角色(前25):")
    for c, n in chars.most_common(25):
        print(f"     {c} ×{n}")
    # 同角色现有音色
    same = Counter()
    for c, _ in chars.most_common():
        for ev, cnt in char_existing[c].most_common():
            same[ev] += cnt
    print("  同角色在别处用的现有音色(候选):")
    if same:
        for ev, n in same.most_common(8):
            print(f"     → {ev}  (这些角色共用 {n} 次)")
    else:
        print("     (无：这些角色全库从未用过任何现有音色)")
