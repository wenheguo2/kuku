"""从 voice_bank_unified.json 生成可用音色池（samples/ 里也要有文件），按性别年龄分类"""
import json, re, sys
from pathlib import Path

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

BASE = Path(r"d:\work\work\code\testsuit\公司\项目\酷酷儿童故事")
VB = BASE / "voice_bank"
uj = json.load(open(VB / "voice_bank_unified.json", "r", encoding="utf-8"))
SAMPLES = VB / "samples"

base_re = re.compile(r"^V-[A-Z]+-\d+\.mp3$")
present = set(f.stem for f in SAMPLES.glob("*.mp3") if base_re.match(f.name))

# 人类/可扮演角色类别（排除情绪变体）
HUMAN = {"infant","young_boy","young_girl","child_boy","child_girl","teen",
         "adult_male","adult_female","elder","magic","animal","robot","dialect",
         "fantasy2","animal2","object","style","bilingual","vehicle","plant",
         "food","toy","weather","building","exaggerated"}

cat_pool = {}
for vid, info in uj["voices"].items():
    cat = info.get("category")
    if cat in ("emotion","emotion2"):
        continue
    if vid not in present:
        continue
    cat_pool.setdefault(cat, []).append((vid, info.get("label",""), info.get("category_name","")))

for cat in ["infant","young_boy","young_girl","child_boy","child_girl","teen",
            "adult_male","adult_female","elder","magic","animal","fantasy2","animal2",
            "robot","dialect","object","style","bilingual","vehicle","plant","food",
            "toy","weather","building","exaggerated"]:
    vlist = cat_pool.get(cat, [])
    if not vlist:
        continue
    print(f"\n[{cat}] ({len(vlist)})")
    for vid, label, cname in vlist:
        print(f"   {vid}  {label}")
