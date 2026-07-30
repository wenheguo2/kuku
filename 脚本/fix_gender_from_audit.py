"""
fix_gender_from_audit.py — 按《性别审核清单.txt》逐条重配音
=========================================================
直接解析 production/性别审核清单.txt 的 A/B/X 类条目，每条已给出：
  故事 rel、角色名、应为性别、错误音色 voice_id。
对每条：
  1) 在 production/generated_stories/<rel>/segments.json 中找出 角色名匹配 且
     voice_id 命中错误音色的段；
  2) 按“角色名年龄桶 + 应为性别”选正确人类音色（奶奶→V-ADW-04）；
  3) 重新配音，仅生成成功才覆盖 audio/<rel>/<seg_id>.mp3，并写回 voice_id。

另外保留 redub 的奶奶规则（学科启蒙 + voice_id==V-ELD-04 → V-ADW-04），
用于补上 redub 那 64 条 bad duration 失败（清单未覆盖，因为统一表把 V-ELD-04 标成了女）。

安全：只处理清单命中的段；生成失败绝不覆盖、绝不改写 voice_id；按 seg_id 写文件不冲突。
用法：
  python fix_gender_from_audit.py --dry-run
  python fix_gender_from_audit.py --test 30
  python fix_gender_from_audit.py
"""
import json, re, time, base64, sys, argparse, threading, requests
from pathlib import Path
from io import BytesIO
from collections import defaultdict, Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from mutagen.mp3 import MP3

BASE = Path(__file__).resolve().parent.parent
SEG_ROOT = BASE / "production" / "generated_stories"   # segments.json 所在
AUDIO_OUT = BASE / "production" / "audio"              # 真实 seg 音频所在
UNIFIED = BASE / "voice_bank" / "voice_bank_unified.json"
VOICE_BANK = BASE / "voice_bank" / "samples"
LIST = BASE / "production" / "性别审核清单.txt"

cfg = json.load(open(BASE / "config" / "tts_providers.json"))["mimo"]
H = {"api-key": cfg["api_key"], "Content-Type": "application/json"}
URL = "https://token-plan-cn.xiaomimimo.com/v1/chat/completions"

MOOD_MAP = {"happy": "语气开心雀跃", "excited": "语气激动兴奋", "sad": "语气低落地带着难过",
    "brave": "语气坚定有力", "curious": "语气充满好奇声调上扬", "teaching": "语气耐心温和像老师讲解",
    "calm": "语气平静安稳", "warm": "语气温暖柔和", "surprised": "语气惊讶声调升高",
    "nervous": "语气有点紧张", "mysterious": "语气神秘压低声音", "neutral": ""}
UNIVERSAL_HINT = "发音清晰，用正常自然的语速朗读，语速平稳流畅，绝对不要加速也不要减速。"

RPM = 300
_rate_lock = threading.Lock()
_vcache = {}
def load_voice(vid):
    if vid in _vcache:
        return _vcache[vid]
    f = VOICE_BANK / f"{vid}.mp3"
    if not f.exists():
        raise FileNotFoundError(vid)
    b = base64.b64encode(f.read_bytes()).decode()
    _vcache[vid] = f"data:audio/mpeg;base64,{b}"
    return _vcache[vid]

rate_q = []
def rate_limit():
    with _rate_lock:
        now = time.time()
        while rate_q and rate_q[0] < now - 60:
            rate_q.pop(0)
        if len(rate_q) >= RPM:
            w = rate_q[0] + 60 - now + 0.1
            if w > 0:
                time.sleep(w)
        rate_q.append(time.time())

def est_chars(ab):
    try:
        return int(MP3(BytesIO(ab)).info.length * 4.2)
    except Exception:
        return 0

def is_bad_duration(text, ab):
    try:
        dur = MP3(BytesIO(ab)).info.length
    except Exception:
        return True
    ch = len(text.replace(' ', '').replace('~', '').strip())
    if ch == 0:
        return False
    if ch <= 2 and dur > 1.0:
        return True
    if ch <= 5 and dur > 2.0:
        return True
    if ch <= 10 and dur > 4.0:
        return True
    if ch <= 30 and dur / ch > 0.8:
        return True
    return False

# ─── 角色名 → 年龄桶 ───────────────────────────────────────────
INFANT_KEYS = ["婴", "宝宝", "小宝", "小婴儿", "新生儿", "小不点"]
CHILD_KEYS  = ["宝", "娃", "孩", "童", "小朋友", "娃娃", "宝贝", "弟弟", "妹妹",
               "哥哥", "姐姐", "小名", "小宝", "小宝宝", "同学"]
TEEN_KEYS   = ["少", "公子", "姑娘", "少年", "少女", "青年", "少爷", "相公"]
ELDER_KEYS  = ["老", "爷", "奶", "婆", "伯", "姥", "太", "翁", "叟", "方丈", "道长",
               "大王", "国王", "皇帝", "将军", "老爷", "大爷", "王爷", "太后", "皇后",
               "公公", "老狼", "老猫", "老山羊", "老公", "山神", "河神", "财神",
               "灶王", "阎王", "龙王", "督主", "相爷"]

def role_age(name):
    if any(k in name for k in INFANT_KEYS):
        return "infant"
    if any(k in name for k in CHILD_KEYS):
        return "child"
    if any(k in name for k in TEEN_KEYS):
        return "teen"
    if any(k in name for k in ELDER_KEYS):
        return "elder"
    return "adult"

# ─── 目标音色池（来自统一表 + 真实样本）────────────────────────
def gender_of(cat, cname, label=""):
    s = f"{cat or ''} {cname or ''} {label or ''}".lower()
    if any(k in s for k in ["girl", "female", "woman", "lady", "女"]):
        return "F"
    if any(k in s for k in ["boy", "male", "man", "男"]):
        return "M"
    if (cat or "") == "elder":
        ls = label or ""
        if any(w in ls for w in ["爷", "公", "伯", "叔", "父", "翁", "郎", "哥", "弟", "汉", "舅", "夫"]):
            return "M"
        if any(w in ls for w in ["奶", "婆", "娘", "妈", "太", "姐", "姨", "婶", "妹", "姑"]):
            return "F"
        return "E"
    return "X"

_present = {f.stem for f in VOICE_BANK.glob("*.mp3") if f.stem.startswith("V-")}
uv = json.load(open(UNIFIED, "r", encoding="utf-8"))
pool = defaultdict(lambda: defaultdict(list))   # cat -> gender -> [vids]
for vid, item in uv.get("voices", {}).items():
    cat = item.get("category")
    if cat in ("infant", "child_boy", "child_girl", "teen", "adult_male", "adult_female", "elder"):
        if vid in _present:
            g = gender_of(cat, item.get("category_name"), item.get("label"))
            pool[cat][g].append(vid)

def pick(cat, gender):
    cands = sorted(pool.get(cat, {}).get(gender, []))
    return cands[0] if cands else None

def target_voice(age, gender):
    if age == "infant":
        return pick("infant", gender) or pick("child_boy" if gender == "M" else "child_girl", gender)
    if age == "child":
        cat = "child_boy" if gender == "M" else "child_girl"
        return pick(cat, gender) or pick("teen", gender)
    if age == "teen":
        return pick("teen", gender) or pick("adult_male" if gender == "M" else "adult_female", gender)
    if age == "elder":
        v = pick("elder", gender)
        if v:
            return v
        v = pick("elder", "E")
        if v:
            return v
        return pick("adult_male" if gender == "M" else "adult_female", gender)
    cat = "adult_male" if gender == "M" else "adult_female"
    return pick(cat, gender) or pick("teen", gender)

# 奶奶统一用已批准音色
GRANDMA_VID = "V-ADW-04"

# ─── 解析清单 ─────────────────────────────────────────────────
A_RE = re.compile(r'^  \[([^\]]*)\] 角色『([^』]*)』应为(女|男)，却用 (V-[\w-]+)\(')
X_RE = re.compile(r'^  \[([^\]]*)\] 角色『([^』]*)』\((女|男)\) 用 (V-[\w-]+)\(')
B_RE = re.compile(r'^  \[([^\]]*)\] 角色『([^』]*)』: (.+)$')
B_VID_RE = re.compile(r'(V-[\w-]+)\([^,]+,(女|男)\)')

def parse_list():
    """返回 list of dict: {rel, role, wrong_vids:set, gender, age, reason}"""
    out = []
    for line in LIST.read_text(encoding="utf-8").splitlines():
        ma = A_RE.match(line)
        if ma:
            rel, role, g, vid = ma.group(1), ma.group(2), ma.group(3), ma.group(4)
            gender = "F" if g == "女" else "M"
            age = "elder" if "奶" in role else role_age(role)
            out.append({"rel": rel, "role": role, "wrong_vids": {vid},
                        "gender": gender, "age": age, "reason": "A"})
            continue
        mx = X_RE.match(line)
        if mx:
            rel, role, g, vid = mx.group(1), mx.group(2), mx.group(3), mx.group(4)
            gender = "F" if g == "女" else "M"
            age = "elder" if "奶" in role else role_age(role)
            out.append({"rel": rel, "role": role, "wrong_vids": {vid},
                        "gender": gender, "age": age, "reason": "X"})
            continue
        mb = B_RE.match(line)
        if mb:
            rel, role, detail = mb.group(1), mb.group(2), mb.group(3)
            vids = B_VID_RE.findall(detail)
            wrong = {v for v, _ in vids}
            # B 类：用角色名推断应为性别；无则查覆盖表；再无则跳过
            gname = role_gender(role) or B_GENDER_OVERRIDE.get(role)
            if gname is None:
                print(f"  [WARN] B类跳过（角色名无性别词，需人工定）: [{rel}] {role}")
                continue
            age = "elder" if "奶" in role else role_age(role)
            out.append({"rel": rel, "role": role, "wrong_vids": wrong,
                        "gender": gname, "age": age, "reason": "B"})
    return out

# B 类性别词库（仅用于推断角色名应为性别）
FEMALE_WORDS = ["夫人","奶奶","外婆","姥姥","阿姨","妈妈","母亲","姐姐","妹妹","姑娘","公主",
               "女王","小姐","大妈","大婶","大娘","婆婆","太太","妻","大姐","婶","姨","妯",
               "女孩","小女孩","小姑娘","女生","女士","大姐大","老奶奶","老太","老妇人",
               "仙女","巫婆","皇后","太后","妃","姐","妹","女侠","女神","女巫","妈咪","娘"]
MALE_WORDS = ["爷爷","外公","姥爷","叔叔","伯伯","爸爸","父亲","哥哥","弟弟","王子","国王",
             "皇帝","老爷","先生","大叔","大伯","公公","夫","少爷","舅","叔","伯","男孩",
             "小男孩","小男子","男生","男士","老大爷","老爷爷","老翁","老丈","男侠","男神",
             "法师","道长","和尚","主持","方丈","侠客","将军","大王","龙王","阎王","妖王"]
def role_gender(name):
    for w in FEMALE_WORDS:
        if w in name:
            return "F"
    for w in MALE_WORDS:
        if w in name:
            return "M"
    return None

# B 类里名字无性别词、但可确定的历史人物/神话角色（仅 8 个）
B_GENDER_OVERRIDE = {
    "李德明": "M", "小石头": "M", "石守信": "M", "李阿婆": "F",
    "秦琼": "M", "天狗": "M", "观音菩萨": "F", "唐敖蹲下来": "M",
}

# redub 奶奶规则（补 64 条失败：清单未覆盖，因统一表把 V-ELD-04 标成女）
CHAR_RULES = [{"char": "奶奶", "scope": "学科启蒙", "old_vid": "V-ELD-04", "new_vid": "V-ADW-04"}]

def norm_char(c):
    return (c or "").replace(" ", "").replace("　", "")

# ─── 主流程 ───────────────────────────────────────────────────
if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--test", type=int)
    args = ap.parse_args()

    items = parse_list()
    print(f"清单解析：A/B/X 条目 {len(items)} 条")

    jobs = defaultdict(list)   # segf -> [(i, new_vid, old_vid, reason)]
    reason_counter = Counter()
    matched_segs = 0

    # 1) 清单条目
    for it in items:
        rel = it["rel"]
        role_n = norm_char(it["role"])
        segf = SEG_ROOT / rel / "segments.json"
        if not segf.exists():
            print(f"  [WARN] 找不到 segments.json: {rel}")
            continue
        try:
            data = json.load(open(segf, "r", encoding="utf-8"))
        except Exception as e:
            print(f"  [WARN] 读失败 {rel}: {e}")
            continue
        new_vid = GRANDMA_VID if "奶" in it["role"] else target_voice(it["age"], it["gender"])
        if not new_vid:
            print(f"  [WARN] 无可用目标音色: [{rel}] {it['role']} {it['gender']}")
            continue
        for i, s in enumerate(data.get("segments", [])):
            ch = norm_char(s.get("角色") or s.get("character") or s.get("name"))
            vid = s.get("voice_id", "")
            if ch == role_n and vid in it["wrong_vids"]:
                if new_vid != vid:
                    jobs[segf].append((i, new_vid, vid, f"{it['reason']}:{it['role']}"))
                    reason_counter[f"{it['reason']}:{it['role']}"] += 1
                    matched_segs += 1

    # 2) redub 奶奶规则（补 64 条 bad duration 失败）
    for segf in SEG_ROOT.rglob("segments.json"):
        rel = str(segf.parent.relative_to(SEG_ROOT))
        try:
            data = json.load(open(segf, "r", encoding="utf-8"))
        except Exception:
            continue
        for i, s in enumerate(data.get("segments", [])):
            ch = norm_char(s.get("角色") or s.get("character") or s.get("name"))
            vid = s.get("voice_id", "")
            for r in CHAR_RULES:
                if ch == norm_char(r["char"]) and rel.startswith(r["scope"]) and vid == r["old_vid"]:
                    if r["new_vid"] != vid:
                        jobs[segf].append((i, r["new_vid"], vid, "CHAR_RULES:奶奶"))
                        reason_counter["CHAR_RULES:奶奶"] += 1
                        matched_segs += 1

    all_jobs = []
    for segf, lst in jobs.items():
        rel = str(segf.parent.relative_to(SEG_ROOT))
        for i, new_vid, old_vid, reason in lst:
            all_jobs.append((segf, rel, i, new_vid, old_vid, reason))

    print(f"匹配到需重配段数: {matched_segs}  (文件 {len(jobs)})")
    for k, v in sorted(reason_counter.items(), key=lambda x: -x[1])[:20]:
        print(f"  {k}: {v}")
    print(f"  ...共 {len(reason_counter)} 类")
    if args.dry_run:
        sys.exit(0)

    if args.test:
        all_jobs = all_jobs[:args.test]

    WORKERS = 10
    def gen_one(job):
        segf, rel, i, new_vid, old_vid, reason = job
        try:
            data = json.load(open(segf, "r", encoding="utf-8"))
        except Exception as e:
            return (segf, i, new_vid, old_vid, "", False, f"读文件失败 {e}", reason)
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
                    "messages": [{"role": "user", "content": user_msg},
                                 {"role": "assistant", "content": text}],
                    "audio": {"format": "mp3", "voice": load_voice(new_vid)}
                }, timeout=120)
                if r.status_code == 429:
                    time.sleep(5 * (attempt + 1)); continue
                if r.status_code != 200:
                    raise Exception(f"HTTP {r.status_code}: {r.text[:80]}")
                ab = base64.b64decode(r.json()["choices"][0]["message"]["audio"]["data"])
                if is_bad_duration(text, ab):
                    raise Exception("bad duration")
                out.parent.mkdir(parents=True, exist_ok=True)
                out.write_bytes(ab)
                done = True; break
            except (requests.exceptions.Timeout, requests.exceptions.ConnectionError,
                    ConnectionResetError, TimeoutError) as e:
                last = e; time.sleep(2 ** attempt); continue
            except Exception as e:
                last = e; break
        return (segf, i, new_vid, old_vid, seg_id, done, (str(last)[:120] if last else ""), reason)

    ok = 0; fail = []
    results = []
    print(f"并发生成中（workers={WORKERS}），共 {len(all_jobs)} 条 ...")
    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        futs = {ex.submit(gen_one, j): j for j in all_jobs}
        for fi, fut in enumerate(as_completed(futs), 1):
            segf, i, new_vid, old_vid, seg_id, done, err, reason = fut.result()
            if done:
                ok += 1; results.append((segf, i, new_vid))
                print(f"  [{fi}/{len(all_jobs)}] ✅ {old_vid}->{new_vid} [{reason}] {seg_id}")
            else:
                fail.append((seg_id, err, reason))
                print(f"  [{fi}/{len(all_jobs)}] ❌ {seg_id} ({err}) [{reason}]")

    file_updates = defaultdict(dict)
    for segf, i, new_vid in results:
        file_updates[segf][i] = new_vid
    for segf, upd in file_updates.items():
        try:
            data = json.load(open(segf, "r", encoding="utf-8"))
            for i, new_vid in upd.items():
                data["segments"][i]["voice_id"] = new_vid
            json.dump(data, open(segf, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"  [WARN] 写回失败 {segf}: {e}")

    print(f"\n结束：成功 {ok}/{len(all_jobs)} | 失败 {len(fail)}")
    for seg_id, e, reason in fail:
        print(f"  - {seg_id}  ({e}) [{reason}]")
