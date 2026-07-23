"""
批量歌曲生成 — 断点续传版
扫描「瞎编的歌曲」下所有 .txt 歌词，每首生成摇篮曲+派对舞曲两个版本。
生成完成后下载 MP3 到歌曲文件同目录，进度记录到 _generation_progress.json。

用法:
    python batch_songs.py              # 继续（自动跳过已完成）
    python batch_songs.py --reset      # 清除进度重新来
    python batch_songs.py --dry-run    # 预览任务列表不执行
    python batch_songs.py --status     # 查看当前进度
"""
import json, os, sys, time, asyncio, hashlib, re, atexit
from datetime import datetime
import argparse

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

try:
    import websockets
except ImportError:
    print("pip install websockets  # missing")
    sys.exit(1)

try:
    import aiohttp
except ImportError:
    print("pip install aiohttp  # missing")
    sys.exit(1)

# ─── 配置 ────────────────────────────────────────────
ROOT_DIR = r"D:\work\work\code\testsuit\公司\项目\酷酷儿童故事\production\generated_stories\瞎编的歌曲"
PROGRESS_FILE = os.path.join(ROOT_DIR, "_generation_progress.json")

# 模型开关：music-2.6 或 music-3.0
#   music-2.6：仅出带歌词歌曲（纯音乐自动跳过），每天 500 首额度
#   music-3.0：全功能（带歌词 + 纯音乐），每天 500 首额度
#   建议正序 2.6 + 倒序 3.0 双跑 → 每日合计 1000 首
MODEL_VERSION = "music-3.0"

# 两个版本的定义（suffix + label 固定，idea 按文件夹动态映射）
VERSION_LULLABY = {"suffix": "", "label": "摇篮曲"}
VERSION_PARTY  = {"suffix": "_Hi", "label": "派对舞曲"}
VERSIONS = [VERSION_LULLABY, VERSION_PARTY]

# 默认风格 idea
DEFAULT_LULLABY_IDEA = "摇篮曲, 极慢速, 轻柔钢琴, 音乐盒, 温柔哼唱, 安静舒缓, 催眠, 放松入睡, lullaby, soft humming, music box, gentle piano, very slow tempo, soothing, sleep aid"
DEFAULT_PARTY_IDEA  = "儿童派对电子舞曲, 超快节奏, 热闹欢腾, 多人合唱和声, 副歌齐唱, 充满能量, 让人想跟着跳, 男女合唱, children's party EDM, ultra fast tempo, energetic, crowd chorus, high energy dance"

# 幼儿专用风格（两版同一风格）
YOUNGER_LULLABY_IDEA = "儿童歌曲, 活泼, 小手拍拍的感觉, 轻快节奏, 铃鼓, 木琴, 欢乐, 让人想动起来, 萌童声, 男童"
YOUNGER_PARTY_IDEA  = "儿童歌曲, 活泼, 小手拍拍的感觉, 轻快节奏, 铃鼓, 木琴, 欢乐, 让人想动起来, 萌童声, 男童"

# 小孩儿/双语歌曲_进阶 专用风格
ADVANCED_LULLABY_IDEA = "摇篮曲, 极慢速, 轻柔钢琴, 音乐盒, 温柔哼唱, 安静舒缓, 催眠, 放松入睡, 英伦风"
ADVANCED_PARTY_IDEA  = "儿童歌曲, 超快节奏, 热闹欢腾, 多人合唱和声, 副歌齐唱, 充满能量, 让人想跟着跳, 混合合唱, 男音, 男声, 英伦风"

# 大孩儿/双语歌曲_进阶、大孩儿/英文歌曲_进阶 专用风格（单版本）
VERSION_ETHEREAL = {"suffix": "（空灵版）", "label": "空灵版"}
VERSION_CUSTOM  = {"suffix": "", "label": "自定义"}  # 青春之歌：每首歌自带风格
VERSION_INSTRUMENTAL = {"suffix": "（纯音乐版）", "label": "纯音乐版"}  # 纯音乐/BGM 专用
ETHEREAL_IDEA = "空灵, 轻灵, 氛围感, 梦幻, 合唱, 风笛, 英伦风, 童话镇"


def is_instrumental_folder(folder_path):
    """判断是否为纯音乐/BGM 文件夹"""
    fp = folder_path.replace('\\', '/').lower()
    keywords = ['纯音乐', '背景音乐', 'bgm', 'instrumental', '伴奏', '自然音效']
    return any(kw in fp for kw in keywords)


def get_version_idea(folder_path, label):
    """根据文件夹路径返回对应的 style idea 字符串"""
    # 标准化路径分隔符
    fp = folder_path.replace('\\', '/')
    # 纯音乐/BGM 文件夹：只有风格，没有歌词
    if is_instrumental_folder(fp):
        return "轻柔钢琴, 氛围音乐, 安静舒缓, 背景音乐, 不抢戏, 适合儿童故事, 温暖治愈, 宁静, 轻灵, 梦幻"
    # 大孩儿/双语歌曲_进阶、大孩儿/英文歌曲_进阶（单版本，空灵风格）
    if '/大孩儿/双语歌曲_进阶' in fp or '/大孩儿/英文歌曲_进阶' in fp:
        return ETHEREAL_IDEA
    # 幼儿目录
    if '/幼儿/' in fp or '/幼儿' == fp or fp.endswith('/幼儿'):
        return YOUNGER_LULLABY_IDEA
    # 小孩儿/双语歌曲_进阶
    if '/小孩儿/双语歌曲_进阶' in fp:
        if label == '派对舞曲':
            return ADVANCED_PARTY_IDEA
        else:
            return ADVANCED_LULLABY_IDEA
    # 默认
    if label == '派对舞曲':
        return DEFAULT_PARTY_IDEA
    return DEFAULT_LULLABY_IDEA

def get_versions_for_folder(folder_path):
    """幼儿/大孩儿进阶/纯音乐文件夹只生成一个版本，其他文件夹双版本"""
    fp = folder_path.replace('\\', '/')
    if '/幼儿/' in fp or '/幼儿' == fp or fp.endswith('/幼儿'):
        return [VERSION_LULLABY]  # 只出摇篮曲一个版本，走幼儿专属风格
    if '/大孩儿/双语歌曲_进阶' in fp or '/大孩儿/英文歌曲_进阶' in fp:
        return [VERSION_ETHEREAL]  # 只出空灵版一个版本
    if '/青春之歌/' in fp:  # 青春之歌单版本，每首歌自带风格
        return [VERSION_CUSTOM]
    if '/其他类型/' in fp:  # 其他类型单版本，每首歌自带风格（首行即风格）
        return [VERSION_CUSTOM]
    if '/蒙学歌曲/' in fp or fp.endswith('/蒙学歌曲'):  # 蒙学歌曲单版本
        return [VERSION_CUSTOM]
    if '/待处理/' in fp or fp.endswith('/待处理'):  # 待处理单版本
        return [VERSION_CUSTOM]
    if is_instrumental_folder(folder_path):  # 纯音乐/BGM 单版本
        return [VERSION_INSTRUMENTAL]
    return [VERSION_CUSTOM]  # 全部单版本：所有歌曲首行即风格

# MiniMax WS 参数（和 minimax_music_auto.py 相同）
FIXED_PARAMS = {
    "device_platform": "web",
    "app_id": "3001",
    "version_code": "22201",
    "biz_id": "1",
    "uuid": "c63ea34a-887a-4b77-b0d8-12dcf22950ba",
    "lang": "zh-Hans",
    "device_id": "528255195446349824",
    "os_name": "Windows",
    "browser_name": "chrome",
    "device_memory": "32",
    "cpu_core_num": "16",
    "browser_language": "zh-CN",
    "browser_platform": "Win32",
    "screen_width": "1440",
    "screen_height": "900",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODYyNTgzODcsInVzZXIiOnsiaWQiOiI0NjA4Nzg5MDE0NDIzNTUyMDciLCJuYW1lIjoi6YOt5paH6LWrIiwiYXZhdGFyIjoiaHR0cHM6Ly90aGlyZHd4LnFsb2dvLmNuL21tb3Blbi92aV8zMi9RMGo0VHdHVGZUTFlJalMwYnhORlo4UXJDOWN2ZWxBUm56dVcwWWJpY0ZGY1ZVa1pRbzkyVFRpY0NzaFAxTTBCaE0wdk9FMkN6UDRhaFlBN0ZZRTdUaWJNdy8xMzIiLCJkZXZpY2VJRCI6IjUyODI1NTE5NTQ0NjM0OTgyNCIsImlzQW5vbnltb3VzIjpmYWxzZX19.kl3igd8qdWJojnedE6zs9wxfIpRnPPPKoclIigAFAgo",
    "op_ticket": "",
}

WS_URL_BASE = "wss://www.minimaxi.com/v1/api/music/ws"
PID_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_batch.lock")


def _is_pid_alive(pid):
    """通过 psutil 检查 PID 是否存活"""
    try:
        import psutil
        return psutil.pid_exists(int(pid))
    except Exception:
        return False

def _is_script_running_by_cmdline(script_name):
    """通过 psutil cmdline 匹配检查脚本是否在运行（不依赖 PID 文件）"""
    try:
        import psutil
        self_pid = os.getpid()
        for proc in psutil.process_iter(['pid', 'cmdline']):
            try:
                if proc.info['pid'] == self_pid:
                    continue
                cmdline_str = ' '.join(proc.info['cmdline'] or [])
                if script_name in cmdline_str and 'minimax_music' in cmdline_str.lower():
                    return True, proc.info['pid']
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
    except Exception:
        pass
    return False, None

def acquire_lock():
    """写 PID 锁文件，防止多实例同时运行（三重保险）"""
    # 保险1：PID 文件检查 — 旧 PID 还活着就拒绝
    if os.path.exists(PID_FILE):
        with open(PID_FILE, 'r') as f:
            old_pid = f.read().strip()
        if old_pid and _is_pid_alive(old_pid):
            log(f"FATAL: batch_songs.py 已在运行 (PID={old_pid})，拒绝启动。")
            sys.exit(1)
    # 写入自己的 PID（保险1 的 PID 文件检查已足以防重复拉起；
    # 外层 daemon/sentry 另有 cmdline 检查兜底，故此处不再做 cmdline 自匹配，
    # 避免 Windows 环境下 os.getpid() 与 psutil pid 不一致导致的自误杀）
    with open(PID_FILE, 'w') as f:
        f.write(str(os.getpid()))


def release_lock():
    try:
        if os.path.exists(PID_FILE):
            os.remove(PID_FILE)
    except Exception:
        pass


def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}", flush=True)


# ─── WS 客户端（从 minimax_music_auto.py 精简） ────────
def build_url():
    unix_ms = int(time.time() * 1000)
    params = dict(FIXED_PARAMS)
    params["unix"] = str(unix_ms)
    params["yy"] = hashlib.md5(f"{unix_ms}{FIXED_PARAMS['device_id']}".encode()).hexdigest()
    import urllib.parse
    qs = urllib.parse.urlencode(params)
    return f"{WS_URL_BASE}?{qs}"


class MusicGenClient:
    def __init__(self):
        self.ws = None
        self.results = {}
        self.heartbeat_task = None
        self.recv_task = None

    async def connect(self):
        url = build_url()
        log(f"WS: {url[:100]}...")
        self.ws = await websockets.connect(url, ping_interval=None)
        log("[CONNECTED]")
        self.recv_task = asyncio.create_task(self._recv_loop())
        self.heartbeat_task = asyncio.create_task(self._heartbeat_loop())
        await self._send_heartbeat()

    async def _send_heartbeat(self):
        hb = {"method": "Heartbeat", "msg_id": f"hb_{int(time.time()*1000)}", "timestamp": int(time.time()*1000)}
        try:
            await self.ws.send(json.dumps(hb))
        except Exception as e:
            pass

    async def _heartbeat_loop(self):
        while True:
            try:
                await asyncio.sleep(7)
                await self._send_heartbeat()
            except asyncio.CancelledError:
                break
            except Exception:
                break

    async def _recv_loop(self):
        recv_count = 0
        try:
            async for msg in self.ws:
                recv_count += 1
                try:
                    d = json.loads(msg)
                except Exception:
                    continue
                method = d.get("method", "")
                data = d.get("data", [])
                if method != "Heartbeat":
                    log(f"  [WS RECV] method={method} data_items={len(data)}")
                for item in data:
                    if isinstance(item, dict):
                        mid = item.get("music_id", item.get("id", ""))
                        if mid and method != "Heartbeat":
                            self.results[mid] = item
                            log(f"  [WS MUSIC_ID] {mid} status={item.get('status','?')}")
        except asyncio.CancelledError:
            pass
        except Exception as e:
            log(f"[RECV ERR] {e}")

    async def generate(self, title, lyrics, idea, instrumental=False):
        msg_id = f"gen_{int(time.time()*1000000)}"
        music_payload = {
            "model": MODEL_VERSION,
            "generation_type": 1,
            "idea": idea,
            "lyrics": lyrics if not instrumental else "",
            "title": title,
            "n": 1,
            "rewrite_idea_switch": False,
            "stream": True,
        }
        if instrumental:
            music_payload["instrumental"] = True
        payload = {
            "method": "MusicGen",
            "music_payLoad": music_payload,
            "msg_id": msg_id,
        }
        log(f"  [SEND] instrumental={instrumental} lyrics_len={len(music_payload['lyrics'])}")
        await self.ws.send(json.dumps(payload, ensure_ascii=False))
        return msg_id

    async def wait_for_music_id(self, timeout=15):
        start = time.time()
        known = set(self.results.keys())
        while time.time() - start < timeout:
            await asyncio.sleep(0.5)
            new_ids = set(self.results.keys()) - known
            for mid in new_ids:
                if self.results[mid].get("status", 0) >= 1:
                    return mid
        return None

    async def wait_done(self, music_id, timeout=120):
        start = time.time()
        last_log = 0
        while time.time() - start < timeout:
            await asyncio.sleep(2)
            item = self.results.get(music_id)
            if not item:
                continue
            st = item.get("status", 0)
            if st in (2, 3):
                return item
            # 每30秒打一条等待日志
            elapsed = int(time.time() - start)
            if elapsed - last_log >= 30:
                last_log = elapsed
                log(f"  [WAITING] {elapsed}s music_id={music_id[:12]}... status={st}")
        return None

    async def try_get_result(self, music_id, timeout=30):
        """尝试获取已有 music_id 的结果（不重新生成，仅轮询已有连接）"""
        start = time.time()
        result = self.results.get(music_id)
        if result and result.get("status") == 2:
            return result
        while time.time() - start < timeout:
            await asyncio.sleep(1)
            result = self.results.get(music_id)
            if result and result.get("status") == 2:
                return result
        return None

    async def close(self):
        if self.heartbeat_task:
            self.heartbeat_task.cancel()
        if self.recv_task:
            self.recv_task.cancel()
        if self.ws:
            await self.ws.close()


async def download(url, dest):
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as resp:
            if resp.status == 200:
                with open(dest, 'wb') as f:
                    async for chunk in resp.content.iter_chunked(8192):
                        f.write(chunk)
                return True
    return False


# ─── 任务扫描 ──────────────────────────────────────────
def scan_songs():
    """扫描所有 .txt 歌词文件，排除根目录的规划文件"""
    tasks = []
    skip_files = {"curriculum plan.txt", "curriculum_plan.txt"}

    for dirpath, dirnames, filenames in os.walk(ROOT_DIR):
        for fn in sorted(filenames):
            if not fn.endswith(".txt"):
                continue
            if fn.lower() in skip_files:
                continue
            # 排除 _generation_progress.json 同目录的规划文件
            if fn.startswith("_"):
                continue

            full_path = os.path.join(dirpath, fn)
            song_name = fn[:-4]  # 去掉 .txt

            task = {
                "path": full_path,
                "name": song_name,
                "folder": dirpath,
            }
            fp = dirpath.replace('\\', '/')

            # ── 统一逻辑：所有歌曲首行都是风格描述 ──
            try:
                with open(full_path, encoding='utf-8') as f:
                    first_line = f.readline().strip()
                if first_line:
                    # 青春之歌格式：首行有前缀，尝试去掉前缀
                    stripped = False
                    for prefix in ['Recommended voice and style: ', 'Recommended voice and style：',
                                   '推荐声线和风格：', '推荐声线和风格:']:
                        if first_line.startswith(prefix):
                            task["custom_idea"] = first_line[len(prefix):].strip()
                            stripped = True
                            break
                    if not stripped:
                        task["custom_idea"] = first_line
            except Exception:
                pass
            # ─────────────────────────────────────────────

            # 纯音乐/BGM 文件夹：整个文件是风格描述（无歌词），重新读取并跳过标题行
            if is_instrumental_folder(dirpath):
                task["is_instrumental"] = True
                try:
                    with open(full_path, encoding='utf-8') as f:
                        content = f.read().strip()
                    # 第一行是标题（与文件名相同），跳过
                    if '\n' in content:
                        _, idea_body = content.split('\n', 1)
                        task["custom_idea"] = idea_body.strip()
                    else:
                        task["custom_idea"] = content
                except Exception:
                    pass

            tasks.append(task)

    return tasks


def load_progress():
    """加载进度文件"""
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE, encoding='utf-8') as f:
            return json.load(f)
    return {}


LOCK_DIR = PROGRESS_FILE + ".lockdir"


def _acquire_file_lock(timeout=1.5):
    """获取进度文件锁（尽力而为）。超时直接清掉可能陈旧的锁目录并返回 False，
    调用方仍会写主文件，不阻塞写入；下次获取即顺畅。"""
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            os.mkdir(LOCK_DIR)
            return True
        except (FileExistsError, PermissionError):
            time.sleep(0.1)
    try:
        os.rmdir(LOCK_DIR)  # 清陈旧锁（正/倒序锁目录各自独立，不会误删对方）
    except Exception:
        pass
    log(f"[WARN] 获取进度文件锁超时 ({timeout}s)，强制写入")
    return False


def _release_file_lock():
    """释放目录锁，重试数次以规避 Windows 偶发删除延迟（防止锁目录泄漏）"""
    for _ in range(5):
        try:
            os.rmdir(LOCK_DIR)
            return
        except Exception:
            time.sleep(0.1)


def save_progress(progress):
    """保存进度文件。目录锁仅作尽力而为的并发保护，无论是否拿到锁都写主文件，
    绝不因锁超时而丢弃写入（此前 bug：超时只写旁路 fallback，主文件永不更新）。"""
    _acquire_file_lock()  # 尽力而为，忽略返回值
    try:
        current = {}
        if os.path.exists(PROGRESS_FILE):
            with open(PROGRESS_FILE, encoding='utf-8') as f:
                try:
                    current = json.load(f)
                except Exception:
                    pass
        current.update(progress)
        tmp = PROGRESS_FILE + ".tmp"
        with open(tmp, 'w', encoding='utf-8') as f:
            json.dump(current, f, ensure_ascii=False, indent=2)
        os.replace(tmp, PROGRESS_FILE)
    except Exception as e:
        log(f"[ERROR] 保存进度文件失败: {e}")
    finally:
        _release_file_lock()


def task_key(song_path, version_label):
    """生成进度 key"""
    # 用相对路径+版本标签
    rel = os.path.relpath(song_path, ROOT_DIR)
    return f"{rel}::{version_label}"


def output_filename(song_name, suffix):
    """生成输出 MP3 文件名"""
    safe = "".join(c for c in f"{song_name}{suffix}" if c.isalnum() or c in ".-_ ()[]（）【】")
    # Windows 文件名不能太长
    if len(safe) > 200:
        safe = safe[:200]
    return f"{safe}.mp3"


def print_status(progress, tasks):
    """打印进度摘要"""
    total = sum(len(get_versions_for_folder(t["folder"])) for t in tasks)
    done = sum(1 for t in tasks for v in get_versions_for_folder(t["folder"])
               if progress.get(task_key(t["path"], v["label"])))
    failed = sum(1 for t in tasks for v in get_versions_for_folder(t["folder"])
                 if progress.get(task_key(t["path"], v["label"]), {}).get("status") in ("failed", "audit_skip"))
    remaining = total - done
    print(f"\n总任务: {total} | 已完成: {done} | 失败: {failed} | 剩余: {remaining}")
    print(f"进度: {done/total*100:.1f}%\n")
    return remaining


def sync_filesystem(progress, tasks):
    """扫描文件系统，把已有文件但进度里没标的补标为 success"""
    synced = 0
    for t in tasks:
        for v in get_versions_for_folder(t["folder"]):
            key = task_key(t["path"], v["label"])
            if progress.get(key, {}).get("status") == "success":
                continue
            out_name = output_filename(t["name"], v["suffix"])
            out_path = os.path.join(os.path.dirname(t["path"]), out_name)
            if os.path.exists(out_path) and os.path.getsize(out_path) > 10000:
                progress[key] = {"status": "success", "file": out_path, "time": datetime.now().isoformat()}
                synced += 1
    if synced:
        save_progress(progress)
        log(f"[SYNC] 文件系统扫描：补标 {synced} 个已有文件为 success")
    return synced


# ─── 主流程 ────────────────────────────────────────────
async def main(dry_run=False, reset=False, max_songs=None):
    # 启动日期标记（供条件杀进程哨兵统计"当日生成"用，不含 [DOWNLOADED]，不影响统计）
    print(f"===== {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} 启动 (PID={os.getpid()}) =====", flush=True)
    # 扫描
    tasks = scan_songs()
    log(f"扫描到 {len(tasks)} 首歌曲")
    if not tasks:
        log("没有找到歌曲文件！")
        return

    # 进度
    if reset:
        progress = {}
        save_progress(progress)
        log("进度已重置")
    else:
        progress = load_progress()

    # 先扫描文件系统，把已有文件补标为 success（避免重复发任务）
    synced = sync_filesystem(progress, tasks)
    if synced:
        log(f"[SYNC] 文件系统扫描：{synced} 个已有文件已补标")

    # 构建待处理列表
    pending = []
    for t in tasks:
        for v in get_versions_for_folder(t["folder"]):
            key = task_key(t["path"], v["label"])
            # 先检查文件是否已存在（双保险）
            out_name = output_filename(t["name"], v["suffix"])
            out_path = os.path.join(os.path.dirname(t["path"]), out_name)
            if os.path.exists(out_path) and os.path.getsize(out_path) > 10000:
                if key not in progress or progress[key].get("status") != "success":
                    progress[key] = {"status": "success", "file": out_path, "time": datetime.now().isoformat()}
                    save_progress(progress)
                continue
            if key not in progress or progress[key].get("status") != "success":
                # 2.6 不支持纯音乐，跳过纯音乐任务
                if t.get("is_instrumental") and MODEL_VERSION == "music-2.6":
                    continue
                pending.append((t, v, key))

    log(f"待生成: {len(pending)} 个版本")

    if dry_run:
        print("\n--- 预览前 20 条 ---")
        for i, (t, v, key) in enumerate(pending[:20]):
            print(f"  {i+1}. [{v['label']}] {t['name']}")
        print(f"  ... 共 {len(pending)} 条")
        return

    if max_songs:
        pending = pending[:max_songs]

    if not pending:
        log("全部完成！")
        print_status(progress, tasks)
        return

    print_status(progress, tasks)

    # 连接 WS
    client = MusicGenClient()
    await client.connect()
    await asyncio.sleep(5)

    success = 0
    fail = 0

    for idx, (t, v, key) in enumerate(pending):
        song_name = t["name"]
        title = f"{song_name}{v['suffix']}"
        folder = t["folder"]

        # 双保险：检查文件是否已存在（可能别的脚本刚生成完）
        out_name = output_filename(song_name, v["suffix"])
        out_path = os.path.join(folder, out_name)
        if os.path.exists(out_path) and os.path.getsize(out_path) > 10000:
            log(f"[SKIP] 文件已存在: {out_name}")
            if key not in progress or progress[key].get("status") != "success":
                progress[key] = {"status": "success", "file": out_path, "time": datetime.now().isoformat()}
                save_progress(progress)
            success += 1
            continue

        lyrics_path = t["path"]

        # 读取歌词（统一：首行是风格，跳过首行取歌词）
        if t.get("is_instrumental"):
            lyrics = ""
        else:
            try:
                with open(lyrics_path, encoding='utf-8') as f:
                    content = f.read().strip()
                # 统一：首行是风格描述，跳过首行
                if '\n' in content:
                    lyrics = content.split('\n', 1)[1].strip()
                else:
                    lyrics = ""  # 只有一行（风格），无歌词
            except Exception as e:
                log(f"[ERR] 读取歌词失败: {lyrics_path}: {e}")
                progress[key] = {"status": "failed", "error": str(e), "time": datetime.now().isoformat()}
                save_progress(progress)
                fail += 1
                continue

            # 跳过空歌词（但有文件名的可能是占位文件）— 纯音乐不在此处跳过
            if not lyrics:
                log(f"[SKIP] 空歌词: {song_name}")
                progress[key] = {"status": "success", "note": "empty lyrics", "time": datetime.now().isoformat()}
                save_progress(progress)
                continue

        log(f"\n[{idx+1}/{len(pending)}] [{v['label']}] {title}")
        log(f"  歌词长度: {len(lyrics)} 字符")

        # ── 缓存拉取：如果有保存的 music_id，先尝试直接下载 ──
        saved_mid = progress.get(key, {}).get("music_id")
        if saved_mid:
            log(f"  [CACHE] 已有 music_id={saved_mid[:16]}... 尝试拉取")
            cached = await client.try_get_result(saved_mid, timeout=30)
            if cached and cached.get("audio_url"):
                try:
                    if await download(cached["audio_url"], out_path):
                        sz = os.path.getsize(out_path) / 1024
                        log(f"  [CACHE HIT] {out_name} ({sz:.1f} KB)")
                        progress[key] = {
                            "status": "success",
                            "title": title,
                            "music_id": saved_mid,
                            "audio_url": cached["audio_url"],
                            "duration_ms": cached.get("duration", 0),
                            "file": out_name,
                            "time": datetime.now().isoformat(),
                            "cached": True,
                        }
                        save_progress(progress)
                        success += 1
                        continue
                except Exception as e:
                    log(f"  [CACHE DL ERR] {e}")
            log("  [CACHE MISS] 拉取不到，重新生成")

        # 提交生成
        try:
            idea = t.get("custom_idea") or get_version_idea(t["folder"], v["label"])
            await client.generate(title=title, lyrics=lyrics, idea=idea, instrumental=t.get("is_instrumental", False))
        except Exception as e:
            log(f"[ERR] 提交失败: {e}")
            progress[key] = {"status": "failed", "error": str(e), "time": datetime.now().isoformat()}
            save_progress(progress)
            fail += 1
            # 重新连接
            try:
                await client.close()
                await asyncio.sleep(2)
                client = MusicGenClient()
                await client.connect()
                await asyncio.sleep(1)
            except Exception:
                log("[!!] 重连失败，退出")
                break
            continue

        # 等 music_id（只试一次，失败直接标失败跳下一首）
        # 统一60s超时
        _wt = 60
        music_id = await client.wait_for_music_id(timeout=_wt)
        if not music_id:
            log("[ERR] 未收到 music_id，跳过本首")
            progress[key] = {"status": "failed", "error": "no music_id", "time": datetime.now().isoformat()}
            save_progress(progress)
            fail += 1
            # 重连保证后续任务可用
            try:
                await client.close()
                await asyncio.sleep(2)
                client = MusicGenClient()
                await client.connect()
                await asyncio.sleep(1)
            except Exception:
                log("[!!] 重连失败，退出")
                break
            continue

        # 等完成（music-3.0 出曲较慢~180s+：纯音乐360s，普通300s）
        _done_timeout = 360 if t.get("is_instrumental") else 300
        result = await client.wait_done(music_id, timeout=_done_timeout)
        if not result:
            log("[TIMEOUT]")
            progress[key] = {"status": "failed", "error": "timeout", "music_id": music_id, "time": datetime.now().isoformat()}
            save_progress(progress)
            fail += 1
            continue

        if result.get("status") == 2:
            audio_url = result.get("audio_url", "")
            duration = result.get("duration", 0)
            log(f"  [OK] duration={duration/1000:.1f}s url={audio_url[:80]}...")

            if audio_url:
                out_name = output_filename(song_name, v["suffix"])
                out_path = os.path.join(folder, out_name)
                try:
                    if await download(audio_url, out_path):
                        size = os.path.getsize(out_path) / 1024
                        log(f"  [DOWNLOADED] {out_name} ({size:.1f} KB)")
                        progress[key] = {
                            "status": "success",
                            "title": title,
                            "music_id": music_id,
                            "audio_url": audio_url,
                            "duration_ms": duration,
                            "file": out_name,
                            "time": datetime.now().isoformat(),
                        }
                        success += 1
                    else:
                        log("[ERR] 下载失败")
                        progress[key] = {"status": "failed", "error": "download failed", "time": datetime.now().isoformat()}
                        fail += 1
                except Exception as e:
                    log(f"[ERR] 下载异常: {e}")
                    progress[key] = {"status": "failed", "error": f"download: {e}", "time": datetime.now().isoformat()}
                    fail += 1
            else:
                log("[AUDIT] 生成成功但无 audio_url（审核状态），跳过")
                progress[key] = {"status": "audit_skip", "error": "no audio_url (auditing)", "time": datetime.now().isoformat()}
                fail += 1
        else:
            log(f"[FAILED] status={result.get('status')}")
            progress[key] = {"status": "failed", "error": f"status={result.get('status')}", "time": datetime.now().isoformat()}
            fail += 1

        # 每完成一个就保存进度
        save_progress(progress)

        # 输出短统计
        done_so_far = sum(1 for k, v2 in progress.items() if v2.get("status") == "success")
        log(f"  --- 累计成功: {done_so_far}/{len(pending)} (本批成功{success}, 失败{fail}) ---")

    # ─── 重试失败任务 ──────────────────────────────────
    await client.close()

    failed_keys = [k for k, v in progress.items() if v.get("status") == "failed"]
    if failed_keys:
        log(f"\n{'='*60}")
        log(f"主流程完成，开始重试 {len(failed_keys)} 个失败任务...")

        client = MusicGenClient()
        await client.connect()
        await asyncio.sleep(1)

        retry_round = 0
        max_rounds = 3

        while retry_round < max_rounds:
            retry_round += 1
            failed_keys = [k for k, v in progress.items() if v.get("status") == "failed"]
            if not failed_keys:
                log("所有失败任务已全部重试成功！")
                break

            log(f"\n[RETRY ROUND {retry_round}/{max_rounds}] 剩余 {len(failed_keys)} 个")

            retry_ok = 0

            for key in list(failed_keys):
                if "::" not in key:
                    continue
                rel_path, version_label = key.split("::", 1)
                song_path = os.path.join(ROOT_DIR, rel_path)

                if not os.path.exists(song_path):
                    log(f"[SKIP] 文件不存在: {rel_path}")
                    del progress[key]
                    save_progress(progress)
                    continue

                # 审核状态的任务不重试（平台扣留，不会突然变好）
                if progress.get(key, {}).get("status") == "audit_skip":
                    log(f"[SKIP] 审核状态，跳过: {song_name[:30]} [{version_label}]")
                    continue

                song_name = os.path.splitext(os.path.basename(song_path))[0]
                folder = os.path.dirname(song_path)

                # 读取歌词（青春之歌提取风格，BGM 纯音乐跳过歌词）
                fp = folder.replace('\\', '/')
                retry_idea = None
                is_instrumental_retry = is_instrumental_folder(folder)
                try:
                    with open(song_path, encoding='utf-8') as f:
                        content = f.read().strip()
                    
                    if is_instrumental_retry:
                        # 纯音乐：整个文件是风格描述，跳过第一行标题
                        lyrics = ""
                        if '\n' in content:
                            _, idea_body = content.split('\n', 1)
                            retry_idea = idea_body.strip()
                        else:
                            retry_idea = content
                    else:
                        # 统一：首行是风格，跳过首行取歌词
                        if '\n' in content:
                            first_line, lyrics = content.split('\n', 1)
                            # 青春之歌格式：首行有前缀
                            stripped = False
                            for prefix in ['Recommended voice and style: ', 'Recommended voice and style：',
                                           '推荐声线和风格：', '推荐声线和风格:']:
                                if first_line.startswith(prefix):
                                    retry_idea = first_line[len(prefix):].strip()
                                    stripped = True
                                    break
                            if not stripped:
                                retry_idea = first_line.strip()
                            lyrics = lyrics.strip()
                        else:
                            retry_idea = content
                            lyrics = ""
                except Exception as e:
                    log(f"[ERR] 读取歌词失败: {e}")
                    continue

                if not is_instrumental_retry and not lyrics:
                    log(f"[SKIP] 空歌词: {song_name}")
                    progress[key] = {"status": "success", "note": "empty lyrics (retry)", "time": datetime.now().isoformat()}
                    save_progress(progress)
                    retry_ok += 1
                    continue

                version = None
                for v in get_versions_for_folder(folder):
                    if v["label"] == version_label:
                        version = v
                        break

                if not version:
                    log(f"[ERR] 找不到版本配置: {version_label}")
                    continue

                title = f"{song_name}{version['suffix']}"
                log(f"\n  [RETRY {retry_round}] [{version['label']}] {title}")

                # ── 缓存拉取：如果有保存的 music_id，先尝试直接下载 ──
                saved_mid = progress.get(key, {}).get("music_id")
                if saved_mid:
                    log(f"  [CACHE] 已有 music_id={saved_mid[:16]}... 尝试拉取")
                    retry_out_name = output_filename(song_name, version["suffix"])
                    retry_out_path = os.path.join(folder, retry_out_name)
                    cached = await client.try_get_result(saved_mid, timeout=30)
                    if cached and cached.get("audio_url"):
                        try:
                            if await download(cached["audio_url"], retry_out_path):
                                sz = os.path.getsize(retry_out_path) / 1024
                                log(f"  [CACHE HIT] {retry_out_name} ({sz:.1f} KB)")
                                progress[key] = {
                                    "status": "success",
                                    "title": title,
                                    "music_id": saved_mid,
                                    "audio_url": cached["audio_url"],
                                    "duration_ms": cached.get("duration", 0),
                                    "file": retry_out_name,
                                    "time": datetime.now().isoformat(),
                                    "cached": True,
                                    "retried": True,
                                    "retry_round": retry_round,
                                }
                                save_progress(progress)
                                retry_ok += 1
                                continue
                        except Exception as e:
                            log(f"  [CACHE DL ERR] {e}")
                    log("  [CACHE MISS] 拉取不到，重新生成")

                try:
                    idea = retry_idea or get_version_idea(folder, version["label"])
                    await client.generate(title=title, lyrics=lyrics, idea=idea, instrumental=is_instrumental_retry)
                except Exception as e:
                    log(f"[ERR] 提交失败: {e}")
                    try:
                        await client.close()
                        await asyncio.sleep(2)
                        client = MusicGenClient()
                        await client.connect()
                        await asyncio.sleep(1)
                    except Exception:
                        log("[!!] 重连失败，退出重试")
                        break
                    continue

                _wt2 = 60
                music_id = await client.wait_for_music_id(timeout=_wt2)
                if not music_id:
                    log("[ERR] 未收到 music_id（重试）")
                    try:
                        await client.close()
                        await asyncio.sleep(2)
                        client = MusicGenClient()
                        await client.connect()
                        await asyncio.sleep(1)
                    except Exception:
                        log("[!!] 重连失败，退出重试")
                        break
                    continue

                _done_timeout2 = 360 if is_instrumental_retry else 300
                result = await client.wait_done(music_id, timeout=_done_timeout2)
                if not result:
                    log("[TIMEOUT]")
                    progress[key] = {"status": "failed", "error": "timeout", "music_id": music_id, "time": datetime.now().isoformat()}
                    save_progress(progress)
                    continue

                if result.get("status") == 2:
                    audio_url = result.get("audio_url", "")
                    duration = result.get("duration", 0)
                    log(f"  [OK] duration={duration/1000:.1f}s")

                    if audio_url:
                        out_name = output_filename(song_name, version["suffix"])
                        out_path = os.path.join(folder, out_name)
                        try:
                            if await download(audio_url, out_path):
                                size = os.path.getsize(out_path) / 1024
                                log(f"  [DOWNLOADED] {out_name} ({size:.1f} KB)")
                                progress[key] = {
                                    "status": "success",
                                    "title": title,
                                    "music_id": music_id,
                                    "audio_url": audio_url,
                                    "duration_ms": duration,
                                    "file": out_name,
                                    "time": datetime.now().isoformat(),
                                    "retried": True,
                                    "retry_round": retry_round,
                                }
                                save_progress(progress)
                                retry_ok += 1
                            else:
                                log("[ERR] 下载失败")
                        except Exception as e:
                            log(f"[ERR] 下载异常: {e}")
                    else:
                        log("[AUDIT] 生成成功但无 audio_url（审核状态），跳过")
                        progress[key] = {"status": "audit_skip", "error": "no audio_url (auditing)", "time": datetime.now().isoformat()}
                else:
                    log(f"[FAILED] status={result.get('status')}")

            log(f"[RETRY ROUND {retry_round}] 本轮成功: {retry_ok}")
            if retry_ok == 0:
                log("本轮无成功任务，停止重试")
                break

        log("重试完成")

    # 收尾
    try:
        await client.close()
    except Exception:
        pass

    log(f"\n{'='*60}")
    log(f"全部完成！")
    print_status(progress, tasks)


if __name__ == "__main__":
    acquire_lock()
    atexit.register(release_lock)

    parser = argparse.ArgumentParser(description="批量歌曲生成 — 断点续传")
    parser.add_argument("--reset", action="store_true", help="清除所有进度，重新开始")
    parser.add_argument("--dry-run", action="store_true", help="预览任务列表，不实际执行")
    parser.add_argument("--status", action="store_true", help="查看当前进度")
    parser.add_argument("--max", type=int, default=0, metavar="N", help="最多生成 N 条（测试用）")
    args = parser.parse_args()

    if args.status:
        tasks = scan_songs()
        progress = load_progress()
        print_status(progress, tasks)
        # 列出最近完成的 10 条
        completed = [(k, v) for k, v in progress.items() if v.get("status") == "success"]
        if completed:
            print("最近完成:")
            for k, v in sorted(completed, key=lambda x: x[1].get("time", ""), reverse=True)[:10]:
                print(f"  {v.get('time','?')[:16]} {v.get('title','?')}")
        sys.exit(0)

    asyncio.run(main(
        dry_run=args.dry_run,
        reset=args.reset,
        max_songs=args.max if args.max > 0 else None,
    ))
