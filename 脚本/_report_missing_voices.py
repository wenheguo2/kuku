"""报告：缺失基础文件的音色 涉及哪些故事 / 角色，并给出替换建议"""
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

# 1) 库里真实存在的基础音色（精确 V-XX-NN.mp3，无情绪后缀）
base_re = re.compile(r"^V-[A-Z]+-\d+\.mp3$")
existing_voices = set()
for f in VOICE_BANK.glob("*.mp3"):
    if base_re.match(f.name):
        existing_voices.add(f.stem)
print(f"库中存在基础音色: {len(existing_voices)} 个")

# 2) 扫描所有 segments.json
# vid -> story set, vid -> char Counter, vid -> count
vid_stories = defaultdict(set)
vid_chars = defaultdict(Counter)
vid_count = Counter()
# char -> {voice_id: count}（仅统计存在的音色，用于给建议）
char_existing_voices = defaultdict(Counter)

files = sorted(PROD.rglob("segments.json"))
total_files = len(files)
for fi, segf in enumerate(files, 1):
    rel = str(segf.parent.relative_to(PROD))
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
            vid_stories[vid].add(rel)
            vid_chars[vid][char] += 1
            vid_count[vid] += 1
        else:
            # 记录“存在的音色”被哪些角色使用
            char_existing_voices[char][vid] += 1

# 3) 生成替换建议
def suggest(vid):
    chars = vid_chars[vid]
    # 优先：这些角色在其它地方使用的、存在的音色
    cand = Counter()
    for c, _ in chars.most_common():
        for ev, cnt in char_existing_voices[c].most_common():
            cand[ev] += cnt
    if cand:
        primary = cand.most_common(1)[0][0]
        return primary, "同角色在用音色", cand.most_common(3)
    # 回退：同前缀(V-XX)存在的音色
    parts = vid.split("-")
    prefix = "-".join(parts[:2]) if len(parts) >= 2 else parts[0]
    prefix_existing = sorted([v for v in existing_voices if v.startswith(prefix + "-")])
    if prefix_existing:
        return prefix_existing[0], "同前缀最近音色(回退)", prefix_existing[:3]
    return "(无可用)", "无建议", []

# 4) 输出
lines = []
lines.append("=" * 70)
lines.append("缺失基础音色影响报告")
lines.append("=" * 70)
lines.append(f"缺失音色数: {len(MISSING)} | 总受影响段数: {sum(vid_count.values())}")
lines.append("")

# 按缺失音色逐个
for vid in MISSING:
    stories = sorted(vid_stories.get(vid, []))
    chars = vid_chars.get(vid, Counter())
    cnt = vid_count.get(vid, 0)
    rec, reason, top = suggest(vid)
    lines.append(f"【{vid}】  引用 {cnt} 段 | 涉及 {len(stories)} 个故事")
    lines.append(f"  角色: " + ", ".join(f"{c}({n})" for c, n in chars.most_common()))
    lines.append(f"  建议替换 → {rec}  [依据: {reason}]"
                 + (f"  候选: {top}" if top else ""))
    if stories:
        lines.append(f"  故事清单({len(stories)}):")
        for st in stories:
            lines.append(f"    - {st}")
    lines.append("")

# 涉及故事聚合（去重）
all_stories = set()
for vid in MISSING:
    all_stories.update(vid_stories.get(vid, set()))
lines.append("=" * 70)
lines.append(f"受影响故事总数（去重）: {len(all_stories)}")
lines.append("=" * 70)
for st in sorted(all_stories):
    affected = [v for v in MISSING if st in vid_stories.get(v, set())]
    lines.append(f"  {st}   <- 缺失音色: {', '.join(affected)}")

report = "\n".join(lines)
print(report)

out = BASE / "production" / "缺失音色影响清单.txt"
out.write_text(report, encoding="utf-8")
print(f"\n✅ 清单已写入: {out}")
