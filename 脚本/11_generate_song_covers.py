# -*- coding: utf-8 -*-
"""批量生成「瞎编的歌曲」下每首歌曲的封面候选图(根据类型 + 歌名 + 简介)。

每首歌生成 GENERATE_NUM 张(默认3)候选图(1:1)，供人工挑选。
提示词为英文框架(对齐 batch_top_covers.py): 风格/反向约束用英文, 主题场景由
中文歌名/简介驱动, 角色统一用 'a little boy and a little girl'。

特性:
- 默认 image2image + 酷酷/桃子角色参考图(对齐参考脚本, 保证形象一致);
  可加 --text2image 切换为纯文生图。
- 断点续做: 每首歌已集齐 GENERATE_NUM 张合法 PNG 则跳过(可用 --force 重生成)
- --test N: 只处理前 N 首歌(验证用)
- --type <类型>: 只处理指定类型(如 安全教育)，可多次指定
- --dry-run: 只统计待生成数量, 不实际调用即梦
- --workers N: 并发路数(默认 7, 手册硬上限 7)

输出(候选): illustrations/covers_generated_temp/瞎编的歌曲/<类型>/<歌名>/<歌名>_N.png
挑选后由处理脚本复制到正式目录 illustrations/covers/瞎编的歌曲/...
"""
import argparse
import json
import queue
import re
import subprocess
import sys
import threading
import time
import urllib.request
from datetime import datetime
from pathlib import Path

# ---- 强制 stdout/stderr 为 UTF-8 ----
import io
try:
    if sys.stdout is not None and hasattr(sys.stdout, "buffer"):
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8",
                                      errors="replace", line_buffering=True)
    if sys.stderr is not None and hasattr(sys.stderr, "buffer"):
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8",
                                      errors="replace", line_buffering=True)
except Exception:
    pass

# ---- 路径(相对本脚本自动解析, 不写死绝对路径) ----
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent                       # .../项目/酷酷儿童故事
ILLUST_DIR = PROJECT_ROOT / "illustrations"
SONGS_ROOT = (PROJECT_ROOT / "production" / "generated_stories"
              / "瞎编的歌曲")
# 候选图目录(每首歌一个子目录, 内含 3 张供挑选); 选定后由处理脚本复制到正式目录
CAND_ROOT = ILLUST_DIR / "covers_generated_temp" / "瞎编的歌曲"
# 正式目录(用户要求先放 illustrations 下; 选定后写入)
FINAL_ROOT = ILLUST_DIR / "covers" / "瞎编的歌曲"
LOG_DIR = SCRIPT_DIR / "logs"

# 每首歌生成的候选张数(默认 1 张; 之前曾用 3 张供挑选)
GENERATE_NUM = 1

# 即梦 CLI
DREAMINA = Path(__import__("os").environ.get(
    "DREAMINA_CLI", str(Path(__file__).drive + r"\work\work\code\testsuit\公司\tools\dreamina.exe")))

# 角色参考图(保证酷酷/妞妞形象一致; 妞妞的参考图文件名为 桃子.png，
# 仅因提示词里写"桃子"会被即梦误解成水果，故提示词统一称"妞妞")
CHAR_REFS = [
    ILLUST_DIR / "characters_all" / "酷酷.png",
    ILLUST_DIR / "characters_all" / "桃子.png",   # 实际角色=妞妞
]

# 视觉风格 / 反向约束(对齐 batch_top_covers.py 的英文风格)
STYLE = ("childrens book illustration style, warm pastel palette, thick outlines 5px, "
         "flat colors with simple shadow, chibi proportions 1:2, big shiny eyes, "
         "soft rounded shapes, preschool-friendly")
NEG = "no photorealistic, no 3D, no photograph, no realistic texture, no text, no watermark, no logo"
# 角色: 直接用 boy girl(避免即梦把"桃子/妞妞"误解成水果, 也不写专有角色名)
CHAR_PHRASE = "a little boy and a little girl as the small main characters in the scene"

# 即梦调用参数
RATIO = "1:1"
RESOLUTION_TYPE = "2k"
MODEL_VERSION = "4.0"

# 并发调度(对齐手册§7)
WORKERS_DEFAULT = 7
STAGGER_S = 2
SLEEP_S = 2
UPLOAD_TIMEOUT = 300
QUERY_TIMEOUT = 90
POLL_SLEEP = 3
MELTDOWN_TOTAL = 10
MELTDOWN_WINDOW = 300
MELTDOWN_COOLDOWN = 300


# ---------------------------------------------------------------------------
# 即梦 CLI 封装(对齐已验证管线)
# ---------------------------------------------------------------------------
def submit(prompt: str, use_char_refs: bool, use_text2image: bool):
    if use_text2image:
        cmd = (f'"{DREAMINA}" text2image --prompt="{prompt}" '
               f'--ratio={RATIO} --resolution_type={RESOLUTION_TYPE} --model_version={MODEL_VERSION}')
    else:
        urls = ",".join(f'"{p}"' for p in CHAR_REFS if Path(p).exists()) if use_char_refs else '""'
        cmd = (f'"{DREAMINA}" image2image --images={urls} --prompt="{prompt}" '
               f'--ratio={RATIO} --resolution_type={RESOLUTION_TYPE} --model_version={MODEL_VERSION}')
    try:
        proc = subprocess.run(cmd, shell=True, capture_output=True, text=True,
                              timeout=UPLOAD_TIMEOUT, encoding="utf-8", errors="ignore")
    except Exception:
        return None
    m = re.search(r"\{.*\}", proc.stdout or "", re.DOTALL)
    if not m:
        return None
    try:
        return json.loads(m.group())
    except Exception:
        return None


def query(sid: str):
    cmd = f'"{DREAMINA}" query_result --submit_id={sid}'
    try:
        proc = subprocess.run(cmd, shell=True, capture_output=True, text=True,
                              timeout=QUERY_TIMEOUT, encoding="utf-8", errors="ignore")
    except Exception:
        return None
    m = re.search(r"\{.*\}", proc.stdout or "", re.DOTALL)
    if not m:
        return None
    try:
        return json.loads(m.group())
    except Exception:
        return None


def gen_image(prompt: str, out_path: Path, use_char_refs: bool, use_text2image: bool) -> bool:
    r = submit(prompt, use_char_refs, use_text2image)
    if not r or not r.get("submit_id"):
        return False
    sid = r["submit_id"]
    deadline = time.time() + QUERY_TIMEOUT
    while time.time() < deadline:
        time.sleep(POLL_SLEEP)
        qr = query(sid)
        if qr and qr.get("gen_status") == "success":
            urls = qr.get("urls") or []
            imgs = (qr.get("result_json") or {}).get("images") or []
            if not urls and imgs:
                urls = [i.get("image_url", "") for i in imgs]
            for url in urls:
                if not url:
                    continue
                time.sleep(SLEEP_S)
                out_path.parent.mkdir(parents=True, exist_ok=True)
                try:
                    urllib.request.urlretrieve(url, str(out_path))
                    return True
                except Exception:
                    return False
            return False
        elif qr and qr.get("gen_status") == "fail":
            return False
    return False


# ---------------------------------------------------------------------------
# 提示词构建
# ---------------------------------------------------------------------------
def parse_header(txt_path: Path):
    """从首行元数据解析 (类型, 语言, 子主题, 歌名, 简介)，并从正文提炼主题场景词。"""
    try:
        lines = txt_path.read_text(encoding="utf-8", errors="ignore").splitlines()
    except Exception:
        lines = []
    first = lines[0] if lines else ""
    type_label = txt_path.parent.name
    title = txt_path.stem
    # 文件名常带语言前缀(如 "中文-丁肇中"), 兜底先剥掉
    title = re.sub(r"^(中文|英文|双语|纯音乐|伴奏)[-_]", "", title)
    desc = ""
    m = re.match(r"^(.+?)\|(.+?)\|(.+?)\|(.+?)\s*-\s*(.+)$", first)
    if m:
        type_label = m.group(1).strip() or type_label
        title = m.group(4).strip() or title   # 优先用元数据里的干净歌名
        desc = m.group(5).strip()
    # 从正文提炼主题场景(跳过标记行与空行, 优先取中文行, 避免英文歌词噪声)
    def has_cjk(s: str) -> bool:
        return any("\u4e00" <= ch <= "\u9fff" for ch in s)

    scene_lines = []
    for ln in lines[1:]:
        s = re.sub(r"\s+", "", ln.strip())
        if not s:
            continue
        if re.match(r"^\[.*\]$", s):   # [Intro]/[Verse] 等标记
            continue
        if re.match(r"^[\W_]+$", s):   # 纯标点行
            continue
        if not has_cjk(s):             # 跳过纯英文/拼音行
            continue
        scene_lines.append(s)
        if len(scene_lines) >= 3:
            break
    scene = "，".join(scene_lines)
    return type_label, title, desc, scene


def condense(text: str, maxlen: int = 80) -> str:
    text = re.sub(r"\s+", "", text or "")
    if len(text) > maxlen:
        text = text[:maxlen]
    if text and not text.endswith(("，", "。", ",", ".")):
        text += "，"
    return text


def is_valid_png(path: Path) -> bool:
    """判断文件是否为有效的 PNG(已下载完成)。"""
    try:
        if (path.exists() and path.stat().st_size > 1024
                and path.read_bytes()[:8] == b"\x89PNG\r\n\x1a\n"):
            return True
    except Exception:
        pass
    return False


def build_prompt(type_label: str, title: str, desc: str, scene: str) -> str:
    """英文框架提示词: 歌名/类型 + 由简介/歌词自行总结的主题场景 + boy girl 小主角。

    风格词与反向约束用英文(对齐 batch_top_covers.py), 主题仍嵌入中文歌名/简介
    (即梦支持中英混排, 能理解中文主题词), 角色统一用 'a little boy and a little girl'。
    """
    if desc:
        theme = condense(desc, 90)
    elif scene:
        theme = condense(scene, 90)
    else:
        theme = f"a whimsical theme about {title}"
    return (f"{title}, children {type_label} themed illustration cover: "
            f"depicting a whimsical scene related to this song — {theme} "
            f"{CHAR_PHRASE}. {STYLE}. {NEG}")


# ---------------------------------------------------------------------------
# 任务收集(断点续做)
# ---------------------------------------------------------------------------
def collect_tasks(limit=None, force=False, types=None):
    """收集任务: 每首歌生成 GENERATE_NUM 张候选图, 存到 CAND_ROOT 下按歌名建子目录。

    断点续做: 某首歌已集齐 GENERATE_NUM 张合法 PNG 则整首跳过; 否则只补缺失的张数。
    """
    tasks = []
    song_files = []
    for p in sorted(SONGS_ROOT.rglob("*.txt")):
        rel = p.relative_to(SONGS_ROOT)
        # 只处理位于类型子目录下的 .txt (depth>=2), 根目录层的策划文档等非歌曲文件跳过
        if len(rel.parts) < 2:
            continue
        # 类型 = 第一级目录名
        if types and rel.parts[0] not in types:
            continue
        song_files.append(p)
    if limit:
        song_files = song_files[:limit]
    for p in song_files:
        type_label, title, desc, scene = parse_header(p)
        song_dir = CAND_ROOT / str(p.relative_to(SONGS_ROOT))[:-4]
        prompt = build_prompt(type_label, title, desc, scene)
        # 整首跳过判断(已集齐)
        if force is False and song_dir.exists():
            valid = [f for f in song_dir.glob(f"{p.stem}_*.png") if is_valid_png(f)]
            if len(valid) >= GENERATE_NUM:
                continue
        for n in range(1, GENERATE_NUM + 1):
            out_path = song_dir / f"{p.stem}_{n}.png"
            if force is False and is_valid_png(out_path):
                continue
            tasks.append((str(p.relative_to(SONGS_ROOT)), title, prompt, out_path))
    return tasks


# ---------------------------------------------------------------------------
# 日志
# ---------------------------------------------------------------------------
class Logger:
    def __init__(self, path: Path):
        path.parent.mkdir(parents=True, exist_ok=True)
        self.f = open(path, "a", encoding="utf-8")

    def write(self, msg: str):
        ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        line = f"[{ts}] {msg}"
        print(line, flush=True)
        try:
            self.f.write(line + "\n")
            self.f.flush()
        except Exception:
            pass

    def close(self):
        try:
            self.f.close()
        except Exception:
            pass


# ---------------------------------------------------------------------------
# 主流程
# ---------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(description="批量生成「瞎编的歌曲」歌曲封面图")
    ap.add_argument("--test", type=int, default=None, help="仅处理前 N 首歌(验证用)")
    ap.add_argument("--type", action="append", default=None,
                    help="只处理指定类型(第一级目录名); 可多次指定")
    ap.add_argument("--force", action="store_true", help="强制重新生成(忽略已存在)")
    ap.add_argument("--dry-run", action="store_true", help="只统计待生成数量")
    ap.add_argument("--no-char-refs", action="store_true", help="不使用酷酷/桃子角色参考图")
    ap.add_argument("--text2image", action="store_true",
                    help="纯文生图(不挂角色参考图), 画面由提示词完全驱动, 场景更自由")
    ap.add_argument("--workers", type=int, default=WORKERS_DEFAULT)
    args = ap.parse_args()

    if not SONGS_ROOT.exists():
        print(f"[错误] 歌曲目录不存在: {SONGS_ROOT}", flush=True)
        sys.exit(1)
    if not DREAMINA.exists():
        print(f"[错误] 即梦 CLI 不存在: {DREAMINA}", flush=True)
        sys.exit(1)

    use_char_refs = (not args.no_char_refs) and (not args.text2image) and all(Path(c).exists() for c in CHAR_REFS)
    use_text2image = bool(args.text2image)
    log = Logger(LOG_DIR / "11_song_covers.log")

    tasks = collect_tasks(limit=args.test, force=args.force, types=set(args.type) if args.type else None)
    total = len(tasks)
    log.write(f"待生成任务数: {total}"
              + (f" (--test {args.test})" if args.test else "")
              + (f" (--type {args.type})" if args.type else "")
              + (" [--force]" if args.force else "")
              + (f" [模式={'文生图' if use_text2image else '图生图(角色参考=' + ('开' if use_char_refs else '关') + ')'}]"))

    if args.dry_run:
        from collections import Counter
        # dry-run 按"首歌"统计(每首生成 GENERATE_NUM 张候选)
        songs = [p for p in sorted(SONGS_ROOT.rglob("*.txt"))
                 if len(p.relative_to(SONGS_ROOT).parts) >= 2
                 and (not args.type or p.relative_to(SONGS_ROOT).parts[0] in set(args.type))]
        if args.test:
            songs = songs[:args.test]
        c = Counter(p.relative_to(SONGS_ROOT).parts[0] for p in songs)
        total_songs = len(songs)
        total_imgs = total_songs * GENERATE_NUM
        log.write(f"[dry-run] 涉及 {len(c)} 个类型, 共 {total_songs} 首歌, "
                  f"每首 {GENERATE_NUM} 张候选 = {total_imgs} 张, 不实际生成")
        for name, n in sorted(c.items()):
            log.write(f"  - {name}: {n} 首")
        log.close()
        return

    # --test 模式: 先打印提示词供人工核对主题贴合度
    if args.test:
        log.write("========== [test] 预览提示词 ==========")
        for rel, title, prompt, _ in tasks:
            log.write(f"[{rel}]\n  {prompt}\n")
        log.write("=======================================")

    if total == 0:
        log.write("没有需要生成的图(可能都已存在; 如需重生成请加 --force)")
        log.close()
        return

    workers = max(1, min(args.workers, WORKERS_DEFAULT))
    log.write(f"并发路数: {workers} (手册规定 ≤{WORKERS_DEFAULT})")

    task_queue: "queue.Queue[dict]" = queue.Queue()
    for (rel, title, p, o) in tasks:
        task_queue.put({"rel": rel, "title": title, "prompt": p, "out": o})

    lock = threading.Lock()
    done = [0]
    ok_cnt = [0]
    fail_cnt = [0]
    fail_times = []
    meltdown = threading.Event()

    def record_failure() -> bool:
        now = time.time()
        with lock:
            fail_cnt[0] += 1
            fail_times.append(now)
            fail_times[:] = [t for t in fail_times if now - t < MELTDOWN_WINDOW]
            if len(fail_times) >= MELTDOWN_TOTAL:
                meltdown.set()
                return True
        return False

    def worker():
        while not task_queue.empty():
            if meltdown.is_set():
                return
            try:
                t = task_queue.get_nowait()
            except queue.Empty:
                break
            ok = gen_image(t["prompt"], t["out"], use_char_refs, use_text2image)
            with lock:
                done[0] += 1
                if ok:
                    ok_cnt[0] += 1
                    log.write(f"[OK {done[0]}/{total}] {t['rel']}")
                else:
                    log.write(f"[FAIL {done[0]}/{total}] {t['rel']}")
            if not ok and record_failure():
                log.write(f"[熔断] 近 {MELTDOWN_WINDOW}s 失败 ≥{MELTDOWN_TOTAL} 次, "
                          f"全体暂停 {MELTDOWN_COOLDOWN // 60} 分钟冷却...")
                return

    while not task_queue.empty():
        threads = []
        meltdown.clear()
        for _ in range(workers):
            th = threading.Thread(target=worker, daemon=True)
            th.start()
            threads.append(th)
            time.sleep(STAGGER_S)
        for th in threads:
            th.join()
        if meltdown.is_set():
            time.sleep(MELTDOWN_COOLDOWN)
            with lock:
                fail_times.clear()
            log.write("[熔断恢复] 继续生成剩余任务...")

    log.write(f"完成: 成功 {ok_cnt[0]}, 失败 {fail_cnt[0]}, 共 {done[0]}/{total}")
    log.close()


if __name__ == "__main__":
    main()
