# -*- coding: utf-8 -*-
"""
gen_song_overrides.py
从 11_song_covers.log 提取最后一批失败的歌曲，为它们生成"干净安全"的通用封面提示词，
写入 song_prompt_overrides.json（键=歌曲相对路径, 值=新提示词）。
原因：这些歌多为历史人物/政治事件/战争题材，原提示词触发即梦内容审核拒出，
或标题含特殊字符(’)导致提交失败。新提示词不嵌入敏感主体、不含特殊字符。
"""
import json, re
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
LOG = SCRIPT_DIR / "logs" / "11_song_covers.log"
OUT = SCRIPT_DIR / "song_prompt_overrides.json"

STYLE = ("childrens book illustration style, warm pastel palette, thick outlines 5px, "
         "flat colors with simple shadow, chibi proportions 1:2, big shiny eyes, "
         "soft rounded shapes, preschool-friendly")
NEG = "no photorealistic, no 3D, no photograph, no realistic texture, no text, no watermark, no logo"

# 通用安全模板（英文，避免任何敏感主体与特殊字符）
KID_TEMPLATES = [
    "a cheerful children's song album cover: a little boy and a little girl singing happily surrounded by rainbow musical notes and stars, warm pastel",
    "a whimsical children's song cover: cute kids dancing in a sunny storybook forest with glowing fireflies and floating notes, soft bright",
    "a dreamy children's song cover: children riding a moon boat through a starry night sky with musical notes and clouds, gentle gradient",
    "a lively children's song cover: kids having a music party with little drums and bells, colorful ribbons and bubbles, joyful warm",
    "a gentle children's song cover: children holding hands in a spring meadow with butterflies and notes, fresh soft palette",
]
# 纯音乐：抽象音乐感，不强调小孩
ABSTRACT_TEMPLATE = ("an abstract playful children's music cover: flowing colorful sound waves, "
                     "glowing musical notes and soft particles, dreamy gradient, preschool-friendly")

# 提取最后 36 条 FAIL 的歌曲相对路径
lines = LOG.read_text(encoding="utf-8", errors="ignore").splitlines()
fail_lines = [l for l in lines if "[FAIL " in l]
last36 = fail_lines[-36:]
pat = re.compile(r"^\[.*?\]\s*\[FAIL \d+/\d+\]\s*(.+)$")
rels = []
for l in last36:
    m = pat.match(l)
    if m:
        rels.append(m.group(1).strip())

overrides = {}
for i, rel in enumerate(rels):
    cat = rel.split("\\")[0] if "\\" in rel else rel.split("/")[0]
    if cat == "纯音乐":
        theme = ABSTRACT_TEMPLATE
    else:
        theme = KID_TEMPLATES[i % len(KID_TEMPLATES)]
    overrides[rel] = f"{theme}, {STYLE}. {NEG}"

OUT.write_text(json.dumps(overrides, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"已生成覆盖提示词: {OUT.name}")
print(f"数量: {len(overrides)}")
for r in rels:
    print(f"  - {r}")
