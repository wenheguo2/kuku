# -*- coding: utf-8 -*-
"""Generate A/B/C full-screen UI concept HTML mockups."""
from pathlib import Path

OUT = Path(__file__).resolve().parent

# Shared phone chrome helpers (theme-aware via CSS vars)

THEMES = {
    "A": {
        "file": "概念A_绘本夜灯.html",
        "title": "方案 A · 绘本夜灯",
        "tagline": "故事沉浸 · 夜空暖灯 · 封面驱动 · 首页做减法",
        "body_bg": "#0B1220",
        "css": """
:root{
  --primary:#FF9F5A; --primary-d:#E8873D; --primary-soft:rgba(255,159,90,.18);
  --blue:#5EC8C0; --green:#7ED98A; --pink:#FF9AAB; --purple:#B8A9E8; --gold:#FFC93C;
  --bg:#121A2B; --bg2:#1A2438; --card:rgba(255,255,255,.06); --ink:#F4F1EA; --sub:#A8B0C0;
  --line:rgba(255,255,255,.08); --lamp:#FFB86B;
  --s0:#6B7280; --s1:#FFD93D; --s2:#6BCBFF; --s3:#7ED957;
  --sh-card:0 8px 24px rgba(0,0,0,.35); --sh-btn:0 6px 18px rgba(255,159,90,.35);
  --sh-float:0 12px 40px rgba(0,0,0,.5);
  --hero-grad:linear-gradient(160deg,#2A1848 0%,#1A2744 40%,#0F1B2D 100%);
  --banner-grad:linear-gradient(135deg,#3D2A1A,#1A2438 60%,#FF9F5A33);
  --song-grad:linear-gradient(135deg,#0F2A28,#1A3A38);
  --growth-grad:linear-gradient(135deg,#142818,#1A3020);
  --tab-bg:rgba(18,26,43,.92); --search-bg:rgba(255,255,255,.08);
  --page-canvas:#0B1220; --phone-border:#2A3348;
}
body{background:radial-gradient(ellipse at 20% 0%,#1a2744 0%,#0B1220 55%);color:var(--ink)}
.phone{background:var(--bg);border-color:var(--phone-border);box-shadow:var(--sh-float),inset 0 0 60px rgba(255,184,107,.04)}
.phone::before{content:"";position:absolute;inset:0;pointer-events:none;z-index:0;
  background:radial-gradient(circle at 80% 8%,rgba(255,184,107,.12),transparent 40%),
             radial-gradient(circle at 15% 90%,rgba(90,140,255,.08),transparent 35%);
  opacity:.9}
.scr,.sb,.tabbar,.nav,.brand{position:relative;z-index:1}
.sb{color:var(--sub)}.brand{color:var(--lamp);letter-spacing:.08em;text-shadow:0 0 20px rgba(255,184,107,.35)}
.search{background:var(--search-bg);color:var(--sub);box-shadow:none;border:1px solid var(--line)}
.card,.row,.scard{background:var(--card);box-shadow:none;border:1px solid var(--line);backdrop-filter:blur(8px)}
.banner{background:var(--banner-grad);border:1px solid rgba(255,159,90,.25);box-shadow:0 0 40px rgba(255,159,90,.12)}
.tabbar{background:var(--tab-bg);border-top:1px solid var(--line);backdrop-filter:blur(12px)}
.tb{color:var(--sub)}.tb.on{color:var(--primary)}
.btn{background:linear-gradient(135deg,#FFB86B,#FF9F5A);box-shadow:var(--sh-btn)}
.btn.ghost{background:transparent;color:var(--lamp);border:1.5px solid rgba(255,184,107,.5)}
.cbtn{background:rgba(255,255,255,.08);color:var(--ink);box-shadow:none;border:1px solid var(--line)}
.cbtn.main{background:linear-gradient(135deg,#FFB86B,#FF9F5A);border:none}
.prog{background:rgba(255,255,255,.1)}.prog i,.prog b{background:var(--primary)}
.chip{background:rgba(255,255,255,.06);border-color:var(--line);color:var(--ink)}
.chip.on{background:var(--primary);border-color:var(--primary);color:#1a1208}
.tag.lv{background:rgba(255,255,255,.1);color:var(--ink)}
.hero-full{height:210px;border-radius:22px;position:relative;overflow:hidden;
  background:linear-gradient(180deg,transparent 30%,#0a101c 100%),
             linear-gradient(135deg,#4A2C1A,#1A2744 50%,#2A1848);
  border:1px solid rgba(255,184,107,.2)}
.hero-full .glow{position:absolute;width:120px;height:120px;border-radius:50%;
  background:radial-gradient(circle,rgba(255,184,107,.45),transparent 70%);right:10px;top:20px;filter:blur(2px)}
.cover-art{aspect-ratio:1;border-radius:16px;display:flex;align-items:center;justify-content:center;
  font-size:28px;position:relative;overflow:hidden}
.cover-art::after{content:"";position:absolute;inset:0;background:linear-gradient(160deg,rgba(255,255,255,.15),transparent 50%)}
.rail{display:flex;gap:10px;overflow:hidden}
.rail .poster{flex:0 0 108px}
.poster .cover-art{height:108px;width:108px}
.poster .nm{font-size:12px;font-weight:700;margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.poster .ds{font-size:10px;color:var(--sub);margin-top:2px}
.night-player{background:radial-gradient(ellipse at 50% 20%,#2A1F14 0%,#121A2B 55%)}
.stars{position:absolute;inset:0;pointer-events:none;opacity:.4;
  background-image:radial-gradient(1px 1px at 20% 30%,#fff,transparent),
                   radial-gradient(1px 1px at 60% 18%,#fff,transparent),
                   radial-gradient(1.5px 1.5px at 80% 55%,#ffe8c0,transparent),
                   radial-gradient(1px 1px at 35% 70%,#fff,transparent)}
""",
    },
    "B": {
        "file": "概念B_角色乐园.html",
        "title": "方案 B · 角色乐园",
        "tagline": "IP 角色出场 · 立绘锚点 · 软纸纹 · 空状态有陪伴",
        "body_bg": "#E8D9C4",
        "css": """
:root{
  --primary:#FF8C42; --primary-d:#F2751F; --primary-soft:#FFF3E7;
  --blue:#3FC5BC; --green:#7FC96A; --pink:#FF8E9E; --purple:#B8A9E8; --gold:#FFC93C;
  --bg:#FFF8EE; --bg2:#FFF1DF; --card:#FFFFFF; --ink:#2D3142; --sub:#8B8D9E;
  --line:#F0E0CC; --lamp:#FF8C42;
  --s0:#D1D5DB; --s1:#FFD93D; --s2:#6BCBFF; --s3:#7ED957;
  --sh-card:0 6px 0 rgba(232,201,160,.55); --sh-btn:0 5px 0 rgba(242,117,31,.35);
  --sh-float:0 10px 28px rgba(90,60,30,.18);
  --page-canvas:#E8D9C4; --phone-border:#3A2E24;
}
body{background:repeating-linear-gradient(0deg,transparent,transparent 11px,rgba(180,140,100,.06) 11px,rgba(180,140,100,.06) 12px),
             linear-gradient(180deg,#F3E6D4,#E8D9C4);color:var(--ink)}
.phone{background:var(--bg);border-color:var(--phone-border);
  background-image:radial-gradient(rgba(200,160,120,.07) 1px,transparent 1px);
  background-size:8px 8px}
.brand-row{display:flex;align-items:center;justify-content:center;gap:8px;padding:6px 0 10px}
.mascot{width:36px;height:36px;border-radius:50%;background:linear-gradient(145deg,#FFD4A8,#FF8C42);
  display:flex;align-items:center;justify-content:center;font-size:20px;
  box-shadow:0 3px 0 rgba(242,117,31,.3);border:2px solid #fff}
.brand{color:var(--primary);padding:0;font-size:15px}
.search{background:#fff;border:2px solid #F0E0CC;box-shadow:0 3px 0 rgba(232,201,160,.4)}
.card,.row,.scard{background:#fff;box-shadow:var(--sh-card);border:2px solid #F5E8D6}
.banner{background:linear-gradient(135deg,#FFB067,#FF8C42);border:2px solid #fff;
  box-shadow:0 6px 0 rgba(242,117,31,.25)}
.tabbar{background:#fff;border-top:2px solid var(--line)}
.tb.on{color:var(--primary)}
.btn{box-shadow:var(--sh-btn);border:2px solid #fff}
.btn.ghost{background:#fff;box-shadow:0 3px 0 rgba(232,201,160,.5)}
.cbtn{border:2px solid #F5E8D6;box-shadow:0 3px 0 rgba(232,201,160,.4)}
.char-stage{display:flex;align-items:flex-end;justify-content:center;gap:4px;height:90px;margin:4px 0 8px}
.char{width:64px;height:78px;border-radius:28px 28px 18px 18px;position:relative;
  background:linear-gradient(180deg,#FFE0C0,#FFB070);border:2px solid #fff;
  box-shadow:0 4px 0 rgba(200,140,80,.35);display:flex;align-items:flex-end;justify-content:center;padding-bottom:6px;font-size:28px}
.char.peach{background:linear-gradient(180deg,#FFD0DC,#FF8E9E);width:56px;height:70px;font-size:24px}
.char.panda{background:linear-gradient(180deg,#E8F5E8,#A8D8A8);width:52px;height:66px;font-size:22px}
.speech{background:#fff;border:2px solid #F0E0CC;border-radius:14px;padding:8px 12px;font-size:12px;
  box-shadow:0 3px 0 rgba(232,201,160,.4);position:relative;margin:0 14px 10px}
.speech::after{content:"";position:absolute;bottom:-8px;left:28px;border:6px solid transparent;border-top-color:#fff}
.hero-full{height:160px;border-radius:22px;overflow:hidden;position:relative;
  background:linear-gradient(135deg,#FFB067,#FF8C42);border:2px solid #fff;box-shadow:0 6px 0 rgba(242,117,31,.25)}
.cover-art{width:48px;height:48px;border-radius:14px;display:flex;align-items:center;justify-content:center;
  font-size:22px;border:2px solid #fff;box-shadow:0 3px 0 rgba(232,201,160,.45);flex:0 0 auto}
.friend-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:12px;
  font-size:11px;font-weight:700;border:2px solid #fff;box-shadow:0 2px 0 rgba(0,0,0,.06)}
""",
    },
    "C": {
        "file": "概念C_软陶海报.html",
        "title": "方案 C · 软陶海报",
        "tagline": "大海报网格 · 少卡片 · 低饱和黏土色 · 封面即容器",
        "body_bg": "#E6E2DC",
        "css": """
:root{
  --primary:#E8915A; --primary-d:#D47A42; --primary-soft:#F7EDE4;
  --blue:#6BB8B2; --green:#8ABF7A; --pink:#E89AA6; --purple:#A99BCF; --gold:#E0B85C;
  --bg:#F3F0EB; --bg2:#EAE6DF; --card:transparent; --ink:#2C2A28; --sub:#8A8680;
  --line:#E0DBD3; --lamp:#E8915A;
  --s0:#C5C2BC; --s1:#E8C84A; --s2:#7BB8E0; --s3:#7DBF6E;
  --sh-card:none; --sh-btn:none; --sh-float:0 16px 40px rgba(60,50,40,.12);
  --page-canvas:#E6E2DC; --phone-border:#2C2A28;
}
body{background:#E6E2DC;color:var(--ink)}
.phone{background:var(--bg);border-color:var(--phone-border);border-radius:36px}
.brand{color:var(--ink);font-weight:800;letter-spacing:-.02em;font-size:17px}
.search{background:var(--bg2);box-shadow:none;border:none;color:var(--sub)}
.card{background:transparent;box-shadow:none;border:none}
.row{background:transparent;box-shadow:none;border:none;border-radius:0;padding:12px 0;
  border-bottom:1px solid var(--line);margin-bottom:0}
.scard{background:var(--bg2);box-shadow:none;border:none;border-radius:20px}
.banner{display:none}
.tabbar{background:var(--bg);border-top:1px solid var(--line);height:58px}
.tb.on{color:var(--primary)}
.btn{background:var(--ink);color:#fff;border-radius:16px;box-shadow:none;font-weight:700}
.btn.ghost{background:transparent;color:var(--ink);border:1.5px solid var(--ink)}
.btn.green{background:var(--green)}.btn.blue{background:var(--blue)}
.cbtn{background:var(--bg2);box-shadow:none;border:none}
.cbtn.main{background:var(--ink);color:#fff}
.prog{background:var(--line);height:3px}.prog i{background:var(--ink);height:3px}
.prog b{background:var(--ink);width:10px;height:10px;top:-3.5px}
.chip{background:var(--bg2);border:none;border-radius:12px}
.chip.on{background:var(--ink);color:#fff}
.poster-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.poster-card{border-radius:20px;overflow:hidden;background:var(--bg2)}
.poster-card .art{height:130px;display:flex;align-items:center;justify-content:center;font-size:42px;
  position:relative}
.poster-card .meta{padding:10px 12px 14px}
.poster-card .nm{font-size:13px;font-weight:700;line-height:1.3}
.poster-card .ds{font-size:11px;color:var(--sub);margin-top:4px}
.hero-poster{height:240px;border-radius:24px;overflow:hidden;position:relative;
  display:flex;flex-direction:column;justify-content:flex-end;padding:18px;color:#fff}
.hero-poster h3{font-size:26px;font-weight:800;letter-spacing:-.02em;margin:0 0 4px}
.sec-h{margin:20px 2px 12px}.sec-h .t{font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--sub)}
.cover-art{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;flex:0 0 auto}
.soft-pill{display:inline-block;padding:4px 10px;border-radius:8px;font-size:11px;font-weight:600;background:rgba(255,255,255,.25)}
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


def tabs(active="story", theme="A"):
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

def s01(theme):
    if theme == "A":
        inner = f'''
        <div class="brand">✦ 酷酷 · 夜读灯</div>
        <div class="pad"><div class="search">🔍 搜故事、角色、主题…</div></div>
        <div class="scroll pad" style="padding-top:10px">
          <div class="hero-full">
            <div class="glow"></div>
            <div class="stars"></div>
            <div style="position:absolute;inset:0;display:flex;flex-direction:column;justify-content:flex-end;padding:16px">
              <span style="font-size:11px;background:rgba(255,184,107,.25);color:#FFD9A8;padding:3px 10px;border-radius:10px;width:fit-content">今日推荐 · 夜灯故事</span>
              <div style="font-size:22px;font-weight:800;margin-top:8px">草船借箭</div>
              <div style="font-size:12px;color:#C8B8A0;margin:4px 0 12px">上下五千年 · 15 分钟</div>
              <div class="btn" style="width:120px;height:36px;font-size:13px;border-radius:18px">▶ 开始听</div>
            </div>
            <div style="position:absolute;right:16px;top:36px;font-size:64px;opacity:.9">🏹</div>
          </div>
          <div class="sec-h"><span class="t">继续听</span><span class="m">全部 ›</span></div>
          <div class="row" style="background:rgba(255,184,107,.08);border-color:rgba(255,184,107,.2)">
            {cover("🦁","#4A2A2A","#2A1A1A")}
            <div class="gr"><div class="nm">勇敢的小狮子</div><div class="ds">听到 03:20 · L4</div></div>
            <span class="play-s">▶</span>
          </div>
          <div class="sec-h"><span class="t">走进学科</span></div>
          <div class="rail">
            <div class="poster"><div class="cover-art" style="background:linear-gradient(145deg,#5A2A38,#3A1A28)">🦁</div><div class="nm">品格养成</div><div class="ds">1,245</div></div>
            <div class="poster"><div class="cover-art" style="background:linear-gradient(145deg,#2A3A2A,#1A2A1A)">💚</div><div class="nm">情绪疗愈</div><div class="ds">980</div></div>
            <div class="poster"><div class="cover-art" style="background:linear-gradient(145deg,#1A3A3A,#0A2A2A)">🏠</div><div class="nm">生活认知</div><div class="ds">1,145</div></div>
            <div class="poster"><div class="cover-art" style="background:linear-gradient(145deg,#2A2A4A,#1A1A3A)">🔬</div><div class="nm">自然科学</div><div class="ds">870</div></div>
          </div>
        </div>
        {tabs("story", theme)}'''
    elif theme == "B":
        inner = f'''
        <div class="brand-row"><div class="mascot">🦊</div><div class="brand">酷酷儿童故事</div></div>
        <div class="char-stage">
          <div class="char">🦊</div><div class="char peach">🍑</div><div class="char panda">🐼</div>
        </div>
        <div class="speech">酷酷：今天想听哪本故事呀？我陪你～</div>
        <div class="pad"><div class="search">🔍 搜索故事…</div></div>
        <div class="scroll pad" style="padding-top:10px">
          <div class="hero-full">
            <div style="position:absolute;inset:0;padding:16px;display:flex;flex-direction:column;justify-content:flex-end;color:#fff">
              <span style="font-size:11px;background:rgba(255,255,255,.3);padding:2px 10px;border-radius:10px;width:fit-content">🌟 酷酷推荐</span>
              <h3 style="font-size:20px;margin:8px 0 4px">草船借箭</h3>
              <div style="font-size:12px;opacity:.9">上下五千年 · 15分钟</div>
            </div>
            <div style="position:absolute;right:8px;bottom:4px;font-size:70px">🏹</div>
          </div>
          <div class="sec-h"><span class="t">📚 故事学科</span><span class="m">全部 ›</span></div>
          <div class="sgrid">
            <div class="scard"><div class="ico" style="background:#FFE3E7">🦁</div><div><div class="nm">品格养成</div><div class="ct">1,245</div></div></div>
            <div class="scard"><div class="ico" style="background:#E5F6E0">💚</div><div><div class="nm">情绪疗愈</div><div class="ct">980</div></div></div>
            <div class="scard"><div class="ico" style="background:#E0F5F3">🏠</div><div><div class="nm">生活认知</div><div class="ct">1,145</div></div></div>
            <div class="scard"><div class="ico" style="background:#EDE7FA">🔬</div><div><div class="nm">自然科学</div><div class="ct">870</div></div></div>
          </div>
          <div class="sec-h"><span class="t">✨ 朋友们在听</span></div>
          <div class="row">{cover("🦁","#FFE3E7","#FFD0D8")}<div class="gr"><div class="nm">勇敢的小狮子</div><div class="ds"><span class="tag lv">L4</span> 8分钟</div></div><span class="play-s">▶</span></div>
        </div>
        {tabs("story", theme)}'''
    else:  # C
        inner = f'''
        <div class="brand" style="text-align:left;padding:8px 14px 6px">酷酷</div>
        <div class="pad"><div class="search">搜索</div></div>
        <div class="scroll pad" style="padding-top:12px">
          <div class="hero-poster" style="background:linear-gradient(160deg,#C47A4A,#6B3A28 60%,#2C2A28)">
            <span class="soft-pill">今日</span>
            <h3>草船借箭</h3>
            <div style="font-size:12px;opacity:.85">上下五千年 · 15 分钟</div>
          </div>
          <div class="sec-h"><span class="t">Stories</span><span class="m">换一批</span></div>
          <div class="poster-grid">
            <div class="poster-card"><div class="art" style="background:linear-gradient(145deg,#E8C4B8,#C47A6A)">🦁</div><div class="meta"><div class="nm">勇敢的小狮子</div><div class="ds">L4 · 8 分</div></div></div>
            <div class="poster-card"><div class="art" style="background:linear-gradient(145deg,#B8D4D0,#6BA8A0)">🚲</div><div class="meta"><div class="nm">第一次自己骑车</div><div class="ds">L3 · 6 分</div></div></div>
            <div class="poster-card"><div class="art" style="background:linear-gradient(145deg,#D4C8B0,#A08050)">📜</div><div class="meta"><div class="nm">三字经</div><div class="ds">章回 · 84</div></div></div>
            <div class="poster-card"><div class="art" style="background:linear-gradient(145deg,#C8C0D8,#7868A0)">🗡️</div><div class="meta"><div class="nm">花木兰</div><div class="ds">L6 · 14 分</div></div></div>
          </div>
          <div class="sec-h"><span class="t">Subjects</span></div>
          <div class="poster-grid">
            <div class="poster-card"><div class="art" style="height:72px;background:#E8C8C8;font-size:28px">品格</div></div>
            <div class="poster-card"><div class="art" style="height:72px;background:#C8D8C8;font-size:28px">情绪</div></div>
            <div class="poster-card"><div class="art" style="height:72px;background:#C8D8D4;font-size:28px">生活</div></div>
            <div class="poster-card"><div class="art" style="height:72px;background:#D0C8E0;font-size:28px">自然</div></div>
          </div>
        </div>
        {tabs("story", theme)}'''
    return item("S-01", "故事首页", phone(inner))


def s02(theme):
    rows = "".join([
        f'<div class="row"><span class="bar" style="background:{c}"></span><div class="gr"><div class="nm">{n}</div><div class="ds">{d} 个故事</div></div><span class="rt">›</span></div>'
        for c, n, d in [("#FF8E9E","勇敢","173"),("#FFB067","诚实","142"),("#7FC96A","感恩","128"),("#3FC5BC","分享","156"),("#B8A9E8","坚持","134")]
    ])
    if theme == "C":
        inner = f'''
        <div class="nav"><span class="bk">‹</span><span class="ti">品格养成</span><span class="rt"></span></div>
        <div class="scroll pad">
          <div style="font-size:28px;font-weight:800;margin:8px 0 4px">品格养成</div>
          <div class="muted" style="margin-bottom:16px">9 分类 · 1,245 故事</div>
          {rows}
        </div>{tabs("story", theme)}'''
    elif theme == "A":
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
    if theme == "C" and cid == "S-03":
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
    if theme == "A":
        head = '''<div class="hero-full" style="height:100px;margin-bottom:8px"><div style="position:absolute;inset:0;padding:14px;display:flex;flex-direction:column;justify-content:flex-end"><div style="font-size:11px;color:#E8C89A">章回 · 84 章</div><div style="font-size:18px;font-weight:800">三字经</div></div></div>'''
    elif theme == "B":
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
    if theme == "C":
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
        if theme == "A":
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
    if theme == "A":
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
    elif theme == "B":
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
    if theme == "A":
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
    elif theme == "B":
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
    if theme == "B":
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
    if theme == "B":
        body = '''
          <div class="char" style="width:80px;height:96px;font-size:40px;margin-bottom:12px">🦊</div>
          <div style="font-size:20px;font-weight:800">太棒啦！</div>
          <div class="muted" style="margin:10px 0">又交到好伙伴啦<br><span style="color:#7ED957;font-weight:700">🟢 好伙伴</span></div>
          <div class="btn green" style="width:200px;margin-top:12px">继续遇见新朋友</div>
          <div style="margin-top:12px;font-size:12px;color:var(--sub)">返回朋友册</div>'''
    elif theme == "A":
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


def pl01(theme):
    if theme == "A":
        inner = f'''
        <div class="night-player" style="flex:1;display:flex;flex-direction:column;position:relative">
          <div class="stars"></div>
          <div class="nav"><span class="bk">⌄</span><span class="ti">正在听</span><span class="rt">≡</span></div>
          <div class="scroll pad">
            <div class="cover-lg" style="background:linear-gradient(145deg,#5A3A28,#2A1A10);box-shadow:0 0 50px rgba(255,184,107,.25)">🏹</div>
            <div style="text-align:center;margin-top:14px"><div style="font-size:18px;font-weight:800">草船借箭</div><div class="muted">上下五千年 · 三国篇</div></div>
            <div style="margin-top:16px"><div class="prog"><i style="width:45%"></i><b style="left:45%"></b></div>
              <div class="time"><span>06:45</span><span>15:00</span></div></div>
            <div class="ctrls"><div class="cbtn">⏮</div><div class="cbtn main">⏸</div><div class="cbtn">⏭</div></div>
            <div class="fns"><div><span class="i">❤️</span>收藏</div><div><span class="i">🕒</span>定时</div><div><span class="i">🔁</span>循环</div><div><span class="i">📝</span>文本</div></div>
          </div>
        </div>'''
    elif theme == "B":
        inner = f'''
        <div class="nav"><span class="bk">⌄</span><span class="ti">正在播放</span><span class="rt">≡</span></div>
        <div class="scroll pad">
          <div class="char-stage" style="height:100px;margin-top:8px"><div class="char" style="width:72px;height:88px;font-size:36px">🦊</div></div>
          <div class="cover-lg" style="background:linear-gradient(135deg,#FFB067,#FF8C42);margin-top:4px">🏹</div>
          <div style="text-align:center;margin-top:12px"><div style="font-size:18px;font-weight:800">草船借箭</div><div class="muted">上下五千年</div></div>
          <div style="margin-top:14px"><div class="prog"><i style="width:45%"></i><b style="left:45%"></b></div>
            <div class="time"><span>06:45</span><span>15:00</span></div></div>
          <div class="ctrls"><div class="cbtn">⏮</div><div class="cbtn main">⏸</div><div class="cbtn">⏭</div></div>
          <div class="fns"><div><span class="i">❤️</span>收藏</div><div><span class="i">🕒</span>定时</div><div><span class="i">🔁</span>循环</div><div><span class="i">📝</span>文本</div></div>
        </div>'''
    else:
        inner = f'''
        <div class="nav"><span class="bk">⌄</span><span class="ti"></span><span class="rt">≡</span></div>
        <div class="scroll pad">
          <div style="height:220px;border-radius:24px;background:linear-gradient(160deg,#C47A4A,#6B3A28);display:flex;align-items:center;justify-content:center;font-size:72px;margin-top:8px">🏹</div>
          <div style="margin-top:18px"><div style="font-size:22px;font-weight:800">草船借箭</div><div class="muted" style="margin-top:4px">上下五千年</div></div>
          <div style="margin-top:20px"><div class="prog"><i style="width:45%"></i><b style="left:45%"></b></div>
            <div class="time"><span>06:45</span><span>15:00</span></div></div>
          <div class="ctrls"><div class="cbtn">⏮</div><div class="cbtn main">⏸</div><div class="cbtn">⏭</div></div>
        </div>'''
    return item("PL-01", "故事播放器", phone(inner))


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
    left_bg = "linear-gradient(135deg,#2A4A28,#1A3020)" if theme == "A" else "linear-gradient(135deg,#8FD97B,#5FA84C)"
    if theme == "C":
        left_bg = "linear-gradient(135deg,#A8C898,#5A8A48)"
    char = "🦊" if theme == "B" else "🧑‍🏫"
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


def a01(theme):
    if theme == "A":
        body = '''
          <div style="font-size:56px;filter:drop-shadow(0 0 20px rgba(255,184,107,.5))">🦊</div>
          <div style="font-size:22px;font-weight:800;margin-top:8px;color:#FFB86B">酷酷儿童故事</div>
          <div class="muted" style="margin:8px 0 24px">点亮一盏夜读灯</div>
          <div class="btn" style="width:230px">微信一键登录</div>
          <div class="btn ghost" style="width:230px;margin-top:12px">手机号登录</div>'''
    elif theme == "B":
        body = '''
          <div class="char-stage" style="height:100px"><div class="char" style="width:72px;height:90px;font-size:36px">🦊</div><div class="char peach">🍑</div></div>
          <div style="font-size:20px;font-weight:800">酷酷儿童故事</div>
          <div class="muted" style="margin:6px 0 22px">听故事 · 唱歌曲 · 交朋友</div>
          <div class="btn green" style="width:230px">💬 微信一键登录</div>
          <div class="btn ghost" style="width:230px;margin-top:12px">📱 手机号登录</div>'''
    else:
        body = '''
          <div style="font-size:40px;font-weight:800;letter-spacing:-.03em">酷酷</div>
          <div class="muted" style="margin:8px 0 28px">儿童故事</div>
          <div class="btn" style="width:220px">微信登录</div>
          <div class="btn ghost" style="width:220px;margin-top:12px">手机号</div>'''
    body += '''<div style="margin-top:22px;font-size:11px;color:var(--sub);line-height:1.6">登录即同意《用户协议》与《隐私政策》</div>'''
    return item("A-01", "登录页", phone(f'<div class="center">{body}</div>'))


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
    if theme == "B":
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
    bar_bg = "rgba(255,255,255,.08)" if theme == "A" else "#fff"
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
    if theme == "B":
        empty_icon = '<div class="char" style="margin:0 auto 12px">🦊</div><div class="speech" style="margin-bottom:16px">还没有收藏哦，酷酷带你去发现～</div>'
        err_icon = '<div class="char peach" style="margin:0 auto 12px">🍑</div>'
        load_icon = '<div class="char panda" style="margin:0 auto 12px">🐼</div>'
    elif theme == "A":
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
        "A": "深靛蓝夜空 + 暖橙夜灯；首页只留推荐/续听/学科轨；播放器沉浸；保留四级朋友色。",
        "B": "角色立绘锚点 + 软纸纹 + 厚描边；空状态/登录/结果页角色出场；话术对齐养成系统。",
        "C": "低饱和黏土色 + 2 列大海报；弱化白卡阴影；封面即容器；信息极简。",
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


def main():
    for key in ("A", "B", "C"):
        path = OUT / THEMES[key]["file"]
        path.write_text(build(key), encoding="utf-8")
        print(f"Wrote {path.name} ({path.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
