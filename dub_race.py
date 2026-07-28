"""dub_race.py — 每条失败项起 N 个并发尝试(默认30)，每条尝试最多重试10次；
任意一个生成合格(非 bad duration)的 mp3 即采用，并立即中止该条其余并发与重试。
复用 dub_all.py 的原始时长校验(不放开阈值)。"""
import json, base64, time, hashlib, threading, requests
from pathlib import Path
from collections import deque
from concurrent.futures import ThreadPoolExecutor
from io import BytesIO
from mutagen.mp3 import MP3

BASE = Path(r"d:\work\work\code\testsuit\公司\项目\酷酷儿童故事")
PROD = BASE / "production/generated_stories"
AUDIO_OUT = BASE / "production" / "audio"
VOICE_BANK = BASE / "voice_bank" / "samples"
PROGRESS_FILE = BASE / "production" / "tts_progress.json"
DEDUP_CACHE = BASE / "production" / "tts_dedup.json"

cfg = json.load(open(BASE / "config" / "tts_providers.json"))["mimo"]
API_KEY = cfg["api_key"]
H = {"api-key": API_KEY, "Content-Type": "application/json"}
URL = "https://token-plan-cn.xiaomimimo.com/v1/chat/completions"
RPM = 300

rate_q = deque(); rl = threading.Lock()
def rate_limit():
    with rl:
        now = time.time()
        while rate_q and rate_q[0] < now - 60: rate_q.popleft()
        if len(rate_q) >= RPM:
            wait = rate_q[0] + 60 - now + 0.1
            if wait > 0: time.sleep(wait)
        rate_q.append(time.time())

MOOD_MAP = {
    "happy": "语气开心雀跃，轻快活泼，像在笑",
    "excited": "语气激动兴奋，充满期待", "exciting": "语气激动兴奋，充满期待",
    "sad": "语气有点低落地，轻轻的，带着一点点难过",
    "brave": "语气坚定有力，声音响亮", "curious": "语气充满好奇，声调上扬",
    "teaching": "语气耐心温和，像老师在认真讲解",
    "calm": "语气平静安稳",
    "warm": "语气温暖柔和，像阳光照在身上",
    "surprised": "语气惊讶，声调突然升高",
    "nervous": "语气有点紧张",
    "mysterious": "语气神秘好奇，压低声音",
    "neutral": "",
}
UNIVERSAL_HINT = "发音清晰，日常交流语速，绝对不要加速减速。"

def _is_poem_text(text):
    import re
    phrases = re.split(r'[，。！？、；：\s]+', text)
    phrases = [p for p in phrases if len(p) >= 2]
    if len(phrases) < 2:
        return False
    poem_like = sum(1 for p in phrases if len(p) in (3, 4, 5, 7))
    return poem_like / len(phrases) > 0.6

def get_subject_hint(rel_dir, char="", seg_type="", text=""):
    hint = ""
    if "F1识字" in rel_dir:
        hint = "你现在是语文老师，正在教小朋友识字认字。汉字发音要标准清晰，偏旁部首名称读完整，拼音声调读准确。特别要注意多音字：根据上下文判断正确读音，比如'教'读jiào（教育）不是jiāo（教书）。"
    elif "F5拼音" in rel_dir:
        hint = "你现在是语文老师，正在教小朋友汉语拼音。声母、韵母、声调发音要非常准确清晰。"
    elif "F2英语" in rel_dir:
        hint = "你现在是中英双语老师，正在教小朋友英语。注意：这是中英文混杂的课堂——读到中文时用标准普通话发音，读到英文单词或句子时切换到标准英语发音，注意单词字母拼读。整体语气温暖鼓励，像在双语课堂上领读。"
    elif "F3数学" in rel_dir:
        hint = "你现在是数学老师，正在教小朋友数学。注意运算符号（加号、减号、乘号、除号、等号）发音要清晰准确，数字读清楚。"
    elif "F4思维" in rel_dir:
        hint = "你现在是老师，正在引导小朋友进行思维训练。语气启发式，温和有耐心，声调有引导感。"
    elif "F7财商" in rel_dir:
        hint = "你现在是老师，正在给小朋友讲解财商知识。语气亲切、讲解清晰，像在讲故事一样传授理财常识。"
    elif "F10口才" in rel_dir:
        hint = "你现在是口才老师，正在教小朋友表达和演讲。语气自信、清晰有力，做示范时注意语调的抑扬顿挫。"
    elif "诗词天地" in rel_dir:
        if _is_poem_text(text):
            hint = "你现在在朗诵中国古诗词。务必要有饱满的情感表达——读到激昂时声音洪亮豪迈，读到婉约时轻柔细腻，读到伤感时低沉缓慢。严格把握诗词格律韵律和节奏。特别注意多音字：根据诗词意境和押韵判断正确读音，例如'教'在诗词中常读jiào，'行'可能是xíng或háng，'长'可能是cháng或zhǎng。咬字清晰，韵味十足，像专业朗诵者一样投入感情。"
    elif "蒙学经典" in rel_dir:
        if _is_poem_text(text):
            hint = "你现在在朗诵蒙学经典。务必要有抑扬顿挫的情感表达——像老师在课堂上领读，声音有节奏感、有温度。特别注意多音字：根据文意判断正确读音，例如'苟不教，性乃迁'中的'教'读jiào（四声），'教不严，师之惰'中的'教'也读jiào。咬字清晰，每个字都读得饱满有韵味，让小朋友感受到经典的韵律美。"
    return hint.strip()

voice_cache = {}
def load_voice(vid):
    if vid in voice_cache: return voice_cache[vid]
    f = VOICE_BANK / f"{vid}.mp3"
    if not f.exists():
        for mp3 in VOICE_BANK.glob("*.mp3"):
            if mp3.stem.startswith(vid.split("-")[0]):
                f = mp3; break
    if f.exists():
        b64 = base64.b64encode(f.read_bytes()).decode()
        voice_cache[vid] = f"data:audio/mpeg;base64,{b64}"
        return voice_cache[vid]
    return None

dedup = {}
if DEDUP_CACHE.exists():
    dedup = json.load(open(DEDUP_CACHE, "r", encoding="utf-8"))

# 原始时长校验 — 不放开阈值
def is_bad_duration(text, audio_bytes):
    try:
        dur = MP3(BytesIO(audio_bytes)).info.length
    except:
        return True  # can't parse = assume bad
    chars = len(text.replace(' ', '').replace('~', '').strip())
    if chars == 0:
        return False
    if chars <= 2 and dur > 1.0: return True
    if chars <= 5 and dur > 2.0: return True
    if chars <= 10 and dur > 4.0: return True
    if chars <= 30 and dur / chars > 0.8: return True
    return False

PER_ITEM_WORKERS = 30   # 每条失败项并发尝试数
MAX_RETRY = 10          # 每个尝试最多重试次数

# ---- 解析失败日志 ----
print("📖 读取失败记录...")
prog = json.load(open(PROGRESS_FILE, "r", encoding="utf-8"))
failed_entries = prog.get("failed", [])
print(f"失败条目: {len(failed_entries)}")

items = []      # 可重跑的失败项
skipped = []    # 找不到文本/voice 的，保留原样
succ_keys = set(); fail_errors = {}; glo = threading.Lock()

for fe in failed_entries:
    key = fe.get("key", "")
    if "/" not in key:
        skipped.append(fe); continue
    rel_dir, seg_id = key.rsplit("/", 1)
    segf = PROD / rel_dir / "segments.json"
    text = None; char = "旁白"; mood = "neutral"; seg_type = ""
    if segf.exists():
        try:
            data = json.load(open(segf, "r", encoding="utf-8"))
            for s in data.get("segments", []):
                if s.get("id") == seg_id:
                    text = s.get("text", "").strip()
                    char = s.get("character", "旁白")
                    mood = s.get("mood", "neutral")
                    seg_type = s.get("type", "")
                    break
        except Exception:
            pass
    if not text:
        skipped.append(fe); continue
    vid = fe.get("vid", "")
    if not vid:
        skipped.append(fe); continue
    text_hash = hashlib.md5(text.encode()).hexdigest()
    dk = f"{vid}/{text_hash}"
    out_file = AUDIO_OUT / rel_dir / f"{seg_id}.mp3"
    # 输出文件已存在且足够大 => 视为已成功，直接移除
    if out_file.exists() and out_file.stat().st_size > 500:
        succ_keys.add(key); continue
    subject_hint = get_subject_hint(rel_dir, char, seg_type, text)
    mood_inst = MOOD_MAP.get(mood, "")
    parts = []
    if subject_hint: parts.append(subject_hint)
    if mood_inst: parts.append(f"朗读时保持以下情绪：{mood_inst}")
    user_msg = (UNIVERSAL_HINT + " " + " ".join(parts) + " " + UNIVERSAL_HINT).strip()
    items.append({
        "key": key, "dk": dk, "out_file": str(out_file),
        "vid": vid, "text": text, "user_msg": user_msg,
    })

print(f"可重跑项: {len(items)} | 跳过(缺文本/voice): {len(skipped)} | 已存在音频直接成功: {len(succ_keys)}")
print(f"策略: 每项 {PER_ITEM_WORKERS} 并发 x 每项最多 {MAX_RETRY} 次重试 | 限速 {RPM}/min")

def save_progress():
    with glo:
        new_failed = []
        for fe in failed_entries:
            k = fe.get("key", "")
            if k in succ_keys: continue
            if k in fail_errors:
                fe = dict(fe); fe["error"] = fail_errors[k]
            new_failed.append(fe)
        new_failed.extend(skipped)
        with open(PROGRESS_FILE, "w", encoding="utf-8") as fp:
            json.dump({"failed": new_failed}, fp)
        with open(DEDUP_CACHE, "w", encoding="utf-8") as fp:
            json.dump(dedup, fp)

def try_once(task, won, write_lock):
    """单个尝试：最多重试 MAX_RETRY 次，产出合格 mp3 即返回 True 并置 won。"""
    for attempt in range(MAX_RETRY):
        if won.is_set():
            return False
        try:
            voice_data = load_voice(task["vid"])
            if not voice_data:
                raise Exception("no voice sample")
            rate_limit()
            r = requests.post(URL, headers=H, json={
                "model": "mimo-v2.5-tts-voiceclone",
                "messages": [
                    {"role": "user", "content": task["user_msg"]},
                    {"role": "assistant", "content": task["text"]}
                ],
                "audio": {"format": "mp3", "voice": voice_data}
            }, timeout=120)
            if r.status_code == 429:
                time.sleep(3 * (attempt + 1)); continue
            if r.status_code != 200:
                raise Exception(f"HTTP {r.status_code}: {r.text[:100]}")
            audio_bytes = base64.b64decode(r.json()["choices"][0]["message"]["audio"]["data"])
            if is_bad_duration(task["text"], audio_bytes):
                # 时长超标 => 当作可重试条件，再生成一次可能就合规
                time.sleep(min(2 ** attempt, 30)); continue
            # 合格！写入并宣告胜出
            with write_lock:
                out = Path(task["out_file"])
                out.parent.mkdir(parents=True, exist_ok=True)
                out.write_bytes(audio_bytes)
                dedup[task["dk"]] = str(out.relative_to(AUDIO_OUT))
            won.set()
            return True
        except (requests.exceptions.Timeout, requests.exceptions.ConnectionError,
                ConnectionResetError, TimeoutError) as e:
            time.sleep(min(2 ** attempt, 30)); continue
        except Exception as e:
            if "no voice sample" in str(e):
                return False
            time.sleep(min(2 ** attempt, 30)); continue
    return False

def race_item(item):
    task = {"vid": item["vid"], "text": item["text"], "user_msg": item["user_msg"],
            "dk": item["dk"], "out_file": item["out_file"]}
    won = threading.Event()
    write_lock = threading.Lock()
    threads = []
    for _ in range(PER_ITEM_WORKERS):
        t = threading.Thread(target=try_once, args=(task, won, write_lock))
        t.start(); threads.append(t)
    for t in threads:
        t.join()
    with glo:
        if won.is_set():
            succ_keys.add(item["key"])
            fail_errors.pop(item["key"], None)
            print(f"  ✅ 胜出: {item['text']}")
        else:
            fail_errors[item["key"]] = f"race exhausted: {PER_ITEM_WORKERS}x{MAX_RETRY} 均 bad duration/失败"
            print(f"  ❌ 仍失败: {item['text']}")
        save_progress()  # 每项跑完即落盘

if not items:
    print("\n✅ 没有需要重跑的任务!")
else:
    print(f"\n🎙️ 开始竞速重跑({len(items)} 项, 每项 {PER_ITEM_WORKERS} 并发)...")
    t0 = time.time()
    with ThreadPoolExecutor(max_workers=len(items)) as ex:
        list(ex.map(race_item, items))
    elapsed = time.time() - t0
    print(f"\n✅ 本轮成功: {len(succ_keys)} | ❌ 仍失败: {len(fail_errors)} | ⏱ {elapsed/60:.1f}min")
    print(f"剩余失败已写回 {PROGRESS_FILE.name}")
