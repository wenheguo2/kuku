"""全库配音性别审核
==================
遍历所有 segments.json，结合 voice_bank_unified.json 中每个 voice_id 的真实性别，
按两类规则找出“性别有问题”的配音并记录到 production/性别审核清单.txt：
  A) 角色名含明显性别词（奶奶/爷爷/王子/公主…），但所用音色性别相反
  B) 同一 (故事, 角色) 下出现了男、女两种人类性别音色（疑似串味）
非人/中性音色（魔法/动物/婴儿/少年等无男女归类）不参与 M<->F 冲突判定，单列观察。

用法: python _gender_audit.py
"""
import json, re
from pathlib import Path
from collections import defaultdict, Counter

BASE = Path(r"d:\work\work\code\testsuit\公司\项目\酷酷儿童故事")
PROD = BASE / "production/generated_stories"
UNIFIED = BASE / "voice_bank/voice_bank_unified.json"
OUT = BASE / "production/性别审核清单.txt"

# ── 音色 gender 推断 ──
def gender_of(cat, cname, label=""):
    s = f"{cat or ''} {cname or ''} {label or ''}".lower()
    if any(k in s for k in ["girl", "female", "woman", "lady", "女"]):
        return "F"
    if any(k in s for k in ["boy", "male", "man", "男"]):
        return "M"
    if (cat or "") == "elder":
        # 老年音按 label 细分性别（慈祥爷爷→男 / 故事婆婆→女），无法判定的归 E(弱)
        ls = label or ""
        if any(w in ls for w in ["爷", "公", "伯", "叔", "父", "翁", "郎", "哥", "弟", "汉", "舅", "夫"]):
            return "M"
        if any(w in ls for w in ["奶", "婆", "娘", "妈", "太", "姐", "姨", "婶", "妹", "姑"]):
            return "F"
        return "E"  # 弱性别（如“睿智长者”），不参与冲突判定
    return "X"  # 其余非人/中性（魔法/动物/婴儿/青少年/群像等）

# 加载统一表（结构: {voices: {vid: {...}}}）
uv = json.load(open(UNIFIED, "r", encoding="utf-8"))
vid_info = {}
for vid, item in uv.get("voices", {}).items():
    vid_info[vid] = {
        "gender": gender_of(item.get("category"), item.get("category_name"), item.get("label")),
        "cat": item.get("category"),
        "cname": item.get("category_name"),
        "label": item.get("label"),
    }

UNK = {"gender": "?", "cat": "未知", "cname": "未知", "label": "未知"}

# ── 角色名性别词库 ──
FEMALE_WORDS = ["夫人","奶奶","外婆","姥姥","阿姨","妈妈","母亲","姐姐","妹妹","姑娘","公主",
               "女王","小姐","大妈","大婶","大娘","婆婆","太太","妻","大姐","婶","姨","妯",
               "女孩","小女孩","小姑娘","女生","女士","大姐大","老奶奶","老太","老妇人",
               "仙女","巫婆","皇后","太后","妃","姐","妹","女侠","女神","女巫","妈咪","娘"]
MALE_WORDS = ["爷爷","外公","姥爷","叔叔","伯伯","爸爸","父亲","哥哥","弟弟","王子","国王",
             "皇帝","老爷","先生","大叔","大伯","公公","夫","少爷","舅","叔","伯","男孩",
             "小男孩","小男子","男生","男士","老大爷","老爷爷","老翁","老丈","男侠","男神",
             "法师","道长","和尚","主持","方丈","侠客","将军","大王","龙王","阎王","妖王"]

def char_gender(name):
    n = name or ""
    for w in FEMALE_WORDS:
        if w in n:
            return "F"
    for w in MALE_WORDS:
        if w in n:
            return "M"
    return None

def norm_char(c):
    return (c or "").replace(" ", "").replace("　", "")

# ── 扫描 ──
# (rel, norm_char) -> {vid: Counter(seg_id)}
role_vids = defaultdict(lambda: defaultdict(Counter))
role_raw = {}  # (rel, norm) -> raw char name
scanned = 0
for segf in PROD.rglob("segments.json"):
    scanned += 1
    try:
        data = json.load(open(segf, "r", encoding="utf-8"))
    except Exception:
        continue
    rel = str(segf.parent.relative_to(PROD))
    for s in data.get("segments", []):
        ch = norm_char(s.get("character"))
        vid = s.get("voice_id", "")
        seg_id = s.get("id", "")
        role_vids[(rel, ch)][vid][seg_id] += 1
        role_raw.setdefault((rel, ch), s.get("character", ""))

# ── 判定 ──
issues_A = []   # 角色名性别 vs 音色性别相反
issues_B = []   # 同角色多种人类性别
issues_X = []   # 人类角色却用了非人/中性音色

for (rel, ch), vmap in role_vids.items():
    raw = role_raw[(rel, ch)]
    expected = char_gender(raw)
    genders_seen = set()
    detail = []
    for vid, cnt in vmap.items():
        g = vid_info.get(vid, UNK)["gender"]
        genders_seen.add(g)
        detail.append((vid, vid_info.get(vid, UNK)["cname"], g, sum(cnt.values())))
    # A: 角色名有性别期望，且出现相反性别人类音色
    if expected in ("F", "M"):
        for vid, cname, g, c in detail:
            if g in ("M", "F") and g != expected:
                issues_A.append((rel, raw, expected, vid, cname, g, c))
    # 人类角色用了非人/中性音色
    if expected in ("F", "M"):
        for vid, cname, g, c in detail:
            if g == "X":
                issues_X.append((rel, raw, expected, vid, cname, c))
    # B: 同一角色出现 M 与 F 两种人类性别
    if "M" in genders_seen and "F" in genders_seen:
        issues_B.append((rel, raw, detail))

# ── 输出 ──
lines = []
lines.append(f"配音性别审核报告（基于 voice_bank_unified.json 性别归类）")
lines.append(f"扫描 segments 文件: {scanned}")
lines.append(f"涉及 (故事,角色) 组合: {len(role_vids)}")
lines.append(f"")
lines.append(f"==============================")
lines.append(f"【A 类】角色名性别 与 所用音色性别相反（明确错误）: 共 {len(issues_A)} 条")
lines.append(f"==============================")
for rel, raw, exp, vid, cname, g, c in sorted(issues_A, key=lambda x: (x[0], x[1])):
    exp_s = "女" if exp == "F" else "男"
    g_s = "女" if g == "F" else "男"
    lines.append(f"  [{rel}] 角色『{raw}』应为{exp_s}，却用 {vid}({cname},{g_s}) ×{c}段")
lines.append(f"")
lines.append(f"==============================")
lines.append(f"【B 类】同一角色出现 男+女 两种人类性别音色（疑似串味）: 共 {len(issues_B)} 处")
lines.append(f"==============================")
for rel, raw, detail in sorted(issues_B, key=lambda x: (x[0], x[1])):
    parts = " / ".join(f"{vid}({cn},{('女' if gg=='F' else '男')})×{cc}" for vid, cn, gg, cc in detail)
    lines.append(f"  [{rel}] 角色『{raw}』: {parts}")
lines.append(f"")
lines.append(f"==============================")
lines.append(f"【X 类】人类角色却用了非人/中性音色(魔法/动物/婴儿/少年等): 共 {len(issues_X)} 条（供参考）")
lines.append(f"==============================")
for rel, raw, exp, vid, cname, c in sorted(issues_X, key=lambda x: (x[0], x[1])):
    exp_s = "女" if exp == "F" else "男"
    lines.append(f"  [{rel}] 角色『{raw}』({exp_s}) 用 {vid}({cname}) ×{c}段")

OUT.write_text("\n".join(lines), encoding="utf-8")
print(f"扫描 {scanned} 文件 | (故事,角色) {len(role_vids)}")
print(f"A类(性别相反): {len(issues_A)} | B类(同角色多性别): {len(issues_B)} | X类(非人音): {len(issues_X)}")
print(f"已写入: {OUT}")
