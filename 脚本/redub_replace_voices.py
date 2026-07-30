"""批量替换错误音色 — 按 性别/年龄 指配的替换表重新配音
=====================================================
替换来源：voice_bank_unified.json 中分类 + samples/ 实际存在的音色。
两路规则：
  A) VID_MAP：原 voice_id -> 新 voice_id（全局，跨所有故事）
  B) CHAR_RULES：指定角色(+故事范围) -> 新 voice_id（如奶奶限学科启蒙）

处理：扫描 segments.json，命中规则的段落用新 voice_id 重新配音（逐条发送、
正常语速），写回 audio 并同步更新 segments.json 的 voice_id。

用法:
  python redub_replace_voices.py --dry-run            # 预览命中段数与各原音色计数
  python redub_replace_voices.py --test 20            # 只处理前 20 条命中
  python redub_replace_voices.py                       # 真实重配音（等指令）
  python redub_replace_voices.py --scope 学科启蒙     # 只处理某目录（如仅奶奶）
"""
import json, base64, time, hashlib, sys, argparse, requests, threading
from pathlib import Path
from io import BytesIO
from collections import defaultdict, Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from mutagen.mp3 import MP3

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

BASE = Path(r"d:\work\work\code\testsuit\公司\项目\酷酷儿童故事")
PROD = BASE / "production/generated_stories"
AUDIO_OUT = BASE / "production" / "audio"
VOICE_BANK = BASE / "voice_bank" / "samples"

# ─── 替换规则 ────────────────────────────────────
# A) 缺失基础文件音色的全局替换（27 个）
VID_MAP = {
    "V-CG-01": "V-CG-02",   # 儿童女
    "V-DFT-01": "V-ADM-01", # 成年男
    "V-CG-07": "V-CG-03",   # 儿童女
    "V-CG-16": "V-CB-02",   # 儿童男
    "V-ELD-07": "V-ELD-01", # 老年男
    "V-ELD-12": "V-ELD-03", # 老年女
    "V-ADW-15": "V-ADW-07", # 成年女
    "V-ADM-18": "V-ADM-02", # 成年男
    "V-ADW-16": "V-YG-05",  # 少女
    "V-MAG-04": "V-MAG-09", # 魔法男
    "V-TN-13": "V-CB-03",   # 儿童
    "V-MAG-11": "V-MAG-01", # 魔法精灵
    "V-ADM-17": "V-ADM-15", # 成年男
    "V-MAG-13": "V-TN-11",  # 少女
    "V-ADM-20": "V-ADM-14", # 成年男
    "V-ADM-00": "V-ADM-12", # 成年男
    "V-ADM-38": "V-ADM-15", # 成年男
    "V-ADW-00": "V-ADW-05", # 成年女
    "V-ADW-18": "V-ADW-03", # 成年女
    "V-TB-03": "V-CB-01",   # 儿童男
    "V-ELD-11": "V-ELD-04", # 老年男/深沉
    "V-CB-15": "V-TN-01",   # 少年男
    "V-ELD-00": "V-ELD-04", # 老年男
    "V-CG-00": "V-ADW-07",  # 成年女
    "V-ELD-13": "V-ELD-01", # 老年男
    "V-CB-16": "V-MAG-07",  # 暗黑
    "V-GRP-01": "V-ADW-03", # 群像
}

# B) 角色限定规则（如奶奶被错配成老年男，仅在学科启蒙重配为老年女）
CHAR_RULES = [
    # 奶奶被错配成老年男音 V-ELD-04（仅当原音色正好是错的那个才替换，杜绝误伤正确音频）
    {"char": "奶奶", "scope": "学科启蒙", "old_vid": "V-ELD-04", "new_vid": "V-ADW-04"},
]

# ─── 校验替换音色都存在 ─────────────────────────
base_re = __import__("re").compile(r"^V-[A-Z]+-\d+\.mp3$")
present = set(f.stem for f in VOICE_BANK.glob("*.mp3") if base_re.match(f.name))
for old, new in VID_MAP.items():
    assert new in present, f"替换音色缺失文件: {new}"
for r in CHAR_RULES:
    assert r["new_vid"] in present, f"替换音色缺失文件: {r['new_vid']}"

cfg = json.load(open(BASE / "config" / "tts_providers.json"))["mimo"]
H = {"api-key": cfg["api_key"], "Content-Type": "application/json"}
URL = "https://token-plan-cn.xiaomimimo.com/v1/chat/completions"
RPM = 300
_rate_lock = threading.Lock()
_vcache = {}
def load_voice(vid):
    if vid in _vcache: return _vcache[vid]
    f = VOICE_BANK / f"{vid}.mp3"
    if not f.exists(): raise FileNotFoundError(vid)
    b = base64.b64encode(f.read_bytes()).decode()
    _vcache[vid] = f"data:audio/mpeg;base64,{b}"
    return _vcache[vid]

UNIVERSAL_HINT = "发音清晰，用正常自然的语速朗读，语速平稳流畅，绝对不要加速也不要减速。"
MOOD_MAP = {"happy":"语气开心雀跃","excited":"语气激动兴奋","sad":"语气低落地带着难过",
    "brave":"语气坚定有力","curious":"语气充满好奇声调上扬","teaching":"语气耐心温和像老师讲解",
    "calm":"语气平静安稳","warm":"语气温暖柔和","surprised":"语气惊讶声调升高",
    "nervous":"语气有点紧张","mysterious":"语气神秘压低声音","neutral":""}
rate_q = []
def rate_limit():
    with _rate_lock:
        now = time.time()
        while rate_q and rate_q[0] < now - 60: rate_q.pop(0)
        if len(rate_q) >= RPM:
            w = rate_q[0] + 60 - now + 0.1
            if w > 0: time.sleep(w)
        rate_q.append(time.time())

def is_bad_duration(text, b):
    try: dur = MP3(BytesIO(b)).info.length
    except Exception: return True
    ch = len(text.replace(' ', '').replace('~', '').strip())
    if ch == 0: return False
    if ch <= 2 and dur > 1.0: return True
    if ch <= 5 and dur > 2.0: return True
    if ch <= 10 and dur > 4.0: return True
    if ch <= 30 and dur / ch > 0.8: return True
    return False

def norm_char(c): return (c or "").replace(" ", "").replace("　", "")

ap = argparse.ArgumentParser()
ap.add_argument("--dry-run", action="store_true")
ap.add_argument("--test", type=int, default=0)
ap.add_argument("--scope", default="", help="只处理此目录前缀，如 学科启蒙")
args = ap.parse_args()

# ─── 收集命中任务 ──────────────────────────────
jobs = defaultdict(list)   # file -> [(seg_index, new_vid)]
vid_count = Counter()
scanned = 0
for segf in sorted(PROD.rglob("segments.json")):
    rel = str(segf.parent.relative_to(PROD))
    if args.scope and not rel.startswith(args.scope):
        continue
    scanned += 1
    try:
        data = json.load(open(segf, "r", encoding="utf-8"))
    except Exception:
        continue
    for i, s in enumerate(data.get("segments", [])):
        new_vid = None
        nc = norm_char(s.get("character"))
        for r in CHAR_RULES:
            if nc == norm_char(r["char"]) and rel.startswith(r["scope"]) \
               and s.get("voice_id") == r["old_vid"]:
                new_vid = r["new_vid"]; break
        if new_vid is None and s.get("voice_id") in VID_MAP:
            new_vid = VID_MAP[s["voice_id"]]
        if new_vid:
            jobs[str(segf)].append((i, new_vid, s.get("voice_id", "")))
            vid_count[new_vid if False else (s.get("voice_id"), new_vid)] += 1

# 统计：按 原音色->新音色
pair_count = Counter()
for segf, lst in jobs.items():
    for i, new_vid, old_vid in lst:
        pair_count[(old_vid, new_vid)] += 1

print(f"扫描文件: {scanned} | 命中任务文件: {len(jobs)} | 命中段数: {sum(vid_count.values())}")
print("原音色 -> 新音色 段数:")
for (o, n), c in sorted(pair_count.items(), key=lambda x: -x[1]):
    print(f"   {o} -> {n} : {c}")

if args.dry_run:
    print("\n[DRY-RUN] 不发送。")
    sys.exit(0)

# ─── 并发重配音（10 并发）─────────────────────
WORKERS = 10

def gen_one(job):
    """单条生成：TTS + 写音频文件（按 seg_id 命名，天然不冲突）。"""
    segf, rel, i, new_vid, old_vid = job
    try:
        data = json.load(open(segf, "r", encoding="utf-8"))
    except Exception as e:
        return (segf, i, new_vid, old_vid, "", False, f"读文件失败 {e}")
    s = data["segments"][i]
    seg_id = s.get("id", "")
    text = s.get("text", "").strip()
    mood = s.get("mood", "neutral")
    mi = MOOD_MAP.get(mood, "")
    user_msg = UNIVERSAL_HINT + (f" 朗读时保持以下情绪：{mi}" if mi else "")
    out = AUDIO_OUT / rel / f"{seg_id}.mp3"
    last = None; done = False
    for attempt in range(3):
        try:
            rate_limit()
            r = requests.post(URL, headers=H, json={
                "model": "mimo-v2.5-tts-voiceclone",
                "messages": [{"role":"user","content":user_msg},
                             {"role":"assistant","content":text}],
                "audio": {"format":"mp3","voice": load_voice(new_vid)}
            }, timeout=120)
            if r.status_code == 429: time.sleep(5*(attempt+1)); continue
            if r.status_code != 200: raise Exception(f"HTTP {r.status_code}: {r.text[:80]}")
            ab = base64.b64decode(r.json()["choices"][0]["message"]["audio"]["data"])
            if is_bad_duration(text, ab): raise Exception("bad duration")
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_bytes(ab)
            done = True; break
        except (requests.exceptions.Timeout, requests.exceptions.ConnectionError,
                ConnectionResetError, TimeoutError) as e:
            last = e; time.sleep(2**attempt); continue
        except Exception as e:
            last = e; break
    return (segf, i, new_vid, old_vid, seg_id, done, (str(last)[:120] if last else ""))

all_jobs = []
for segf, lst in jobs.items():
    rel = str(Path(segf).parent.relative_to(PROD))
    for i, new_vid, old_vid in lst:
        all_jobs.append((segf, rel, i, new_vid, old_vid))

if args.test:
    all_jobs = all_jobs[:args.test]

ok = 0; fail = []
results = []   # 成功项：(segf, i, new_vid) 用于汇总写回
print(f"并发生成中（workers={WORKERS}），共 {len(all_jobs)} 条 ...")
with ThreadPoolExecutor(max_workers=WORKERS) as ex:
    futs = {ex.submit(gen_one, j): j for j in all_jobs}
    for fi, fut in enumerate(as_completed(futs), 1):
        segf, i, new_vid, old_vid, seg_id, done, err = fut.result()
        if done:
            ok += 1; results.append((segf, i, new_vid))
            print(f"  [{fi}/{len(all_jobs)}] ✅ {old_vid}->{new_vid} {seg_id}")
        else:
            fail.append((seg_id, err))
            print(f"  [{fi}/{len(all_jobs)}] ❌ {seg_id} ({err})")

# 汇总写回 segments.json（按文件聚合，串行避免并发写冲突）
file_updates = defaultdict(dict)   # segf -> {i: new_vid}
for segf, i, new_vid in results:
    file_updates[segf][i] = new_vid
for segf, upd in file_updates.items():
    try:
        data = json.load(open(segf, "r", encoding="utf-8"))
        for i, new_vid in upd.items():
            data["segments"][i]["voice_id"] = new_vid
        json.dump(data, open(segf, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"  ⚠ 写回失败 {segf}: {e}")

print(f"\n结束：成功 {ok}/{len(all_jobs)} | 失败 {len(fail)}")
for seg_id, e in fail:
    print(f"  - {seg_id}  ({e})")
