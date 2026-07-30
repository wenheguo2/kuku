# -*- coding: utf-8 -*-
"""
13_generate_search_index.py — 生成条目级搜索索引（只读扫描镜像索引树）
产出（production/index/generated_stories/）：
  _search_story.json  全库故事条目 {"list": [{"t":标题,"p":path,"s":学科,"c":1有章回}]}（章回作品记作品级，单篇记条目级）
  _search_song.json   全库歌曲条目 {"list": [{"t":展示标题(去语言前缀),"p":path,"s":分类}]}
用途：小程序搜索页支持"大类 + 单条目"两级命中（用户需求 2026-07-29）。
growth 学习搜索用课程索引（lessonCatalog）无需专门索引。
字段名压缩（t/p/s/c）控制体积；万级条目 1~3MB，前端懒加载+内存缓存。
"""
import json
import sys
from datetime import datetime
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent / "production" / "index" / "generated_stories"
SONG_SUBJECT = "瞎编的歌曲"
EXCLUDE_STORY_SUBJECTS = {SONG_SUBJECT, "学科启蒙"}
LANG_PREFIX = ("中文-", "英文-", "双语-", "中文－", "英文－", "双语－")


def load(p: Path):
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return None


def clean_song_title(t: str) -> str:
    for pre in LANG_PREFIX:
        if t.startswith(pre):
            return t[len(pre):].strip()
    return t


def walk_story(dir_path: Path, subject: str, out: list):
    """递归收集故事条目：作品级(章回,有 chapters/总集标记)记 1 条；普通 entries 记单篇。"""
    idx = load(dir_path / "_index.json")
    if not idx:
        return
    # 章回作品（作品级索引带 chapters 或 is_collection）
    if idx.get("chapters") or idx.get("is_collection"):
        title = idx.get("title") or dir_path.name
        rel = dir_path.relative_to(BASE).as_posix()
        out.append({"t": title, "p": rel, "s": subject, "c": 1})
        return  # 章内不再展开（搜作品名进作品页）
    for e in idx.get("entries", []):
        t, p = e.get("title"), e.get("path")
        if t and p:
            out.append({"t": t, "p": p, "s": subject})
    for sub in idx.get("categories", []) or idx.get("sub_categories", []) or []:
        name = sub.get("id") or sub.get("name")
        if name:
            walk_story(dir_path / name, subject, out)
    return


def main():
    g = load(BASE / "_global.json") or {}
    subjects = [s.get("subject_id") or s.get("subject_name") for s in g.get("subjects", [])]

    # ---- 故事 ----
    story: list = []
    for s in subjects:
        if not s or s in EXCLUDE_STORY_SUBJECTS:
            continue
        walk_story(BASE / s, s, story)
    # 去重（path 唯一）
    seen = set()
    story_uniq = []
    for it in story:
        if it["p"] in seen:
            continue
        seen.add(it["p"])
        story_uniq.append(it)

    # ---- 歌曲 ----
    songs: list = []
    root = load(BASE / SONG_SUBJECT / "_index.json") or {}
    for cat in root.get("categories", []):
        cname = cat.get("id") or cat.get("name")
        if not cname:
            continue
        cidx = load(BASE / SONG_SUBJECT / cname / "_index.json") or {}
        subs = cidx.get("sub_categories") or cidx.get("categories") or []
        for sub in subs:
            sname = sub.get("id") or sub.get("name")
            if not sname:
                continue
            sidx = load(BASE / SONG_SUBJECT / cname / sname / "_index.json") or {}
            for e in sidx.get("entries", []):
                t, p = e.get("title"), e.get("path")
                if t and p:
                    songs.append({"t": clean_song_title(t), "p": p, "s": cname})
        # 分类直挂 entries（无语言子类的分类）
        for e in cidx.get("entries", []):
            t, p = e.get("title"), e.get("path")
            if t and p:
                songs.append({"t": clean_song_title(t), "p": p, "s": cname})

    out_story = BASE / "_search_story.json"
    out_song = BASE / "_search_song.json"
    out_story.write_text(json.dumps({"generated_at": datetime.now().isoformat(), "list": story_uniq}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    out_song.write_text(json.dumps({"generated_at": datetime.now().isoformat(), "list": songs}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"[OK] _search_story.json {len(story_uniq)} 条 ({out_story.stat().st_size//1024}KB)")
    print(f"[OK] _search_song.json  {len(songs)} 条 ({out_song.stat().st_size//1024}KB)")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
