"""逐句配音 v3 — 全量 + 学科特色提示 + 去重 + 断点续跑 + 时长校验"""
import json, base64, time, hashlib, threading, requests
from pathlib import Path
from collections import deque
from concurrent.futures import ThreadPoolExecutor, as_completed
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
    """Detect if text is poetry/classic verse (5/7 char lines) vs regular narration"""
    # Split by Chinese punctuation to get phrases
    import re
    phrases = re.split(r'[，。！？、；：\s]+', text)
    phrases = [p for p in phrases if len(p) >= 2]
    if len(phrases) < 2:
        return False
    # Count how many phrases match classic poem patterns (3/4/5/7 chars)
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
    hint = hint.strip()
    return hint

# Voice cache
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

# Load dedup cache
dedup = {}
if DEDUP_CACHE.exists():
    dedup = json.load(open(DEDUP_CACHE, "r", encoding="utf-8"))

# Load progress
done_ids = set()
failed_log = []
if PROGRESS_FILE.exists():
    pdata = json.load(open(PROGRESS_FILE, "r", encoding="utf-8"))
    done_ids = set(pdata.get("done", []))
    failed_log = pdata.get("failed", [])
    print(f"断点续跑: 已完成 {len(done_ids)} 句, 失败 {len(failed_log)} 句")

# Collect tasks
print("📖 扫描台词...")
instances = []       # all output targets
tasks = []           # unique TTS tasks (deduped)
total_t = 0; narrator_t = 0; no_voice_t = 0
dedup_hits = 0

for segf in sorted(PROD.rglob("segments.json")):
    rel_dir = str(segf.parent.relative_to(PROD))
    try: data = json.load(open(segf, 'r', encoding='utf-8'))
    except: continue
    
    for s in data.get("segments", []):
        text = s.get("text", "").strip()
        if not text: continue
        total_t += 1
        char = s.get("character", "旁白")
        if char == "旁白": narrator_t += 1
        vid = s.get("voice_id", "")
        if not vid: no_voice_t += 1; continue
        seg_id = s.get("id", "")
        mood = s.get("mood", "neutral")
        
        key = f"{rel_dir}/{seg_id}"
        if key in done_ids: continue
        
        out_file = AUDIO_OUT / rel_dir / f"{seg_id}.mp3"
        if out_file.exists() and out_file.stat().st_size > 500:
            done_ids.add(key)
            continue
        
        # Build user message
        seg_type = s.get("type", "")
        subject_hint = get_subject_hint(rel_dir, char, seg_type, text)
        mood_inst = MOOD_MAP.get(mood, "")
        parts_msg = []
        if subject_hint:
            parts_msg.append(subject_hint)
        if mood_inst:
            parts_msg.append(f"朗读时保持以下情绪：{mood_inst}")
        user_msg = UNIVERSAL_HINT + " " + " ".join(parts_msg) + " " + UNIVERSAL_HINT
        user_msg = user_msg.strip()
        
        # Dedup key: (voice_id, text_md5)
        text_hash = hashlib.md5(text.encode()).hexdigest()
        dk = f"{vid}/{text_hash}"
        
        instances.append({
            "key": key, "dk": dk, "out_file": str(out_file),
            "vid": vid, "text": text, "story_dir": rel_dir,
            "seg_id": seg_id, "char": char, "mood": mood,
        })
        
        if dk in dedup:
            dedup_hits += 1
        else:
            tasks.append({"dk": dk, "vid": vid, "text": text, "user_msg": user_msg})

# De-duplicate tasks
seen = {}
unique_tasks = []
for t in tasks:
    if t["dk"] not in seen:
        seen[t["dk"]] = t
        unique_tasks.append(t)
tasks = unique_tasks

print(f"总: {total_t} | 旁白: {narrator_t} | 无voice: {no_voice_t}")
print(f"已完成: {len(done_ids)} | 实例数: {len(instances)} | 去重命中: {dedup_hits}")
print(f"唯一TTS任务: {len(tasks)} | 限速: {RPM}/min | 预估: {len(tasks)//RPM}分钟")

total_tasks = len(tasks)
done = [0]; lock = threading.Lock()

# Distribute dedup cache hits first
if dedup:
    print(f"📋 分发 {dedup_hits} 个去重缓存...")
    count = 0
    for inst in instances:
        if inst["dk"] in dedup:
            src = AUDIO_OUT / dedup[inst["dk"]]
            if src.exists():
                out_path = Path(inst["out_file"])
                out_path.parent.mkdir(parents=True, exist_ok=True)
                out_path.write_bytes(src.read_bytes())
                done_ids.add(inst["key"])
                count += 1
    print(f"  已分发 {count} 个文件")

def is_bad_duration(text, audio_bytes):
    """Check if generated audio duration is grossly mismatched with text length."""
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

def dub(task):
    last_err = None
    for attempt in range(5):
        try:
            voice_data = load_voice(task["vid"])
            if not voice_data:
                raise Exception(f"no voice sample for {task['vid']}")
            
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
                time.sleep(5 * (attempt + 1))
                continue
            if r.status_code != 200:
                raise Exception(f"HTTP {r.status_code}: {r.text[:100]}")
            
            audio_bytes = base64.b64decode(r.json()["choices"][0]["message"]["audio"]["data"])
            
            # Validate duration for short texts
            if is_bad_duration(task["text"], audio_bytes):
                raise Exception(f"bad duration for text: {task['text'][:20]}")
            
            # Save canonical copy
            dk = task["dk"]
            cache_file = AUDIO_OUT / "_dedup" / f"{dk.replace('/','_')}.mp3"
            cache_file.parent.mkdir(parents=True, exist_ok=True)
            cache_file.write_bytes(audio_bytes)
            
            # Distribute to all instances (use pre-built index)
            with lock:
                for inst in inst_by_dk.get(dk, []):
                    Path(inst["out_file"]).parent.mkdir(parents=True, exist_ok=True)
                    Path(inst["out_file"]).write_bytes(audio_bytes)
                    done_ids.add(inst["key"])
                # Keep dedup pointing to first target, delete _dedup cache
                first_target = Path(inst_by_dk[dk][0]["out_file"])
                dedup[dk] = str(first_target.relative_to(AUDIO_OUT))
                cache_file.unlink()
            
            with lock:
                done[0] += 1
                if done[0] % 500 == 0:
                    with open(PROGRESS_FILE, "w", encoding="utf-8") as f:
                        json.dump({"done": list(done_ids), "failed": failed_log}, f)
                    with open(DEDUP_CACHE, "w", encoding="utf-8") as f:
                        json.dump(dedup, f)
                    print(f"  {done[0]}/{total_tasks} (fail:{len(failed_log)}) 💾")
            return True
        except (requests.exceptions.Timeout, requests.exceptions.ConnectionError,
                ConnectionResetError, TimeoutError) as e:
            last_err = e
            time.sleep(2 ** attempt)
            continue
        except Exception as e:
            last_err = e
            break
    
    with lock:
        for inst in instances:
            if inst["dk"] == task["dk"]:
                failed_log.append({"key": inst["key"], "seg_id": inst["seg_id"],
                    "story": inst["story_dir"], "vid": task["vid"], "error": str(last_err)[:200]})
                done_ids.add(inst["key"])
        done[0] += 1
        if done[0] % 200 == 0:
            print(f"  {done[0]}/{total_tasks} (fail:{len(failed_log)})")
    return False

# Also distribute for new tasks that share dedup with already-dubbed tasks
pre_distributed = 0
inst_by_dk = {}
for inst in instances:
    inst_by_dk.setdefault(inst["dk"], []).append(inst)

for dk, insts in inst_by_dk.items():
    if dk in dedup:
        src = AUDIO_OUT / dedup[dk]
        if src.exists():
            for inst in insts:
                if inst["key"] not in done_ids:
                    Path(inst["out_file"]).parent.mkdir(parents=True, exist_ok=True)
                    Path(inst["out_file"]).write_bytes(src.read_bytes())
                    done_ids.add(inst["key"])
                    pre_distributed += 1
if pre_distributed:
    print(f"📋 预分发 {pre_distributed} 个去重配对")

# Filter tasks: skip if all instances already done (use pre-built index)
tasks = [t for t in tasks if not all(i["key"] in done_ids for i in inst_by_dk.get(t["dk"], []))]
total_tasks = len(tasks)
if total_tasks <= 0:
    print("\n✅ 全部完成!")
else:
    print(f"待配音: {total_tasks}")
    print(f"\n🎙️ 开始逐句配音...")
    t0 = time.time()
    last_print = [0, t0]
    with ThreadPoolExecutor(max_workers=50) as ex:
        futs = {ex.submit(dub, t): i for i, t in enumerate(tasks)}
        for f in as_completed(futs):
            f.result()
            if done[0] % 500 == 0 and done[0] > 0 and done[0] != last_print[0]:
                last_print[0] = done[0]
                now = time.time()
                delta = now - last_print[1]
                rate = 500 / delta * 60
                eta = (total_tasks - done[0]) / rate if rate > 0 else 0
                print(f"  {done[0]}/{total_tasks} | 速率:{rate:.0f}/min | ETA:{eta/60:.1f}h")
                last_print[1] = now
    
    with open(PROGRESS_FILE, "w", encoding="utf-8") as f:
        json.dump({"done": list(done_ids), "failed": failed_log}, f)
    with open(DEDUP_CACHE, "w", encoding="utf-8") as f:
        json.dump(dedup, f)
    
    elapsed = time.time() - t0
    print(f"\n✅ 成功: {done[0]-len(failed_log)} | ❌ 失败: {len(failed_log)} | ⏱ {elapsed/60:.1f}min")
