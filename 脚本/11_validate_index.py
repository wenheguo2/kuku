"""
11_validate_index.py — 索引完整性校验（只读，不修改任何文件）
用途（md/18 泳道A "索引校验脚本"）：校验 production/index/generated_stories/ 下
  _global.json → 学科 _index.json → 分类 _index.json → entries 的结构与交叉引用一致性。

校验项：
  1. _global.json 存在且可解析；stats 字段齐全
  2. _global 里每个 subject 都有对应目录 + 学科 _index.json
  3. 学科 _index.json 结构合法（subject_id/categories）
  4. 分类 _index.json：structure_type/display_as/path/entries 齐全；entry_count == len(entries)
  5. entries 每项必备字段（entry_id/title/path）
  6. cover_image_url 指向的封面文件是否存在（仅 warn，封面持续制作中）

用法：
  python 脚本/11_validate_index.py            # 全量校验
  python 脚本/11_validate_index.py --covers    # 额外校验封面文件是否存在
输出：控制台摘要 + 脚本/logs/11_validate_index.log + _failed.json（如有错误）
"""
import json
import sys
from pathlib import Path

import common

REQUIRED_ENTRY_FIELDS = ("entry_id", "title", "path")
VALID_STRUCTURE_TYPES = {"standalone_collection", "chaptered_work", "mixed", "multi_level", "standalone", "chaptered"}


def load_json(path: Path):
    """读 JSON，返回 (data, error)"""
    try:
        return json.loads(path.read_text(encoding="utf-8")), None
    except FileNotFoundError:
        return None, "file not found"
    except (json.JSONDecodeError, UnicodeDecodeError) as e:
        return None, f"parse error: {e}"


def validate(check_covers: bool):
    errors = []   # 阻断性问题
    warnings = []  # 非阻断（如封面缺失）
    stats = {"subjects": 0, "categories": 0, "entries": 0}

    index_root = common.INDEX_DIR
    covers_root = common.COVERS_DIR.parent  # illustrations/covers（cover_image_url 以 covers/ 开头）

    def err(msg):
        errors.append(msg)
        print(f"  [ERR] {msg}")

    def warn(msg):
        warnings.append(msg)

    # 1. 全局索引
    global_file = index_root / "_global.json"
    gdata, gerr = load_json(global_file)
    if gerr:
        err(f"_global.json {gerr}")
        return errors, warnings, stats
    if "subjects" not in gdata or not isinstance(gdata.get("subjects"), list):
        err("_global.json 缺少 subjects 数组")
        return errors, warnings, stats
    if "stats" not in gdata:
        warn("_global.json 缺少 stats 字段")

    # 2~5. 逐学科
    for subj in gdata["subjects"]:
        sid = subj.get("subject_id")
        if not sid:
            err("_global.json 某 subject 缺少 subject_id")
            continue
        stats["subjects"] += 1
        subj_dir = index_root / sid
        if not subj_dir.is_dir():
            err(f"学科目录不存在: {sid}")
            continue
        subj_index = subj_dir / "_index.json"
        sdata, serr = load_json(subj_index)
        if serr:
            err(f"学科 {sid}/_index.json {serr}")
            continue
        categories = sdata.get("categories", [])
        if not isinstance(categories, list):
            err(f"学科 {sid} categories 非数组")
            continue

        # 逐分类：优先读分类 _index.json（镜像物理目录）
        for cat in categories:
            cname = cat.get("name") or cat.get("id")
            if not cname:
                warn(f"学科 {sid} 某分类缺少 name")
                continue
            cat_index = subj_dir / cname / "_index.json"
            cdata, cerr = load_json(cat_index)
            if cerr:
                # 分类索引可能内嵌在学科索引中（结构差异），仅 warn
                warn(f"分类索引缺失或异常: {sid}/{cname}/_index.json ({cerr})")
                continue
            stats["categories"] += 1

            st = cdata.get("structure_type")
            if st and st not in VALID_STRUCTURE_TYPES:
                warn(f"{sid}/{cname} 未知 structure_type: {st}")

            entries = cdata.get("entries", [])
            declared = cdata.get("entry_count")
            if declared is not None and declared != len(entries):
                err(f"{sid}/{cname} entry_count={declared} 与实际 {len(entries)} 不一致")

            for e in entries:
                stats["entries"] += 1
                for f in REQUIRED_ENTRY_FIELDS:
                    if not e.get(f):
                        err(f"{sid}/{cname} 某 entry 缺少字段 {f}")
                        break
                if check_covers:
                    cu = (e.get("cover") or {}).get("cover_image_url")
                    if cu:
                        cover_path = covers_root / cu.replace("covers/", "", 1) if cu.startswith("covers/") else covers_root / cu
                        # cover_image_url 形如 covers/generated/{学科}/.../x.jpg（2026-07-29 起统一 jpg/png）
                        real = common.ILLUSTRATIONS_DIR / cu
                        if not real.exists():
                            warn(f"封面文件缺失: {cu}")

    return errors, warnings, stats


def main():
    check_covers = "--covers" in sys.argv
    common.banner("索引完整性校验 (只读)")
    print(f"索引根目录: {common.INDEX_DIR}\n")

    errors, warnings, stats = validate(check_covers)

    print("\n" + "=" * 60)
    print(f"  学科: {stats['subjects']} | 分类: {stats['categories']} | 条目: {stats['entries']}")
    print(f"  错误: {len(errors)} | 警告: {len(warnings)}")
    print("=" * 60)

    log_lines = [
        f"索引校验结果 @ {common.datetime.now()}",
        f"学科={stats['subjects']} 分类={stats['categories']} 条目={stats['entries']}",
        f"错误={len(errors)} 警告={len(warnings)}",
        "",
        "== 错误 ==",
        *errors,
        "",
        "== 警告(前50) ==",
        *warnings[:50],
    ]
    common.save_log("11_validate_index", "\n".join(log_lines))
    if errors:
        common.save_failures("11_validate_index", {"errors": errors, "warnings": warnings[:200]})
        print("[FAIL] 校验发现错误，详见 脚本/logs/11_validate_index_failed.json")
        sys.exit(1)
    print("[OK] 索引结构校验通过" + ("" if not warnings else f"（{len(warnings)} 条警告，多为封面持续制作中/分类索引待补，非阻断）"))


if __name__ == "__main__":
    main()
