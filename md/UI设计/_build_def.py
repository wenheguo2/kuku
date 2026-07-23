# -*- coding: utf-8 -*-
"""Build D/E/F concept HTMLs by patching generator safely."""
from pathlib import Path
import re
import runpy

ROOT = Path(__file__).resolve().parent
BASE = ROOT / "_gen_concepts.py"
OUT_PY = ROOT / "_gen_concepts_def.py"

# --- theme CSS blocks (no nested code) ---
CSS_D = r"""
:root{
  --primary:#2F9FE0; --primary-d:#1E86C4; --primary-soft:#E3F4FC;
  --blue:#2F9FE0; --green:#5DBE6A; --pink:#FF8FA3; --purple:#8B9FE8; --gold:#F5C542;
  --bg:#F2FAFE; --bg2:#E5F4FB; --card:#FFFFFF; --ink:#1E3A4C; --sub:#6A8799;
  --line:#CDE6F2; --lamp:#F5C542;
  --s0:#C5D0D8; --s1:#F5C542; --s2:#5BB8F0; --s3:#5DBE6A;
  --sh-card:0 8px 0 #C5E4F2; --sh-btn:0 5px 0 #1E86C4;
  --sh-float:0 14px 32px rgba(30,100,140,.18);
  --page-canvas:#B8DFF0; --phone-border:#1E3A4C;
}
body{background:linear-gradient(180deg,#9FD4EE 0%,#C8E8F5 40%,#D4F0C8 100%);color:var(--ink)}
.phone{background:var(--bg);border-color:var(--phone-border);box-shadow:var(--sh-float)}
.phone::before{content:"";position:absolute;top:40px;right:18px;width:54px;height:28px;border-radius:20px;
  background:#fff;opacity:.55;box-shadow:-28px 18px 0 -4px #fff,22px 30px 0 -8px #fff;z-index:0;pointer-events:none}
.scr,.sb,.tabbar,.nav,.brand{position:relative;z-index:1}
.brand{color:var(--primary);font-weight:800}
.search{background:#fff;border:2px solid #B8DCEF;box-shadow:0 4px 0 #C5E4F2}
.card,.row,.scard{background:#fff;border:2px solid #D7EEF7;box-shadow:var(--sh-card)}
.banner{background:linear-gradient(135deg,#6BC4F0,#2F9FE0);border:2px solid #fff;box-shadow:0 6px 0 #1E86C4}
.tabbar{background:#fff;border-top:2px solid var(--line)}
.tb.on{color:var(--primary)}
.btn{background:var(--primary);box-shadow:var(--sh-btn);border:2px solid #fff;border-radius:22px}
.btn.ghost{background:#fff;color:var(--primary);border:2px solid var(--primary);box-shadow:0 4px 0 #C5E4F2}
.btn.green{background:var(--green);box-shadow:0 5px 0 #3E9A4C}
.cbtn{background:#fff;border:2px solid #D7EEF7;box-shadow:0 4px 0 #C5E4F2}
.cbtn.main{background:var(--primary);border-color:#fff;color:#fff}
.hero-full{height:180px;border-radius:28px;overflow:hidden;position:relative;
  background:linear-gradient(160deg,#7EC8F0 0%,#4AAEE0 50%,#5DBE6A 130%);
  border:3px solid #fff;box-shadow:0 8px 0 #8BC4A0}
.sky-hill{position:absolute;bottom:-20px;left:-10%;right:-10%;height:70px;background:#7BCF7A;border-radius:50% 50% 0 0}
.cover-art{width:48px;height:48px;border-radius:16px;display:flex;align-items:center;justify-content:center;
  font-size:22px;border:2px solid #fff;box-shadow:0 4px 0 #C5E4F2;flex:0 0 auto}
.rail{display:flex;gap:10px;overflow:hidden}
.rail .poster{flex:0 0 100px}
.poster .cover-art{width:100px;height:100px;border-radius:22px;font-size:36px}
.poster .nm{font-size:12px;font-weight:700;margin-top:6px}
.poster .ds{font-size:10px;color:var(--sub)}
"""

CSS_E = r"""
:root{
  --primary:#C45C48; --primary-d:#A84838; --primary-soft:#F3E6E2;
  --blue:#4A6B7C; --green:#6B8F71; --pink:#C45C48; --purple:#6B5B7A; --gold:#C4A35A;
  --bg:#F4EFE6; --bg2:#EAE3D6; --card:#FFFbf5; --ink:#2A2622; --sub:#7A7368;
  --line:#D8CFC0; --lamp:#C45C48;
  --s0:#B8B2A8; --s1:#C4A35A; --s2:#6A8FA3; --s3:#6B8F71;
  --sh-card:none; --sh-btn:none;
  --sh-float:0 12px 36px rgba(60,50,40,.16);
  --page-canvas:#D9D2C4; --phone-border:#2A2622;
}
body{background:
  radial-gradient(ellipse at 10% 20%,rgba(196,92,72,.06),transparent 40%),
  radial-gradient(ellipse at 90% 80%,rgba(74,107,124,.08),transparent 40%),
  #D9D2C4;color:var(--ink);
  font-family:"Songti SC","STSong","SimSun","Noto Serif SC","PingFang SC",serif}
.phone{background:var(--bg);border-color:var(--phone-border);
  background-image:linear-gradient(180deg,rgba(255,255,255,.35),transparent 30%)}
.brand{color:var(--ink);letter-spacing:.2em;font-weight:700}
.brand .seal{display:inline-block;width:18px;height:18px;background:var(--primary);color:#fff;
  font-size:10px;line-height:18px;text-align:center;border-radius:2px;margin-right:6px;vertical-align:middle;
  font-family:"PingFang SC",sans-serif}
.search{background:transparent;border:none;border-bottom:1px solid var(--ink);border-radius:0;box-shadow:none;color:var(--sub)}
.card,.row{background:transparent;box-shadow:none;border:none;border-bottom:1px solid var(--line);border-radius:0}
.scard{border:1px solid var(--line);border-radius:4px;padding:12px;background:rgba(255,255,255,.35);box-shadow:none}
.banner{background:linear-gradient(135deg,#3A3330,#2A2622);border-radius:4px;border-left:4px solid var(--primary)}
.tabbar{background:var(--bg);border-top:1px solid var(--line)}
.tb.on{color:var(--primary)}
.btn{background:var(--ink);color:#fff;border-radius:4px;letter-spacing:.12em;box-shadow:none}
.btn.ghost{background:transparent;color:var(--ink);border:1px solid var(--ink)}
.btn.green{background:var(--green)}.btn.blue{background:var(--blue)}
.cbtn{background:var(--bg2);border-radius:4px;box-shadow:none;border:1px solid var(--line)}
.cbtn.main{background:var(--primary);color:#fff;border:none;border-radius:4px}
.prog{background:var(--line);height:2px}.prog i,.prog b{background:var(--primary)}
.hero-full{height:170px;border-radius:4px;overflow:hidden;position:relative;
  background:linear-gradient(160deg,#3F3834,#1E1A18);color:#F4EFE6;border-left:4px solid var(--primary)}
.ink-wash{position:absolute;right:-20px;top:-20px;width:140px;height:140px;border-radius:50%;
  background:radial-gradient(circle,rgba(255,255,255,.12),transparent 70%)}
.cover-art{width:44px;height:44px;border-radius:4px;display:flex;align-items:center;justify-content:center;
  font-size:20px;border:1px solid var(--line);flex:0 0 auto;background:var(--bg2)}
.rail{display:flex;gap:10px;overflow:hidden}
.rail .poster{flex:0 0 96px}
.poster .cover-art{width:96px;height:120px;border-radius:4px;font-size:32px}
.poster .nm{font-size:12px;font-weight:700;margin-top:6px;letter-spacing:.06em}
.poster .ds{font-size:10px;color:var(--sub)}
.chip{border-radius:2px;border:1px solid var(--line);background:transparent}
.chip.on{background:var(--primary);border-color:var(--primary);color:#fff}
.sec-h .t{letter-spacing:.15em;font-size:13px}
"""

CSS_F = r"""
:root{
  --primary:#FF6B5A; --primary-d:#E85544; --primary-soft:#FFE8E4;
  --blue:#2EC4B6; --green:#7BD67A; --pink:#FF6B5A; --purple:#7B6CF0; --gold:#F4C430;
  --bg:#FFFDF8; --bg2:#F3EFE6; --card:#FFFFFF; --ink:#1A1A1A; --sub:#7A776F;
  --line:#E8E2D6; --lamp:#F4C430;
  --s0:#C8C4BC; --s1:#F4C430; --s2:#4DB7E8; --s3:#7BD67A;
  --sh-card:0 0 0 3px #1A1A1A; --sh-btn:4px 4px 0 #1A1A1A;
  --sh-float:8px 8px 0 #1A1A1A;
  --page-canvas:#2A2A2A; --phone-border:#1A1A1A;
}
body{background:#2A2A2A;color:var(--ink);
  background-image:repeating-linear-gradient(0deg,transparent,transparent 23px,rgba(255,255,255,.04) 23px,rgba(255,255,255,.04) 24px),
                   repeating-linear-gradient(90deg,transparent,transparent 23px,rgba(255,255,255,.04) 23px,rgba(255,255,255,.04) 24px)}
.page-head h1,.page-head p,.group-title,.item .cap,.item .cap b,.item .cid,.footer,.compare{color:#F0EDE6}
.item .cid{background:#3A3A3A;border-color:#555;color:#CCC}
.compare{background:#3A3A3A;border-color:#555}
.phone{background:var(--bg);border-color:var(--phone-border);border-width:8px;border-radius:28px;box-shadow:var(--sh-float)}
.brand{color:var(--ink);font-weight:900;letter-spacing:-.03em;font-size:16px}
.search{background:var(--bg2);border:3px solid var(--ink);border-radius:12px;box-shadow:3px 3px 0 var(--ink)}
.card{background:#fff;border:3px solid var(--ink);border-radius:16px;box-shadow:4px 4px 0 var(--ink)}
.row{background:#fff;border:3px solid var(--ink);border-radius:14px;box-shadow:3px 3px 0 var(--ink);margin-bottom:10px}
.scard{background:#fff;border:3px solid var(--ink);border-radius:16px;box-shadow:3px 3px 0 var(--ink)}
.banner{background:var(--primary);border:3px solid var(--ink);border-radius:18px;box-shadow:5px 5px 0 var(--ink)}
.tabbar{background:#fff;border-top:3px solid var(--ink)}
.tb.on{color:var(--primary)}
.btn{background:var(--primary);color:#fff;border:3px solid var(--ink);border-radius:14px;box-shadow:var(--sh-btn)}
.btn.ghost{background:#fff;color:var(--ink);border:3px solid var(--ink);box-shadow:3px 3px 0 var(--ink)}
.btn.green{background:var(--green);color:var(--ink)}.btn.blue{background:var(--blue);color:var(--ink)}
.cbtn{background:#fff;border:3px solid var(--ink);border-radius:12px;box-shadow:3px 3px 0 var(--ink)}
.cbtn.main{background:var(--gold);color:var(--ink);border:3px solid var(--ink);box-shadow:4px 4px 0 var(--ink)}
.prog{background:var(--bg2);height:8px;border:2px solid var(--ink);border-radius:4px}
.prog i{background:var(--primary);height:100%}.prog b{background:var(--ink);border:2px solid var(--ink);width:14px;height:14px;top:-5px}
.hero-full{height:170px;border-radius:20px;overflow:hidden;position:relative;
  background:var(--gold);border:3px solid var(--ink);box-shadow:5px 5px 0 var(--ink);color:var(--ink)}
.wave{display:flex;align-items:flex-end;justify-content:center;gap:3px;height:36px}
.wave i{display:block;width:4px;background:var(--ink);border-radius:2px;animation:wav 1s ease-in-out infinite alternate}
.wave i:nth-child(1){height:12px}.wave i:nth-child(2){height:22px;animation-delay:.1s}
.wave i:nth-child(3){height:30px;animation-delay:.2s}.wave i:nth-child(4){height:18px;animation-delay:.15s}
.wave i:nth-child(5){height:26px;animation-delay:.05s}.wave i:nth-child(6){height:14px;animation-delay:.25s}
@keyframes wav{to{transform:scaleY(1.35)}}
.block-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.block{border:3px solid var(--ink);border-radius:16px;padding:14px;box-shadow:3px 3px 0 var(--ink);min-height:88px}
.block .nm{font-size:14px;font-weight:900}.block .ct{font-size:11px;margin-top:4px}
.cover-art{width:46px;height:46px;border-radius:12px;border:3px solid var(--ink);display:flex;align-items:center;justify-content:center;font-size:20px;flex:0 0 auto}
.chip{border:2px solid var(--ink);border-radius:10px;box-shadow:2px 2px 0 var(--ink);background:#fff}
.chip.on{background:var(--primary);color:#fff}
"""


def themes_block():
    # Build THEMES dict source with escaped CSS for embedding in Python triple quotes
    def esc(css):
        return css.replace("\\", "\\\\")

    return f'''THEMES = {{
    "D": {{
        "file": "概念D_晴空操场.html",
        "title": "方案 D · 晴空操场",
        "tagline": "白天户外感 · 天蓝草绿 · 云朵软形状 · 活力但不吵",
        "body_bg": "#B8DFF0",
        "css": """{esc(CSS_D)}""",
    }},
    "E": {{
        "file": "概念E_水墨书房.html",
        "title": "方案 E · 水墨书房",
        "tagline": "宣纸墨色 · 朱砂点睛 · 东方书房 · 适合蒙学/历史气质",
        "body_bg": "#D9D2C4",
        "css": """{esc(CSS_E)}""",
    }},
    "F": {{
        "file": "概念F_积木电台.html",
        "title": "方案 F · 积木电台",
        "tagline": "块面几何 · 音频优先 · 珊瑚/芥末/青绿 · 玩具积木感",
        "body_bg": "#2A2A2A",
        "css": """{esc(CSS_F)}""",
    }},
}}
'''


OVERRIDES = r'''
# ---- D/E/F signature screens (override A/B/C layouts) ----

def s01(theme):
    if theme == "D":
        inner = f"""
        <div class="brand">☀️ 酷酷 · 操场日</div>
        <div class="pad"><div class="search">🔍 搜故事、儿歌、朋友…</div></div>
        <div class="scroll pad" style="padding-top:10px">
          <div class="hero-full">
            <div class="sky-hill"></div>
            <div style="position:absolute;inset:0;display:flex;flex-direction:column;justify-content:flex-end;padding:16px;color:#fff;z-index:1">
              <span style="font-size:11px;background:rgba(255,255,255,.3);padding:3px 10px;border-radius:12px;width:fit-content">今日推荐</span>
              <div style="font-size:22px;font-weight:800;margin-top:8px">草船借箭</div>
              <div style="font-size:12px;opacity:.9;margin:4px 0 10px">上下五千年 · 15 分钟</div>
              <div class="btn" style="width:118px;height:34px;font-size:12px;background:#F5C542;color:#1E3A4C;box-shadow:0 4px 0 #C4A020">▶ 开始听</div>
            </div>
            <div style="position:absolute;right:12px;top:24px;font-size:58px;z-index:1">🏹</div>
          </div>
          <div class="sec-h"><span class="t">继续听</span><span class="m">全部 ›</span></div>
          <div class="row">{cover("🦁","#FFE3E7","#FFD0D8")}<div class="gr"><div class="nm">勇敢的小狮子</div><div class="ds">听到 03:20 · L4</div></div><span class="play-s">▶</span></div>
          <div class="sec-h"><span class="t">学科跑道</span></div>
          <div class="rail">
            <div class="poster"><div class="cover-art" style="background:linear-gradient(145deg,#FFB4C0,#FF8FA3)">🦁</div><div class="nm">品格养成</div><div class="ds">1,245</div></div>
            <div class="poster"><div class="cover-art" style="background:linear-gradient(145deg,#B8F0C0,#5DBE6A)">💚</div><div class="nm">情绪疗愈</div><div class="ds">980</div></div>
            <div class="poster"><div class="cover-art" style="background:linear-gradient(145deg,#B8E4F8,#2F9FE0)">🏠</div><div class="nm">生活认知</div><div class="ds">1,145</div></div>
          </div>
        </div>
        {tabs("story", theme)}"""
    elif theme == "E":
        inner = f"""
        <div class="brand"><span class="seal">酷</span>儿童故事</div>
        <div class="pad"><div class="search">检索篇目、学科、典故…</div></div>
        <div class="scroll pad" style="padding-top:12px">
          <div class="hero-full">
            <div class="ink-wash"></div>
            <div style="position:absolute;inset:0;padding:18px;display:flex;flex-direction:column;justify-content:flex-end">
              <div style="font-size:11px;letter-spacing:.2em;color:#C45C48">今日一读</div>
              <div style="font-size:24px;font-weight:700;margin-top:8px;letter-spacing:.12em">草船借箭</div>
              <div style="font-size:12px;color:#B8AFA3;margin:6px 0 12px">上下五千年 · 十五分钟</div>
              <div class="btn" style="width:110px;height:34px;font-size:12px">开卷</div>
            </div>
          </div>
          <div class="sec-h"><span class="t">续听</span><span class="m">全部</span></div>
          <div class="row">{cover("🦁","#EAE3D6","#D8CFC0")}<div class="gr"><div class="nm">勇敢的小狮子</div><div class="ds">已听至 03:20</div></div><span class="rt">听</span></div>
          <div class="sec-h"><span class="t">八科</span></div>
          <div class="rail">
            <div class="poster"><div class="cover-art" style="background:#E8D8D4">品</div><div class="nm">品格养成</div></div>
            <div class="poster"><div class="cover-art" style="background:#D8E4D8">情</div><div class="nm">情绪疗愈</div></div>
            <div class="poster"><div class="cover-art" style="background:#D4DEE4">史</div><div class="nm">上下五千年</div></div>
          </div>
        </div>
        {tabs("story", theme)}"""
    else:
        inner = f"""
        <div class="brand">KUKU FM</div>
        <div class="pad"><div class="search">🔍 SEARCH</div></div>
        <div class="scroll pad" style="padding-top:10px">
          <div class="hero-full">
            <div style="position:absolute;inset:0;padding:16px;display:flex;flex-direction:column;justify-content:space-between">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <span style="font-size:11px;font-weight:900;border:2px solid #1A1A1A;padding:2px 8px;border-radius:8px;background:#fff">NOW</span>
                <div class="wave"><i></i><i></i><i></i><i></i><i></i><i></i></div>
              </div>
              <div>
                <div style="font-size:24px;font-weight:900">草船借箭</div>
                <div style="font-size:12px;margin:4px 0 10px">上下五千年 · 15:00</div>
                <div class="btn" style="width:120px;height:36px;font-size:12px;background:#FF6B5A">▶ PLAY</div>
              </div>
            </div>
          </div>
          <div class="sec-h"><span class="t">CONTINUE</span></div>
          <div class="row">{cover("🦁","#FFD0D8","#FF6B5A")}<div class="gr"><div class="nm">勇敢的小狮子</div><div class="ds">03:20 LEFT</div></div><span class="play-s">▶</span></div>
          <div class="sec-h"><span class="t">BLOCKS</span></div>
          <div class="block-grid">
            <div class="block" style="background:#FF6B5A;color:#fff"><div class="nm">品格</div><div class="ct">1,245</div></div>
            <div class="block" style="background:#2EC4B6"><div class="nm">情绪</div><div class="ct">980</div></div>
            <div class="block" style="background:#F4C430"><div class="nm">生活</div><div class="ct">1,145</div></div>
            <div class="block" style="background:#7B6CF0;color:#fff"><div class="nm">自然</div><div class="ct">870</div></div>
          </div>
        </div>
        {tabs("story", theme)}"""
    return item("S-01", "故事首页", phone(inner))


def pl01(theme):
    if theme == "D":
        inner = """
        <div class="nav"><span class="bk">⌄</span><span class="ti">正在听</span><span class="rt">≡</span></div>
        <div class="scroll pad">
          <div class="cover-lg" style="background:linear-gradient(145deg,#7EC8F0,#2F9FE0);border:3px solid #fff;box-shadow:0 8px 0 #8BC4A0">🏹</div>
          <div style="text-align:center;margin-top:14px"><div style="font-size:18px;font-weight:800">草船借箭</div><div class="muted">上下五千年 · 三国篇</div></div>
          <div style="margin-top:16px"><div class="prog"><i style="width:45%"></i><b style="left:45%"></b></div>
            <div class="time"><span>06:45</span><span>15:00</span></div></div>
          <div class="ctrls"><div class="cbtn">⏮</div><div class="cbtn main">⏸</div><div class="cbtn">⏭</div></div>
          <div class="fns"><div><span class="i">❤️</span>收藏</div><div><span class="i">🕒</span>定时</div><div><span class="i">🔁</span>循环</div><div><span class="i">📝</span>文本</div></div>
        </div>"""
    elif theme == "E":
        inner = """
        <div class="nav"><span class="bk">⌄</span><span class="ti">播音</span><span class="rt">≡</span></div>
        <div class="scroll pad">
          <div class="cover-lg" style="background:linear-gradient(145deg,#3F3834,#1E1A18);border-radius:4px;color:#F4EFE6;border-left:4px solid #C45C48">弓</div>
          <div style="text-align:center;margin-top:16px"><div style="font-size:20px;font-weight:700;letter-spacing:.15em">草船借箭</div><div class="muted">上下五千年</div></div>
          <div style="margin-top:20px"><div class="prog"><i style="width:45%"></i><b style="left:45%"></b></div>
            <div class="time"><span>06:45</span><span>15:00</span></div></div>
          <div class="ctrls"><div class="cbtn">⏮</div><div class="cbtn main">⏸</div><div class="cbtn">⏭</div></div>
        </div>"""
    else:
        inner = """
        <div class="nav"><span class="bk">⌄</span><span class="ti">PLAYER</span><span class="rt">≡</span></div>
        <div class="scroll pad">
          <div class="cover-lg" style="background:#F4C430;border:3px solid #1A1A1A;border-radius:20px;box-shadow:6px 6px 0 #1A1A1A">🏹</div>
          <div style="text-align:center;margin-top:12px"><div class="wave" style="justify-content:center;margin-bottom:8px"><i></i><i></i><i></i><i></i><i></i><i></i></div>
            <div style="font-size:20px;font-weight:900">草船借箭</div><div class="muted">三国 · 15:00</div></div>
          <div style="margin-top:16px"><div class="prog"><i style="width:45%"></i><b style="left:45%"></b></div>
            <div class="time"><span>06:45</span><span>15:00</span></div></div>
          <div class="ctrls"><div class="cbtn">⏮</div><div class="cbtn main">⏸</div><div class="cbtn">⏭</div></div>
        </div>"""
    return item("PL-01", "故事播放器", phone(inner))


def a01(theme):
    if theme == "D":
        body = """
          <div style="font-size:56px">☀️</div>
          <div style="font-size:22px;font-weight:800;margin-top:8px;color:#2F9FE0">酷酷儿童故事</div>
          <div class="muted" style="margin:8px 0 24px">出去玩，也带着故事</div>
          <div class="btn" style="width:230px">微信一键登录</div>
          <div class="btn ghost" style="width:230px;margin-top:12px">手机号登录</div>"""
    elif theme == "E":
        body = """
          <div style="width:56px;height:56px;background:#C45C48;color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;margin-bottom:12px">酷</div>
          <div style="font-size:22px;font-weight:700;letter-spacing:.2em">儿童故事</div>
          <div class="muted" style="margin:10px 0 26px">听故事 · 唱歌曲 · 交朋友</div>
          <div class="btn" style="width:230px">微信登录</div>
          <div class="btn ghost" style="width:230px;margin-top:12px">手机号登录</div>"""
    else:
        body = """
          <div style="font-size:36px;font-weight:900;letter-spacing:-.04em">KUKU</div>
          <div class="muted" style="margin:8px 0 28px">STORY RADIO</div>
          <div class="btn" style="width:220px">微信登录</div>
          <div class="btn ghost" style="width:220px;margin-top:12px">手机号</div>"""
    body += """<div style="margin-top:22px;font-size:11px;color:var(--sub);line-height:1.6">登录即同意《用户协议》与《隐私政策》</div>"""
    return item("A-01", "登录页", phone(f'<div class="center">{body}</div>'))
'''


def main():
    text = BASE.read_text(encoding="utf-8")

    text2, n = re.subn(
        r"THEMES = \{.*?\n\}\n\n\ndef base_css",
        themes_block() + "\n\ndef base_css",
        text,
        count=1,
        flags=re.S,
    )
    if n != 1:
        raise SystemExit(f"THEMES replace failed: {n}")
    text = text2

    text = text.replace('theme="A"', 'theme="D"')
    text = text.replace('theme == "A"', 'theme == "D"')
    text = text.replace('theme == "B"', 'theme == "E"')
    text = text.replace('theme == "C"', 'theme == "F"')
    text = text.replace('for key in ("A", "B", "C")', 'for key in ("D", "E", "F")')
    text = text.replace(
        '"""Generate A/B/C full-screen UI concept HTML mockups."""',
        '"""Generate D/E/F full-screen UI concept HTML mockups."""',
    )
    text = text.replace(
        '''notes = {
        "A": "深靛蓝夜空 + 暖橙夜灯；首页只留推荐/续听/学科轨；播放器沉浸；保留四级朋友色。",
        "B": "角色立绘锚点 + 软纸纹 + 厚描边；空状态/登录/结果页角色出场；话术对齐养成系统。",
        "C": "低饱和黏土色 + 2 列大海报；弱化白卡阴影；封面即容器；信息极简。",
    }''',
        '''notes = {
        "D": "天蓝+草绿晴空操场；云朵/山坡软形状；厚底阴影像贴纸；白天活力，对位夜灯方案。",
        "E": "宣纸底+墨色字+朱砂点睛；细线书房感；宋体气质；贴合蒙学/上下五千年。",
        "F": "粗描边积木块+芥末金波形；音频优先；珊瑚/青绿撞色；玩具电台感。",
    }''',
    )

    # Drop original s01/pl01/a01 then append overrides at end (before main)
    text2, n = re.subn(r"\ndef s01\(theme\):.*?\n\ndef s02\(", "\n\ndef s02(", text, count=1, flags=re.S)
    if n != 1:
        raise SystemExit(f"remove s01 failed: {n}")
    text = text2

    text2, n = re.subn(r"\ndef pl01\(theme\):.*?\n\ndef pl02\(", "\n\ndef pl02(", text, count=1, flags=re.S)
    if n != 1:
        raise SystemExit(f"remove pl01 failed: {n}")
    text = text2

    text2, n = re.subn(r"\ndef a01\(theme\):.*?\n\ndef a03\(", "\n\ndef a03(", text, count=1, flags=re.S)
    if n != 1:
        raise SystemExit(f"remove a01 failed: {n}")
    text = text2

    text = text.replace("\ndef main():", "\n" + OVERRIDES + "\n\ndef main():")

    OUT_PY.write_text(text, encoding="utf-8")
    print("wrote", OUT_PY.name, "bytes", OUT_PY.stat().st_size)

    # Execute generator
    runpy.run_path(str(OUT_PY), run_name="__main__")

    for name in ("概念D_晴空操场.html", "概念E_水墨书房.html", "概念F_积木电台.html"):
        p = ROOT / name
        t = p.read_text(encoding="utf-8")
        print(name, "ok", p.stat().st_size, "cid", t.count('class="cid"'), "S-01", "S-01" in t)


if __name__ == "__main__":
    main()
