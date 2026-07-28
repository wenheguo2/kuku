"""爱丽丝角色重配音 — 指定故事，仅爱丽丝角色，改用 V-YG-05
================================================================
只处理单个故事里 character == "爱丽丝" 的段落，用 V-YG-05 重新配音，
一条一条发送，逐条打印结果。会顺带把 segments.json 中爱丽丝的
voice_id 更新为 V-YG-05（保持元数据与实际一致）。

用法:
    python redub_alice_yg05.py --dry-run   # 只预览爱丽丝段数与当前音色
    python redub_alice_yg05.py             # 真实重配音
    python redub_alice_yg05.py --no-update # 配音但不改 segments.json 的 voice_id
"""
import json, base64, time, hashlib, sys, argparse, requests
from pathlib import Path
from io import BytesIO
from mutagen.mp3 import MP3

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ap = argparse.ArgumentParser(description="爱丽丝角色重配音 (V-YG-05)")
ap.add_argument("--dry-run", action="store_true", help="只预览，不发送")
ap.add_argument("--no-update", action="store_true", help="配音但不更新 segments.json 的 voice_id")
args = ap.parse_args()

BASE = Path(r"d:\work\work\code\testsuit\公司\项目\酷酷儿童故事")
PROD = BASE / "production/generated_stories"
AUDIO_OUT = BASE / "production" / "audio"
VOICE_BANK = BASE / "voice_bank" / "samples"

STORY_REL = "上下五千年/E4神话故事/白蛇传"
TARGET_CHAR = "小青"
NEW_VID = "V-YG-05"

def norm_char(c):
    """去掉空格后比较，兼容 '小青' 与 '小 青' 等写法"""
    return (c or "").replace(" ", "").replace("　", "")

cfg = json.load(open(BASE / "config" / "tts_providers.json"))["mimo"]
API_KEY = cfg["api_key"]
H = {"api-key": API_KEY, "Content-Type": "application/json"}
URL = "https://token-plan-cn.xiaomimimo.com/v1/chat/completions"
RPM = 300

UNIVERSAL_HINT = "发音清晰，用正常自然的语速朗读，语速平稳流畅，绝对不要加速也不要减速。"

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

rate_q = []
def rate_limit():
    now = time.time()
    while rate_q and rate_q[0] < now - 60: rate_q.pop(0)
    if len(rate_q) >= RPM:
        wait = rate_q[0] + 60 - now + 0.1
        if wait > 0: time.sleep(wait)
    rate_q.append(time.time())

def load_voice(vid):
    f = VOICE_BANK / f"{vid}.mp3"
    if not f.exists():
        raise FileNotFoundError(f"音色样本缺失: {vid}.mp3")
    b64 = base64.b64encode(f.read_bytes()).decode()
    return f"data:audio/mpeg;base64,{b64}"

def is_bad_duration(text, audio_bytes):
    try:
        dur = MP3(BytesIO(audio_bytes)).info.length
    except Exception:
        return True
    chars = len(text.replace(' ', '').replace('~', '').strip())
    if chars == 0:
        return False
    if chars <= 2 and dur > 1.0: return True
    if chars <= 5 and dur > 2.0: return True
    if chars <= 10 and dur > 4.0: return True
    if chars <= 30 and dur / chars > 0.8: return True
    return False

# ─── 读取故事 ──────────────────────────────────────
segf = PROD / STORY_REL / "segments.json"
data = json.load(open(segf, "r", encoding="utf-8"))
segs = data.get("segments", [])

alice = [s for s in segs if norm_char(s.get("character")) == norm_char(TARGET_CHAR)]
old_vids = {}
for s in alice:
    old_vids[s.get("voice_id", "")] = old_vids.get(s.get("voice_id", ""), 0) + 1

print(f"故事: {STORY_REL}")
print(f"目标角色: {TARGET_CHAR}（含空格变体匹配）")
print(f"匹配段数: {len(alice)}")
print(f"爱丽丝当前音色分布: {old_vids}")
print(f"目标音色: {NEW_VID}  存在: {(VOICE_BANK / f'{NEW_VID}.mp3').exists()}")

if args.dry_run:
    print("\n[DRY-RUN] 不发送。")
    sys.exit(0)

if not (VOICE_BANK / f"{NEW_VID}.mp3").exists():
    print(f"❌ 音色样本 {NEW_VID}.mp3 不存在，终止。")
    sys.exit(1)

# ─── 逐条重配音 ────────────────────────────────────
voice_data = load_voice(NEW_VID)
ok = 0
fail = []

for i, s in enumerate(alice, 1):
    seg_id = s.get("id", "")
    text = s.get("text", "").strip()
    mood = s.get("mood", "neutral")
    mood_inst = MOOD_MAP.get(mood, "")
    user_msg = UNIVERSAL_HINT
    if mood_inst:
        user_msg = f"{UNIVERSAL_HINT} 朗读时保持以下情绪：{mood_inst}"
    out_file = AUDIO_OUT / STORY_REL / f"{seg_id}.mp3"
    sys.stdout.write(f"  [{i}/{len(alice)}] {seg_id} ... ")
    sys.stdout.flush()

    last_err = None
    done = False
    for attempt in range(3):
        try:
            rate_limit()
            r = requests.post(URL, headers=H, json={
                "model": "mimo-v2.5-tts-voiceclone",
                "messages": [
                    {"role": "user", "content": user_msg},
                    {"role": "assistant", "content": text}
                ],
                "audio": {"format": "mp3", "voice": voice_data}
            }, timeout=120)
            if r.status_code == 429:
                time.sleep(5 * (attempt + 1)); continue
            if r.status_code != 200:
                raise Exception(f"HTTP {r.status_code}: {r.text[:100]}")
            audio_bytes = base64.b64decode(r.json()["choices"][0]["message"]["audio"]["data"])
            if is_bad_duration(text, audio_bytes):
                raise Exception(f"bad duration: {text[:20]}")
            out_file.parent.mkdir(parents=True, exist_ok=True)
            out_file.write_bytes(audio_bytes)
            done = True
            break
        except (requests.exceptions.Timeout, requests.exceptions.ConnectionError,
                ConnectionResetError, TimeoutError) as e:
            last_err = e; time.sleep(2 ** attempt); continue
        except Exception as e:
            last_err = e; break

    if done:
        ok += 1
        print("✅")
    else:
        fail.append((seg_id, str(last_err)[:120]))
        print("❌")

# ─── 更新 segments.json 的 voice_id ───────────────
if not args.no_update and not fail:
    alice_ids = {s.get("id") for s in alice}
    for s in data["segments"]:
        if s.get("id") in alice_ids:
            s["voice_id"] = NEW_VID
    json.dump(data, open(segf, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"\n已更新 segments.json：爱丽丝 {len(alice_ids)} 段的 voice_id → {NEW_VID}")
elif not args.no_update and fail:
    print("\n⚠ 有失败项，未更新 segments.json 的 voice_id（避免半成品）。")

print(f"\n结束：成功 {ok}/{len(alice)} | 失败 {len(fail)}")
if fail:
    print("失败清单:")
    for seg_id, err in fail:
        print(f"  - {seg_id}  ({err})")
