# -*- coding: utf-8 -*-
"""Generate D/E/F full-screen UI concept HTML mockups."""
from pathlib import Path

OUT = Path(__file__).resolve().parent

# Shared phone chrome helpers (theme-aware via CSS vars)

THEMES = {
    "D": {
        "file": "概念D_晴空操场.html",
        "title": "方案 D · 晴空操场",
        "tagline": "白天户外感 · 天蓝草绿 · 云朵软形状 · 活力但不吵",
        "body_bg": "#B8DFF0",
        "css": """
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
""",
    },
    "E": {
        "file": "概念E_水墨书房.html",
        "title": "方案 E · 水墨书房",
        "tagline": "宣纸墨色 · 朱砂点睛 · 东方书房 · 适合蒙学/历史气质",
        "body_bg": "#D9D2C4",
        "css": """
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
""",
    },
    "F": {
        "file": "概念F_积木电台.html",
        "title": "方案 F · 积木电台",
        "tagline": "块面几何 · 音频优先 · 珊瑚/芥末/青绿 · 玩具积木感",
        "body_bg": "#2A2A2A",
        "css": """
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
""",
    },
}


def base_css(extra: str) -> str:
    return f"""
*{{margin:0;padding:0;box-sizing:border-box;-webkit-font-smoothing:antialiased}}
body{{font-family:"PingFang SC","Microsoft YaHei","Noto Sans SC",system-ui,sans-serif;padding:36px 20px 60px}}
.page-head{{text-align:center;margin-bottom:28px}}
.page-head h1{{font-size:24px;letter-spacing:.5px}}
.page-head p{{font-size:13px;margin-top:8px;opacity:.75}}
.page-head .pill{{display:inline-block;margin-top:12px;background:var(--primary);color:#fff;
  font-size:12px;padding:6px 16px;border-radius:20px}}
.compare{{max-width:900px;margin:0 auto 28px;padding:14px 18px;border-radius:14px;
  background:var(--bg2,rgba(255,255,255,.08));border:1px solid var(--line);font-size:13px;line-height:1.7;color:var(--ink)}}
.group-title{{max-width:1280px;margin:40px auto 18px;font-size:17px;font-weight:700;color:var(--ink);
  border-left:4px solid var(--primary);padding-left:12px}}
.grid{{max-width:1280px;margin:0 auto;display:flex;flex-wrap:wrap;gap:32px 24px}}
.item{{width:300px}}.item.wide{{width:640px}}
.item .cap{{text-align:center;margin-top:12px;font-size:13px;color:var(--sub)}}
.item .cap b{{color:var(--ink)}}
.item .cid{{display:inline-block;background:var(--bg2,rgba(255,255,255,.1));border:1px solid var(--line);
  font-size:11px;padding:2px 8px;border-radius:10px;margin-right:6px;color:var(--sub)}}
.phone{{width:300px;height:640px;border-radius:34px;overflow:hidden;position:relative;border:7px solid #222}}
.phone.land{{width:640px;height:300px}}
.sb{{height:26px;display:flex;align-items:center;justify-content:space-between;padding:0 18px;font-size:11px;font-weight:600}}
.scr{{height:calc(100% - 26px);overflow:hidden;display:flex;flex-direction:column}}
.pad{{padding:0 14px}}.scroll{{flex:1;overflow:hidden}}
.nav{{display:flex;align-items:center;gap:10px;padding:6px 14px 10px}}
.nav .bk{{font-size:20px;width:22px}}.nav .ti{{font-size:15px;font-weight:700;flex:1;text-align:center}}
.nav .rt{{font-size:13px;color:var(--sub);width:34px;text-align:right}}
.brand{{text-align:center;font-size:15px;font-weight:700;padding:4px 0 10px}}
.search{{height:40px;border-radius:22px;display:flex;align-items:center;gap:8px;padding:0 16px;font-size:13px}}
.card{{border-radius:18px}}
.sec-h{{display:flex;align-items:center;justify-content:space-between;margin:14px 2px 10px}}
.sec-h .t{{font-size:14px;font-weight:700}}.sec-h .m{{font-size:12px;color:var(--sub)}}
.banner{{height:120px;border-radius:20px;padding:16px;color:#fff;position:relative;overflow:hidden}}
.banner .big{{position:absolute;right:-6px;bottom:-14px;font-size:72px;opacity:.85}}
.banner .tag{{font-size:11px;background:rgba(255,255,255,.25);padding:2px 10px;border-radius:10px;display:inline-block}}
.banner h3{{font-size:18px;margin:10px 0 4px;font-weight:800}}.banner .meta{{font-size:12px;opacity:.9}}
.sgrid{{display:grid;grid-template-columns:1fr 1fr;gap:10px}}
.scard{{border-radius:16px;padding:12px;display:flex;align-items:center;gap:10px}}
.ico{{width:42px;height:42px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:20px;flex:0 0 auto}}
.scard .nm{{font-size:13px;font-weight:700}}.scard .ct{{font-size:11px;color:var(--sub);margin-top:2px}}
.row{{display:flex;align-items:center;gap:12px;border-radius:14px;padding:11px 12px;margin-bottom:8px}}
.row .bar{{width:5px;height:32px;border-radius:3px;flex:0 0 auto}}
.row .thumb{{width:46px;height:46px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;flex:0 0 auto;overflow:hidden}}
.row .gr{{flex:1;min-width:0}}
.row .gr .nm{{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
.row .gr .ds{{font-size:11px;color:var(--sub);margin-top:3px}}
.row .rt{{font-size:13px;color:var(--sub)}}
.play-s{{width:34px;height:34px;border-radius:50%;background:var(--primary-soft);color:var(--primary);
  display:flex;align-items:center;justify-content:center;font-size:13px;flex:0 0 auto}}
.tag{{font-size:10px;padding:2px 8px;border-radius:8px;font-weight:600}}
.tag.vip{{background:#FFF0C4;color:#B8860B}}
.tag.s0{{background:var(--s0);color:#333}}.tag.s1{{background:var(--s1);color:#7a5b00}}
.tag.s2{{background:var(--s2);color:#0a4a6b}}.tag.s3{{background:var(--s3);color:#1a5c1a}}
.tabbar{{flex:0 0 auto;height:58px;display:flex;align-items:center;justify-content:space-around;padding-bottom:4px}}
.tb{{text-align:center;color:var(--sub);font-size:10px}}.tb .i{{font-size:18px;display:block;margin-bottom:2px}}
.tb.on{{font-weight:700}}
.btn{{height:46px;border-radius:23px;background:var(--primary);color:#fff;display:flex;
  align-items:center;justify-content:center;gap:8px;font-size:14px;font-weight:700}}
.btn.ghost{{background:transparent;color:var(--primary);border:1.5px solid var(--primary)}}
.btn.blue{{background:var(--blue)}}.btn.green{{background:var(--green)}}
.cover-lg{{width:170px;height:170px;border-radius:28px;margin:12px auto 0;display:flex;align-items:center;justify-content:center;font-size:64px}}
.prog{{height:4px;background:var(--line);border-radius:3px;position:relative;margin:8px 0 4px}}
.prog i{{position:absolute;left:0;top:0;height:100%;border-radius:3px;background:var(--primary)}}
.prog b{{position:absolute;top:-4px;width:12px;height:12px;border-radius:50%;background:var(--primary)}}
.time{{display:flex;justify-content:space-between;font-size:11px;color:var(--sub)}}
.ctrls{{display:flex;align-items:center;justify-content:center;gap:22px;margin:14px 0}}
.cbtn{{width:46px;height:46px;border-radius:50%;background:var(--card);color:var(--ink);display:flex;align-items:center;justify-content:center;font-size:16px}}
.cbtn.main{{width:70px;height:70px;background:var(--primary);color:#fff;font-size:26px}}
.fns{{display:flex;justify-content:space-around;color:var(--sub);font-size:11px;text-align:center}}
.fns .i{{font-size:16px;display:block;margin-bottom:3px}}
.center{{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;text-align:center;padding:0 28px}}
.muted{{color:var(--sub);font-size:12px;line-height:1.7}}
.chip{{display:inline-block;border:1px solid var(--line);border-radius:16px;padding:6px 12px;font-size:12px;margin:0 6px 8px 0}}
.chip.on{{background:var(--primary);color:#fff;border-color:var(--primary)}}
.footer{{max-width:1280px;margin:48px auto 0;text-align:center;font-size:12px;opacity:.65;line-height:1.9}}
.skeleton{{background:linear-gradient(90deg,rgba(128,128,128,.15) 25%,rgba(128,128,128,.25) 50%,rgba(128,128,128,.15) 75%);
  background-size:200% 100%;animation:sk 1.5s infinite;border-radius:8px}}
@keyframes sk{{0%{{background-position:200% 0}}100%{{background-position:-200% 0}}}}
.spin{{width:36px;height:36px;border:3px solid var(--line);border-top-color:var(--primary);border-radius:50%;animation:spin 1s linear infinite}}
@keyframes spin{{to{{transform:rotate(360deg)}}}}
{extra}
"""


def tabs(active="story", theme="D"):
    colors = {
        "story": "var(--primary)",
        "song": "var(--blue)",
        "growth": "var(--green)",
        "parent": "var(--primary)",
    }
    items = [
        ("story", "📖", "故事"),
        ("song", "🎵", "歌曲"),
        ("growth", "🌱", "成长"),
        ("parent", "👪", "家长"),
    ]
    html = ['<div class="tabbar">']
    for key, icon, label in items:
        on = " on" if key == active else ""
        style = f' style="color:{colors[key]}"' if key == active else ""
        html.append(f'<div class="tb{on}"{style}><span class="i">{icon}</span>{label}</div>')
    html.append("</div>")
    return "".join(html)


def phone(inner, land=False):
    cls = "phone land" if land else "phone"
    return f'''<div class="{cls}">
      <div class="sb"><span>9:41</span><span>📶 🔋</span></div>
      <div class="scr">{inner}</div>
    </div>'''


def item(cid, name, phone_html, wide=False):
    w = ' wide' if wide else ""
    return f'''<div class="item{w}">
    {phone_html}
    <div class="cap"><span class="cid">{cid}</span><b>{name}</b></div>
  </div>'''


def cover(emoji, g1, g2, size="thumb"):
    if size == "thumb":
        return f'<span class="thumb" style="background:linear-gradient(145deg,{g1},{g2})">{emoji}</span>'
    return f'<div class="cover-art" style="background:linear-gradient(145deg,{g1},{g2})">{emoji}</div>'


# ---------- Screen builders per theme ----------


def s02(theme):
    rows = "".join([
        f'<div class="row"><span class="bar" style="background:{c}"></span><div class="gr"><div class="nm">{n}</div><div class="ds">{d} 个故事</div></div><span class="rt">›</span></div>'
        for c, n, d in [("#FF8E9E","勇敢","173"),("#FFB067","诚实","142"),("#7FC96A","感恩","128"),("#3FC5BC","分享","156"),("#B8A9E8","坚持","134")]
    ])
    if theme == "F":
        inner = f'''
        <div class="nav"><span class="bk">‹</span><span class="ti">品格养成</span><span class="rt"></span></div>
        <div class="scroll pad">
          <div style="font-size:28px;font-weight:800;margin:8px 0 4px">品格养成</div>
          <div class="muted" style="margin-bottom:16px">9 分类 · 1,245 故事</div>
          {rows}
        </div>{tabs("story", theme)}'''
    elif theme == "D":
        inner = f'''
        <div class="nav"><span class="bk">‹</span><span class="ti">品格养成</span><span class="rt">🔍</span></div>
        <div class="scroll pad">
          <div class="hero-full" style="height:110px;margin-bottom:12px">
            <div style="position:absolute;inset:0;padding:16px;display:flex;flex-direction:column;justify-content:flex-end">
              <div style="font-size:18px;font-weight:800">勇敢 · 诚实 · 感恩</div>
              <div style="font-size:12px;color:#C8B8A0">9 个分类</div>
            </div>
            <div style="position:absolute;right:12px;top:16px;font-size:48px">🦁</div>
          </div>
          {rows}
        </div>{tabs("story", theme)}'''
    else:
        inner = f'''
        <div class="nav"><span class="bk">‹</span><span class="ti">品格养成</span><span class="rt">🔍</span></div>
        <div class="scroll pad">
          <div class="banner" style="background:linear-gradient(135deg,#FFA6B4,#FF8E9E)">
            <span class="big">🦁</span><span class="tag">品格养成</span>
            <h3>勇敢·诚实·感恩</h3><div class="meta">9 个分类 · 1,245 个故事</div>
          </div>
          <div style="height:12px"></div>{rows}
        </div>{tabs("story", theme)}'''
    return item("S-02", "学科详情页", phone(inner))


def list_stories(theme, cid, title, items_data, extra=""):
    rows = ""
    for em, g1, g2, nm, ds in items_data:
        rows += f'<div class="row">{cover(em,g1,g2)}<div class="gr"><div class="nm">{nm}</div><div class="ds">{ds}</div></div><span class="play-s">▶</span></div>'
    if theme == "F" and cid == "S-03":
        posters = ""
        for em, g1, g2, nm, ds in items_data:
            posters += f'<div class="poster-card"><div class="art" style="background:linear-gradient(145deg,{g1},{g2})">{em}</div><div class="meta"><div class="nm">{nm}</div><div class="ds">{ds}</div></div></div>'
        inner = f'''
        <div class="nav"><span class="bk">‹</span><span class="ti">{title}</span><span class="rt"></span></div>
        <div class="scroll pad"><div class="poster-grid">{posters}</div></div>{tabs("story", theme)}'''
    else:
        inner = f'''
        <div class="nav"><span class="bk">‹</span><span class="ti">{title}</span><span class="rt">🔍</span></div>
        <div class="scroll pad">{extra}{rows}</div>{tabs("story", theme)}'''
    return item(cid, {"S-03":"故事列表页","S-04":"章回作品章节列表","S-05":"混合型页","S-06":"多层分类页"}.get(cid, title), phone(inner))


def s04(theme):
    ch = "".join([
        f'<div class="row"><span class="thumb" style="background:linear-gradient(145deg,#C9A66B,#9C7B4A);font-size:13px;font-weight:700;color:#fff">{n:02d}</span><div class="gr"><div class="nm">{t}</div><div class="ds">{s}</div></div><span class="play-s">▶</span></div>'
        for n, t, s in [(1,"人之初，性本善","12 秒"),(2,"性相近，习相远","11 秒"),(3,"苟不教，性乃迁","13 秒")]
    ])
    head = ""
    if theme == "D":
        head = '''<div class="hero-full" style="height:100px;margin-bottom:8px"><div style="position:absolute;inset:0;padding:14px;display:flex;flex-direction:column;justify-content:flex-end"><div style="font-size:11px;color:#E8C89A">章回 · 84 章</div><div style="font-size:18px;font-weight:800">三字经</div></div></div>'''
    elif theme == "E":
        head = '''<div class="banner" style="background:linear-gradient(135deg,#C9A66B,#9C7B4A)"><span class="big">📜</span><span class="tag">章回作品 · 84 章</span><h3>三字经</h3><div class="meta">传统启蒙经典</div></div><div style="height:8px"></div>'''
    else:
        head = '''<div style="font-size:26px;font-weight:800;margin:4px 0">三字经</div><div class="muted" style="margin-bottom:12px">章回 · 84 章</div>'''
    btn = '<div class="btn" style="margin:8px 0">▶ 从第 1 章开始</div>'
    inner = f'''
        <div class="nav"><span class="bk">‹</span><span class="ti">三字经</span><span class="rt">⋮</span></div>
        <div class="scroll pad">{head}{btn}{ch}</div>{tabs("story", theme)}'''
    return item("S-04", "章回作品章节列表", phone(inner))


def s05(theme):
    inner = f'''
        <div class="nav"><span class="bk">‹</span><span class="ti">历史故事</span><span class="rt">🔍</span></div>
        <div class="scroll pad">
          <div class="sec-h"><span class="t">章回作品</span></div>
          <div class="row">{cover("⚔️","#FFF0D6","#FFE8C8")}<div class="gr"><div class="nm">三国演义</div><div class="ds">120 章</div></div><span class="rt">›</span></div>
          <div class="row">{cover("🏹","#FFF0D6","#FFE8C8")}<div class="gr"><div class="nm">水浒传</div><div class="ds">108 章</div></div><span class="rt">›</span></div>
          <div class="sec-h"><span class="t">独立故事</span></div>
          <div class="row">{cover("🗡️","#FFE3E7","#FFD0D8")}<div class="gr"><div class="nm">花木兰</div><div class="ds"><span class="tag lv">L6</span> 14分钟</div></div><span class="play-s">▶</span></div>
          <div class="sec-h"><span class="t">合集</span></div>
          <div class="row">{cover("📦","#EDE7FA","#DDD5F0")}<div class="gr"><div class="nm">其他历史故事</div><div class="ds">146 个</div></div><span class="rt">›</span></div>
        </div>{tabs("story", theme)}'''
    return item("S-05", "混合型页", phone(inner))


def s06(theme):
    if theme == "F":
        grid = '''<div class="poster-grid">
          <div class="poster-card"><div class="art" style="background:linear-gradient(145deg,#C8C0E0,#7868A8)">🐉</div><div class="meta"><div class="nm">东方神话</div><div class="ds">168</div></div></div>
          <div class="poster-card"><div class="art" style="background:linear-gradient(145deg,#B8D8D4,#589888)">🧚</div><div class="meta"><div class="nm">西方童话</div><div class="ds">145</div></div></div>
          <div class="poster-card"><div class="art" style="background:linear-gradient(145deg,#D8D0B8,#A09050)">🤖</div><div class="meta"><div class="nm">科幻未来</div><div class="ds">92</div></div></div>
          <div class="poster-card"><div class="art" style="background:linear-gradient(145deg,#E0C0C8,#A06878)">🦄</div><div class="meta"><div class="nm">奇幻冒险</div><div class="ds">130</div></div></div>
        </div>'''
        inner = f'''
        <div class="nav"><span class="bk">‹</span><span class="ti">双界之门</span><span class="rt"></span></div>
        <div class="scroll pad"><div style="font-size:24px;font-weight:800;margin:6px 0 14px">选择一扇门</div>{grid}</div>{tabs("story", theme)}'''
    else:
        head = '<div class="banner" style="background:linear-gradient(135deg,#C6B5F2,#9D86E0)"><span class="big">🚪</span><span class="tag">多层分类</span><h3>双界之门</h3><div class="meta">选择一个门进入</div></div><div style="height:12px"></div>'
        if theme == "D":
            head = '<div class="hero-full" style="height:100px;margin-bottom:12px"><div style="position:absolute;inset:0;padding:14px"><div style="font-size:11px;color:#C8B0E8">奇幻世界</div><div style="font-size:18px;font-weight:800;margin-top:6px">双界之门</div></div><div style="position:absolute;right:12px;top:20px;font-size:48px">🚪</div></div>'
        inner = f'''
        <div class="nav"><span class="bk">‹</span><span class="ti">双界之门</span><span class="rt">🔍</span></div>
        <div class="scroll pad">{head}
          <div class="sgrid">
            <div class="scard"><div class="ico" style="background:linear-gradient(135deg,#EDE7FA,#DDD5F0)">🐉</div><div><div class="nm">东方神话</div><div class="ct">168</div></div></div>
            <div class="scard"><div class="ico" style="background:linear-gradient(135deg,#E0F5F3,#C8EBE8)">🧚</div><div><div class="nm">西方童话</div><div class="ct">145</div></div></div>
            <div class="scard"><div class="ico" style="background:linear-gradient(135deg,#FFF0D6,#FFE8C8)">🤖</div><div><div class="nm">科幻未来</div><div class="ct">92</div></div></div>
            <div class="scard"><div class="ico" style="background:linear-gradient(135deg,#FFE3E7,#FFD0D8)">🦄</div><div><div class="nm">奇幻冒险</div><div class="ct">130</div></div></div>
          </div>
        </div>{tabs("story", theme)}'''
    return item("S-06", "多层分类页", phone(inner))


def m01(theme):
    if theme == "D":
        inner = f'''
        <div class="brand" style="color:var(--blue)">♪ 夜歌台</div>
        <div class="pad"><div class="search">🔍 搜索歌曲…</div></div>
        <div class="scroll pad" style="padding-top:10px">
          <div class="hero-full" style="background:linear-gradient(160deg,#0F2A28,#1A3A38 50%,#0F1B2D)">
            <div style="position:absolute;inset:0;padding:16px;display:flex;flex-direction:column;justify-content:flex-end">
              <span style="font-size:11px;color:#8FD9D0">热唱榜 TOP1</span>
              <div style="font-size:20px;font-weight:800;margin-top:6px">两只老虎</div>
              <div style="font-size:12px;color:#8AB0A8;margin:4px 0 10px">1分12秒</div>
              <div class="btn blue" style="width:110px;height:34px;font-size:12px;border-radius:17px">▶ 播放</div>
            </div>
            <div style="position:absolute;right:14px;top:30px;font-size:56px">🎤</div>
          </div>
          <div class="sec-h"><span class="t">分类</span></div>
          <div class="rail">
            <div class="poster"><div class="cover-art" style="background:linear-gradient(145deg,#1A4A48,#0A2A28)">🐯</div><div class="nm">经典儿歌</div></div>
            <div class="poster"><div class="cover-art" style="background:linear-gradient(145deg,#3A3A1A,#2A2A0A)">🔤</div><div class="nm">英文儿歌</div></div>
            <div class="poster"><div class="cover-art" style="background:linear-gradient(145deg,#2A1A3A,#1A0A2A)">🌙</div><div class="nm">睡前音乐</div></div>
          </div>
        </div>{tabs("song", theme)}'''
    elif theme == "E":
        inner = f'''
        <div class="brand-row"><div class="mascot" style="background:linear-gradient(145deg,#B8F0EA,#3FC5BC)">🎵</div><div class="brand" style="color:#3FC5BC">唱唱儿歌</div></div>
        <div class="speech" style="border-color:#C8EBE8">桃子：一起唱两只老虎好不好？</div>
        <div class="pad"><div class="search">🔍 搜索歌曲…</div></div>
        <div class="scroll pad" style="padding-top:8px">
          <div class="banner" style="background:linear-gradient(135deg,#5AD6CD,#3FC5BC)">
            <span class="big">🎤</span><span class="tag">热唱榜 TOP1</span>
            <h3>两只老虎</h3><div class="meta">经典儿歌 · 1分12秒</div>
          </div>
          <div class="sec-h"><span class="t">🎶 歌曲分类</span></div>
          <div class="sgrid">
            <div class="scard"><div class="ico" style="background:#E0F5F3">🐯</div><div><div class="nm">经典儿歌</div><div class="ct">1,280</div></div></div>
            <div class="scard"><div class="ico" style="background:#FFF0D6">🔤</div><div><div class="nm">英文儿歌</div><div class="ct">960</div></div></div>
            <div class="scard"><div class="ico" style="background:#FFE3E7">🌙</div><div><div class="nm">睡前音乐</div><div class="ct">540</div></div></div>
            <div class="scard"><div class="ico" style="background:#EDE7FA">🎹</div><div><div class="nm">古典启蒙</div><div class="ct">320</div></div></div>
          </div>
        </div>{tabs("song", theme)}'''
    else:
        inner = f'''
        <div class="brand" style="text-align:left;padding:8px 14px;color:var(--blue)">歌曲</div>
        <div class="pad"><div class="search">搜索歌曲</div></div>
        <div class="scroll pad" style="padding-top:12px">
          <div class="hero-poster" style="background:linear-gradient(160deg,#4AA8A0,#1A4844);height:180px">
            <span class="soft-pill">TOP 1</span>
            <h3>两只老虎</h3>
            <div style="font-size:12px;opacity:.85">经典儿歌 · 1:12</div>
          </div>
          <div class="sec-h"><span class="t">Categories</span></div>
          <div class="poster-grid">
            <div class="poster-card"><div class="art" style="height:90px;background:#B8D8D4;font-size:28px">🐯</div><div class="meta"><div class="nm">经典儿歌</div></div></div>
            <div class="poster-card"><div class="art" style="height:90px;background:#D8D0B0;font-size:28px">🔤</div><div class="meta"><div class="nm">英文儿歌</div></div></div>
            <div class="poster-card"><div class="art" style="height:90px;background:#D0C0D8;font-size:28px">🌙</div><div class="meta"><div class="nm">睡前音乐</div></div></div>
            <div class="poster-card"><div class="art" style="height:90px;background:#C8C8D8;font-size:28px">🎹</div><div class="meta"><div class="nm">古典启蒙</div></div></div>
          </div>
        </div>{tabs("song", theme)}'''
    return item("M-01", "歌曲首页", phone(inner))


def m02(theme):
    rows = "".join([
        f'<div class="row"><span class="bar" style="background:{c}"></span><div class="gr"><div class="nm">{n}</div><div class="ds">{d} 首</div></div><span class="rt">›</span></div>'
        for c, n, d in [("#3FC5BC","字母 ABC","86"),("#7FC96A","数字歌","64"),("#FFB067","动物主题","120"),("#FF8E9E","日常生活","98"),("#B8A9E8","节日歌曲","72")]
    ])
    inner = f'''
        <div class="nav"><span class="bk">‹</span><span class="ti">英文儿歌</span><span class="rt">🔍</span></div>
        <div class="scroll pad">{rows}</div>{tabs("song", theme)}'''
    return item("M-02", "歌曲多层分类页", phone(inner))


def m03(theme):
    rows = "".join([
        f'<div class="row"><span class="thumb" style="background:linear-gradient(145deg,#E0F5F3,#C8EBE8);font-size:13px;font-weight:700;color:#3FC5BC">{i}</span><div class="gr"><div class="nm">{n}</div><div class="ds">{d}</div></div><span class="play-s" style="color:#3FC5BC">▶</span></div>'
        for i, n, d in [(1,"小星星","1分08秒"),(2,"数鸭子","1分32秒"),(3,"两只老虎","1分12秒"),(4,"小毛驴","1分20秒")]
    ])
    inner = f'''
        <div class="nav"><span class="bk">‹</span><span class="ti">动物主题</span><span class="rt">▷</span></div>
        <div class="scroll pad">
          <div class="sec-h"><span class="t">全部 120 首</span><span class="m">▶ 播放全部</span></div>
          {rows}
        </div>{tabs("song", theme)}'''
    return item("M-03", "歌曲列表页", phone(inner))


def g01(theme):
    # Fixed subjects: 识字 / 英语 / 拼音
    if theme == "D":
        inner = f'''
        <div class="brand" style="color:var(--green)">🌱 朋友收集册</div>
        <div class="scroll pad" style="padding-top:8px">
          <div class="card" style="padding:16px;background:linear-gradient(135deg,rgba(126,217,87,.2),rgba(20,40,24,.8));border-color:rgba(126,217,87,.3)">
            <div style="font-size:12px;color:#A8D8A0">酷酷的朋友们</div>
            <div style="font-size:24px;font-weight:800;margin:6px 0">结交 128 个字词朋友</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
              <span class="tag s3">🟢 32 好伙伴</span><span class="tag s2">🔵 40 好朋友</span><span class="tag s1">🟡 56 已相识</span>
            </div>
          </div>
          <div class="sec-h"><span class="t">学科</span></div>
          <div class="sgrid">
            <div class="scard"><div class="ico" style="background:rgba(126,217,87,.2)">字</div><div><div class="nm">识字</div><div class="ct">128 朋友</div></div></div>
            <div class="scard"><div class="ico" style="background:rgba(63,197,188,.2)">A</div><div><div class="nm">英语</div><div class="ct">86 朋友</div></div></div>
            <div class="scard"><div class="ico" style="background:rgba(255,159,90,.2)">拼</div><div><div class="nm">拼音</div><div class="ct">42 朋友</div></div></div>
            <div class="scard"><div class="ico" style="background:rgba(184,169,232,.2)">🏅</div><div><div class="nm">成就贴纸</div><div class="ct">会员</div></div></div>
          </div>
        </div>{tabs("growth", theme)}'''
    elif theme == "E":
        inner = f'''
        <div class="brand-row"><div class="mascot" style="background:linear-gradient(145deg,#C8F0B8,#7FC96A)">🌱</div><div class="brand" style="color:#7FC96A">成长</div></div>
        <div class="char-stage" style="height:70px"><div class="char" style="height:64px">🦊</div></div>
        <div class="speech">酷酷：你已经交到 128 个字词朋友啦！</div>
        <div class="scroll pad">
          <div style="display:flex;gap:8px;justify-content:center;margin-bottom:12px">
            <span class="friend-badge" style="background:#7ED957">🟢 32</span>
            <span class="friend-badge" style="background:#6BCBFF">🔵 40</span>
            <span class="friend-badge" style="background:#FFD93D">🟡 56</span>
          </div>
          <div class="sgrid">
            <div class="scard"><div class="ico" style="background:#E5F6E0">字</div><div><div class="nm">识字</div><div class="ct">128 朋友</div></div></div>
            <div class="scard"><div class="ico" style="background:#E0F5F3">A</div><div><div class="nm">英语</div><div class="ct">86 朋友</div></div></div>
            <div class="scard"><div class="ico" style="background:#FFF0D6">拼</div><div><div class="nm">拼音</div><div class="ct">42 朋友</div></div></div>
            <div class="scard"><div class="ico" style="background:#EDE7FA">🏅</div><div><div class="nm">成就贴纸</div><div class="ct">会员</div></div></div>
          </div>
        </div>{tabs("growth", theme)}'''
    else:
        inner = f'''
        <div class="brand" style="text-align:left;padding:8px 14px;color:var(--green)">成长</div>
        <div class="scroll pad">
          <div style="font-size:32px;font-weight:800;margin:8px 0 4px">128</div>
          <div class="muted" style="margin-bottom:16px">个字词朋友 · 好伙伴 32</div>
          <div class="poster-grid">
            <div class="poster-card"><div class="art" style="height:100px;background:#C8D8C0;font-size:36px">字</div><div class="meta"><div class="nm">识字</div><div class="ds">128 朋友</div></div></div>
            <div class="poster-card"><div class="art" style="height:100px;background:#B8D4D0;font-size:36px">A</div><div class="meta"><div class="nm">英语</div><div class="ds">86 朋友</div></div></div>
            <div class="poster-card"><div class="art" style="height:100px;background:#D8D0B8;font-size:36px">拼</div><div class="meta"><div class="nm">拼音</div><div class="ds">42 朋友</div></div></div>
            <div class="poster-card"><div class="art" style="height:100px;background:#D0C8E0;font-size:36px">🏅</div><div class="meta"><div class="nm">成就贴纸</div><div class="ds">会员专属</div></div></div>
          </div>
        </div>{tabs("growth", theme)}'''
    return item("G-01", "成长首页", phone(inner))


def g02(theme):
    rows = "".join([
        f'<div class="row">{cover(em,g1,g2)}<div class="gr"><div class="nm">{nm}</div><div class="ds"><span class="tag {tg}">{lb}</span></div></div><span class="rt">›</span></div>'
        for em, g1, g2, nm, tg, lb in [
            ("🟢","#E5F6E0","#D0ECD0","声母 b p m f","s3","好伙伴"),
            ("🔵","#E0F5F3","#C8EBE8","声母 d t n l","s2","好朋友"),
            ("🟡","#FFF7D6","#FFE8C8","单韵母 a o e","s1","已相识"),
            ("⚪","#F0F1F3","#E0E0E0","复韵母 ai ei ui","s0","未遇见"),
        ]
    ])
    inner = f'''
        <div class="nav"><span class="bk">‹</span><span class="ti">拼音</span><span class="rt">🔍</span></div>
        <div class="scroll pad">{rows}</div>{tabs("growth", theme)}'''
    return item("G-02", "课程列表页", phone(inner))


def g03(theme):
    # Fixed copy: 去挑战 (not 习题测一测)
    if theme == "E":
        top = '''<div class="char-stage" style="height:80px"><div class="char">🦊</div></div>
          <div class="speech">酷酷：这个拼音已经是你好伙伴啦！</div>'''
    else:
        top = '''<div class="card" style="padding:18px;text-align:center">
            <div style="font-size:48px">🟢</div>
            <div style="font-size:16px;font-weight:700;margin-top:6px">好伙伴</div>
            <div class="muted" style="margin-top:4px">你们已经是好伙伴啦</div>
          </div>'''
    inner = f'''
        <div class="nav"><span class="bk">‹</span><span class="ti">声母 b p m f</span><span class="rt"></span></div>
        <div class="scroll pad">
          {top}
          <div class="sec-h"><span class="t">关联故事</span></div>
          <div class="row">{cover("🐻","#E5F6E0","#D0ECD0")}<div class="gr"><div class="nm">小熊吃苹果</div><div class="ds">听故事遇见声母 b</div></div><span class="play-s">▶</span></div>
          <div class="sec-h"><span class="t">关联歌曲</span></div>
          <div class="row">{cover("🎵","#E0F5F3","#C8EBE8")}<div class="gr"><div class="nm">拼音声母歌</div><div class="ds">1分30秒</div></div><span class="play-s">▶</span></div>
          <div class="btn green" style="margin-top:14px">✨ 去挑战</div>
        </div>'''
    return item("G-03", "课程详情页", phone(inner))


def g04(theme):
    inner = f'''
        <div class="nav"><span class="bk">✕</span><span class="ti">听音选字</span><span class="rt">2/10</span></div>
        <div class="pad"><div class="prog" style="background:rgba(127,201,106,.2)"><i style="width:20%;background:#7FC96A"></i><b style="left:20%;background:#7FC96A"></b></div></div>
        <div class="scroll pad" style="display:flex;flex-direction:column;align-items:center;padding-top:18px">
          <div style="width:100px;height:100px;border-radius:50%;background:linear-gradient(135deg,#8FD97B,#7FC96A);display:flex;align-items:center;justify-content:center;font-size:42px;color:#fff">🔊</div>
          <div class="muted" style="margin:14px 0">听一听，选出正确的字</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;width:100%">
            <div class="card" style="padding:20px;text-align:center;font-size:28px;font-weight:800;background:rgba(255,255,255,.08);border:1px solid var(--line)">猫</div>
            <div class="card" style="padding:20px;text-align:center;font-size:28px;font-weight:800;border:2px solid #7FC96A;background:rgba(126,217,87,.12)">狗</div>
            <div class="card" style="padding:20px;text-align:center;font-size:28px;font-weight:800;background:rgba(255,255,255,.08);border:1px solid var(--line)">鱼</div>
            <div class="card" style="padding:20px;text-align:center;font-size:28px;font-weight:800;background:rgba(255,255,255,.08);border:1px solid var(--line)">鸟</div>
          </div>
        </div>'''
    return item("G-04", "挑战·听音选字", phone(inner))


def g05(theme):
    inner = f'''
        <div class="nav"><span class="bk">✕</span><span class="ti">综合挑战</span><span class="rt">5/15</span></div>
        <div class="pad"><div class="prog"><i style="width:33%"></i><b style="left:33%"></b></div></div>
        <div class="scroll pad" style="padding-top:14px">
          <div class="card" style="padding:16px;background:rgba(255,255,255,.06);border:1px solid var(--line)">
            <div style="font-size:12px;color:var(--sub)">第 5 题 · 看图选词</div>
            <div style="font-size:56px;text-align:center;margin:10px 0">🍎</div>
            <div style="text-align:center;font-size:15px;font-weight:600">这是什么水果？</div>
          </div>
          <div style="margin-top:14px">
            <div class="card" style="padding:14px;margin-bottom:8px;font-weight:600;background:rgba(255,255,255,.05);border:1px solid var(--line)">A. 香蕉</div>
            <div class="card" style="padding:14px;margin-bottom:8px;font-weight:600;border:2px solid var(--primary);background:rgba(255,140,66,.1)">B. 苹果</div>
            <div class="card" style="padding:14px;margin-bottom:8px;font-weight:600;background:rgba(255,255,255,.05);border:1px solid var(--line)">C. 葡萄</div>
          </div>
        </div>'''
    return item("G-05", "综合挑战界面", phone(inner))


def g06(theme):
    if theme == "E":
        body = '''
          <div class="char" style="width:80px;height:96px;font-size:40px;margin-bottom:12px">🦊</div>
          <div style="font-size:20px;font-weight:800">太棒啦！</div>
          <div class="muted" style="margin:10px 0">又交到好伙伴啦<br><span style="color:#7ED957;font-weight:700">🟢 好伙伴</span></div>
          <div class="btn green" style="width:200px;margin-top:12px">继续遇见新朋友</div>
          <div style="margin-top:12px;font-size:12px;color:var(--sub)">返回朋友册</div>'''
    elif theme == "D":
        body = '''
          <div style="font-size:56px">✨</div>
          <div style="font-size:20px;font-weight:800;margin-top:8px">挑战完成</div>
          <div style="font-size:40px;font-weight:800;color:#7ED957;margin:10px 0">好伙伴</div>
          <div class="muted">字词朋友升级成功<br>酷酷为你鼓掌</div>
          <div class="btn green" style="width:200px;margin-top:16px">继续下一组</div>'''
    else:
        body = '''
          <div style="font-size:48px;font-weight:800;color:var(--green)">好伙伴</div>
          <div class="muted" style="margin:12px 0 20px">字词朋友升级</div>
          <div class="btn" style="width:180px">继续</div>'''
    inner = f'<div class="center">{body}</div>'
    return item("G-06", "挑战结果页", phone(inner))



def pl02(theme):
    accent = "var(--blue)"
    inner = f'''
        <div class="nav"><span class="bk">⌄</span><span class="ti">正在播放</span><span class="rt">≡</span></div>
        <div class="scroll pad">
          <div class="cover-lg" style="background:linear-gradient(135deg,#5AD6CD,#3FC5BC);border-radius:50%">🎵</div>
          <div style="text-align:center;margin-top:14px"><div style="font-size:18px;font-weight:800">两只老虎</div><div class="muted">经典儿歌</div></div>
          <div style="text-align:center;margin-top:12px;line-height:2">
            <div style="color:var(--sub);font-size:13px">两只老虎 两只老虎</div>
            <div style="color:{accent};font-size:17px;font-weight:800">跑得快 跑得快</div>
            <div style="color:var(--sub);font-size:13px">一只没有耳朵</div>
          </div>
          <div style="margin-top:12px"><div class="prog"><i style="width:55%;background:{accent}"></i><b style="left:55%;background:{accent}"></b></div>
            <div class="time"><span>00:40</span><span>01:12</span></div></div>
          <div class="ctrls"><div class="cbtn">⏮</div><div class="cbtn main" style="background:{accent}">⏸</div><div class="cbtn">⏭</div></div>
        </div>'''
    return item("PL-02", "歌曲播放器（LRC）", phone(inner))


def pl03(theme):
    left_bg = "linear-gradient(135deg,#2A4A28,#1A3020)" if theme == "D" else "linear-gradient(135deg,#8FD97B,#5FA84C)"
    if theme == "F":
        left_bg = "linear-gradient(135deg,#A8C898,#5A8A48)"
    char = "🦊" if theme == "E" else "🧑‍🏫"
    inner = f'''
        <div style="flex-direction:row;padding:6px 10px 10px;gap:10px;display:flex;flex:1">
          <div style="width:50%;border-radius:18px;background:{left_bg};display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;position:relative">
            <div style="font-size:72px">{char}</div>
            <div style="position:absolute;bottom:12px;background:rgba(0,0,0,.25);padding:5px 14px;border-radius:14px;font-size:12px">酷酷 · 拼音课堂</div>
          </div>
          <div style="flex:1;display:flex;flex-direction:column">
            <div class="card" style="flex:1;padding:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(255,255,255,.06);border:1px solid var(--line)">
              <div style="font-size:12px;color:var(--sub)">今天遇见</div>
              <div style="font-size:64px;font-weight:800;color:var(--green);margin:4px 0">b</div>
              <div style="font-size:14px">小熊吃苹果， b b b～</div>
            </div>
            <div style="margin-top:8px"><div class="prog"><i style="width:60%;background:var(--green)"></i><b style="left:60%;background:var(--green)"></b></div></div>
            <div style="display:flex;align-items:center;justify-content:center;gap:18px;margin-top:8px">
              <div class="cbtn" style="width:36px;height:36px">⏮</div>
              <div class="cbtn main" style="width:48px;height:48px;font-size:18px;background:var(--green)">⏸</div>
              <div class="cbtn" style="width:36px;height:36px">⏭</div>
            </div>
          </div>
        </div>'''
    return item("PL-03", "教学播放器·横屏", phone(inner, land=True), wide=True)



def a03(theme):
    # Correct pricing ¥9.9 / ¥26 / ¥88
    inner = f'''
        <div class="nav"><span class="bk">‹</span><span class="ti">会员中心</span><span class="rt"></span></div>
        <div class="scroll pad">
          <div class="card" style="padding:18px;background:linear-gradient(135deg,#FFDFA0,#FFC93C);color:#7a5b00;border:none">
            <div style="font-size:13px">👑 酷酷会员</div>
            <div style="font-size:18px;font-weight:800;margin:6px 0">解锁蒙学 · 诗词 · 大IP</div>
            <div style="font-size:12px">朋友册 · 综合挑战 · 成就贴纸</div>
          </div>
          <div class="sec-h"><span class="t">选择套餐</span></div>
          <div class="row" style="border:2px solid var(--primary)"><div class="gr"><div class="nm">年卡 · 最划算</div><div class="ds">每天不到 0.25 元</div></div><div style="font-size:18px;font-weight:800;color:var(--primary)">¥88</div></div>
          <div class="row"><div class="gr"><div class="nm">季卡</div><div class="ds">折合月约 ¥8.7</div></div><div style="font-size:16px;font-weight:700">¥26</div></div>
          <div class="row"><div class="gr"><div class="nm">月卡 · 早鸟价</div><div class="ds">按月订阅</div></div><div style="font-size:16px;font-weight:700">¥9.9</div></div>
          <div class="btn" style="margin-top:14px">立即开通</div>
        </div>'''
    return item("A-03", "会员中心", phone(inner))


def c01(theme):
    if theme == "E":
        head = '''<div class="brand-row"><div class="mascot">👪</div><div class="brand">家长中心</div></div>'''
    else:
        head = '''<div class="brand">家长中心</div>'''
    inner = f'''
        {head}
        <div class="scroll pad">
          <div class="card" style="padding:14px;display:flex;align-items:center;gap:12px;background:rgba(255,255,255,.06);border:1px solid var(--line)">
            <div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#FFF3E7,#FF8C42);display:flex;align-items:center;justify-content:center;font-size:26px">🦊</div>
            <div style="flex:1"><div style="font-size:15px;font-weight:700">酷酷 · 5岁</div><div class="muted">今日已听 32 分钟</div></div>
            <span class="tag vip">会员</span>
          </div>
          <div class="sgrid" style="margin-top:12px">
            <div class="scard"><div class="ico" style="background:rgba(255,140,66,.15)">⏰</div><div><div class="nm">定时关闭</div><div class="ct">30 分</div></div></div>
            <div class="scard"><div class="ico" style="background:rgba(127,201,106,.15)">📊</div><div><div class="nm">成长进度</div><div class="ct">本周</div></div></div>
            <div class="scard"><div class="ico" style="background:rgba(63,197,188,.15)">❤️</div><div><div class="nm">我的收藏</div><div class="ct">28</div></div></div>
            <div class="scard"><div class="ico" style="background:rgba(184,169,232,.15)">⚙️</div><div><div class="nm">设置</div><div class="ct">主题</div></div></div>
          </div>
        </div>{tabs("parent", theme)}'''
    return item("C-01", "家长中心", phone(inner))


def c05(theme):
    inner = f'''
        <div style="display:flex;align-items:center;gap:8px;padding:8px 14px">
          <div class="search" style="flex:1">🔍 搜索故事…</div><span style="color:var(--sub);font-size:13px">取消</span>
        </div>
        <div class="scroll pad">
          <div class="sec-h"><span class="t">热门搜索</span></div>
          <div><span class="chip on">西游记</span><span class="chip">三字经</span><span class="chip">安全教育</span><span class="chip">英文儿歌</span></div>
          <div class="sec-h"><span class="t">搜索历史</span><span class="m">🗑</span></div>
          <div class="row"><div class="gr"><div class="nm">小猪佩奇</div></div><span class="rt">↖</span></div>
          <div class="row"><div class="gr"><div class="nm">团结的故事</div></div><span class="rt">↖</span></div>
        </div>'''
    return item("C-05", "搜索页", phone(inner))


def c06(theme):
    inner = f'''
        <div class="nav"><span class="bk">‹</span><span class="ti">设置</span><span class="rt"></span></div>
        <div class="scroll pad">
          <div class="sec-h"><span class="t">外观主题</span></div>
          <div style="display:flex;gap:8px">
            <div style="flex:1;text-align:center;border:2px solid var(--primary);border-radius:12px;padding:10px;background:rgba(255,255,255,.06)"><div style="font-size:22px">☀️</div><div style="font-size:11px;margin-top:4px">浅色</div></div>
            <div style="flex:1;text-align:center;border:1px solid var(--line);border-radius:12px;padding:10px;background:#1A2438;color:#fff"><div style="font-size:22px">🌙</div><div style="font-size:11px;margin-top:4px">深色</div></div>
            <div style="flex:1;text-align:center;border:1px solid var(--line);border-radius:12px;padding:10px"><div style="font-size:22px">📱</div><div style="font-size:11px;margin-top:4px">跟随</div></div>
          </div>
          <div class="sec-h"><span class="t">通用</span></div>
          <div class="row"><div class="gr"><div class="nm">睡眠定时</div></div><span class="rt">30分 ›</span></div>
          <div class="row"><div class="gr"><div class="nm">仅 Wi-Fi 播放</div></div><span style="width:40px;height:22px;background:var(--green);border-radius:12px;position:relative"><i style="position:absolute;right:2px;top:2px;width:18px;height:18px;background:#fff;border-radius:50%"></i></span></div>
          <div class="row"><div class="gr"><div class="nm">关于酷酷</div></div><span class="rt">v1.0 ›</span></div>
        </div>'''
    return item("C-06", "设置页", phone(inner))


def gl02(theme):
    bar_bg = "rgba(255,255,255,.08)" if theme == "D" else "#fff"
    inner = f'''
        <div class="brand">酷酷儿童故事</div>
        <div class="scroll pad"><div class="muted" style="text-align:center;padding:40px 0">页面内容区域<br>底部常驻迷你播放栏</div></div>
        <div style="margin:0 10px 8px;background:{bar_bg};border-radius:16px;border:1px solid var(--line);display:flex;align-items:center;gap:10px;padding:8px 12px">
          <div style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#FFB067,#FF8C42);display:flex;align-items:center;justify-content:center;font-size:18px">🏹</div>
          <div style="flex:1"><div style="font-size:13px;font-weight:700">草船借箭</div><div style="font-size:11px;color:var(--sub)">06:45 / 15:00</div></div>
          <div class="cbtn" style="width:34px;height:34px;font-size:13px">⏸</div>
        </div>
        {tabs("story", theme)}'''
    return item("GL-02", "全局迷你播放栏", phone(inner))


def u_states(theme):
    if theme == "E":
        empty_icon = '<div class="char" style="margin:0 auto 12px">🦊</div><div class="speech" style="margin-bottom:16px">还没有收藏哦，酷酷带你去发现～</div>'
        err_icon = '<div class="char peach" style="margin:0 auto 12px">🍑</div>'
        load_icon = '<div class="char panda" style="margin:0 auto 12px">🐼</div>'
    elif theme == "D":
        empty_icon = '<div style="font-size:48px;margin-bottom:8px">🕯️</div>'
        err_icon = '<div style="font-size:48px;margin-bottom:8px">🌑</div>'
        load_icon = '<div class="spin" style="margin:0 auto 16px"></div>'
    else:
        empty_icon = '<div style="font-size:36px;font-weight:800;opacity:.3;margin-bottom:12px">空</div>'
        err_icon = '<div style="font-size:36px;font-weight:800;opacity:.3;margin-bottom:12px">断</div>'
        load_icon = '<div class="spin" style="margin:0 auto 16px"></div>'

    u_combo = item("U", "通用状态合集", phone(f'''
        <div style="flex:1;display:flex;flex-direction:column">
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;border-bottom:1px dashed var(--line);padding:12px;text-align:center">
            <div style="font-size:28px">📦</div><div style="font-weight:700;font-size:13px;margin-top:4px">空状态</div>
          </div>
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;border-bottom:1px dashed var(--line);padding:12px;text-align:center">
            <div style="font-size:28px">📡</div><div style="font-weight:700;font-size:13px;margin-top:4px">网络异常</div>
          </div>
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:12px;text-align:center">
            <div class="spin"></div><div style="font-weight:700;font-size:13px;margin-top:8px">加载中</div>
          </div>
        </div>'''))

    u01 = item("U-01", "骨架屏加载态", phone(f'''
        <div class="brand">酷酷儿童故事</div>
        <div class="scroll pad" style="padding-top:12px">
          <div style="height:120px;border-radius:20px;margin-bottom:12px" class="skeleton"></div>
          <div style="height:14px;width:50%;margin-bottom:12px" class="skeleton"></div>
          <div style="height:56px;border-radius:14px;margin-bottom:10px" class="skeleton"></div>
          <div style="height:56px;border-radius:14px;margin-bottom:10px" class="skeleton"></div>
          <div style="height:56px;border-radius:14px" class="skeleton"></div>
        </div>{tabs("story", theme)}'''))

    u02 = item("U-02", "空状态页", phone(f'<div class="center">{empty_icon}<div style="font-size:18px;font-weight:800">这里空空如也</div><div class="muted" style="margin:8px 0 20px">还没有收藏任何故事</div><div class="btn" style="width:160px">去发现</div></div>'))
    u03 = item("U-03", "网络错误页", phone(f'<div class="center">{err_icon}<div style="font-size:18px;font-weight:800">网络开小差了</div><div class="muted" style="margin:8px 0 20px">请检查网络后重试</div><div class="btn" style="width:160px">重新加载</div></div>'))
    u04 = item("U-04", "加载中页", phone(f'<div class="center">{load_icon}<div style="font-size:18px;font-weight:800">加载中…</div><div class="muted" style="margin-top:8px">精彩马上呈现</div></div>'))
    return u_combo, u01, u02, u03, u04


def build(theme_key: str) -> str:
    t = THEMES[theme_key]
    story_list = [
        ("🦁", "#FFE3E7", "#FFD0D8", "勇敢的小狮子", '<span class="tag lv">L4</span> 8分钟'),
        ("🎤", "#FFF0D6", "#FFE8C8", "上台声音发抖也讲完", '<span class="tag lv">L4</span> 12分钟'),
        ("🚲", "#E0F5F3", "#C8EBE8", "第一次自己骑车", '<span class="tag lv">L3</span> 6分钟'),
        ("🌙", "#EDE7FA", "#DDD5F0", "不怕黑的夜晚", '<span class="tag lv">L3</span> 7分钟'),
    ]
    u_combo, u01, u02, u03, u04 = u_states(theme_key)

    sections = [
        ("📖 故事 Tab（S-01 ~ S-06）", [
            s01(theme_key), s02(theme_key),
            list_stories(theme_key, "S-03", "勇敢", story_list, '<div class="sec-h"><span class="t">为你推荐</span><span class="m">换一换</span></div>'),
            s04(theme_key), s05(theme_key), s06(theme_key),
        ]),
        ("🎵 歌曲 Tab（M-01 ~ M-03）", [m01(theme_key), m02(theme_key), m03(theme_key)]),
        ("🌱 成长 Tab（G-01 ~ G-06）", [g01(theme_key), g02(theme_key), g03(theme_key), g04(theme_key), g05(theme_key), g06(theme_key)]),
        ("▶️ 播放器（PL-01 · PL-02 · PL-03）", [pl01(theme_key), pl02(theme_key), pl03(theme_key)]),
        ("👤 账户·家长·通用", [a01(theme_key), a03(theme_key), c01(theme_key), c05(theme_key), c06(theme_key), gl02(theme_key), u_combo]),
        ("⏳ 加载与空状态", [u01, u02, u03, u04]),
    ]

    body_parts = []
    for title, items in sections:
        body_parts.append(f'<div class="group-title">{title}</div>')
        body_parts.append('<div class="grid">')
        body_parts.extend(items)
        body_parts.append("</div>")

    notes = {
        "D": "天蓝+草绿晴空操场；云朵/山坡软形状；厚底阴影像贴纸；白天活力，对位夜灯方案。",
        "E": "宣纸底+墨色字+朱砂点睛；细线书房感；宋体气质；贴合蒙学/上下五千年。",
        "F": "粗描边积木块+芥末金波形；音频优先；珊瑚/青绿撞色；玩具电台感。",
    }

    html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>酷酷儿童故事 — {t['title']}</title>
<style>
{base_css(t['css'])}
</style>
</head>
<body>
<div class="page-head">
  <h1>{t['title']}</h1>
  <p>{t['tagline']}</p>
  <span class="pill">概念稿 · 全量 30+ 屏 · 可与现稿并排对比</span>
</div>
<div class="compare"><b>设计要点：</b>{notes[theme_key]}<br>
已修正：G-01 学科=识字/英语/拼音；会员价=月¥9.9/季¥26/年¥88；养成话术（挑战/好伙伴，无「习题测一测」）。</div>
{''.join(body_parts)}
<div class="footer">
  酷酷儿童故事 · {t['title']} · 概念 HTML<br>
  对照现稿：酷酷UI设计稿_优化版.html · 选定后可回写 design-tokens.json
</div>
</body>
</html>
"""
    return html



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


def main():
    for key in ("D", "E", "F"):
        path = OUT / THEMES[key]["file"]
        path.write_text(build(key), encoding="utf-8")
        print(f"Wrote {path.name} ({path.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
