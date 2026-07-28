import json
from pathlib import Path
from collections import defaultdict

BASE = Path(r"d:\work\work\code\testsuit\公司\项目\酷酷儿童故事")
PROD = BASE / "production/generated_stories"
VB = BASE / "voice_bank/samples"
OUT = BASE / "问题音色影响清单.txt"

# 1) 计算有问题的 voice_id：库里没有精确基础文件 {vid}.mp3
def exact_ok(vid):
    return (VB / f"{vid}.mp3").exists()

problem_vids = set()
for p in VB.glob("*.mp3"):
    pass  # 仅用于确认目录存在
# 收集所有被引用的 voice_id 并判缺
ref_vids = set()
for segf in PROD.rglob("segments.json"):
    try:
        data = json.load(open(segf, encoding="utf-8"))
    except Exception:
        continue
    for s in data.get("segments", []):
        vid = s.get("voice_id", "")
        if vid:
            ref_vids.add(vid)
problem_vids = {v for v in ref_vids if not exact_ok(v)}

# 2) 扫描受影响段落，按故事分组
by_story = defaultdict(list)   # rel_story_dir -> list of dict
per_vid = defaultdict(int)
total_seg = 0
for segf in PROD.rglob("segments.json"):
    rel = str(segf.parent.relative_to(PROD))
    try:
        data = json.load(open(segf, encoding="utf-8"))
    except Exception:
        continue
    for s in data.get("segments", []):
        vid = s.get("voice_id", "")
        if vid in problem_vids:
            seg_id = s.get("id", "")
            char = s.get("character", "")
            text = s.get("text", "").strip()
            by_story[rel].append({
                "vid": vid, "seg_id": seg_id, "char": char,
                "text": text[:30],
            })
            per_vid[vid] += 1
            total_seg += 1

# 3) 写文件
lines = []
lines.append("【问题音色影响清单】")
lines.append(f"生成时间: {__import__('datetime').datetime.now():%Y-%m-%d %H:%M:%S}")
lines.append(f"问题 voice_id 种类: {len(problem_vids)}")
lines.append(f"受影响段落总数(mp3条数): {total_seg}")
lines.append(f"受影响故事数: {len(by_story)}")
lines.append("")
lines.append("=== 问题 voice_id 及引用次数 ===")
for v, c in sorted(per_vid.items(), key=lambda x: -x[1]):
    lines.append(f"  {v}: {c} 段")
lines.append("")
lines.append("=== 按故事分组（mp3编号 = seg_id，对应 {seg_id}.mp3）===")
for story in sorted(by_story.keys()):
    segs = by_story[story]
    lines.append(f"\n[故事] {story}  （{len(segs)} 段）")
    for it in segs:
        lines.append(f"    voice={it['vid']}  mp3={it['seg_id']}.mp3  角色={it['char']}  文本={it['text']}")

OUT.write_text("\n".join(lines), encoding="utf-8")

print("已写入:", OUT)
print("问题 voice_id 种类:", len(problem_vids))
print("受影响段落总数:", total_seg)
print("受影响故事数:", len(by_story))
