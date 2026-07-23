"""
12_generate_home_index.py — 生成首页推荐索引 _home.json（只读扫描 + 写单个 json）
用途：首页推荐是"数据驱动"的，从真实索引生成，供前端轮动展示。

产出 production/index/generated_stories/_home.json：
  - chaptered_works[]  : 全部章回作品（大IP总入口，如 三国演义/三十六计/二十四孝…），点进 story/work
  - standalone_picks[] : 单篇推荐池，仅从「上下五千年」「神州之外」两学科抽取（用户指定），前端轮动/换一换
  - hot[]              : 热点精选（章回大IP + 单篇 混合抽样；后续可换成 events 播放量聚合）

用法：python 脚本/12_generate_home_index.py
"""
import json
import random
import sys
from pathlib import Path

import common

# 单篇推荐来源学科（用户指定）
STANDALONE_SUBJECTS = ["上下五千年", "神州之外"]
STANDALONE_POOL_SIZE = 60   # 单篇池上限（前端每次轮动取窗口）
HOT_SIZE = 10               # 热点数量


def load_json(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def main():
    common.banner("生成首页推荐索引 _home.json (只读扫描)")
    index_root = common.INDEX_DIR

    chaptered_works = []
    standalone_pool = []

    for idx_file in index_root.rglob("_index.json"):
        data = load_json(idx_file)
        if not data:
            continue
        itype = data.get("index_type")

        # 1) 章回作品（work_index）→ 全部收录
        if itype == "work_index" and data.get("structure_type") == "chaptered_work":
            path = data.get("path", "")
            chaptered_works.append({
                "title": data.get("work_name") or path.split("/")[-1],
                "path": path,
                "subject": path.split("/")[0] if path else "",
                "total_chapters": data.get("total_chapters", len(data.get("chapters", []))),
                "cover": (data.get("cover") or {}).get("cover_image_url", ""),
            })
            continue

        # 2) 单篇池：仅「上下五千年」「神州之外」的分类索引里的 standalone 条目
        if itype == "category_index":
            path = data.get("path", "")
            subject = path.split("/")[0] if path else ""
            if subject in STANDALONE_SUBJECTS:
                for e in data.get("entries", []):
                    if e.get("structure_type") == "standalone" or e.get("display_as") == "story_card":
                        standalone_pool.append({
                            "title": e.get("title"),
                            "path": e.get("path"),
                            "subject": subject,
                            "level": e.get("level", ""),
                            "duration_ms": e.get("duration_ms", 0),
                            "cover": (e.get("cover") or {}).get("cover_image_url", ""),
                        })

    # 按名称去重章回作品，稳定排序
    seen = set()
    uniq_works = []
    for w in sorted(chaptered_works, key=lambda x: x["path"]):
        if w["path"] in seen:
            continue
        seen.add(w["path"])
        uniq_works.append(w)

    # 单篇池随机抽样（供前端轮动）
    random.seed(20260722)
    picks = random.sample(standalone_pool, min(STANDALONE_POOL_SIZE, len(standalone_pool))) if standalone_pool else []

    # 热点：章回大IP + 单篇 混合抽样
    hot_src = [{"type": "chaptered", **w} for w in uniq_works] + [{"type": "standalone", **p} for p in picks]
    hot = random.sample(hot_src, min(HOT_SIZE, len(hot_src))) if hot_src else []

    home = {
        "schema_version": "1.0",
        "index_type": "home_index",
        "generated_at": common.datetime.now().isoformat(),
        "chaptered_works": uniq_works,
        "standalone_picks": picks,
        "hot": hot,
        "stats": {
            "chaptered_count": len(uniq_works),
            "standalone_pool": len(picks),
            "hot_count": len(hot),
        },
    }

    out = index_root / "_home.json"
    out.write_text(json.dumps(home, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[OK] 已生成 {out}")
    print(f"  章回作品 {len(uniq_works)} 部 | 单篇池 {len(picks)} 条 | 热点 {len(hot)} 条")
    if not uniq_works:
        print("[WARN] 未扫描到 work_index（章回作品）")
    if not picks:
        print(f"[WARN] 未从 {STANDALONE_SUBJECTS} 抽到单篇（检查这两个学科索引是否存在）")


if __name__ == "__main__":
    main()
