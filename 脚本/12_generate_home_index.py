"""
12_generate_home_index.py — 生成首页推荐索引 _home.json（只读扫描 + 写单个 json）
用途：首页推荐是"数据驱动"的，从真实索引生成，供前端轮动展示。

产出 production/index/generated_stories/_home.json：
  - chaptered_works[]  : 全部章回作品（大IP总入口，如 三国演义/三十六计/二十四孝…），点进 story/work
  - standalone_picks[] : 单篇推荐池，仅从「上下五千年」「神州之外」两学科抽取（用户指定），前端轮动/换一换
  - hot[]              : 热点精选——大IP白名单打头（用户定：今日推荐要搞大IP 白蛇/宝莲灯/白雪公主/爱丽丝等，
                         按日期轮换 hero=hot[0]）+ 随机补足；后续可换成 events 播放量聚合

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

# 大IP精选白名单（2026-07-29 用户定：今日推荐搞几个大IP的厉害故事）：
# 匹配规则：先找章回作品名==关键词，再找单篇 path 末段==关键词（正主），最后取含关键词标题最短的条目（衍生变体）
FEATURED_IP_KEYWORDS = [
    "白蛇传", "宝莲灯", "哪吒", "花木兰", "西游记", "封神演义", "三国演义", "水浒传",
    "白雪公主", "爱丽丝梦游仙境", "灰姑娘", "小红帽", "阿拉丁与神灯", "木偶奇遇记", "彼得潘", "绿野仙踪",
]
# 大IP白名单只从故事学科选（歌曲/教学不入今日推荐）
FEATURED_EXCLUDE_SUBJECTS = {"瞎编的歌曲", "学科启蒙"}


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
    all_entries = []  # 全库单篇池（含双界之门等，供大IP白名单匹配）

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
            for e in data.get("entries", []):
                if e.get("structure_type") == "standalone" or e.get("display_as") == "story_card":
                    item = {
                        "title": e.get("title"),
                        "path": e.get("path"),
                        "subject": subject,
                        "level": e.get("level", ""),
                        "duration_ms": e.get("duration_ms", 0),
                        "cover": (e.get("cover") or {}).get("cover_image_url", ""),
                    }
                    all_entries.append(item)
                    if subject in STANDALONE_SUBJECTS:
                        standalone_pool.append(item)

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

    # 大IP精选：按白名单逐关键词选最佳条目（章回正主 > 单篇正主 > 标题最短衍生）；排除歌曲/教学学科
    ip_pool = [e for e in all_entries if e.get("subject") not in FEATURED_EXCLUDE_SUBJECTS]

    def pick_featured(kw):
        for w in uniq_works:
            if w["title"] == kw or w["path"].split("/")[-1] == kw:
                return {"type": "chaptered", **w}
        exact = [e for e in ip_pool if e.get("path", "").split("/")[-1] == kw]
        if exact:
            return {"type": "standalone", **exact[0]}
        fuzzy = [e for e in ip_pool if kw in (e.get("title") or "")]
        if fuzzy:
            best = sorted(fuzzy, key=lambda e: len(e.get("title") or ""))[0]
            return {"type": "standalone", **best}
        return None

    featured = []
    featured_paths = set()
    for kw in FEATURED_IP_KEYWORDS:
        item = pick_featured(kw)
        if item and item["path"] not in featured_paths:
            featured_paths.add(item["path"])
            featured.append(item)

    # 按日期轮换大IP打头（hero=hot[0] 即“今日推荐”，每天换一个IP）
    if featured:
        shift = common.datetime.now().toordinal() % len(featured)
        featured = featured[shift:] + featured[:shift]

    # 热点：大IP精选打头 + 随机补足到 HOT_SIZE
    hot_src = [{"type": "chaptered", **w} for w in uniq_works] + [{"type": "standalone", **p} for p in picks]
    hot_src = [h for h in hot_src if h["path"] not in featured_paths]
    filler = random.sample(hot_src, min(max(HOT_SIZE - len(featured), 0), len(hot_src))) if hot_src else []
    hot = (featured + filler)[:max(HOT_SIZE, len(featured))]

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
    print(f"  章回作品 {len(uniq_works)} 部 | 单篇池 {len(picks)} 条 | 热点 {len(hot)} 条 | 大IP精选 {len(featured)} 条")
    for f in featured[:5]:
        print(f"  ★ IP: {f['title']} ({f['type']}) <- {f['path']}")
    if not uniq_works:
        print("[WARN] 未扫描到 work_index（章回作品）")
    if not picks:
        print(f"[WARN] 未从 {STANDALONE_SUBJECTS} 抽到单篇（检查这两个学科索引是否存在）")


if __name__ == "__main__":
    main()
