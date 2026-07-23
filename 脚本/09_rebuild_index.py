# -*- coding: utf-8 -*-
"""
09_rebuild_index.py - 重建 generated_stories 全量索引
严格镜像 generated_stories 物理目录层级，每个容器目录生成 _index.json
封面引用 covers/generated 下的 .webp（无则回退父级）

用法: Python312\\python.exe 项目/酷酷儿童故事/脚本/09_rebuild_index.py
输出: production/index/generated_stories/（先清空旧索引再写入）
"""
import json
import os
import re
import shutil
import sys
from pathlib import Path
from datetime import datetime

# === 路径配置 ===
BASE_DIR = Path(__file__).resolve().parent.parent / "production"  # 项目/酷酷儿童故事/production/
STORIES_DIR = BASE_DIR / "generated_stories"
COVERS_DIR = BASE_DIR / "illustrations" / "covers" / "generated"
INDEX_DIR = BASE_DIR / "index" / "generated_stories"

# 忽略的目录/文件前缀
IGNORE_PREFIXES = ('_', '.')


def should_ignore(name: str) -> bool:
    return any(name.startswith(p) for p in IGNORE_PREFIXES)


def safe_read_json(path: Path) -> dict | None:
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return None


def resolve_cover(rel_path: str, name: str = None) -> str | None:
    """
    解析封面路径，沿目录链向上回退。
    rel_path: 相对于 generated_stories 的目录路径 (如 "上下五千年/E1成语故事")
    name: 条目名 (如 "一丘之貉")，用于查找故事级封面
    """
    # 1. 故事/条目级: covers/generated/{rel_path}/{name}/{name}.webp
    if name:
        p = COVERS_DIR / rel_path / name / f"{name}.webp"
        if p.exists():
            return f"covers/generated/{rel_path}/{name}/{name}.webp"

    # 2. 当前目录级: covers/generated/{rel_path}/{dirname}.webp
    parts = rel_path.replace('\\', '/').split('/')
    dir_name = parts[-1] if parts else ''
    if dir_name:
        p = COVERS_DIR / rel_path / f"{dir_name}.webp"
        if p.exists():
            return f"covers/generated/{rel_path}/{dir_name}.webp"

    # 3. 逐级向上回退
    for i in range(len(parts) - 1, 0, -1):
        parent_rel = '/'.join(parts[:i])
        parent_name = parts[i - 1]
        p = COVERS_DIR / parent_rel / f"{parent_name}.webp"
        if p.exists():
            return f"covers/generated/{parent_rel}/{parent_name}.webp"

    return None


def is_chaptered_dir(dir_path: Path) -> bool:
    """判断目录是否为章回作品（子目录为章节）"""
    children = sorted([d for d in dir_path.iterdir()
                       if d.is_dir() and not should_ignore(d.name)])
    if not children:
        return False

    # 检查1: 子目录名以"第"开头
    di_count = sum(1 for c in children if c.name.startswith('第'))
    if di_count > len(children) * 0.5:
        return True

    # 检查2: 采样第一个子目录的 JSON
    sample = children[0]
    json_files = [f for f in sample.iterdir()
                  if f.is_file() and f.suffix == '.json' and f.name != 'segments.json']
    if json_files:
        data = safe_read_json(json_files[0])
        if data:
            if 'unit_number' in data:
                return True
            title = data.get('title', '')
            if re.match(r'第\d+', title):
                return True

    # 检查3: 子目录名含编号模式 (如 三字经001-001_第1段_xxx)
    numbered = sum(1 for c in children if re.search(r'\d{2,}', c.name))
    if numbered > len(children) * 0.8 and len(children) > 3:
        # 进一步验证: 子目录内有 segments.json
        if (sample / 'segments.json').exists():
            return True

    return False


def is_lesson_dir(dir_path: Path) -> bool:
    """判断是否为学科启蒙课时目录（含学习N或习题子目录）"""
    children_names = [d.name for d in dir_path.iterdir()
                      if d.is_dir() and not should_ignore(d.name)]
    has_learning = any(n.startswith('学习') for n in children_names)
    has_exercise = any(n == '习题' for n in children_names)
    return has_learning or has_exercise


def get_story_metadata(dir_path: Path) -> dict:
    """从故事目录提取元数据"""
    name = dir_path.name
    # 尝试读取 {name}.json
    json_file = dir_path / f"{name}.json"
    if json_file.exists():
        data = safe_read_json(json_file)
        if data:
            return {
                'title': data.get('title', name),
                'level': data.get('age_stage', data.get('branch_level', '')),
                'duration_ms': data.get('duration_ms', 0),
                'char_count': data.get('char_count', 0),
            }
    # 尝试读取 segments.json
    seg_file = dir_path / 'segments.json'
    if seg_file.exists():
        data = safe_read_json(seg_file)
        if data:
            return {
                'title': data.get('title', name),
                'level': '',
                'duration_ms': data.get('duration_ms', 0),
                'char_count': data.get('char_count', 0),
            }
    # 尝试读取 B0.json (蒙学经典)
    b0_file = dir_path / 'B0.json'
    if b0_file.exists():
        data = safe_read_json(b0_file)
        if data:
            seg_data = safe_read_json(seg_file) if seg_file.exists() else {}
            return {
                'title': data.get('title', name),
                'level': '',
                'duration_ms': seg_data.get('duration_ms', 0) if seg_data else 0,
                'char_count': seg_data.get('char_count', 0) if seg_data else 0,
            }
    return {'title': name, 'level': '', 'duration_ms': 0, 'char_count': 0}


def get_lesson_metadata(dir_path: Path) -> dict:
    """从学科启蒙课时目录提取元数据（汇总子segments）"""
    name = dir_path.name
    total_duration = 0
    total_chars = 0
    # 遍历子目录的 segments.json
    for seg_file in dir_path.rglob('segments.json'):
        data = safe_read_json(seg_file)
        if data:
            total_duration += data.get('duration_ms', 0)
            total_chars += data.get('char_count', 0)
    return {
        'title': name,
        'level': '',
        'duration_ms': total_duration,
        'char_count': total_chars,
    }


def build_entry(dir_path: Path, rel_path: str, structure_type: str = 'standalone') -> dict:
    """构建索引条目"""
    name = dir_path.name
    meta = get_story_metadata(dir_path)
    cover = resolve_cover(os.path.dirname(rel_path), name)
    entry = {
        'entry_id': name,
        'title': meta['title'],
        'structure_type': structure_type,
        'display_as': 'story_card' if structure_type == 'standalone' else 'chaptered_card',
        'path': rel_path.replace('\\', '/'),
        'level': meta['level'],
        'duration_ms': meta['duration_ms'],
        'char_count': meta['char_count'],
    }
    if cover:
        entry['cover'] = {
            'cover_image_url': cover,
            'cover_level': 'story' if structure_type == 'standalone' else 'work',
        }
    return entry


def build_txt_entry(file_path: Path, rel_path: str) -> dict:
    """构建 .txt 歌曲条目"""
    name = file_path.stem
    return {
        'entry_id': name,
        'title': name,
        'structure_type': 'standalone',
        'display_as': 'story_card',
        'path': rel_path.replace('\\', '/'),
    }


def build_chapter_entry(dir_path: Path, rel_path: str, index: int) -> dict:
    """构建章节条目"""
    name = dir_path.name
    meta = get_story_metadata(dir_path)
    # 章节级封面（如山海经各章均有独立插图）
    cover = resolve_cover(os.path.dirname(rel_path), name)
    entry = {
        'chapter_index': index,
        'chapter_id': name,
        'title': meta['title'],
        'full_path': rel_path.replace('\\', '/'),
        'structure_type': 'chapter',
        'display_as': 'chapter_item',
        'level': meta['level'],
        'duration_ms': meta['duration_ms'],
        'char_count': meta['char_count'],
    }
    if cover:
        entry['cover'] = {
            'cover_image_url': cover,
            'cover_level': 'chapter',
        }
    return entry


def build_index_for_dir(dir_path: Path, rel_path: str, depth: int) -> dict | None:
    """
    为一个容器目录构建 _index.json 内容。
    depth: 0=学科, 1=分类, 2=子分类/作品, 3+=更深层
    返回索引字典，如果目录是叶子则返回 None。
    """
    if should_ignore(dir_path.name):
        return None

    # 获取有效子项
    all_children = sorted(dir_path.iterdir(), key=lambda x: x.name)
    files = [f for f in all_children if f.is_file() and not should_ignore(f.name)]
    dirs = [d for d in all_children if d.is_dir() and not should_ignore(d.name)]

    # === 类型检测 ===

    # 1. txt_collection: 有 .txt 文件
    txt_files = [f for f in files if f.suffix == '.txt']
    if txt_files:
        return build_txt_collection_index(dir_path, rel_path, txt_files, dirs)

    # 2. 有 segments.json 或同名 JSON/B0.json → 叶子故事
    #    （内部可能有 L2 等分支子目录，但整体仍是一个故事单元，不建索引）
    file_names = {f.name for f in files}
    if 'segments.json' in file_names or f"{dir_path.name}.json" in file_names or 'B0.json' in file_names:
        return None

    # 3. 无子目录 → 叶子节点，不生成索引
    if not dirs:
        return None

    # 4. 检测是否为学科启蒙课时 (学习N / 习题)
    if is_lesson_dir(dir_path):
        return None  # 课时是叶子节点

    # 4. 检测章回作品
    if is_chaptered_dir(dir_path):
        return build_work_index(dir_path, rel_path, dirs)

    # 5. 分类子目录（子目录是叶子故事或容器）
    # 判断子目录类型
    child_types = {}
    for child in dirs:
        child_types[child.name] = classify_child(child)

    # 如果所有子目录都是课时型叶子
    if all(t == 'lesson' for t in child_types.values()):
        return build_lesson_collection_index(dir_path, rel_path, dirs)

    # 如果所有子目录都是独立故事叶子
    if all(t == 'standalone' for t in child_types.values()):
        return build_standalone_collection_index(dir_path, rel_path, dirs)

    # 如果所有子目录都是容器（多层分类 / txt_collection）
    if all(t in ('container', 'txt_collection') for t in child_types.values()):
        return build_multi_level_index(dir_path, rel_path, dirs)

    # 混合型
    return build_mixed_index(dir_path, rel_path, dirs, child_types)


def classify_child(child: Path) -> str:
    """分类子目录类型: standalone / txt_collection / lesson / chaptered / collection / container"""
    if should_ignore(child.name):
        return 'ignore'

    child_contents = list(child.iterdir())
    child_files = [f for f in child_contents if f.is_file()]
    child_dirs = [d for d in child_contents if d.is_dir() and not should_ignore(d.name)]

    # 有 .txt 文件 → txt_collection（是容器，不是叶子）
    if any(f.suffix == '.txt' for f in child_files):
        return 'txt_collection'

    # 有 segments.json 或 {name}.json → 独立故事叶子
    has_segments = any(f.name == 'segments.json' for f in child_files)
    has_named_json = any(f.name == f"{child.name}.json" for f in child_files)
    has_b0 = any(f.name == 'B0.json' for f in child_files)
    if has_segments or has_named_json or has_b0:
        return 'standalone'

    # 是课时目录（学科启蒙）
    if child_dirs and is_lesson_dir(child):
        return 'lesson'

    # 是章回作品
    if child_dirs and is_chaptered_dir(child):
        return 'chaptered'

    # 子目录的子目录有 segments.json → 合集（内含独立故事）
    if child_dirs:
        sample = child_dirs[0]
        sample_files = [f for f in sample.iterdir() if f.is_file()] if sample.exists() else []
        if any(f.name == 'segments.json' or f.name == f"{sample.name}.json" for f in sample_files):
            return 'collection'
        # 否则是容器（多层分类）
        return 'container'

    return 'standalone'


def build_txt_collection_index(dir_path: Path, rel_path: str, txt_files: list, dirs: list) -> dict:
    """构建 .txt 歌曲集索引"""
    entries = [build_txt_entry(f, f"{rel_path}/{f.stem}") for f in sorted(txt_files)]
    cover = resolve_cover(rel_path)
    index = {
        'schema_version': '1.0',
        'index_type': 'category_index',
        'structure_type': 'txt_collection',
        'display_as': 'category_card',
        'path': rel_path.replace('\\', '/'),
        'name': dir_path.name,
        'cover': {'cover_image_url': cover, 'cover_level': 'category'} if cover else None,
        'entry_count': len(entries),
        'entries': entries,
    }
    # 如果有子目录（不太可能），也列出
    if dirs:
        index['sub_categories'] = [d.name for d in dirs]
    return index


def build_work_index(dir_path: Path, rel_path: str, chapter_dirs: list) -> dict:
    """构建章回作品索引"""
    chapters = []
    for i, ch_dir in enumerate(chapter_dirs, 1):
        ch_rel = f"{rel_path}/{ch_dir.name}"
        chapters.append(build_chapter_entry(ch_dir, ch_rel, i))

    cover = resolve_cover(rel_path)
    total_duration = sum(c.get('duration_ms', 0) for c in chapters)
    return {
        'schema_version': '1.0',
        'index_type': 'work_index',
        'structure_type': 'chaptered_work',
        'display_as': 'chaptered_card',
        'path': rel_path.replace('\\', '/'),
        'work_name': dir_path.name,
        'cover': {'cover_image_url': cover, 'cover_level': 'work'} if cover else None,
        'total_chapters': len(chapters),
        'total_duration_ms': total_duration,
        'chapters': chapters,
    }


def build_standalone_collection_index(dir_path: Path, rel_path: str, story_dirs: list) -> dict:
    """构建独立故事集索引"""
    entries = []
    for sd in story_dirs:
        entry_rel = f"{rel_path}/{sd.name}"
        entries.append(build_entry(sd, entry_rel, 'standalone'))

    cover = resolve_cover(rel_path)
    return {
        'schema_version': '1.0',
        'index_type': 'category_index',
        'structure_type': 'standalone_collection',
        'display_as': 'category_card',
        'path': rel_path.replace('\\', '/'),
        'name': dir_path.name,
        'cover': {'cover_image_url': cover, 'cover_level': 'category'} if cover else None,
        'entry_count': len(entries),
        'entries': entries,
    }


def build_lesson_collection_index(dir_path: Path, rel_path: str, lesson_dirs: list) -> dict:
    """构建学科启蒙课时集索引"""
    entries = []
    for ld in lesson_dirs:
        meta = get_lesson_metadata(ld)
        cover = resolve_cover(rel_path, ld.name)
        entries.append({
            'entry_id': ld.name,
            'title': meta['title'],
            'structure_type': 'standalone',
            'display_as': 'story_card',
            'path': f"{rel_path}/{ld.name}".replace('\\', '/'),
            'level': meta['level'],
            'duration_ms': meta['duration_ms'],
            'char_count': meta['char_count'],
        })

    cover = resolve_cover(rel_path)
    return {
        'schema_version': '1.0',
        'index_type': 'category_index',
        'structure_type': 'standalone_collection',
        'display_as': 'category_card',
        'path': rel_path.replace('\\', '/'),
        'name': dir_path.name,
        'cover': {'cover_image_url': cover, 'cover_level': 'category'} if cover else None,
        'entry_count': len(entries),
        'entries': entries,
    }


def build_multi_level_index(dir_path: Path, rel_path: str, sub_dirs: list) -> dict:
    """构建多层分类索引"""
    sub_categories = []
    for sd in sub_dirs:
        sd_rel = f"{rel_path}/{sd.name}"
        # 统计条目数
        count = count_entries(sd)
        cover = resolve_cover(sd_rel)
        sub_categories.append({
            'id': sd.name,
            'name': sd.name,
            'structure_type': detect_sub_type(sd),
            'display_as': 'category_card',
            'entry_count': count,
            'cover': {'cover_image_url': cover, 'cover_level': 'category'} if cover else None,
        })

    cover = resolve_cover(rel_path)
    return {
        'schema_version': '1.0',
        'index_type': 'category_index',
        'structure_type': 'multi_level',
        'display_as': 'nested_category',
        'path': rel_path.replace('\\', '/'),
        'name': dir_path.name,
        'cover': {'cover_image_url': cover, 'cover_level': 'category'} if cover else None,
        'sub_category_count': len(sub_categories),
        'sub_categories': sub_categories,
    }


def build_mixed_index(dir_path: Path, rel_path: str, dirs: list, child_types: dict) -> dict:
    """构建混合型索引"""
    entries = []
    for d in dirs:
        ctype = child_types.get(d.name, 'standalone')
        d_rel = f"{rel_path}/{d.name}"
        if ctype == 'standalone':
            entries.append(build_entry(d, d_rel, 'standalone'))
        elif ctype == 'chaptered':
            # 章回作品条目
            ch_count = len([x for x in d.iterdir() if x.is_dir() and not should_ignore(x.name)])
            cover = resolve_cover(d_rel)
            entries.append({
                'entry_id': d.name,
                'title': d.name,
                'structure_type': 'chaptered',
                'display_as': 'chaptered_card',
                'path': d_rel.replace('\\', '/'),
                'total_chapters': ch_count,
                'cover': {'cover_image_url': cover, 'cover_level': 'work'} if cover else None,
            })
        elif ctype == 'collection':
            # 合集条目
            sub_count = len([x for x in d.iterdir() if x.is_dir() and not should_ignore(x.name)])
            cover = resolve_cover(d_rel)
            entries.append({
                'entry_id': d.name,
                'title': d.name,
                'structure_type': 'collection',
                'display_as': 'collection_card',
                'path': d_rel.replace('\\', '/'),
                'sub_entry_count': sub_count,
                'cover': {'cover_image_url': cover, 'cover_level': 'collection'} if cover else None,
            })
        elif ctype == 'lesson':
            meta = get_lesson_metadata(d)
            entries.append({
                'entry_id': d.name,
                'title': meta['title'],
                'structure_type': 'standalone',
                'display_as': 'story_card',
                'path': d_rel.replace('\\', '/'),
                'duration_ms': meta['duration_ms'],
                'char_count': meta['char_count'],
            })
        else:  # container
            count = count_entries(d)
            cover = resolve_cover(d_rel)
            entries.append({
                'entry_id': d.name,
                'title': d.name,
                'structure_type': 'multi_level',
                'display_as': 'nested_category',
                'path': d_rel.replace('\\', '/'),
                'entry_count': count,
                'cover': {'cover_image_url': cover, 'cover_level': 'category'} if cover else None,
            })

    cover = resolve_cover(rel_path)
    return {
        'schema_version': '1.0',
        'index_type': 'category_index',
        'structure_type': 'mixed',
        'display_as': 'mixed_container',
        'path': rel_path.replace('\\', '/'),
        'name': dir_path.name,
        'cover': {'cover_image_url': cover, 'cover_level': 'category'} if cover else None,
        'entry_count': len(entries),
        'entries': entries,
    }


def count_entries(dir_path: Path) -> int:
    """递归统计目录下的条目总数"""
    count = 0
    try:
        for item in dir_path.iterdir():
            if should_ignore(item.name):
                continue
            if item.is_file() and item.suffix == '.txt':
                count += 1
            elif item.is_dir():
                # 课时目录（学科启蒙）→ 计为1条
                if is_lesson_dir(item):
                    count += 1
                # 叶子故事（有 segments.json 或同名 json）
                elif (item / 'segments.json').exists() or (item / f"{item.name}.json").exists():
                    count += 1
                # 章回作品 → 统计章节数
                elif is_chaptered_dir(item):
                    count += len([d for d in item.iterdir()
                                  if d.is_dir() and not should_ignore(d.name)])
                else:
                    count += count_entries(item)
    except PermissionError:
        pass
    return count


def detect_sub_type(dir_path: Path) -> str:
    """检测子目录的结构类型"""
    try:
        children = list(dir_path.iterdir())
        files = [f for f in children if f.is_file()]
        dirs = [d for d in children if d.is_dir() and not should_ignore(d.name)]
        if any(f.suffix == '.txt' for f in files):
            return 'txt_collection'
        if not dirs:
            return 'standalone_collection'
        if is_chaptered_dir(dir_path):
            return 'chaptered_work'
        return 'standalone_collection'
    except Exception:
        return 'standalone_collection'


def build_subject_index(subject_dir: Path) -> dict:
    """构建学科级 _index.json"""
    subject_name = subject_dir.name
    categories = []

    for cat_dir in sorted(subject_dir.iterdir(), key=lambda x: x.name):
        if not cat_dir.is_dir() or should_ignore(cat_dir.name):
            continue

        cat_rel = f"{subject_name}/{cat_dir.name}"
        cover = resolve_cover(cat_rel)
        entry_count = count_entries(cat_dir)
        structure_type = detect_category_type(cat_dir)

        categories.append({
            'id': cat_dir.name,
            'name': cat_dir.name,
            'structure_type': structure_type,
            'display_as': get_display_as(structure_type),
            'entry_count': entry_count,
            'cover': {'cover_image_url': cover, 'cover_level': 'category'} if cover else None,
        })

    cover = resolve_cover(subject_name)
    return {
        'schema_version': '1.0',
        'index_type': 'subject_index',
        'subject_id': subject_name,
        'subject_name': subject_name,
        'cover': {'cover_image_url': cover, 'cover_level': 'subject'} if cover else None,
        'category_count': len(categories),
        'categories': categories,
    }


def detect_category_type(cat_dir: Path) -> str:
    """检测分类的 structure_type"""
    try:
        children = [d for d in cat_dir.iterdir()
                    if d.is_dir() and not should_ignore(d.name)]
        files = [f for f in cat_dir.iterdir()
                 if f.is_file() and not should_ignore(f.name)]

        if any(f.suffix == '.txt' for f in files):
            return 'txt_collection'
        if not children:
            return 'standalone_collection'

        # 检查子目录类型
        sample_types = set()
        for child in children[:5]:  # 采样前5个
            sample_types.add(classify_child(child))

        if 'chaptered' in sample_types and 'standalone' in sample_types:
            return 'mixed'
        if 'chaptered' in sample_types and 'collection' in sample_types:
            return 'mixed'
        if sample_types == {'chaptered'}:
            if is_chaptered_dir(cat_dir):
                return 'chaptered_work'
            return 'mixed'
        if sample_types == {'container'}:
            return 'multi_level'
        if 'lesson' in sample_types:
            return 'standalone_collection'

        # 检查是否整体是章回作品
        if is_chaptered_dir(cat_dir):
            return 'chaptered_work'

        return 'standalone_collection'
    except Exception:
        return 'standalone_collection'


def get_display_as(structure_type: str) -> str:
    mapping = {
        'standalone_collection': 'category_card',
        'chaptered_work': 'chaptered_card',
        'mixed': 'mixed_container',
        'multi_level': 'nested_category',
        'txt_collection': 'category_card',
    }
    return mapping.get(structure_type, 'category_card')


def write_index(dir_path: Path, index_data: dict):
    """写入 _index.json"""
    dir_path.mkdir(parents=True, exist_ok=True)
    out_file = dir_path / '_index.json'
    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump(index_data, f, ensure_ascii=False, indent=2)


def process_category(cat_dir: Path, rel_path: str, out_dir: Path):
    """递归处理分类目录，生成所有层级的 _index.json"""
    index_data = build_index_for_dir(cat_dir, rel_path, depth=1)
    if index_data:
        write_index(out_dir, index_data)

    # 递归处理子容器（章回作品、合集、多层子分类）
    for child in sorted(cat_dir.iterdir(), key=lambda x: x.name):
        if not child.is_dir() or should_ignore(child.name):
            continue
        child_rel = f"{rel_path}/{child.name}"
        child_out = out_dir / child.name

        # 只对容器型子目录递归
        child_index = build_index_for_dir(child, child_rel, depth=2)
        if child_index:
            write_index(child_out, child_index)
            # 继续递归更深层
            for grandchild in sorted(child.iterdir(), key=lambda x: x.name):
                if not grandchild.is_dir() or should_ignore(grandchild.name):
                    continue
                gc_rel = f"{child_rel}/{grandchild.name}"
                gc_out = child_out / grandchild.name
                gc_index = build_index_for_dir(grandchild, gc_rel, depth=3)
                if gc_index:
                    write_index(gc_out, gc_index)


def build_global_index(subjects_info: list) -> dict:
    """构建全局 _global.json"""
    total_stories = sum(s.get('total_entries', 0) for s in subjects_info)
    return {
        'schema_version': '1.0',
        'index_type': 'global_index',
        'generated_at': datetime.now().isoformat(),
        'stats': {
            'total_subjects': len(subjects_info),
            'total_entries': total_stories,
        },
        'subjects': subjects_info,
    }


def main():
    print(f"=== 重建索引 ===")
    print(f"源目录: {STORIES_DIR}")
    print(f"输出目录: {INDEX_DIR}")
    print(f"封面目录: {COVERS_DIR}")
    print()

    if not STORIES_DIR.exists():
        print(f"错误: 源目录不存在 {STORIES_DIR}")
        sys.exit(1)

    # 清空旧索引
    if INDEX_DIR.exists():
        print(f"清空旧索引: {INDEX_DIR}")
        shutil.rmtree(INDEX_DIR)
    INDEX_DIR.mkdir(parents=True, exist_ok=True)

    # 遍历学科
    subjects_info = []
    subject_dirs = sorted([d for d in STORIES_DIR.iterdir()
                           if d.is_dir() and not should_ignore(d.name)],
                          key=lambda x: x.name)

    for subject_dir in subject_dirs:
        subject_name = subject_dir.name
        print(f"\n处理学科: {subject_name}")

        # 构建学科索引
        subject_index = build_subject_index(subject_dir)
        subject_out = INDEX_DIR / subject_name
        write_index(subject_out, subject_index)

        # 处理每个分类
        for cat_dir in sorted(subject_dir.iterdir(), key=lambda x: x.name):
            if not cat_dir.is_dir() or should_ignore(cat_dir.name):
                continue
            cat_rel = f"{subject_name}/{cat_dir.name}"
            cat_out = subject_out / cat_dir.name
            print(f"  分类: {cat_dir.name}", end='', flush=True)
            process_category(cat_dir, cat_rel, cat_out)
            # 统计
            cat_count = count_entries(cat_dir)
            print(f" ({cat_count} 条)")

        # 学科统计
        total = sum(c.get('entry_count', 0) for c in subject_index.get('categories', []))
        subjects_info.append({
            'subject_id': subject_name,
            'subject_name': subject_name,
            'category_count': subject_index.get('category_count', 0),
            'total_entries': total,
            'cover': subject_index.get('cover'),
        })
        print(f"  小计: {subject_index.get('category_count', 0)} 个分类, {total} 条")

    # 全局索引
    global_index = build_global_index(subjects_info)
    global_file = INDEX_DIR / '_global.json'
    with open(global_file, 'w', encoding='utf-8') as f:
        json.dump(global_index, f, ensure_ascii=False, indent=2)

    print(f"\n=== 完成 ===")
    print(f"学科数: {len(subjects_info)}")
    print(f"总条目: {global_index['stats']['total_entries']}")
    print(f"全局索引: {global_file}")


if __name__ == '__main__':
    main()
