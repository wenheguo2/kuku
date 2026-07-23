# -*- coding: utf-8 -*-
"""Build G/H/I premium concept HTMLs."""
from pathlib import Path
import re
import runpy

ROOT = Path(__file__).resolve().parent
BASE = ROOT / "_gen_concepts.py"
OUT_PY = ROOT / "_gen_concepts_ghi.py"

CSS_G = r"""
:root{
  --primary:#A67C5D; --primary-d:#8B6550; --primary-soft:#F3EBE4;
  --blue:#7A9AA8; --green:#8FA38A; --pink:#C4A4A0; --purple:#9A8FA8; --gold:#C4A574;
  --bg:#F7F4F0; --bg2:#EFEAE4; --card:rgba(255,255,255,.72); --ink:#2B2724; --sub:#8A827A;
  --line:rgba(43,39,36,.08); --lamp:#C4A574;
  --s0:#C8C2BA; --s1:#D4B56A; --s2:#7A9AA8; --s3:#8FA38A;
  --sh-card:0 20px 50px rgba(60,40,30,.06); --sh-btn:none;
  --sh-float:0 30px 80px rgba(40,30,20,.12);
  --page-canvas:#E8E2DA; --phone-border:#2B2724;
}
body{background:linear-gradient(165deg,#EDE7DF,#E2DBD2 50%,#D9D1C7);color:var(--ink);
  font-family:"PingFang SC","Hiragino Sans GB","Noto Sans SC",system-ui,sans-serif;
  letter-spacing:.01em}
.page-head h1{font-weight:500;letter-spacing:.08em}
.phone{background:var(--bg);border-color:var(--phone-border);border-radius:40px;box-shadow:var(--sh-float)}
.brand{color:var(--ink);font-weight:500;letter-spacing:.28em;font-size:12px;text-transform:uppercase}
.search{background:rgba(255,255,255,.55);border:none;box-shadow:none;backdrop-filter:blur(12px);
  border-radius:999px;color:var(--sub);font-size:12px;letter-spacing:.04em}
.card,.row,.scard{background:var(--card);border:1px solid var(--line);box-shadow:var(--sh-card);
  backdrop-filter:blur(16px);border-radius:22px}
.banner{background:linear-gradient(145deg,#C4A574,#A67C5D);border:none;box-shadow:var(--sh-card);border-radius:24px}
.tabbar{background:rgba(247,244,240,.88);border-top:1px solid var(--line);backdrop-filter:blur(20px)}
.tb{font-size:9px;letter-spacing:.08em;text-transform:uppercase}.tb.on{color:var(--primary);font-weight:600}
.btn{background:var(--ink);color:#F7F4F0;border-radius:999px;box-shadow:none;font-weight:500;letter-spacing:.12em;font-size:12px}
.btn.ghost{background:transparent;color:var(--ink);border:1px solid rgba(43,39,36,.25)}
.btn.green{background:var(--green)}.btn.blue{background:var(--blue)}
.cbtn{background:rgba(255,255,255,.7);border:1px solid var(--line);box-shadow:none;backdrop-filter:blur(8px)}
.cbtn.main{background:var(--ink);color:#F7F4F0;border:none}
.prog{background:rgba(43,39,36,.08);height:2px}.prog i,.prog b{background:var(--ink)}
.hero-full{height:220px;border-radius:28px;overflow:hidden;position:relative;
  background:linear-gradient(165deg,#B89A7A 0%,#8A6B52 45%,#5C4638 100%);
  box-shadow:var(--sh-card)}
.hero-full::after{content:"";position:absolute;inset:0;
  background:linear-gradient(180deg,transparent 35%,rgba(20,14,10,.55))}
.veil{position:absolute;inset:0;background:radial-gradient(circle at 70% 20%,rgba(255,255,255,.18),transparent 45%)}
.cover-art{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;
  font-size:18px;flex:0 0 auto;background:var(--bg2)}
.rail{display:flex;gap:12px;overflow:hidden}
.rail .poster{flex:0 0 112px}
.poster .cover-art{width:112px;height:140px;border-radius:18px;font-size:28px}
.poster .nm{font-size:11px;font-weight:500;margin-top:8px;letter-spacing:.04em}
.poster .ds{font-size:10px;color:var(--sub);letter-spacing:.02em}
.sec-h .t{font-size:11px;font-weight:500;letter-spacing:.18em;text-transform:uppercase;color:var(--sub)}
.row .gr .nm{font-weight:500;font-size:13px}.muted{letter-spacing:.02em}
.chip{border-radius:999px;background:rgba(255,255,255,.5);border:1px solid var(--line);font-size:11px;letter-spacing:.04em}
.chip.on{background:var(--ink);color:#F7F4F0;border-color:var(--ink)}
"""

CSS_H = r"""
:root{
  --primary:#3D5A5B; --primary-d:#2F4748; --primary-soft:#E8EEED;
  --blue:#5B7C8A; --green:#6B8F71; --pink:#A88984; --purple:#7A7389; --gold:#A89070;
  --bg:#F5F4F1; --bg2:#ECEAE4; --card:#FFFFFF; --ink:#1C1C1C; --sub:#7A7872;
  --line:#E4E1DA; --lamp:#A89070;
  --s0:#BDBBB4; --s1:#C4A86A; --s2:#6A8FA3; --s3:#6B8F71;
  --sh-card:none; --sh-btn:none;
  --sh-float:0 24px 60px rgba(20,20,20,.1);
  --page-canvas:#DCD9D2; --phone-border:#1C1C1C;
}
body{background:#DCD9D2;color:var(--ink);
  font-family:"PingFang SC","Helvetica Neue","Noto Sans SC",system-ui,sans-serif}
.page-head h1{font-weight:400;letter-spacing:.06em}
.phone{background:var(--bg);border-color:var(--phone-border);border-radius:36px;box-shadow:var(--sh-float)}
.brand{color:var(--ink);font-weight:400;letter-spacing:.35em;font-size:11px}
.search{background:transparent;border:none;border-bottom:1px solid var(--ink);border-radius:0;
  box-shadow:none;padding-left:0;color:var(--sub);font-size:12px;letter-spacing:.06em}
.card{background:transparent;box-shadow:none;border:none;border-radius:0}
.row{background:transparent;box-shadow:none;border:none;border-bottom:1px solid var(--line);
  border-radius:0;padding:14px 0;margin:0}
.scard{background:var(--bg2);box-shadow:none;border:none;border-radius:8px}
.banner{display:none}
.tabbar{background:var(--bg);border-top:1px solid var(--line)}
.tb{letter-spacing:.1em;font-size:9px;text-transform:uppercase}.tb.on{color:var(--primary);font-weight:600}
.btn{background:var(--ink);color:#F5F4F1;border-radius:2px;box-shadow:none;font-weight:400;letter-spacing:.16em;font-size:11px}
.btn.ghost{background:transparent;color:var(--ink);border:1px solid var(--ink)}
.btn.green{background:var(--green)}.btn.blue{background:var(--blue)}
.cbtn{background:var(--bg2);box-shadow:none;border:none;border-radius:2px}
.cbtn.main{background:var(--ink);color:#F5F4F1;border-radius:2px}
.prog{background:var(--line);height:1px}.prog i{background:var(--ink);height:1px}
.prog b{background:var(--ink);width:8px;height:8px;top:-3.5px}
.hero-full{height:260px;border-radius:0;overflow:hidden;position:relative;margin:0 -14px;
  background:linear-gradient(180deg,#4A5C5C 0%,#2A3535 100%)}
.hero-full::after{content:"";position:absolute;inset:0;
  background:linear-gradient(180deg,transparent 40%,rgba(0,0,0,.45))}
.cover-art{width:40px;height:40px;border-radius:2px;display:flex;align-items:center;justify-content:center;
  font-size:16px;flex:0 0 auto;background:var(--bg2)}
.rail{display:flex;gap:14px;overflow:hidden}
.rail .poster{flex:0 0 120px}
.poster .cover-art{width:120px;height:150px;border-radius:2px;font-size:28px}
.poster .nm{font-size:11px;font-weight:400;margin-top:10px;letter-spacing:.04em}
.poster .ds{font-size:10px;color:var(--sub)}
.sec-h{margin:28px 0 12px}.sec-h .t{font-size:10px;font-weight:500;letter-spacing:.22em;text-transform:uppercase;color:var(--sub)}
.editorial-title{font-size:28px;font-weight:300;letter-spacing:.04em;line-height:1.25}
.chip{border-radius:0;border:1px solid var(--line);background:transparent;letter-spacing:.06em}
.chip.on{background:var(--ink);color:#F5F4F1;border-color:var(--ink)}
.pad{padding:0 18px}
"""

CSS_I = r"""
:root{
  --primary:#D4C4A8; --primary-d:#B8A88C; --primary-soft:rgba(212,196,168,.12);
  --blue:#8AA4B0; --green:#8FA890; --pink:#C4A8A8; --purple:#A89AB0; --gold:#D4C4A8;
  --bg:#0E0E0E; --bg2:#181818; --card:#161616; --ink:#F2EDE4; --sub:#8A8680;
  --line:rgba(242,237,228,.08); --lamp:#D4C4A8;
  --s0:#55524E; --s1:#D4C4A8; --s2:#8AA4B0; --s3:#8FA890;
  --sh-card:none; --sh-btn:none;
  --sh-float:0 40px 100px rgba(0,0,0,.65);
  --page-canvas:#050505; --phone-border:#2A2A2A;
}
body{background:#050505;color:var(--ink);
  font-family:"PingFang SC","Helvetica Neue","Noto Sans SC",system-ui,sans-serif}
.page-head h1,.page-head p,.group-title,.item .cap,.item .cap b,.item .cid,.footer,.compare{color:#E8E2D8}
.item .cid{background:#1A1A1A;border-color:#333;color:#999}
.compare{background:#141414;border-color:#2A2A2A}
.phone{background:var(--bg);border-color:var(--phone-border);border-radius:38px;box-shadow:var(--sh-float)}
.sb{color:var(--sub)}
.brand{color:var(--primary);font-weight:300;letter-spacing:.4em;font-size:11px}
.search{background:var(--bg2);border:1px solid var(--line);box-shadow:none;border-radius:999px;color:var(--sub);font-size:12px}
.card,.row,.scard{background:var(--card);border:1px solid var(--line);box-shadow:none;border-radius:16px}
.banner{background:linear-gradient(145deg,#2A2620,#141210);border:1px solid rgba(212,196,168,.2)}
.tabbar{background:rgba(14,14,14,.92);border-top:1px solid var(--line);backdrop-filter:blur(20px)}
.tb{color:#666;letter-spacing:.1em;font-size:9px;text-transform:uppercase}.tb.on{color:var(--primary)}
.btn{background:var(--primary);color:#0E0E0E;border-radius:999px;box-shadow:none;font-weight:500;letter-spacing:.14em;font-size:12px}
.btn.ghost{background:transparent;color:var(--primary);border:1px solid rgba(212,196,168,.35)}
.btn.green{background:var(--green);color:#0E0E0E}.btn.blue{background:var(--blue);color:#0E0E0E}
.cbtn{background:var(--bg2);border:1px solid var(--line);box-shadow:none;color:var(--ink)}
.cbtn.main{background:var(--primary);color:#0E0E0E;border:none}
.prog{background:rgba(242,237,228,.1);height:2px}.prog i,.prog b{background:var(--primary)}
.hero-full{height:240px;border-radius:20px;overflow:hidden;position:relative;
  background:linear-gradient(160deg,#3A3228 0%,#1A1612 50%,#0A0908 100%);
  border:1px solid rgba(212,196,168,.15)}
.hero-full::after{content:"";position:absolute;inset:0;
  background:linear-gradient(180deg,transparent 30%,rgba(0,0,0,.75))}
.film{position:absolute;inset:0;opacity:.35;
  background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,.02) 2px,rgba(255,255,255,.02) 3px)}
.cover-art{width:44px;height:44px;border-radius:10px;display:flex;align-items:center;justify-content:center;
  font-size:18px;flex:0 0 auto;background:var(--bg2);border:1px solid var(--line)}
.rail{display:flex;gap:12px;overflow:hidden}
.rail .poster{flex:0 0 108px}
.poster .cover-art{width:108px;height:135px;border-radius:12px;font-size:26px}
.poster .nm{font-size:11px;font-weight:400;margin-top:8px;letter-spacing:.06em;color:var(--ink)}
.poster .ds{font-size:10px;color:var(--sub)}
.sec-h .t{font-size:10px;font-weight:400;letter-spacing:.24em;text-transform:uppercase;color:var(--sub)}
.chip{background:var(--bg2);border:1px solid var(--line);border-radius:999px;color:var(--sub)}
.chip.on{background:var(--primary);color:#0E0E0E;border-color:var(--primary)}
.tag.lv{background:rgba(212,196,168,.12);color:var(--primary)}
"""


def themes_block():
    def esc(css):
        return css.replace("\\", "\\\\")

    return f'''THEMES = {{
    "G": {{
        "file": "概念G_雾面丝绸.html",
        "title": "方案 G · 雾面丝绸",
        "tagline": "柔雾玻璃 · 香槟灰褐 · 大留白 · 轻奢亲子品牌感",
        "body_bg": "#E8E2DA",
        "css": """{esc(CSS_G)}""",
    }},
    "H": {{
        "file": "概念H_北欧书斋.html",
        "title": "方案 H · 北欧书斋",
        "tagline": "编辑排版 · 冷石色 · 细线克制 · 杂志级内容发现",
        "body_bg": "#DCD9D2",
        "css": """{esc(CSS_H)}""",
    }},
    "I": {{
        "file": "概念I_深夜画廊.html",
        "title": "方案 I · 深夜画廊",
        "tagline": "博物馆黑 · 象牙金点缀 · 全幅封面 · 高端音频产品感",
        "body_bg": "#050505",
        "css": """{esc(CSS_I)}""",
    }},
}}
'''


OVERRIDES = r'''
def s01(theme):
    if theme == "G":
        inner = f"""
        <div class="brand">KUKU</div>
        <div class="pad"><div class="search">搜索故事</div></div>
        <div class="scroll pad" style="padding-top:14px">
          <div class="hero-full">
            <div class="veil"></div>
            <div style="position:absolute;inset:0;z-index:1;display:flex;flex-direction:column;justify-content:flex-end;padding:22px;color:#F7F4F0">
              <div style="font-size:10px;letter-spacing:.2em;opacity:.75">今日精选</div>
              <div style="font-size:26px;font-weight:400;margin-top:8px;letter-spacing:.06em">草船借箭</div>
              <div style="font-size:11px;opacity:.7;margin:8px 0 16px;letter-spacing:.04em">上下五千年 · 15 分钟</div>
              <div class="btn" style="width:108px;height:36px">收听</div>
            </div>
          </div>
          <div class="sec-h"><span class="t">Continue</span></div>
          <div class="row">{cover(" ","#EFEAE4","#E2DBD2")}<div class="gr"><div class="nm">勇敢的小狮子</div><div class="ds">03:20 · L4</div></div><span class="play-s">▶</span></div>
          <div class="sec-h"><span class="t">Collections</span></div>
          <div class="rail">
            <div class="poster"><div class="cover-art" style="background:linear-gradient(160deg,#E8D4C8,#C4A090)"></div><div class="nm">品格养成</div><div class="ds">1,245</div></div>
            <div class="poster"><div class="cover-art" style="background:linear-gradient(160deg,#D4E0D4,#A8BCA8)"></div><div class="nm">情绪疗愈</div><div class="ds">980</div></div>
            <div class="poster"><div class="cover-art" style="background:linear-gradient(160deg,#D4DCE4,#A8B4C0)"></div><div class="nm">生活认知</div><div class="ds">1,145</div></div>
          </div>
        </div>
        {tabs("story", theme)}"""
    elif theme == "H":
        inner = f"""
        <div class="brand">KUKU</div>
        <div class="pad" style="padding-top:4px"><div class="search">Search</div></div>
        <div class="scroll">
          <div class="hero-full">
            <div style="position:absolute;inset:0;z-index:1;display:flex;flex-direction:column;justify-content:flex-end;padding:24px 18px;color:#F5F4F1">
              <div style="font-size:10px;letter-spacing:.25em;opacity:.65">TODAY</div>
              <div class="editorial-title" style="color:#F5F4F1;margin-top:10px">草船借箭</div>
              <div style="font-size:11px;opacity:.65;margin:10px 0 0;letter-spacing:.08em">上下五千年 · 15 MIN</div>
            </div>
          </div>
          <div class="pad">
            <div class="sec-h"><span class="t">Continue listening</span></div>
            <div class="row">{cover(" ","#ECEAE4","#DDDAD2")}<div class="gr"><div class="nm">勇敢的小狮子</div><div class="ds">03:20 remaining</div></div><span class="rt">→</span></div>
            <div class="sec-h"><span class="t">Subjects</span></div>
            <div class="rail">
              <div class="poster"><div class="cover-art" style="background:#D8CFC6"></div><div class="nm">品格养成</div></div>
              <div class="poster"><div class="cover-art" style="background:#CDD5CF"></div><div class="nm">情绪疗愈</div></div>
              <div class="poster"><div class="cover-art" style="background:#CDD3D6"></div><div class="nm">上下五千年</div></div>
            </div>
          </div>
        </div>
        {tabs("story", theme)}"""
    else:
        inner = f"""
        <div class="brand">KUKU</div>
        <div class="pad"><div class="search">搜索</div></div>
        <div class="scroll pad" style="padding-top:12px">
          <div class="hero-full">
            <div class="film"></div>
            <div style="position:absolute;inset:0;z-index:1;display:flex;flex-direction:column;justify-content:flex-end;padding:22px">
              <div style="font-size:10px;letter-spacing:.28em;color:var(--primary)">FEATURED</div>
              <div style="font-size:28px;font-weight:300;margin-top:10px;letter-spacing:.08em">草船借箭</div>
              <div style="font-size:11px;color:var(--sub);margin:10px 0 18px;letter-spacing:.06em">上下五千年 · 15:00</div>
              <div class="btn" style="width:120px;height:38px">播放</div>
            </div>
          </div>
          <div class="sec-h"><span class="t">Resume</span></div>
          <div class="row">{cover(" ","#222","#181818")}<div class="gr"><div class="nm">勇敢的小狮子</div><div class="ds">03:20</div></div><span class="play-s" style="background:rgba(212,196,168,.12);color:var(--primary)">▶</span></div>
          <div class="sec-h"><span class="t">Gallery</span></div>
          <div class="rail">
            <div class="poster"><div class="cover-art" style="background:linear-gradient(160deg,#3A2E28,#1A1410)"></div><div class="nm">品格养成</div></div>
            <div class="poster"><div class="cover-art" style="background:linear-gradient(160deg,#2A322A,#121812)"></div><div class="nm">情绪疗愈</div></div>
            <div class="poster"><div class="cover-art" style="background:linear-gradient(160deg,#2A3038,#101418)"></div><div class="nm">自然科学</div></div>
          </div>
        </div>
        {tabs("story", theme)}"""
    return item("S-01", "故事首页", phone(inner))


def pl01(theme):
    if theme == "G":
        inner = """
        <div class="nav"><span class="bk">⌄</span><span class="ti" style="font-weight:400;letter-spacing:.2em;font-size:11px">NOW PLAYING</span><span class="rt"></span></div>
        <div class="scroll pad">
          <div class="cover-lg" style="background:linear-gradient(160deg,#C4A574,#8A6B52);border-radius:24px;box-shadow:0 24px 48px rgba(60,40,20,.18)"></div>
          <div style="text-align:center;margin-top:22px">
            <div style="font-size:20px;font-weight:400;letter-spacing:.08em">草船借箭</div>
            <div class="muted" style="margin-top:6px">上下五千年</div>
          </div>
          <div style="margin-top:28px"><div class="prog"><i style="width:45%"></i><b style="left:45%"></b></div>
            <div class="time"><span>06:45</span><span>15:00</span></div></div>
          <div class="ctrls"><div class="cbtn">⏮</div><div class="cbtn main">⏸</div><div class="cbtn">⏭</div></div>
        </div>"""
    elif theme == "H":
        inner = """
        <div class="nav"><span class="bk">⌄</span><span class="ti" style="font-weight:400;letter-spacing:.2em;font-size:11px">LISTENING</span><span class="rt"></span></div>
        <div class="scroll">
          <div style="height:240px;background:linear-gradient(180deg,#4A5C5C,#2A3535);margin:0;display:flex;align-items:flex-end;padding:20px 18px">
            <div style="color:#F5F4F1">
              <div style="font-size:10px;letter-spacing:.2em;opacity:.6">STORY</div>
              <div style="font-size:24px;font-weight:300;margin-top:6px;letter-spacing:.06em">草船借箭</div>
            </div>
          </div>
          <div class="pad" style="padding-top:20px">
            <div class="prog"><i style="width:45%"></i><b style="left:45%"></b></div>
            <div class="time"><span>06:45</span><span>15:00</span></div>
            <div class="ctrls" style="margin-top:24px"><div class="cbtn">⏮</div><div class="cbtn main">⏸</div><div class="cbtn">⏭</div></div>
          </div>
        </div>"""
    else:
        inner = """
        <div class="nav"><span class="bk">⌄</span><span class="ti" style="font-weight:300;letter-spacing:.25em;font-size:11px;color:var(--primary)">PLAYING</span><span class="rt"></span></div>
        <div class="scroll pad">
          <div class="cover-lg" style="width:200px;height:200px;background:linear-gradient(160deg,#3A3228,#141210);border-radius:16px;border:1px solid rgba(212,196,168,.2)"></div>
          <div style="text-align:center;margin-top:24px">
            <div style="font-size:22px;font-weight:300;letter-spacing:.1em">草船借箭</div>
            <div class="muted" style="margin-top:8px;letter-spacing:.08em">上下五千年</div>
          </div>
          <div style="margin-top:32px"><div class="prog"><i style="width:45%"></i><b style="left:45%"></b></div>
            <div class="time"><span>06:45</span><span>15:00</span></div></div>
          <div class="ctrls"><div class="cbtn">⏮</div><div class="cbtn main">⏸</div><div class="cbtn">⏭</div></div>
        </div>"""
    return item("PL-01", "故事播放器", phone(inner))


def a01(theme):
    if theme == "G":
        body = """
          <div style="font-size:11px;letter-spacing:.4em;font-weight:500;margin-bottom:28px">KUKU</div>
          <div style="font-size:22px;font-weight:300;letter-spacing:.08em;line-height:1.5">听故事长大<br>的温柔时光</div>
          <div class="muted" style="margin:16px 0 36px">儿童故事 · 歌曲 · 识字陪伴</div>
          <div class="btn" style="width:220px">微信登录</div>
          <div class="btn ghost" style="width:220px;margin-top:12px">手机号登录</div>"""
    elif theme == "H":
        body = """
          <div style="font-size:11px;letter-spacing:.35em;margin-bottom:40px">KUKU</div>
          <div style="font-size:26px;font-weight:300;letter-spacing:.04em">儿童故事</div>
          <div class="muted" style="margin:14px 0 40px;letter-spacing:.06em">STORY · SONG · GROWTH</div>
          <div class="btn" style="width:220px">微信登录</div>
          <div class="btn ghost" style="width:220px;margin-top:12px">手机号</div>"""
    else:
        body = """
          <div style="font-size:11px;letter-spacing:.45em;color:var(--primary);margin-bottom:36px">KUKU</div>
          <div style="font-size:24px;font-weight:300;letter-spacing:.12em">深夜，听一个故事</div>
          <div class="muted" style="margin:14px 0 40px">Premium Story Listening</div>
          <div class="btn" style="width:220px">微信登录</div>
          <div class="btn ghost" style="width:220px;margin-top:12px">手机号</div>"""
    body += """<div style="margin-top:28px;font-size:10px;color:var(--sub);letter-spacing:.04em">登录即同意《用户协议》与《隐私政策》</div>"""
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

    text = text.replace('theme="A"', 'theme="G"')
    text = text.replace('theme == "A"', 'theme == "G"')
    text = text.replace('theme == "B"', 'theme == "H"')
    text = text.replace('theme == "C"', 'theme == "I"')
    text = text.replace('for key in ("A", "B", "C")', 'for key in ("G", "H", "I")')
    text = text.replace(
        '"""Generate A/B/C full-screen UI concept HTML mockups."""',
        '"""Generate G/H/I premium UI concept HTML mockups."""',
    )
    text = text.replace(
        '''notes = {
        "A": "深靛蓝夜空 + 暖橙夜灯；首页只留推荐/续听/学科轨；播放器沉浸；保留四级朋友色。",
        "B": "角色立绘锚点 + 软纸纹 + 厚描边；空状态/登录/结果页角色出场；话术对齐养成系统。",
        "C": "低饱和黏土色 + 2 列大海报；弱化白卡阴影；封面即容器；信息极简。",
    }''',
        '''notes = {
        "G": "雾面玻璃+香槟灰褐；轻字重、大留白、胶囊按钮；对标轻奢亲子品牌，不做贴纸卡通。",
        "H": "北欧编辑排版；全宽封面、细线列表、字距排版；杂志发现感，家长端更显高级。",
        "I": "博物馆黑+象牙金；全幅沉浸、极简控件；高端音频产品气质，适合睡前品牌心智。",
    }''',
    )

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
    print("wrote", OUT_PY.name)

    runpy.run_path(str(OUT_PY), run_name="__main__")

    for name in ("概念G_雾面丝绸.html", "概念H_北欧书斋.html", "概念I_深夜画廊.html"):
        p = ROOT / name
        t = p.read_text(encoding="utf-8")
        print(name, p.stat().st_size, "cid", t.count('class="cid"'), "ok" if "S-01" in t else "FAIL")

    # README
    readme = ROOT / "README.md"
    rt = readme.read_text(encoding="utf-8")
    if "概念G_雾面丝绸" not in rt:
        rt = rt.replace(
            "| F 积木电台 | [`概念F_积木电台.html`](概念F_积木电台.html) | 粗描边积木 + 波形，音频优先 |\n",
            "| F 积木电台 | [`概念F_积木电台.html`](概念F_积木电台.html) | 粗描边积木 + 波形，音频优先 |\n"
            "| G 雾面丝绸 | [`概念G_雾面丝绸.html`](概念G_雾面丝绸.html) | 柔雾玻璃 · 轻奢亲子（高级向） |\n"
            "| H 北欧书斋 | [`概念H_北欧书斋.html`](概念H_北欧书斋.html) | 编辑排版 · 杂志级（高级向） |\n"
            "| I 深夜画廊 | [`概念I_深夜画廊.html`](概念I_深夜画廊.html) | 博物馆黑 · 象牙金（高级向） |\n",
        )
        rt = rt.replace(
            "| 概念F_积木电台.html | HTML/CSS | 视觉方案 F · 全量概念 | ⭐⭐⭐⭐ |\n",
            "| 概念F_积木电台.html | HTML/CSS | 视觉方案 F · 全量概念 | ⭐⭐⭐⭐ |\n"
            "| 概念G_雾面丝绸.html | HTML/CSS | 视觉方案 G · 高级感 | ⭐⭐⭐⭐ |\n"
            "| 概念H_北欧书斋.html | HTML/CSS | 视觉方案 H · 高级感 | ⭐⭐⭐⭐ |\n"
            "| 概念I_深夜画廊.html | HTML/CSS | 视觉方案 I · 高级感 | ⭐⭐⭐⭐ |\n",
        )
        rt = rt.replace("A~F 六套", "A~I 九套")
        readme.write_text(rt, encoding="utf-8")
        print("README updated")


if __name__ == "__main__":
    main()
