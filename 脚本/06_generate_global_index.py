"""
脚本6：全局索引生成
====================
功能：扫描 production/index/generated_stories/ 下各学科的 _index.json，
      汇总生成 _global.json 全局索引文件
运行机器：本机
前置条件：所有 segments.json 就绪（建议内容全部完成后执行）

使用方式：
  python 06_generate_global_index.py              # 生成全局索引
  python 06_generate_global_index.py --dry-run    # 只扫描统计
"""
import os
import sys
import json
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent))
from common import INDEX_DIR, banner


def scan_subjects():
    """扫描所有学科索引"""
    subjects = []
    if not INDEX_DIR.exists():
        print(f"[ERROR] 索引目录不存在: {INDEX_DIR}")
        return subjects

    for subj_dir in sorted(INDEX_DIR.iterdir()):
        if not subj_dir.is_dir():
            continue
        index_file = subj_dir / "_index.json"
        if not index_file.exists():
            continue

        try:
            index_data = json.loads(index_file.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError) as e:
            print(f"  [WARN] 解析失败: {index_file} - {e}")
            continue

        # 统计该学科下的分类数
        categories = index_data.get("categories", [])
        cat_count = len(categories)

        # 统计该学科下的故事/课程数
        total_items = 0
        for cat in categories:
            cat_file = subj_dir / f"{cat.get('id', cat.get('name', '')}.json"
            if cat_file.exists():
                try:
                    cat_data = json.loads(cat_file.read_text(encoding="utf-8"))
                    if isinstance(cat_data, list):
                        total_items += len(cat_data)
                    elif isinstance(cat_data, dict):
                        items = cat_data.get("items", cat_data.get("stories", []))
                        total_items += len(items) if isinstance(items, list) else 0
                except Exception:
                    pass

        subjects.append({
            "id": subj_dir.name,
            "name": index_data.get("name", subj_dir.name),
            "type": index_data.get("type", "story"),
            "category_count": cat_count,
            "item_count": total_items,
            "cover": index_data.get("cover", ""),
            "description": index_data.get("description", "")
        })

    return subjects


def scan_songs():
    """扫描歌曲分类"""
    sys.path.insert(0, str(Path(__file__).parent))
    from common import SONG_ROOT
    if not SONG_ROOT.exists():
        return {"total_mp3": 0, "total_txt": 0, "categories": []}

    categories = []
    total_mp3 = 0
    total_txt = 0

    for cat_dir in sorted(SONG_ROOT.iterdir()):
        if not cat_dir.is_dir():
            continue
        cat_mp3 = 0
        cat_txt = 0
        for root, dirs, files in os.walk(cat_dir):
            for f in files:
                if f.endswith(".mp3"):
                    cat_mp3 += 1
                    total_mp3 += 1
                elif f.endswith(".txt"):
                    cat_txt += 1
                    total_txt += 1
        categories.append({
            "name": cat_dir.name,
            "mp3_count": cat_mp3,
            "txt_count": cat_txt
        })

    return {"total_mp3": total_mp3, "total_txt": total_txt, "categories": categories}


def scan_lessons():
    """扫描教学课程"""
    sys.path.insert(0, str(Path(__file__).parent))
    from common import TEACHING_CONTENT_ROOT
    if not TEACHING_CONTENT_ROOT.exists():
        return {"total_courses": 0, "subjects": []}

    subjects = []
    total_courses = 0

    for subj_dir in sorted(TEACHING_CONTENT_ROOT.iterdir()):
        if not subj_dir.is_dir():
            continue
        course_count = 0
        for course_dir in subj_dir.iterdir():
            if course_dir.is_dir():
                course_count += 1
                total_courses += 1
        subjects.append({
            "name": subj_dir.name,
            "course_count": course_count
        })

    return {"total_courses": total_courses, "subjects": subjects}


def main():
    import argparse
    parser = argparse.ArgumentParser(description="全局索引生成")
    parser.add_argument("--dry-run", action="store_true",
                        help="扫描模式：只统计不生成")
    args = parser.parse_args()

    banner("脚本6: 全局索引生成")

    print("扫描学科索引...")
    subjects = scan_subjects()
    print(f"  找到 {len(subjects)} 个学科")

    print("扫描歌曲...")
    songs_info = scan_songs()
    print(f"  MP3: {songs_info['total_mp3']}, TXT: {songs_info['total_txt']}, "
          f"分类: {len(songs_info['categories'])}")

    print("扫描教学课程...")
    lessons_info = scan_lessons()
    print(f"  课程总数: {lessons_info['total_courses']}, "
          f"学科: {len(lessons_info['subjects'])}")

    if args.dry_run:
        print("\n[DRY-RUN] 学科列表:")
        for s in subjects:
            print(f"  {s['id']}: {s['name']} (type={s['type']}, "
                  f"分类={s['category_count']}, 条目={s['item_count']})")
        print("\n[DRY-RUN] 歌曲分类:")
        for c in songs_info["categories"]:
            print(f"  {c['name']}: MP3={c['mp3_count']}, TXT={c['txt_count']}")
        print("\n[DRY-RUN] 教学学科:")
        for s in lessons_info["subjects"]:
            print(f"  {s['name']}: {s['course_count']}课程")
        return

    # 生成全局索引
    global_index = {
        "schema_version": "1.1",
        "content_version": datetime.now().strftime("%Y-%m-%d"),
        "generated_at": datetime.now().isoformat(),
        "subjects": [
            {
                "id": s["id"],
                "name": s["name"],
                "type": s["type"],
                "categories": s.get("cover", ""),
                "description": s["description"]
            }
            for s in subjects
        ],
        "stats": {
            "total_subjects": len(subjects),
            "total_story_items": sum(s["item_count"] for s in subjects if s["type"] == "story"),
            "total_songs": songs_info["total_mp3"],
            "total_song_lyrics": songs_info["total_txt"],
            "total_lessons": lessons_info["total_courses"],
            "song_categories": songs_info["categories"],
            "lesson_subjects": lessons_info["subjects"]
        }
    }

    output_file = INDEX_DIR / "_global.json"
    INDEX_DIR.mkdir(parents=True, exist_ok=True)
    output_file.write_text(
        json.dumps(global_index, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

    print(f"\n全局索引已生成: {output_file}")
    print(f"  学科数: {len(subjects)}")
    print(f"  故事条目: {global_index['stats']['total_story_items']}")
    print(f"  歌曲MP3: {global_index['stats']['total_songs']}")
    print(f"  教学课程: {global_index['stats']['total_lessons']}")


if __name__ == "__main__":
    main()
