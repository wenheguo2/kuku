# -*- coding: utf-8 -*-
"""生成「上下五千年 / E3历史故事 / 其他」下每个历史故事的封面图。

每个故事 3 款提示词(A 全景 / B 角色特写 / C 高潮瞬间) × 每款 3 张 = 9 张。
提示词由故事 JSON 的 synopsis + illustration_style 自动生成(中文, 即梦原生支持)。
输出: illustrations/covers_generated_temp/上下五千年/E3历史故事/其他/<故事>/{A,B,C}/<A/B/C>_NNN.png

特性:
- 断点续做: 已存在的图自动跳过(可用 --force 强制重生成)
- --test N: 只处理前 N 个故事(验证用)
- --dry-run: 只统计待生成数量, 不实际调用即梦
- --workers N: 并发路数(默认 7, 手册硬上限 7), 与故事/提示词种类无关
- 7 路并发 × 2s 首轮错峰 × gen 后 sleep 2s(对齐《即梦Dreamina》§7, 防封号)
- 全局熔断: 5 分钟窗口内失败总数 ≥10 → 全体暂停 5 分钟再续

依赖: 即梦 CLI (默认 公司/tools/dreamina.exe), 可用环境变量 DREAMINA_CLI 覆盖。
注意: 运行前请先激活虚拟环境(python 需能 import 本目录的 common, 非必须; 本脚本本身无第三方依赖)。
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

# ---- 强制 stdout/stderr 为 UTF-8: 避免重定向到日志文件时被控制台 GBK 编码污染 ----
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
STORIES_ROOT = (PROJECT_ROOT / "production" / "generated_stories"
                / "上下五千年" / "E3历史故事" / "其他")
GENERATED = ILLUST_DIR / "covers_generated_temp" / "上下五千年" / "E3历史故事" / "其他"
LOG_DIR = SCRIPT_DIR / "logs"

# 即梦 CLI: 默认 公司/tools/dreamina.exe, 可用环境变量覆盖
DREAMINA = Path(__file__).drive + r"\work\work\code\testsuit\公司\tools\dreamina.exe"
DREAMINA = Path(__import__("os").environ.get("DREAMINA_CLI", str(DREAMINA)))

# 角色参考图(保证酷酷/桃子形象一致) —— 与现有封面生成实际生效的参考一致
CHAR_REFS = ",".join([
    str(ILLUST_DIR / "characters_all" / "酷酷.png"),
    str(ILLUST_DIR / "characters_all" / "桃子.png"),
])

# 风格 / 反向约束
STYLE_SUFFIX = ("儿童绘本插画风格，暖色柔和配色，粗描边，扁平色块，圆润可爱Q版形象，"
                "大眼睛，适合学龄前儿童")
NEG = "不要写实照片，不要3D，不要真人照片，不要文字，不要水印，不要标志，人物不要变形"

# 3 款提示词 = 3 种取景/构图思路
VARIANTS = {
    "A": "采用宽幅全景构图，展现故事宏大的历史场景与整体氛围",
    "B": "聚焦故事主角的温馨特写镜头，人物表情生动",
    "C": "捕捉故事最动人的高潮瞬间，富有戏剧张力与情感",
}
N_PER_VARIANT = 3

# 即梦调用参数
RATIO = "1:1"
RESOLUTION_TYPE = "4k"
MODEL_VERSION = "4.0"

# ---- 即梦并发调度策略(对齐《即梦Dreamina》手册 §7: 7路×2s错峰×2s休眠, 防封号) ----
WORKERS_DEFAULT = 7          # 并发路数(手册硬规定 7 路, 不可超过)
STAGGER_S = 2                # 首轮错峰: 启动 Worker 时每隔 2s 启一个, 避免初始请求风暴
SLEEP_S = 2                  # 每轮 gen 完成后 sleep(2s) 再 download, 自然错峰
UPLOAD_TIMEOUT = 300         # submit(图生图上传)超时: 纯 I/O 不占 GPU, 设大(手册§7.1)
QUERY_TIMEOUT = 60           # query_result 轮询总窗口(s)
POLL_SLEEP = 3               # 轮询间隔(s, 手册模板用 3s)
MELTDOWN_TOTAL = 10          # 全局熔断阈值: 5 分钟窗口内失败总数 ≥10
MELTDOWN_WINDOW = 300        # 熔断时间窗口(s)
MELTDOWN_COOLDOWN = 300      # 熔断后冷却(s)


# ---------------------------------------------------------------------------
# 即梦 CLI 封装(逻辑对齐已验证的 batch_top_covers.py, 关键点: 落盘前先 mkdir)
# ---------------------------------------------------------------------------
def submit(prompt: str):
    """提交图生图任务, 返回完整 JSON(含 submit_id); 失败返回 None。"""
    urls = f'"{CHAR_REFS}"'
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
    """查询任务结果, 返回完整 JSON; 失败返回 None。"""
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


def gen_image(prompt: str, out_path: Path) -> bool:
    """提交 + 轮询 + 下载。成功返回 True。关键: 下载前先确保父目录存在。"""
    r = submit(prompt)
    if not r or not r.get("submit_id"):
        return False
    sid = r["submit_id"]
    deadline = time.time() + QUERY_TIMEOUT
    while time.time() < deadline:                 # 轮询总窗口 QUERY_TIMEOUT(60s)
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
                time.sleep(SLEEP_S)               # 自然错峰, 再 download
                out_path.parent.mkdir(parents=True, exist_ok=True)   # 关键修复点
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
def find_story_json(story_dir: Path) -> Path | None:
    name = story_dir.name + ".json"
    cand = story_dir / name
    if cand.exists():
        return cand
    for f in story_dir.glob("*.json"):
        try:
            d = json.loads(f.read_text(encoding="utf-8", errors="ignore"))
        except Exception:
            continue
        if isinstance(d, dict) and "synopsis" in d:
            return f
    return None


def condense(synopsis: str, maxlen: int = 90) -> str:
    s = re.sub(r"\s+", "", synopsis or "")
    parts = [p for p in s.split("。") if p]
    out = "。".join(parts[:2])
    if len(out) > maxlen:
        out = out[:maxlen]
    if out and not out.endswith("。"):
        out += "。"
    return out


def build_prompt(story_title: str, synopsis: str, style: str, framing: str) -> str:
    scene = condense(synopsis)
    style = (style or "").strip()
    if style and not style.endswith(("，", "。", ",", ".")):
        style += "，"
    return (f"《{story_title}》儿童历史故事封面插画："
            f"{scene}{style}{STYLE_SUFFIX}，{framing}，{NEG}")


# ---------------------------------------------------------------------------
# 任务收集(断点续做)
# ---------------------------------------------------------------------------
def collect_tasks(limit=None, force=False):
    tasks = []
    story_dirs = sorted([d for d in STORIES_ROOT.iterdir() if d.is_dir()])
    if limit:
        story_dirs = story_dirs[:limit]
    for sd in story_dirs:
        jf = find_story_json(sd)
        if not jf:
            print(f"[跳过] 无可用JSON: {sd.name}", flush=True)
            continue
        try:
            meta = json.loads(jf.read_text(encoding="utf-8", errors="ignore"))
        except Exception:
            print(f"[跳过] JSON解析失败: {sd.name}", flush=True)
            continue
        title = meta.get("title") or sd.name
        synopsis = meta.get("synopsis") or ""
        style = meta.get("illustration_style") or "2D卡通历史写实风格"
        out_base = GENERATED / sd.name
        for vk, framing in VARIANTS.items():
            prompt = build_prompt(title, synopsis, style, framing)
            vdir = out_base / vk
            # 续做校验: 仅合法且非残缺的 PNG 才算"已完成"(避免被杀进程留下的半截文件被跳过)
            valid = 0
            if force is False and vdir.exists():
                for f in vdir.glob("*.png"):
                    try:
                        if f.stat().st_size > 1024 and f.read_bytes()[:8] == b"\x89PNG\r\n\x1a\n":
                            valid += 1
                    except Exception:
                        pass
            existing = valid
            for i in range(existing, N_PER_VARIANT):
                out_path = vdir / f"{vk}_{i+1:03d}.png"
                tasks.append((sd.name, vk, prompt, out_path))
    return tasks


# ---------------------------------------------------------------------------
# 日志(同时写文件 + stdout)
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
    ap = argparse.ArgumentParser(description="生成「上下五千年/E3历史故事/其他」历史故事封面图")
    ap.add_argument("--test", type=int, default=None,
                    help="仅处理前 N 个故事(验证用)。例: --test 1")
    ap.add_argument("--force", action="store_true", help="强制重新生成(忽略已存在的图)")
    ap.add_argument("--dry-run", action="store_true", help="只统计待生成数量, 不实际调用")
    ap.add_argument("--workers", type=int, default=WORKERS_DEFAULT,
                    help=f"并发路数(默认 {WORKERS_DEFAULT}, 手册硬上限 {WORKERS_DEFAULT})。"
                         "每(故事×A/B/C×第几张)都是独立任务, 并发不受故事或提示词种类限制")
    args = ap.parse_args()

    if not STORIES_ROOT.exists():
        print(f"[错误] 故事目录不存在: {STORIES_ROOT}", flush=True)
        sys.exit(1)
    if not DREAMINA.exists():
        print(f"[错误] 即梦 CLI 不存在: {DREAMINA} (可用 DREAMINA_CLI 环境变量指定)", flush=True)
        sys.exit(1)

    log = Logger(LOG_DIR / "10_history_covers.log")

    tasks = collect_tasks(limit=args.test, force=args.force)
    total = len(tasks)
    log.write(f"待生成任务数: {total}"
              + (f" (--test {args.test})" if args.test else "")
              + (" [--force]" if args.force else ""))

    if args.dry_run:
        # 统计每个故事的待生成张数
        from collections import Counter
        c = Counter(t[0] for t in tasks)
        log.write(f"[dry-run] 涉及 {len(c)} 个故事, 共 {total} 张图, 不实际生成")
        for name, n in c.items():
            log.write(f"  - {name}: {n} 张")
        log.close()
        return

    if total == 0:
        log.write("没有需要生成的图(可能都已存在; 如需重生成请加 --force)")
        log.close()
        return

    workers = max(1, min(args.workers, WORKERS_DEFAULT))   # 手册硬上限 7 路
    log.write(f"并发路数: {workers} (手册规定 ≤{WORKERS_DEFAULT})")

    # ---- 调度引擎: 队列 + 7 路 + 2s 首轮错峰 + 全局熔断(对齐手册§7) ----
    task_queue: "queue.Queue[dict]" = queue.Queue()
    for (sn, vk, p, o) in tasks:
        task_queue.put({"sn": sn, "vk": vk, "prompt": p, "out": o})

    lock = threading.Lock()
    done = [0]
    ok_cnt = [0]
    fail_cnt = [0]
    fail_times = []                       # 失败时间戳, 用于全局熔断窗口统计
    meltdown = threading.Event()

    def record_failure() -> bool:
        """记录一次失败; 若 5 分钟窗口内失败总数 ≥ 阈值, 触发熔断并返回 True。"""
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
            ok = gen_image(t["prompt"], t["out"])
            with lock:
                done[0] += 1
                if ok:
                    ok_cnt[0] += 1
                    log.write(f"[OK {done[0]}/{total}] {t['sn']}/{t['vk']}/{t['out'].name}")
                else:
                    log.write(f"[FAIL {done[0]}/{total}] {t['sn']}/{t['vk']}/{t['out'].name}")
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
            time.sleep(STAGGER_S)              # 首轮错峰: 每启一个 Worker 间隔 2s
        for th in threads:
            th.join()
        if meltdown.is_set():                 # 熔断发生, 冷却后清空窗口再续
            time.sleep(MELTDOWN_COOLDOWN)
            with lock:
                fail_times.clear()
            log.write("[熔断恢复] 继续生成剩余任务...")

    log.write(f"完成: 成功 {ok_cnt[0]}, 失败 {fail_cnt[0]}, 共 {done[0]}/{total}")
    log.close()


if __name__ == "__main__":
    main()
