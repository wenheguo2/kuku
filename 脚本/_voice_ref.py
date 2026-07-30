"""参考表：每个缺失音色 -> 使用者角色(判断性别年龄) + 可用替换音色档案"""
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
existing_voices = set()
for f in VOICE_BANK.glob("*.mp3"):
    if base_re.match(f.name):
        existing_voices.add(f.stem)

# 扫描
vid_chars = defaultdict(Counter)          # 缺失音色 -> 角色计数
char_existing = defaultdict(Counter)      # 角色 -> 现有音色计数
vid_prefix_existing = defaultdict(list)   # 同 V-XX 前缀现有音色

for segf in sorted(PROD.rglob("segments.json")):
    try:
        data = json.load(open(segf, "r", encoding="utf-8"))
    except Exception:
        continue
    for s in data.get("segments", []):
        vid = s.get("voice_id", "")
        if not vid:
            continue
        char = s.get("character", "")
        if vid in missing_set:
            vid_chars[vid][char] += 1
        else:
            char_existing[char][vid] += 1

# 同前缀现有音色
for v in sorted(existing_voices):
    pre = "-".join(v.split("-")[:2])
    vid_prefix_existing[pre].append(v)

out = []
for vid in MISSING:
    chars = vid_chars.get(vid, Counter())
    pre = "-".join(vid.split("-")[:2])
    out.append(f"\n{'='*60}")
    out.append(f"缺失 {vid}  |  引用 {sum(chars.values())} 段  | 前缀 {pre}")
    out.append(f"  -- 使用者角色(前20, 判性别年龄) --")
    for c, n in chars.most_common(20):
        out.append(f"     {c} ({n})")
    # 同角色现有音色
    out.append(f"  -- 同角色目前在用的现有音色 --")
    same_char = Counter()
    for c, _ in chars.most_common():
        for ev, cnt in char_existing[c].most_common():
            same_char[ev] += cnt
    if same_char:
        for ev, n in same_char.most_common(6):
            out.append(f"     {ev}  (这些角色共用 {n} 次)")
    else:
        out.append(f"     (无：这些角色从未用过任何现有音色)")
    # 同前缀现有音色
    pe = vid_prefix_existing.get(pre, [])
    out.append(f"  -- 同前缀 {pre}-* 现有音色({len(pe)}) --")
    out.append(f"     {pe}")
    # 这些同前缀音色的角色档案(前3个各列前3角色)
    for ev in pe[:6]:
        ce = Counter()
        for c, cc in char_existing.items():
            if ev in cc:
                ce[c] += cc[ev]
        top = ", ".join(f"{c}" for c, _ in ce.most_common(4)) or "(无使用记录)"
        out.append(f"     {ev}: {top}")

print("\n".join(out))
