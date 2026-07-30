"""
redub_fix_gender.py — 性别/音色一致性批量修复脚本
=================================================
与 redub_replace_voices.py 共用生成内核（10 并发、rate_limit、仅生成成功才覆盖）。

定位「有问题的段」：
  A) redub 的 VID_MAP（27 个缺失音色，按 voice_id 精确命中）
  B) redub 的 CHAR_RULES（奶奶：角色==奶奶 且 scope==学科启蒙 且 原音色==V-ELD-04）
  C) 性别审核的 A/B/X 类：复用 _gender_audit 的判定，凡角色性别明确(F/M)且其当前音色
     性别相反/非人/年龄不符 → 需要重配。

目标音色解析（仅基于“角色名”推断年龄桶+性别，不看原错误音色）：
  年龄桶: elder / adult / teen / child / infant
  性别  : M / F
  → 在统一音色表中找 同 category + 同性别 且 存在样本 mp3 的音色作为目标。
  （elder 按 label 细分性别；teen/adult/child 按 category 名取男/女 variant）

安全原则：
  * 只处理“目标音色 != 当前 voice_id”的段（已正确的段天然跳过，幂等）。
  * 生成失败（含 bad duration）绝不覆盖原音频、绝不改写 voice_id。
  * 音频按 seg_id 写文件不冲突；segments.json 的 voice_id 汇总后串行写回。

用法：
  python redub_fix_gender.py --dry-run        # 只统计，不请求
  python redub_fix_gender.py --test 20        # 真实发 20 条
  python redub_fix_gender.py                  # 全量
  python redub_fix_gender.py --scope 学科启蒙 # 限定 story 前缀
"""
import json, base64, time, hashlib, sys, argparse, requests, threading
from pathlib import Path
from io import BytesIO
from collections import defaultdict, Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from mutagen.mp3 import MP3

BASE = Path(__file__).resolve().parent.parent
PROD = BASE / "production"
VOICE_BANK = BASE / "voice_bank" / "samples"
UNIFIED = BASE / "voice_bank" / "voice_bank_unified.json"
AUDIO_OUT = PROD
REDUB_LOG = PROD / "redub_run.log"

URL = "https://api.minimax.io/v1/t2a_v2?GroupId=1851048352207340076"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJHUkVBVElORVNBUEki6O3g3PmN5y0Hxv_qJ3Gpf2XjVUmPviD7OG4"
H = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}

MOOD_MAP = {
    "neutral": "", "happy": "开心、轻快", "sad": "难过、低沉", "angry": "生气、急促",
    "excited": "兴奋、上扬", "calm": "平静、舒缓", "scared": "害怕、紧张",
    "surprised": "惊讶、突然", "thoughtful": "思考、柔和", "mysterious": "神秘、低语",
}
UNIVERSAL_HINT = ("用自然、亲切、适合儿童故事的有声书语调朗读，"

"咬字清晰、语速适中，不要播音腔、不要亢奋，像在给孩子慢慢讲故事。")

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
    """放宽阈值：极短文本（英语单词/单字）也能过。仅拦截明显异常。"""
    n = len(text)
    ec = est_chars(ab)
    if ec < 1:
        return True
    if n <= 3 and ec < 4:        # 极短：至少 4 字符时长（约 1s）
        return True
    if n <= 8 and ec < 8:
        return True
    if ec > max(40, n * 7):      # 异常偏长
        return True
    return False

# ─── 来自 redub_replace_voices.py：缺失音色 / 奶奶规则（用于补全 64 条失败）──
VID_MAP = {
    "V-YG-09": "V-CG-02", "V-YB-09": "V-CB-02",
    "V-YG-05": "V-CG-03", "V-YB-05": "V-CB-01",
    "V-YG-11": "V-CG-06", "V-YB-11": "V-CB-03",
    "V-TN-11": "V-TN-01", "V-TN-12": "V-TN-01",
    "V-TB-01": "V-ADM-01", "V-TB-02": "V-ADM-02",
    "V-TB-03": "V-ADM-12", "V-TB-04": "V-ADW-03",
    "V-TB-05": "V-ADW-05", "V-TB-14": "V-ADW-09",
    "V-MAG-01": "V-ADM-01", "V-MAG-02": "V-ADW-07",
    "V-MAG-03": "V-CG-02", "V-MAG-04": "V-CG-03",
    "V-MAG-05": "V-CB-02", "V-MAG-06": "V-CB-01",
    "V-MAG-07": "V-ADM-12", "V-MAG-08": "V-ADW-03",
    "V-MAG-09": "V-CG-06", "V-MAG-10": "V-CB-03",
    "V-MAG-11": "V-ADM-02", "V-MAG-12": "V-ADW-05",
    "V-MAG-13": "V-TN-01", "V-MAG-14": "V-TN-11",
    "V-GRP-01": "V-ADM-01", "V-GRP-02": "V-ADW-07",
}
CHAR_RULES = [
    {"char": "奶奶", "scope": "学科启蒙", "old_vid": "V-ELD-04", "new_vid": "V-ADW-04"},
]

# ─── 性别 / 年龄 推断（复用 _gender_audit 的词库与规则）──────────────
MALE_WORDS = ["爷爷","姥爷","外公","公公","伯伯","伯父","大伯","叔","大叔","舅舅","舅父","爸爸","父亲","爹",
    "哥","大哥","老哥","弟弟","小弟","兄","兄弟","小子","男孩","小男子汉","大侠","公子","少爷","相公","郎",
    "将军","大王","国王","皇帝","老爷","大爷","老头","老汉","老翁","老方丈","老道","道长","师傅","师父","先生",
    "大伯","大舅","大表哥","山神","河神","财神","灶王","阎王","龙王","老山羊","老狼","老猫","老虎","老公",
    "相爷","督主","太监","男","父","爷","郎","汉","翁","舅","叔","哥","弟","侠","将军"]
FEMALE_WORDS = ["夫人","奶奶","外婆","姥姥","阿姨","妈妈","母亲","姐姐","妹妹","姑娘","公主",
    "女王","小姐","大妈","大婶","大娘","婆婆","太太","妻","大姐","婶","姨","妯",
    "女孩","小女孩","小姑娘","女生","女士","大姐大","老奶奶","老太","老妇人",
    "仙女","巫婆","皇后","太后","妃","姐","妹","女侠","女神","女巫","妈咪","娘",
    "老婆婆","风婆婆","乌云婆婆","王婆婆","李大娘","大娘","妈妈","母亲","女","奶","婆","娘","姨","姐","妹","婶","姑","太"]
ELDER_KEYS = ["老","爷","奶","婆","伯","姥","太","翁","叟","方丈","道长","老道","山神","河神","财神","灶王","阎王","龙王",
    "大王","国王","皇帝","将军","老爷","大爷","王爷","太后","皇后","公公","督主","相爷","老狼","老猫","老山羊","老公"]
CHILD_KEYS = ["小","宝","娃","孩","童","宝宝","小宝","小朋友","娃娃","同学","弟弟","妹妹","哥哥","姐姐","小名","小不点","宝贝"]
TEEN_KEYS = ["少","公子","姑娘","少年","少女","青年","少爷","相公"]
INFANT_KEYS = ["婴","宝宝","小宝","小婴儿","新生儿"]

def norm_char(s):
    return (s or "").strip().lower()

def contains_any(s, words):
    return any(w in s for w in words)

def role_gender(name):
    if contains_any(name, FEMALE_WORDS):
        return "F"
    if contains_any(name, MALE_WORDS):
        return "M"
    return None

def role_age(name):
    if contains_any(name, INFANT_KEYS):
        return "infant"
    if contains_any(name, CHILD_KEYS):
        return "child"
    if contains_any(name, TEEN_KEYS):
        return "teen"
    if contains_any(name, ELDER_KEYS):
        return "elder"
    return "adult"

# ─── 音色 gender 推断（同 _gender_audit）─────────────────────────
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

# 构建 样本音色 → (category, gender) 查找表，并列出每类可用音色
_present = {f.stem for f in VOICE_BANK.glob("*.mp3") if f.stem.startswith("V-")}
uv = json.load(open(UNIFIED, "r", encoding="utf-8"))
vid_meta = {}
for vid, item in uv.get("voices", {}).items():
    cat = item.get("category")
    g = gender_of(cat, item.get("category_name"), item.get("label"))
    vid_meta[vid] = {"cat": cat, "gender": g, "label": item.get("label"),
                     "exists": vid in _present}

# 目标音色池：category -> gender(M/F/E) -> [vids]
pool = defaultdict(lambda: defaultdict(list))
for vid, m in vid_meta.items():
    if m["exists"] and m["cat"] in ("infant", "child_boy", "child_girl", "teen",
                                    "adult_male", "adult_female", "elder"):
        pool[m["cat"]][m["gender"]].append(vid)

# 每个 (category, gender) 选一个稳定代表（按 vid 排序取第一个，便于复现）
def pick(cat, gender):
    cands = pool.get(cat, {}).get(gender, [])
    if not cands:
        return None
    return sorted(cands)[0]

def target_voice(age, gender):
    """按 年龄桶+性别 解析目标音色 id。找不到则降级到 adult / elder。"""
    if age == "infant":
        return pick("infant", gender) or pick("child_boy" if gender == "M" else "child_girl", gender)
    if age == "child":
        cat = "child_boy" if gender == "M" else "child_girl"
        return pick(cat, gender) or pick("teen", gender)
    if age == "teen":
        return pick("teen", gender) or pick("adult_male" if gender == "M" else "adult_female", gender)
    if age == "elder":
        # elder 按 label 细分：男/女/弱(E 当降级)
        v = pick("elder", gender)
        if v:
            return v
        v = pick("elder", "E")   # 弱性别兜底（睿智长者）
        if v:
            return v
        return pick("adult_male" if gender == "M" else "adult_female", gender)
    # adult
    cat = "adult_male" if gender == "M" else "adult_female"
    return pick(cat, gender) or pick("teen", gender)

# ─── 定位所有需要重配的段 ─────────────────────────────────────
jobs = defaultdict(list)   # segf -> [(i, new_vid, old_vid, reason)]
reason_counter = Counter()

def seg_files():
    return [str(p) for p in PROD.rglob("*/segments.json")]

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--test", type=int)
    ap.add_argument("--scope", type=str, default="")
    args = ap.parse_args()

    total_segs = 0
    for segf in seg_files():
        rel = str(Path(segf).parent.relative_to(PROD))
        if args.scope and not rel.startswith(args.scope):
            continue
        try:
            data = json.load(open(segf, "r", encoding="utf-8"))
        except Exception:
            continue
        for i, s in enumerate(data.get("segments", [])):
            total_segs += 1
            vid = s.get("voice_id")
            if not vid:
                continue
            new_vid = None
            reason = None

            # 1) VID_MAP（缺失音色）
            if new_vid is None and vid in VID_MAP:
                new_vid = VID_MAP[vid]; reason = "VID_MAP"

            # 2) 奶奶规则
            if new_vid is None:
                nc = norm_char(s.get("角色") or s.get("character") or s.get("name"))
                for r in CHAR_RULES:
                    if nc == norm_char(r["char"]) and rel.startswith(r["scope"]) \
                       and vid == r["old_vid"]:
                        new_vid = r["new_vid"]; reason = "CHAR_RULES"; break

            # 3) 性别审核 A/B/X：角色性别明确 且 当前音色性别相反/非人/年龄不符
            if new_vid is None:
                raw = s.get("角色") or s.get("character") or s.get("name") or ""
                nc = norm_char(raw)
                if nc:
                    exp = role_gender(nc)
                    if exp in ("F", "M"):
                        m = vid_meta.get(vid, {})
                        g = m.get("gender")
                        age = role_age(nc)
                        if g in ("M", "F"):
                            if g != exp:
                                # A 类：性别相反 → 改同年龄桶+正确性别
                                new_vid = target_voice(age, exp)
                                reason = f"A:{age}/{exp}"
                        elif g in ("E", "X"):
                            # E/X 类：老年弱性别或 非人音 → 改同年龄桶+正确性别人类音
                            new_vid = target_voice(age, exp)
                            reason = f"X:{age}/{exp}"

            if new_vid and new_vid != vid:
                jobs[segf].append((i, new_vid, vid, reason))
                reason_counter[reason] += 1

    # 汇总
    all_jobs = []
    for segf, lst in jobs.items():
        rel = str(Path(segf).parent.relative_to(PROD))
        for i, new_vid, old_vid, reason in lst:
            all_jobs.append((segf, rel, i, new_vid, old_vid, reason))

    print(f"扫描 segment 段数: {total_segs}")
    print(f"需重配段数: {len(all_jobs)}  (涉及文件 {len(jobs)})")
    print("原因分布:")
    for k, v in sorted(reason_counter.items(), key=lambda x: -x[1]):
        print(f"  {k}: {v}")
    if args.dry_run:
        sys.exit(0)

    if args.test:
        all_jobs = all_jobs[:args.test]

    # ─── 并发生成（10 并发）──────────────────────────────────
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

    # 汇总写回 segments.json（按文件聚合，串行避免并发写冲突）
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
            print(f"  ⚠ 写回失败 {segf}: {e}")

    print(f"\n结束：成功 {ok}/{len(all_jobs)} | 失败 {len(fail)}")
    for seg_id, e, reason in fail:
        print(f"  - {seg_id}  ({e}) [{reason}]")
