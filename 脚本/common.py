"""
酷酷儿童故事 — 生产管道公共模块 (v5)
- 路径配置（自动解析项目根目录，不硬编码）
- 日志工具
- ★ 逐段WPM语速归一化（不同角色统一到目标字/分钟）
- ★ segments.json 找不到时跳过+报错（不fallback）
- ★ 未匹配MP3告警+跳过（不追加末尾）
- ★ ffprobe 超时返回 None（不返回0.0）
- 通用函数（进度打印、失败记录等）

所有脚本 import common 即可使用统一配置。
"""
import os
import re
import sys
import json
import time
import shutil
import argparse
import subprocess
from pathlib import Path
from datetime import datetime

# ============================================================
# 路径配置（自动解析，不依赖工作目录）
# ============================================================
SCRIPTS_DIR = Path(__file__).parent.resolve()
PROJECT_ROOT = SCRIPTS_DIR.parent
PRODUCTION_DIR = PROJECT_ROOT / "production"
AUDIO_DIR = PRODUCTION_DIR / "audio"
CONTENT_DIR = PRODUCTION_DIR / "generated_stories"
ILLUSTRATIONS_DIR = PRODUCTION_DIR / "illustrations"
INDEX_DIR = PRODUCTION_DIR / "index" / "generated_stories"
LOGS_DIR = SCRIPTS_DIR / "logs"

# 故事音频根目录
STORY_AUDIO_ROOT = AUDIO_DIR
# 教学音频根目录
TEACHING_AUDIO_ROOT = AUDIO_DIR / "学科启蒙"
TEACHING_CONTENT_ROOT = CONTENT_DIR / "学科启蒙"
# 歌曲根目录
SONG_ROOT = CONTENT_DIR / "瞎编的歌曲"
# 立绘目录
CHARACTERS_GENERATED = ILLUSTRATIONS_DIR / "characters_generated"
CHARACTERS_TRANSPARENT = ILLUSTRATIONS_DIR / "characters_transparent"
# 封面目录
COVERS_DIR = ILLUSTRATIONS_DIR / "covers" / "generated"
# 场景图目录
SCENCE_DIR = ILLUSTRATIONS_DIR / "scence"

# Python 解释器路径（managed venv）
PYTHON_VENV = r"C:\Users\49781\.workbuddy\binaries\python\envs\default\Scripts\python.exe"

# 远端 4080 机器配置
REMOTE_HOST = "172.30.10.30"
REMOTE_USER = "ZD"
REMOTE_PASS = "123456"
REMOTE_LRC_WORK = "D:/lrc_work"

# ============================================================
# 音频参数 (v5)
# ============================================================
AUDIO_SAMPLE_RATE = 24000
AUDIO_CHANNELS = 1
AUDIO_BITRATE = "96k"        # v5: 64k → 96k（音质更好）
AUDIO_CODEC = "libmp3lame"

# loudnorm 参数（EBU R128 语音标准）
LOUDNORM_FILTER = "loudnorm=I=-16:TP=-1.5:LRA=11"

# 淡入淡出时长
FADE_IN_DURATION = 0.1
FADE_OUT_DURATION = 0.3

# ★ v6: WPM区间归一化（不强制统一，只修正极端值）
# 90-300区间不改，>300降速到300，<90加速到90
WPM_LOW = 90                  # 低于此提速到此值
WPM_HIGH = 300                # 高于此降速到此值
WPM_MIN = 80                  # 低于此不处理（可能是停顿多的段）
WPM_MAX = 400                 # 高于此不处理（极短段计算不准）
ATEMPO_MIN = 0.5              # atempo 最小值（ffmpeg限制）
ATEMPO_MAX = 2.0              # atempo 最大值（ffmpeg限制）
DEFAULT_SPEED = 0.85          # fallback atempo（无法计算WPM时用）

# 并行线程数
DEFAULT_WORKERS = 2           # v5: 4 → 2（逐段处理更吃CPU）


# ============================================================
# 分段 MP3 查找与排序
# ============================================================

def find_all_mp3s(directory):
    """
    在指定目录中查找所有分段 MP3 文件（排除 full.mp3 和临时文件）。
    返回文件名列表（未排序）。
    """
    files = []
    try:
        for f in os.listdir(directory):
            if not f.endswith(".mp3"):
                continue
            if f.startswith("full") or f.startswith("_") or f.startswith("norm_"):
                continue
            files.append(f)
    except OSError:
        pass
    return files


def get_ordered_segments(audio_dir, seg_data=None):
    """
    ★ v5: 按 segments.json 的 seq 字段排序，用 id 匹配音频文件。
    
    变更:
      - segments.json 找不到 → 返回 ([], "segments.json not found")，不 fallback
      - 未匹配的 MP3 文件 → 告警但不追加到末尾
      - 返回 (ordered_list, error_msg)
    
    参数:
        audio_dir: 音频目录 Path
        seg_data: segments.json 解析后的 dict（可选，为 None 时自动查找）
    
    返回:
        (ordered, error)
        ordered: [(mp3_filename, segment_info_dict), ...]  按 seq 排序，仅含匹配的
        error: None if OK, str if error (segments.json not found / no segments / etc.)
    """
    if seg_data is None:
        seg_data = get_segments_json(audio_dir)
    
    if not seg_data:
        return ([], "segments.json not found")
    
    segments = seg_data.get("segments", [])
    if not segments:
        return ([], "segments.json has no 'segments' array")
    
    all_mp3s = find_all_mp3s(audio_dir)
    if not all_mp3s:
        return ([], "no mp3 files in directory")
    
    # 按 seq 字段排序
    sorted_segs = sorted(segments, key=lambda s: s.get("seq", 0))
    
    # 用 segment.id 匹配音频文件: {id}.mp3
    mp3_set = set(all_mp3s)
    ordered = []
    matched_files = set()
    unmatched_mp3s = []
    
    for seg in sorted_segs:
        seg_id = seg.get("id", "")
        expected_name = f"{seg_id}.mp3"
        if expected_name in mp3_set:
            ordered.append((expected_name, seg))
            matched_files.add(expected_name)
        else:
            # 尝试模糊匹配（id 是文件名的子串或反之）
            found = False
            for mp3 in mp3_set - matched_files:
                mp3_base = mp3[:-4]
                if mp3_base == seg_id or seg_id in mp3_base or mp3_base in seg_id:
                    ordered.append((mp3, seg))
                    matched_files.add(mp3)
                    found = True
                    break
            if not found:
                # segment 没有对应音频文件
                ordered.append((None, seg))
    
    # ★ v5: 未匹配的 MP3 文件 → 告警但不追加
    unmatched_mp3s = mp3_set - matched_files
    if unmatched_mp3s:
        print(f"  [WARN] {len(unmatched_mp3s)} unmatched MP3 files (not in segments.json), skipped: {list(unmatched_mp3s)[:3]}")
    
    return (ordered, None)


def find_story_dirs():
    """
    遍历 AUDIO_DIR 下所有包含分段 MP3 的故事目录。
    返回 [(story_dir: Path, mp3_files: list), ...]
    """
    story_dirs = []
    for root, dirs, files in os.walk(STORY_AUDIO_ROOT):
        if "学科启蒙" in root:
            continue
        mp3_files = find_all_mp3s(Path(root))
        if mp3_files:
            story_dirs.append((Path(root), mp3_files))
    return story_dirs


def find_teaching_units():
    """
    遍历教学音频目录，找到所有需要合并的教学单元。
    教学单元 = 包含分段 MP3 的叶子目录（学习1/学习2/学习3/习题/编号N）
    返回 [Path, ...]
    """
    units = []
    if not TEACHING_AUDIO_ROOT.exists():
        return units
    for root, dirs, files in os.walk(TEACHING_AUDIO_ROOT):
        mp3_files = find_all_mp3s(Path(root))
        if mp3_files and len(mp3_files) > 1:
            units.append(Path(root))
    return units


def get_segments_json(audio_dir):
    """
    根据音频目录路径找到对应的 segments.json。
    
    音频路径 → 内容路径映射:
      教学: production/audio/学科启蒙/.../学习1/ → production/generated_stories/学科启蒙/.../学习1/
      故事: production/audio/上下五千年/.../一丘之貉/ → production/generated_stories/上下五千年/.../一丘之貉/
    """
    # 尝试教学路径映射
    try:
        rel = audio_dir.relative_to(TEACHING_AUDIO_ROOT)
        content_dir = TEACHING_CONTENT_ROOT / rel
        seg_file = content_dir / "segments.json"
        if seg_file.exists():
            try:
                return json.loads(seg_file.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, UnicodeDecodeError) as e:
                print(f"  [WARN] segments.json 解析失败: {seg_file} - {e}")
    except ValueError:
        pass
    
    # 尝试故事路径映射: audio/XXX → generated_stories/XXX
    try:
        rel = audio_dir.relative_to(AUDIO_DIR)
        content_dir = CONTENT_DIR / rel
        seg_file = content_dir / "segments.json"
        if seg_file.exists():
            try:
                return json.loads(seg_file.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, UnicodeDecodeError) as e:
                print(f"  [WARN] segments.json 解析失败: {seg_file} - {e}")
    except ValueError:
        pass
    
    # 最后尝试音频目录自身
    seg_file = audio_dir / "segments.json"
    if seg_file.exists():
        try:
            return json.loads(seg_file.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError) as e:
            print(f"  [WARN] segments.json 解析失败: {seg_file} - {e}")
    
    return None


# ============================================================
# 时长测量 (v5: 超时返回 None)
# ============================================================

def get_duration_seconds(filepath):
    """用 ffprobe 获取音频时长（秒，浮点）。★ v5: 超时/出错返回 None"""
    cmd = ["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
           "-of", "default=noprint_wrappers=1:nokey=1", str(filepath)]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="ignore", timeout=10)
        if result.returncode != 0 or not result.stdout.strip():
            return None
        return float(result.stdout.strip())
    except Exception:
        return None


def get_duration_ms(filepath):
    """用 ffprobe 获取音频时长（毫秒）。★ v5: 超时返回 None"""
    secs = get_duration_seconds(filepath)
    return int(secs * 1000) if secs is not None else None


# ============================================================
# ★ v5: 逐段 WPM 语速归一化
# ============================================================

def count_speech_units(text):
    """
    统计文本中的语音单位数（中文字 + 英文词 + 数字组）。
    排除标点和空白。
    """
    if not text:
        return 0
    # 中文字符
    chinese = len(re.findall(r'[\u4e00-\u9fff]', text))
    # 英文单词（连续字母）
    english = len(re.findall(r'[a-zA-Z]+', text))
    # 数字组（连续数字）
    numbers = len(re.findall(r'\d+', text))
    return chinese + english + numbers


def calculate_segment_speed(text, duration_sec, target_wpm=None):
    """
    ★ v6: WPM区间归一化。180-210不改，>210降速到210，<180加速到180。
    
    逻辑:
      1. 算实际 WPM = 字数 / (时长秒 / 60)
      2. WPM在[WPM_LOW, WPM_HIGH]区间 → atempo=1.0（不改）
      3. WPM > WPM_HIGH → atempo = WPM_HIGH / actual_wpm（降速）
      4. WPM < WPM_LOW → atempo = WPM_LOW / actual_wpm（加速）
      5. clamp atempo 到 [ATEMPO_MIN, ATEMPO_MAX]
    
    特殊情况:
      - 字数=0 或 时长=None → 返回 1.0 (不改)
      - WPM < WPM_MIN → 不处理（停顿多的段）
      - WPM > WPM_MAX → 不处理（极短段）
    
    返回: (atempo: float, actual_wpm: float)
    """
    if not text or duration_sec is None or duration_sec <= 0:
        return (1.0, 0.0)
    
    units = count_speech_units(text)
    if units == 0:
        return (1.0, 0.0)
    
    actual_wpm = units / (duration_sec / 60.0)
    
    # 极端值保护
    if actual_wpm < WPM_MIN:
        return (1.0, actual_wpm)
    if actual_wpm > WPM_MAX:
        return (1.0, actual_wpm)
    
    # 区间内不改
    if WPM_LOW <= actual_wpm <= WPM_HIGH:
        return (1.0, actual_wpm)
    
    # 超出区间才调整
    if actual_wpm > WPM_HIGH:
        target = WPM_HIGH
    else:
        target = WPM_LOW
    
    atempo = target / actual_wpm
    atempo = max(ATEMPO_MIN, min(ATEMPO_MAX, atempo))
    
    return (round(atempo, 4), round(actual_wpm, 1))


# ============================================================
# 音频合并工具 (v5: 逐段处理)
# ============================================================

def generate_silence_file(filepath, duration_sec, sample_rate=AUDIO_SAMPLE_RATE):
    """生成指定时长的静音 MP3 文件"""
    cmd = [
        "ffmpeg", "-y", "-f", "lavfi",
        "-i", f"anullsrc=channel_layout=mono:sample_rate={sample_rate}",
        "-t", str(duration_sec),
        "-c:a", AUDIO_CODEC, "-b:a", AUDIO_BITRATE,
        "-ar", str(sample_rate), "-ac", str(AUDIO_CHANNELS),
        str(filepath)
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="ignore", timeout=30)
    return result.returncode == 0


def build_concat_list(list_filepath, audio_files, silence_file=None, gap=0.0):
    """构建 ffmpeg concat 列表文件。"""
    list_filepath.parent.mkdir(parents=True, exist_ok=True)
    with open(list_filepath, "w", encoding="utf-8") as f:
        for i, audio_path in enumerate(audio_files):
            safe = str(audio_path).replace("'", r"'\''")
            f.write(f"file '{safe}'\n")
            if gap > 0 and silence_file and i < len(audio_files) - 1:
                safe_sil = str(silence_file).replace("'", r"'\''")
                f.write(f"file '{safe_sil}'\n")


def normalize_segment(input_path, output_path, speed=1.0, normalize=True):
    """
    ★ v5: 对单个音频文件做 atempo语速调整 + loudnorm归一化。
    
    滤镜链: atempo → loudnorm
    - atempo: 逐段语速调整（不同角色不同speed）
    - loudnorm: 逐段音量归一化（比整曲更精确）
    
    参数:
        speed: atempo 值（1.0=原速, 0.85=降速15%, 1.2=加速20%）
        normalize: 是否做 loudnorm 归一化
    """
    filters = []
    if speed != 1.0:
        filters.append(f"atempo={speed}")
    if normalize:
        filters.append(LOUDNORM_FILTER)
    
    cmd = [
        "ffmpeg", "-y", "-i", str(input_path),
        "-c:a", AUDIO_CODEC, "-b:a", AUDIO_BITRATE,
        "-ar", str(AUDIO_SAMPLE_RATE), "-ac", str(AUDIO_CHANNELS),
    ]
    if filters:
        cmd.extend(["-af", ",".join(filters)])
    cmd.append(str(output_path))
    
    result = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="ignore", timeout=60)
    return result.returncode == 0


def merge_with_ffmpeg(concat_list_path, output_path, total_duration,
                      fade=True):
    """
    ★ v5 简化: 纯 concat + 淡入淡出。
    atempo 和 loudnorm 已在逐段 normalize_segment 中完成。
    
    参数:
        total_duration: 合并后预期总时长（秒），用于计算 fade out 起始点
    """
    filters = []
    if fade:
        filters.append(f"afade=t=in:st=0:d={FADE_IN_DURATION}")
        fade_out_start = max(0, total_duration - FADE_OUT_DURATION)
        filters.append(f"afade=t=out:st={fade_out_start:.3f}:d={FADE_OUT_DURATION}")
    
    cmd = [
        "ffmpeg", "-y", "-f", "concat", "-safe", "0",
        "-i", str(concat_list_path),
        "-c:a", AUDIO_CODEC, "-b:a", AUDIO_BITRATE,
        "-ar", str(AUDIO_SAMPLE_RATE), "-ac", str(AUDIO_CHANNELS),
    ]
    if filters:
        cmd.extend(["-af", ",".join(filters)])
    cmd.append(str(output_path))
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="ignore", timeout=600)
        return result.returncode == 0, result.stderr[-500:] if result.stderr else ""
    except subprocess.TimeoutExpired:
        return False, "timeout (600s)"


def cleanup_temp_dirs():
    """★ v5: 清理所有 _tmp_merge 临时目录"""
    cleaned = 0
    for root, dirs, files in os.walk(AUDIO_DIR):
        for d in dirs:
            if d == "_tmp_merge":
                tmp_path = os.path.join(root, d)
                shutil.rmtree(tmp_path, ignore_errors=True)
                cleaned += 1
    if cleaned > 0:
        print(f"  清理了 {cleaned} 个临时目录")
    return cleaned


def check_segments_completeness(ordered):
    """
    校验 segments.json 中所有段落是否都有对应的音频文件。
    
    返回:
        (is_complete: bool, missing: list[dict])
    """
    missing = []
    for mp3_name, seg in ordered:
        if mp3_name is None and seg is not None:
            missing.append({
                "seq": seg.get("seq", "?"),
                "id": seg.get("id", "unknown"),
                "character": seg.get("character", ""),
                "text": seg.get("text", ""),
                "reason": "mp3 not found"
            })
    return len(missing) == 0, missing


def save_log(script_name, content):
    """保存日志到 脚本/logs/ 目录"""
    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    log_file = LOGS_DIR / f"{script_name}.log"
    with open(log_file, "w", encoding="utf-8") as f:
        f.write(content)
    return log_file


def save_failures(script_name, failures):
    """保存失败列表到 JSON"""
    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    fail_file = LOGS_DIR / f"{script_name}_failed.json"
    with open(fail_file, "w", encoding="utf-8") as f:
        json.dump(failures, f, ensure_ascii=False, indent=2)
    return fail_file


def save_incomplete(script_name, records):
    """保存缺段（不完整但已合成）记录到 JSON，供后续补档用"""
    if not records:
        return None
    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    inc_file = LOGS_DIR / f"{script_name}_incomplete.json"
    with open(inc_file, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)
    return inc_file


def print_progress(current, total, results, interval=100):
    """统一进度打印"""
    if current % interval == 0 or current == total:
        parts = " | ".join(f"{k}={v}" for k, v in results.items())
        print(f"  [{current}/{total}] {parts}")


def add_common_args(description):
    """添加通用命令行参数"""
    parser = argparse.ArgumentParser(description=description)
    parser.add_argument("--test", type=int, default=0, metavar="N",
                        help="测试模式：只处理前 N 个项目")
    parser.add_argument("--dry-run", action="store_true",
                        help="扫描模式：只统计不执行")
    parser.add_argument("--force", action="store_true",
                        help="强制重新生成（跳过已存在检查）")
    return parser


def add_merge_args(description):
    """★ v5: 合并脚本专用参数"""
    parser = add_common_args(description)
    parser.add_argument("--gap", type=float, default=None, metavar="SEC",
                        help="段间静音时长（秒），默认: 故事0.3 教学0.5")
    parser.add_argument("--no-normalize", action="store_true",
                        help="不做音量归一化（默认逐段loudnorm）")
    parser.add_argument("--no-fade", action="store_true",
                        help="不添加淡入淡出")
    parser.add_argument("--wpm-low", type=int, default=WPM_LOW, metavar="WPM",
                        help=f"WPM下限，低于此提速到此值，默认{WPM_LOW}")
    parser.add_argument("--wpm-high", type=int, default=WPM_HIGH, metavar="WPM",
                        help=f"WPM上限，高于此降速到此值，默认{WPM_HIGH}")
    parser.add_argument("--allow-incomplete", action="store_true",
                        help="允许段不完整时仍合并(默认缺段则跳过)")
    parser.add_argument("--workers", type=int, default=DEFAULT_WORKERS, metavar="N",
                        help=f"并行线程数，默认{DEFAULT_WORKERS}")
    return parser


def banner(title):
    """打印脚本标题横幅"""
    line = "=" * 60
    print(f"\n{line}")
    print(f"  {title}")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{line}\n")
