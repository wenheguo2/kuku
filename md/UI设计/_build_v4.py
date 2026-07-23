# -*- coding: utf-8 -*-
# 酷酷儿童故事 UI 定稿 v4 构建脚本：典藏绘本骨架 + 日夜双主题 + 真实封面管线
import pathlib

DIR = pathlib.Path(__file__).parent
OUT = DIR / "酷酷UI_融合版_v4.html"
MASCOT = "../../../../md/UI设计/assets/Cute_orange_fox_mascot_charact_2026-07-22T08-08-31.png"

CSS = r"""
:root{--primary:#FF8C42;--primary-d:#F2751F;--blue:#3FC5BC;--green:#7FC96A;--pink:#FF8E9E;--purple:#B8A9E8;--gold:#FFC93C;
--bg:#FFF9F0;--ink:#2D3142;--sub:#8B8D9E;--line:#F0E6D8;--s0:#D1D5DB;--s1:#FFD93D;--s2:#6BCBFF;--s3:#7ED957;
--night:#171D33;--night2:#222C4E;--lamp:#FFC98F}
*{margin:0;padding:0;box-sizing:border-box;-webkit-font-smoothing:antialiased}
body{font-family:"PingFang SC","Hiragino Sans GB","Microsoft YaHei",system-ui,sans-serif;color:var(--ink);
padding:40px 20px 80px;min-height:100vh;background:radial-gradient(900px 520px at 10% -6%,rgba(255,140,66,.16),transparent 60%),
radial-gradient(820px 520px at 94% 6%,rgba(63,197,188,.13),transparent 60%),#F3EADC}
.serif{font-family:"Songti SC","STSong","Noto Serif SC","SimSun",serif}
.page-head{text-align:center;margin-bottom:10px}
.page-head h1{font-size:27px;font-weight:800}
.page-head p{color:#9a8f7d;font-size:13.5px;margin-top:8px}
.page-head .pill{display:inline-block;margin-top:12px;background:linear-gradient(135deg,#FFB067,var(--primary));color:#fff;
font-size:12.5px;padding:6px 16px;border-radius:20px;box-shadow:0 8px 18px rgba(255,140,66,.4)}
.note{max-width:1240px;margin:18px auto 8px;background:#fff;border:1px solid var(--line);border-radius:18px;padding:14px 20px;
font-size:13px;color:#6b6255;line-height:1.9;box-shadow:0 8px 22px rgba(232,201,160,.28)}
.note b{color:var(--primary-d)}
.group-title{max-width:1240px;margin:40px auto 16px;font-size:17px;font-weight:800;border-left:5px solid var(--primary);padding-left:12px}
.grid{max-width:1240px;margin:0 auto;display:flex;flex-wrap:wrap;gap:36px 28px}
.item{width:340px}
.item.wide{width:700px}
.cap{text-align:center;margin-top:13px;font-size:13.5px;color:#6b6255}
.cap b{color:var(--ink)}
.cap .tag{display:inline-block;background:#fff;border:1px solid #d9cdb6;color:#a08f72;font-size:11px;padding:1px 8px;border-radius:10px;margin-right:6px}
.phone{width:340px;height:700px;background:var(--bg);border-radius:42px;overflow:hidden;position:relative;
box-shadow:0 26px 55px rgba(45,49,66,.24);border:8px solid #1e2129}
.phone.land{width:640px;height:400px;border-radius:36px}
.phone.dk{background:linear-gradient(180deg,#141B31,#1D2646 60%,#232F55);color:#E8ECFF}
.sb{height:30px;display:flex;align-items:center;justify-content:space-between;padding:0 22px;font-size:12px;font-weight:600;flex:0 0 auto;position:relative;z-index:5}
.sb .dots{letter-spacing:2px;opacity:.55}
.scr{height:calc(100% - 30px);overflow:hidden;display:flex;flex-direction:column;position:relative;z-index:2}
.scroll{flex:1;overflow:hidden}
img{display:block}
.crop{overflow:hidden;position:relative}
.crop img{width:100%;height:100%;object-fit:cover}
.ic{width:22px;height:22px}
.tabbar{flex:0 0 auto;height:66px;background:rgba(255,255,255,.88);backdrop-filter:blur(12px);border-top:1px solid var(--line);
display:flex;align-items:center;justify-content:space-around;padding-bottom:5px;position:relative;z-index:10}
.tb{text-align:center;color:var(--sub);font-size:10px;font-weight:800;display:flex;flex-direction:column;align-items:center;gap:3px;position:relative}
.tb.on{color:var(--primary)}
.tb.on::before{content:"";position:absolute;top:-11px;width:32px;height:4px;border-radius:3px;background:var(--primary)}
.dk .tabbar{background:rgba(23,29,51,.85);border-top-color:rgba(255,255,255,.08)}
.dk .tb{color:#8A93B8}
.nav{display:flex;align-items:center;gap:10px;padding:8px 16px 10px}
.nav .ti{font-size:16px;font-weight:800;flex:1;text-align:center}
.nav .ic{width:22px;height:22px;color:inherit}
.nav .sp{width:22px}
.greet{display:flex;align-items:center;gap:12px;padding:6px 20px 0}
.avatar{width:46px;height:46px;border-radius:50%;overflow:hidden;flex:0 0 auto;box-shadow:0 4px 12px rgba(255,140,66,.35);border:2px solid #fff}
.avatar img{width:100%;height:100%;object-fit:cover;object-position:center 30%}
.greet .hi{font-size:12px;color:var(--sub);font-weight:700}
.greet .big{font-size:17px;font-weight:800;margin-top:2px;white-space:nowrap}
.sbtn{margin-left:auto;width:42px;height:42px;border-radius:50%;flex:0 0 auto;background:rgba(255,255,255,.8);border:1px solid #fff;
display:flex;align-items:center;justify-content:center;box-shadow:0 5px 14px rgba(232,201,160,.4)}
.sbtn .ic{width:19px;height:19px;color:var(--primary)}
.hero{margin:14px 16px 0;border-radius:26px;height:200px;box-shadow:0 16px 32px rgba(180,110,40,.32)}
.shade{position:absolute;inset:0;z-index:2;background:linear-gradient(180deg,transparent 36%,rgba(46,30,14,.62) 90%)}
.hero .inner{position:absolute;left:16px;right:16px;bottom:14px;z-index:3;color:#fff}
.htag{display:inline-block;font-size:11px;font-weight:800;background:rgba(255,255,255,.26);backdrop-filter:blur(6px);
padding:3px 10px;border-radius:11px;border:1px solid rgba(255,255,255,.35)}
.hero h3{font-size:23px;font-weight:800;margin:8px 0 3px;text-shadow:0 2px 10px rgba(0,0,0,.35);letter-spacing:2px}
.hero .meta{font-size:12px;opacity:.94}
.hplay{position:absolute;right:14px;bottom:14px;z-index:4;width:50px;height:50px;border-radius:50%;color:#fff;
background:radial-gradient(circle at 35% 30%,#FFB067,var(--primary) 70%,var(--primary-d));display:flex;align-items:center;
justify-content:center;box-shadow:0 8px 20px rgba(255,140,66,.55)}
.hplay .ic{width:21px;height:21px;margin-left:2px}
.dots-i{text-align:center;margin-top:10px}
.dots-i i{display:inline-block;width:6px;height:6px;border-radius:3px;background:#e0d0b8;margin:0 3px}
.dots-i i.on{width:17px;background:var(--primary)}
.sec-h{display:flex;align-items:baseline;justify-content:space-between;margin:18px 20px 11px}
.sec-h .t{font-size:16px;font-weight:800}
.sec-h .m{font-size:12px;color:var(--primary);font-weight:800}
.cont{margin:0 16px;background:#fff;border-radius:22px;padding:12px;display:flex;align-items:center;gap:12px;
box-shadow:0 10px 24px rgba(232,201,160,.32);border:1px solid #fff}
.cont .cvr{width:62px;height:62px;border-radius:16px;flex:0 0 auto;box-shadow:0 6px 14px rgba(180,110,40,.28)}
.cont .gr{flex:1;min-width:0}
.cont .nm{font-size:14px;font-weight:800}
.cont .ds{font-size:11px;color:var(--sub);margin:3px 0 7px}
.cont .bar{height:5px;background:var(--line);border-radius:3px;position:relative}
.cont .bar i{position:absolute;inset:0;width:42%;border-radius:3px;background:linear-gradient(90deg,#FFB067,var(--primary))}
.cp{width:40px;height:40px;border-radius:50%;flex:0 0 auto;color:#fff;background:radial-gradient(circle at 35% 30%,#FFB067,var(--primary));
display:flex;align-items:center;justify-content:center;box-shadow:0 6px 14px rgba(255,140,66,.5)}
.cp .ic{width:16px;height:16px;margin-left:1px}
.hscroll{display:flex;gap:13px;padding:2px 16px 6px;overflow:hidden}
.scard{width:124px;flex:0 0 auto}
.scard .cvr{height:112px;border-radius:19px;box-shadow:0 10px 20px rgba(45,49,66,.16)}
.scard .nm{font-size:12.5px;font-weight:800;margin:8px 2px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.scard .ds{font-size:11px;color:var(--sub);margin:3px 2px 0}
.lvb{display:inline-block;background:var(--line);color:var(--ink);font-size:10px;font-weight:800;padding:1px 7px;border-radius:7px;margin-right:5px}
.sgrid{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:0 16px 14px}
.tile{position:relative;height:86px;border-radius:20px;overflow:hidden;box-shadow:0 10px 20px rgba(45,49,66,.15)}
.tile .shade{background:linear-gradient(180deg,rgba(30,22,14,.05) 40%,rgba(30,22,14,.55))}
.tile .tt{position:absolute;left:12px;bottom:9px;z-index:3;color:#fff}
.tile .tt .a{font-size:14px;font-weight:800;text-shadow:0 1px 6px rgba(0,0,0,.4)}
.tile .tt .b{font-size:10.5px;opacity:.92;margin-top:1px}
.sbhead{margin:0 16px;height:148px;border-radius:24px;box-shadow:0 12px 26px rgba(180,110,40,.28)}
.sbhead .inner{position:absolute;left:16px;bottom:13px;z-index:3;color:#fff}
.sbhead h3{font-size:22px;font-weight:800;text-shadow:0 2px 8px rgba(0,0,0,.35);letter-spacing:2px}
.sbhead .meta{font-size:11.5px;opacity:.94;margin-top:3px}
.row{display:flex;align-items:center;gap:12px;background:#fff;border-radius:16px;padding:10px 13px;margin:0 16px 10px;
box-shadow:0 5px 14px rgba(232,201,160,.26);border:1px solid #fffaf2}
.row .cvr{width:50px;height:50px;border-radius:14px;flex:0 0 auto}
.row .barl{width:5px;height:34px;border-radius:3px;flex:0 0 auto}
.row .gr{flex:1;min-width:0}
.row .nm{font-size:14px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.row .ds{font-size:11px;color:var(--sub);margin-top:3px}
.row .rt{font-size:13px;color:var(--sub)}
.mini{margin:auto 12px 8px;height:62px;border-radius:19px;display:flex;align-items:center;gap:11px;padding:0 12px;
background:rgba(255,255,255,.66);backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.75);
box-shadow:0 8px 22px rgba(45,49,66,.16);position:relative;z-index:9;flex:0 0 auto}
.mini .cvr{width:42px;height:42px;border-radius:12px;flex:0 0 auto}
.mini .gr{flex:1;min-width:0}
.mini .t{font-size:13px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mini .s{font-size:10.5px;color:var(--sub);margin-top:2px}
.mini .mp{width:38px;height:38px;border-radius:50%;color:#fff;flex:0 0 auto;background:radial-gradient(circle at 35% 30%,#FFB067,var(--primary));
display:flex;align-items:center;justify-content:center;box-shadow:0 5px 12px rgba(255,140,66,.5)}
.mini .mp .ic{width:16px;height:16px}
"""
CSS += r"""
.pbg{position:absolute;inset:0;z-index:0}
.pbg img{width:100%;height:100%;object-fit:cover;filter:blur(50px) saturate(1.1) brightness(.75);transform:scale(1.5)}
.pbg::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(20,25,45,.5),rgba(16,21,40,.85))}
.pscr{position:relative;z-index:2;height:100%;display:flex;flex-direction:column;color:#fff}
.pnav{display:flex;align-items:center;gap:10px;padding:8px 18px 4px}
.pnav .ti{flex:1;text-align:center;font-size:15px;font-weight:800;opacity:.95}
.pnav .ic{color:#fff}
.lampcov{margin:24px auto 0;width:188px;height:188px;border-radius:50%;animation:lamp 3.2s ease-in-out infinite}
@keyframes lamp{0%,100%{box-shadow:0 0 0 10px rgba(255,200,120,.12),0 0 60px 24px rgba(255,170,80,.32),0 18px 40px rgba(0,0,0,.4)}
50%{box-shadow:0 0 0 13px rgba(255,200,120,.18),0 0 85px 34px rgba(255,170,80,.48),0 18px 40px rgba(0,0,0,.4)}}
.ptitle{text-align:center;font-size:24px;font-weight:800;margin-top:20px;letter-spacing:3px;text-shadow:0 2px 14px rgba(0,0,0,.4)}
.psub{text-align:center;font-size:12.5px;opacity:.78;margin-top:6px}
.pprog{margin:19px 24px 6px;height:5px;background:rgba(255,255,255,.25);border-radius:3px;position:relative}
.pprog i{position:absolute;inset:0;width:42%;border-radius:3px;background:linear-gradient(90deg,#FFE0B0,var(--lamp))}
.pprog b{position:absolute;top:-5px;left:42%;width:15px;height:15px;border-radius:50%;background:#FFF3DC;
box-shadow:0 0 10px 4px rgba(255,200,130,.6);animation:bre 1.5s ease-in-out infinite}
@keyframes bre{0%,100%{transform:scale(1)}50%{transform:scale(1.16)}}
.ptime{display:flex;justify-content:space-between;font-size:11px;opacity:.85;margin:0 24px}
.pctrls{display:flex;align-items:center;justify-content:center;gap:34px;margin:20px 0 10px}
.pbtn{width:52px;height:52px;border-radius:50%;background:rgba(255,255,255,.14);backdrop-filter:blur(8px);
border:1px solid rgba(255,255,255,.22);display:flex;align-items:center;justify-content:center;color:#fff}
.pbtn.main{width:78px;height:78px;border:none;background:radial-gradient(circle at 35% 30%,#FFD9A0,var(--primary) 65%,var(--primary-d));
box-shadow:0 14px 32px rgba(255,150,60,.55),inset 0 2px 6px rgba(255,255,255,.55)}
.pbtn.main .ic{width:32px;height:32px}
.pfns{display:flex;justify-content:space-around;font-size:11px;font-weight:700;opacity:.92;padding:0 10px}
.pfns div{display:flex;flex-direction:column;align-items:center;gap:5px}
.pfns .ic{width:21px;height:21px}
.pind{height:5px;width:120px;border-radius:3px;background:rgba(255,255,255,.45);margin:auto auto 10px}
.lyr{margin:12px 22px 0;text-align:center;font-size:13.5px;color:var(--sub);line-height:2.05}
.lyr .on{display:inline-block;background:linear-gradient(135deg,#DFF3F1,#CDEBE8);color:#178F88;font-weight:800;padding:2px 14px;border-radius:14px;font-size:15px}
.nmoon{position:absolute;top:36px;right:36px;width:70px;height:70px;border-radius:50%;z-index:1;
background:radial-gradient(circle at 38% 35%,#FFF6D8,#FFE9A8 55%,#FFD873);box-shadow:0 0 40px 14px rgba(255,220,130,.32),0 0 90px 40px rgba(255,220,130,.13)}
.nstar{position:absolute;color:#FFE9A8;font-size:11px;z-index:1;animation:tw 2.4s ease-in-out infinite}
@keyframes tw{0%,100%{opacity:.3}50%{opacity:.95}}
.ncard{margin:12px 16px 0;border-radius:24px;height:168px;box-shadow:0 16px 34px rgba(0,0,0,.45)}
.nrow{display:flex;align-items:center;gap:11px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);
border-radius:16px;padding:9px 12px;margin:0 16px 9px;backdrop-filter:blur(6px)}
.nrow .cvr{width:44px;height:44px;border-radius:12px;flex:0 0 auto}
.nrow .gr{flex:1;min-width:0}
.nrow .nm{font-size:13px;font-weight:800}
.nrow .ds{font-size:10.5px;opacity:.6;margin-top:2px}
.nrow .ic{width:15px;height:15px;color:#FFD873}
.ncta{margin:12px 16px 0;height:48px;border-radius:24px;background:linear-gradient(135deg,#FFE9A8,#FFC93C);color:#5A3D00;
display:flex;align-items:center;justify-content:center;gap:8px;font-size:14px;font-weight:800;box-shadow:0 10px 24px rgba(255,201,60,.35)}
.gbar{display:flex;height:22px;border-radius:11px;overflow:hidden;margin:8px 0 10px}
.gbar i{display:block;height:100%}
.glegend{display:flex;gap:12px;font-size:11px;color:var(--sub);flex-wrap:wrap}
.glegend b{display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:4px}
.gcard{margin:0 16px 12px;background:#fff;border-radius:20px;padding:15px;box-shadow:0 8px 20px rgba(232,201,160,.3)}
.grow3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin:0 16px 12px}
.gstat{background:#fff;border-radius:18px;padding:13px 8px;text-align:center;box-shadow:0 8px 18px rgba(232,201,160,.3)}
.gstat .v{font-size:19px;font-weight:800}
.gstat .k{font-size:10.5px;color:var(--sub);margin-top:3px}
.bgrid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px 10px;padding:0 20px}
.badge{text-align:center}
.badge .ring{width:62px;height:62px;border-radius:50%;margin:0 auto;overflow:hidden;position:relative;
border:3px solid var(--s1);box-shadow:0 6px 14px rgba(232,201,160,.35)}
.badge .ring img{width:100%;height:100%;object-fit:cover}
.badge .ring.g2{border-color:var(--s2)}
.badge .ring.g3{border-color:var(--s3)}
.badge .ring.no{border:2.5px dashed #D9CDB6;background:#FBF4E8;overflow:visible;display:flex;align-items:center;
justify-content:center;font-size:20px;color:#D5C6AC;box-shadow:none}
.badge .bn{font-size:11.5px;font-weight:800;margin-top:6px}
.badge .bs{font-size:10px;color:var(--sub);margin-top:2px}
.kid{margin:0 16px 12px;background:rgba(255,255,255,.62);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.85);
border-radius:22px;padding:14px;display:flex;align-items:center;gap:12px;box-shadow:0 10px 24px rgba(190,160,120,.25)}
.frow{display:flex;align-items:center;gap:12px;background:#fff;border-radius:15px;padding:12px 14px;margin:0 16px 9px;
box-shadow:0 4px 12px rgba(232,201,160,.24);font-size:13.5px;font-weight:700}
.frow .fi{width:34px;height:34px;border-radius:11px;display:flex;align-items:center;justify-content:center;flex:0 0 auto}
.frow .fi .ic{width:18px;height:18px}
.frow .rt{margin-left:auto;font-size:11.5px;color:var(--sub);font-weight:600}
.login{display:flex;flex-direction:column;align-items:center;text-align:center;padding:30px 30px 0;height:100%}
.lmascot{width:148px;height:148px;border-radius:50%;overflow:hidden;box-shadow:0 16px 36px rgba(255,140,66,.35);border:4px solid #fff}
.lmascot img{width:100%;height:100%;object-fit:cover;object-position:center 30%}
.btn{width:100%;height:50px;border-radius:25px;display:flex;align-items:center;justify-content:center;gap:9px;font-size:15px;
font-weight:800;box-shadow:0 8px 20px rgba(255,140,66,.4);color:#fff;background:radial-gradient(circle at 35% 25%,#FFB067,var(--primary) 70%,var(--primary-d))}
.btn.ghost{background:#fff;color:var(--primary);border:1.5px solid var(--primary);box-shadow:none}
.btn.wx{background:radial-gradient(circle at 35% 25%,#7FD98F,#4CAF50 75%,#3D9142);box-shadow:0 8px 20px rgba(76,175,80,.4)}
.gold{background:linear-gradient(180deg,#221E17,#37301F);color:#F5E6C8}
.gold .sb{color:#F5E6C8}
.plan{background:rgba(255,255,255,.06);border:1px solid rgba(255,201,60,.32);border-radius:18px;padding:12px 8px;text-align:center;position:relative}
.plan .pr{font-size:19px;font-weight:800;margin-top:4px}
.plan .pd{font-size:10.5px;opacity:.65;margin-top:3px}
.plan.on{background:linear-gradient(135deg,#FFE9A8,#FFC93C);color:#5A3D00;box-shadow:0 8px 22px rgba(255,201,60,.45);border-color:transparent}
.goldrow{display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.05);border:1px solid rgba(255,201,60,.18);
border-radius:14px;padding:10px 13px;margin:0 16px 8px;font-size:12.5px}
.chip{display:inline-block;background:#fff;border:1px solid var(--line);border-radius:16px;padding:6px 14px;font-size:12px;margin:0 6px 8px 0;font-weight:700}
.chip.on{background:var(--primary);color:#fff;border-color:var(--primary)}
.seg{display:flex;background:#F5EBDB;border-radius:14px;padding:3px;gap:3px;flex:1}
.seg span{flex:1;text-align:center;font-size:11.5px;font-weight:700;padding:6px 0;border-radius:11px;color:var(--sub)}
.seg span.on{background:#fff;color:var(--primary);box-shadow:0 2px 6px rgba(232,201,160,.5)}
.opt{background:#fff;border-radius:18px;padding:15px 8px;text-align:center;font-size:21px;font-weight:800;
box-shadow:0 6px 16px rgba(232,201,160,.3);border:2.5px solid transparent}
.opt.sel{border-color:var(--green);background:#F2FAEE}
.opt.no{border-color:#F0B4B4;background:#FDF1F1}
.center{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;text-align:center;padding:0 30px}
.escore{width:120px;height:120px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#B9E89B,var(--s3) 70%,#57B83E);
display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;box-shadow:0 14px 30px rgba(126,217,87,.45)}
.eland2{display:flex;flex-direction:column;height:100%}
.etop{flex:1;display:flex;min-height:0}
.esceneL{width:65%;position:relative;overflow:hidden;flex:0 0 auto}
.esceneL>img{width:100%;height:100%;object-fit:cover;display:block}
.echar{position:absolute;left:4px;bottom:0;height:84%;z-index:2;filter:drop-shadow(0 4px 10px rgba(0,0,0,.3))}
.ewordR{flex:1;background:var(--bg);border-left:1px solid var(--line);display:flex;flex-direction:column;
align-items:center;justify-content:center;gap:3px;padding:8px}
.esub{height:40px;flex:0 0 auto;display:flex;align-items:center;justify-content:center;background:#171D33;
color:#fff;font-size:13px;letter-spacing:1px}
.esub b{color:#FFD873;font-size:16px;padding:0 2px}
.ectrl{height:54px;flex:0 0 auto;display:flex;align-items:center;justify-content:center;gap:20px;background:#1D2646}
.ebtn{width:36px;height:36px;border-radius:50%;background:#fff;border:1px solid var(--line);display:flex;
align-items:center;justify-content:center;color:var(--ink);box-shadow:0 4px 10px rgba(232,201,160,.4)}
.ebtn .ic{width:16px;height:16px}
.ebtn.main{width:44px;height:44px;background:radial-gradient(circle at 35% 30%,#FFB067,var(--primary));color:#fff;
border:none;box-shadow:0 6px 14px rgba(255,140,66,.5)}
.ebtn.main .ic{width:20px;height:20px}
.footer{max-width:1240px;margin:50px auto 0;text-align:center;color:#8a7f6d;font-size:12px;line-height:1.9}
"""

def _sym(id, body, fill=True):
    kind = 'fill="currentColor"' if fill else 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'
    return f'<symbol id="{id}" viewBox="0 0 24 24" {kind}>{body}</symbol>'

SPRITE = '<svg width="0" height="0" style="position:absolute">' + "".join([
    _sym("i-book", '<path d="M4 5a2 2 0 0 1 2-2h7v16H6a2 2 0 0 0-2 2z"/><path d="M20 5a2 2 0 0 0-2-2h-3v16h3a2 2 0 0 1 2 2z"/>', False),
    _sym("i-music", '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>', False),
    _sym("i-sprout", '<path d="M12 22c0-6 0-8-4-10a4 4 0 0 1 8 0c0 1-.5 2-1 2 4 1 4 5 4 8z"/>', False),
    _sym("i-family", '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="7" r="2.5"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5M15 20c0-2 1-3.5 3-3.5s3 1.5 3 3.5"/>', False),
    _sym("i-search", '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/>', False),
    _sym("i-play", '<path d="M8 5v14l11-7z"/>'),
    _sym("i-pause", '<path d="M9 7h3v10H9zM15 7h3v10h-3z"/>'),
    _sym("i-prev", '<path d="M18 6v12l-9-6zM7 6h3v12H7z"/>'),
    _sym("i-next", '<path d="M6 6v12l9-6zM17 6h3v12h-3z"/>'),
    _sym("i-heart", '<path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 11c0 5.5-7 10-7 10z"/>', False),
    _sym("i-share", '<path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M16 6l-4-4-4 4M12 2v13"/>', False),
    _sym("i-timer", '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/>', False),
    _sym("i-list", '<path d="M4 6h16M4 12h16M4 18h10"/>', False),
    _sym("i-back", '<path d="M15 18l-6-6 6-6"/>', False),
    _sym("i-down", '<path d="M6 9l6 6 6-6"/>', False),
    _sym("i-dots", '<circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/>'),
    _sym("i-moon", '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>', False),
    _sym("i-star", '<path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8-6.1-3.4-6.1 3.4 1.4-6.8L2.2 9.1l6.9-.8z"/>', False),
    _sym("i-check", '<path d="M20 6L9 17l-5-5"/>', False),
    _sym("i-crown", '<path d="M3 8l4 4 5-6 5 6 4-4v9H3z"/><path d="M3 19h18"/>', False),
    _sym("i-gear", '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.6 1.6 0 0 0-1.82-.33 1.6 1.6 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.6 1.6 0 0 0-1-1.51 1.6 1.6 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.6 1.6 0 0 0 4.6 15a1.6 1.6 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.6 1.6 0 0 0 1.51-1 1.6 1.6 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.6 1.6 0 0 0 9.92 4.6a1.6 1.6 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.6 1.6 0 0 0 1 1.51 1.6 1.6 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.6 1.6 0 0 0-.33 1.82 1.6 1.6 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.6 1.6 0 0 0-1.51 1z"/>', False),
    _sym("i-clock", '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>', False),
    _sym("i-refresh", '<path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6"/>', False),
    _sym("i-vol", '<path d="M11 5L6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>', False),
]) + "</svg>"
# ---------- helpers ----------
def ic(name, cls="ic"):
    return f'<svg class="{cls}"><use href="#{name}"/></svg>'

def tabbar(on):
    items = [("story", "i-book", "故事"), ("song", "i-music", "歌曲"), ("growth", "i-sprout", "成长"), ("parent", "i-family", "家长")]
    tbs = "".join(f'<div class="tb{" on" if k == on else ""}">{ic(i)}<span>{t}</span></div>' for k, i, t in items)
    return f'<div class="tabbar">{tbs}</div>'

def phone(cid, cname, inner, cls="", tab=None, wide=False):
    return (f'<div class="item{" wide" if wide else ""}"><div class="phone{cls}{" land" if wide else ""}">'
            f'<div class="sb"><span>9:41</span><span class="dots">📶 🔋</span></div>'
            f'<div class="scr">{inner}{tabbar(tab) if tab else ""}</div></div>'
            f'<div class="cap"><span class="tag">{cid}</span><b>{cname}</b></div></div>')

def nav(title, right=""):
    return f'<div class="nav">{ic("i-back")}<span class="ti">{title}</span>{right or "<span class=sp></span>"}</div>'

def row(name, ds, cover=None, bar=None, rt="›", play=False):
    left = (f'<span class="cvr crop"><img src="{cover}"></span>' if cover
            else f'<span class="barl" style="background:{bar}"></span>' if bar else "")
    right = f'<span class="cp">{ic("i-play")}</span>' if play else f'<span class="rt">{rt}</span>'
    return f'<div class="row">{left}<div class="gr"><div class="nm">{name}</div><div class="ds">{ds}</div></div>{right}</div>'

def chrow(num, name, dur):
    return (f'<div class="row"><span class="cvr" style="display:flex;align-items:center;justify-content:center;'
            f'background:linear-gradient(135deg,#FFF3E7,#FFE8D2);color:var(--primary-d);font-weight:800;font-size:15px">{num}</span>'
            f'<div class="gr"><div class="nm">{name}</div><div class="ds">{dur}</div></div><span class="cp">{ic("i-play")}</span></div>')

def tile(name, count, cover):
    return (f'<div class="tile crop"><img src="{cover}"><div class="shade"></div>'
            f'<div class="tt"><div class="a">{name}</div><div class="b">{count}</div></div></div>')

def scard(name, lv, mins, cover):
    return (f'<div class="scard"><div class="cvr crop"><img src="{cover}"></div>'
            f'<div class="nm">{name}</div><div class="ds"><span class="lvb">{lv}</span>{mins}</div></div>')

def mini(t, s, cover):
    return (f'<div class="mini"><span class="cvr crop"><img src="{cover}"></span>'
            f'<div class="gr"><div class="t">{t}</div><div class="s">{s}</div></div><span class="mp">{ic("i-pause")}</span></div>')

# ---------- covers ----------
CAO = "上下五千年/E1成语故事/草船借箭/草船借箭.webp"
HE = "上下五千年/E1成语故事/一丘之貉/一丘之貉.webp"
HML = "上下五千年/E3历史故事/花木兰/花木兰.webp"
WQN = "上下五千年/上下五千年.webp"
PG = "品格养成/品格养成.webp"
QX = "情绪疗愈/情绪疗愈.webp"
SH = "生活认知/生活认知.webp"
ZR = "自然科学/自然科学.webp"
SC = "诗词天地/诗词天地.webp"
MX = "蒙学经典/蒙学经典.webp"
SONG = "瞎编的歌曲/瞎编的歌曲.webp"
LULL = "瞎编的歌曲/摇篮曲/摇篮曲.webp"
TH = "瞎编的歌曲/童话故事/童话故事.webp"
DW = "瞎编的歌曲/动物世界/动物世界.webp"
SHW = "瞎编的歌曲/神话故事/神话故事.webp"
SJM = "双界之门/双界之门.webp"
NIGHT = "品格养成/A5礼貌/睡前对星星说晚安月亮/睡前对星星说晚安月亮.webp"
LION = "情绪疗愈/H2嫉妒/小狮子跑得比我快/小狮子跑得比我快.webp"
Y1 = "品格养成/A1勇敢/上台讲故事时声音发抖却坚持讲完/上台讲故事时声音发抖却坚持讲完.webp"
Y2 = "品格养成/A1勇敢/第一次自己关灯睡觉，黑暗里抱紧小熊/第一次自己关灯睡觉，黑暗里抱紧小熊.webp"
Y3 = "品格养成/A1勇敢/学骑自行车摔倒后爬起来再骑/学骑自行车摔倒后爬起来再骑.webp"
Y4 = "品格养成/A1勇敢/黑乎乎的房间里有小夜灯我不怕/黑乎乎的房间里有小夜灯我不怕.webp"
ECLIPSE = "自然科学/C5天文/日食是月亮挡住了太阳/日食是月亮挡住了太阳.webp"

# ---------- 故事 Tab ----------
S01 = phone("S-01", "故事首页 · 日", tab="story", inner=f'''
<div class="scroll">
<div class="greet"><div class="avatar"><img src="{MASCOT}"></div>
<div><div class="hi">晚上好，小听众 🌙</div><div class="big serif">今天想听什么故事呀？</div></div>
<div class="sbtn">{ic("i-search")}</div></div>
<div class="hero crop"><img src="{CAO}"><div class="shade"></div>
<div class="inner"><span class="htag">🌟 今日推荐</span><h3 class="serif">草船借箭</h3>
<div class="meta">上下五千年 · L5 · 15分钟</div></div>
<div class="hplay">{ic("i-play")}</div></div>
<div class="dots-i"><i class="on"></i><i></i><i></i></div>
<div class="sec-h"><span class="t">继续听</span><span class="m">全部 ›</span></div>
<div class="cont"><div class="cvr crop"><img src="{HE}"></div>
<div class="gr"><div class="nm">一丘之貉</div><div class="ds">上下五千年 · 已播 42%</div><div class="bar"><i></i></div></div>
<div class="cp">{ic("i-play")}</div></div>
<div class="sec-h"><span class="t">热门故事</span><span class="m">榜单 ›</span></div>
<div class="hscroll">{scard("花木兰", "L6", "14分钟", HML)}{scard("小狮子跑得比我快", "L3", "6分钟", LION)}{scard("草船借箭", "L5", "15分钟", CAO)}</div>
<div class="sec-h"><span class="t">故事学科</span><span class="m">全部 ›</span></div>
<div class="sgrid">{tile("品格养成", "1,245 个故事", PG)}{tile("情绪疗愈", "980 个故事", QX)}{tile("生活认知", "1,145 个故事", SH)}{tile("自然科学", "870 个故事", ZR)}</div>
</div>''')

S02 = phone("S-02", "学科详情页 + 迷你播放栏", tab="story", inner=f'''
<div class="scroll">
{nav("品格养成", ic("i-search"))}
<div class="sbhead crop"><img src="{PG}"><div class="shade"></div>
<div class="inner"><span class="htag">品格养成</span><h3 class="serif">勇敢 · 诚实 · 感恩</h3>
<div class="meta">9 个分类 · 1,245 个故事</div></div></div>
<div style="height:16px"></div>
{row("勇敢", "173 个故事", bar="#FF8E9E")}
{row("诚实", "142 个故事", bar="#FFB067")}
{row("感恩", "128 个故事", bar="#7FC96A")}
{row("分享", "156 个故事", bar="#3FC5BC")}
{row("坚持", "134 个故事", bar="#B8A9E8")}
</div>{mini("一丘之貉", "上下五千年 · L6", HE)}''')
S03 = phone("S-03", "故事列表页", tab="story", inner=f'''
<div class="scroll">
{nav("勇敢", '<span style="font-size:12px;color:var(--primary);font-weight:800">换一换 ↻</span>')}
<div class="sec-h" style="margin-top:2px"><span class="t">✨ 为你推荐</span><span class="m">173 个故事</span></div>
{row("上台讲故事时声音发抖却坚持讲完", '<span class=lvb>L4</span> 8分钟', cover=Y1, play=True)}
{row("第一次自己关灯睡觉，黑暗里抱紧小熊", '<span class=lvb>L3</span> 6分钟', cover=Y2, play=True)}
{row("学骑自行车摔倒后爬起来再骑", '<span class=lvb>L3</span> 7分钟', cover=Y3, play=True)}
{row("黑乎乎的房间里有小夜灯我不怕", '<span class=lvb>L4</span> 7分钟', cover=Y4, play=True)}
{row("花木兰", '<span class=lvb>L6</span> 14分钟', cover=HML, play=True)}
</div>''')

S04 = phone("S-04", "章回作品章节列表", tab="story", inner=f'''
<div class="scroll">
{nav("三字经")}
<div class="sbhead crop" style="height:120px"><img src="{MX}"><div class="shade"></div>
<div class="inner"><span class="htag">章回作品 · 84 章</span><h3 class="serif">三字经</h3>
<div class="meta">传统启蒙经典 · 三字一句</div></div></div>
<div style="margin:14px 16px 4px"><div class="btn">{ic("i-play")} 从第 1 章开始听</div></div>
<div class="sec-h"><span class="t">章节列表</span><span class="m">连续播放 ✓</span></div>
{chrow("01", "人之初，性本善", "12 秒")}
{chrow("02", "性相近，习相远", "11 秒")}
{chrow("03", "苟不教，性乃迁", "13 秒")}
{chrow("04", "教之道，贵以专", "12 秒")}
</div>''')

S05 = phone("S-05", "混合型页", tab="story", inner=f'''
<div class="scroll">
{nav("历史故事")}
<div class="sec-h" style="margin-top:4px"><span class="t">📜 章回作品</span><span class="m">更多 ›</span></div>
{row("三国演义", "120 章", cover=WQN)}
{row("水浒传", "108 章", cover=WQN)}
<div class="sec-h"><span class="t">📖 独立故事</span><span class="m">换一换 ↻</span></div>
{row("花木兰", '<span class=lvb>L6</span> 14分钟', cover=HML, play=True)}
{row("草船借箭", '<span class=lvb>L5</span> 15分钟', cover=CAO, play=True)}
<div class="sec-h"><span class="t">🗂 合集</span><span class="m">更多 ›</span></div>
{row("其他历史故事", "146 个故事", bar="#FFB067")}
</div>''')

S06 = phone("S-06", "多层分类页", tab="story", inner=f'''
<div class="scroll">
{nav("双界之门")}
<div class="sbhead crop"><img src="{SJM}"><div class="shade"></div>
<div class="inner"><span class="htag">多层分类</span><h3 class="serif">双界之门</h3>
<div class="meta">奇幻世界 · 选择一个世界进入</div></div></div>
<div style="height:16px"></div>
{row("东方神话", "168 个故事", bar="#B8A9E8")}
{row("西方童话", "145 个故事", bar="#6BCBFF")}
{row("科幻未来", "92 个故事", bar="#3FC5BC")}
{row("奇幻冒险", "130 个故事", bar="#FF8E9E")}
</div>''')
# ---------- 播放器与睡前 ----------
PL01 = phone("PL-01", "故事播放器 · 故事灯", cls=" dk", inner=f'''
<div class="pbg"><img src="{HE}"></div>
<div class="pscr">
<div class="pnav">{ic("i-down")}<span class="ti">正在播放 · 故事灯</span>{ic("i-dots")}</div>
<div class="lampcov crop"><img src="{HE}"></div>
<div class="ptitle serif">一丘之貉</div>
<div class="psub">上下五千年 · L6 · 9分钟</div>
<div class="pprog"><i></i><b></b></div>
<div class="ptime"><span>02:15</span><span>09:08</span></div>
<div class="pctrls">
<div class="pbtn">{ic("i-prev")}</div>
<div class="pbtn main">{ic("i-pause")}</div>
<div class="pbtn">{ic("i-next")}</div>
</div>
<div class="pfns">
<div>{ic("i-heart")}收藏</div><div>{ic("i-share")}分享</div><div>{ic("i-timer")}定时</div><div>{ic("i-list")}列表</div>
</div>
<div class="pind"></div>
</div>''')

N01 = phone("N-01", "睡前模式 · 绘本夜灯", cls=" dk", tab="story", inner=f'''
<div class="nmoon"></div>
<span class="nstar" style="top:52px;left:44px">✦</span>
<span class="nstar" style="top:96px;left:110px;font-size:8px;animation-delay:.6s">✦</span>
<span class="nstar" style="top:38px;left:180px;font-size:9px;animation-delay:1.2s">✦</span>
<div class="scroll" style="position:relative;z-index:2">
<div style="padding:10px 20px 0">
<div style="font-size:12px;opacity:.7;font-weight:700">晚安，小明 🌙</div>
<div class="serif" style="font-size:20px;font-weight:800;margin-top:3px">故事灯已点亮</div>
</div>
<div class="ncard crop"><img src="{NIGHT}"><div class="shade"></div>
<div class="inner" style="position:absolute;left:15px;bottom:12px;z-index:3;color:#fff">
<span class="htag">睡前故事</span>
<div class="serif" style="font-size:18px;font-weight:800;margin-top:7px;text-shadow:0 2px 8px rgba(0,0,0,.4)">睡前对星星说晚安</div>
</div></div>
<div class="sec-h" style="margin:16px 20px 10px"><span class="t" style="color:#E8ECFF">今晚的晚安曲</span><span class="m" style="color:#FFD873">换一批 ›</span></div>
<div class="nrow"><span class="cvr crop"><img src="{Y4}"></span><div class="gr"><div class="nm">小夜灯我不怕</div><div class="ds">品格养成 · 7分钟</div></div>{ic("i-play")}</div>
<div class="nrow"><span class="cvr crop"><img src="{LULL}"></span><div class="gr"><div class="nm">月亮摇篮曲</div><div class="ds">摇篮曲 · 5分钟</div></div>{ic("i-play")}</div>
<div class="nrow"><span class="cvr crop"><img src="{Y2}"></span><div class="gr"><div class="nm">黑暗里抱紧小熊</div><div class="ds">品格养成 · 6分钟</div></div>{ic("i-play")}</div>
<div class="ncta">{ic("i-moon")} 开始睡前时光 · 30分钟后自动关闭</div>
</div>''')
CSS += r"""
.light .pbtn{background:#fff;color:var(--ink);border:1px solid var(--line);box-shadow:0 6px 16px rgba(232,201,160,.4)}
.light .pbtn.main{background:radial-gradient(circle at 35% 30%,#7EDCD4,var(--blue) 70%,#25A39B);color:#fff;border:none;
box-shadow:0 12px 28px rgba(63,197,188,.5)}
.light .pprog{background:var(--line)}
.light .pprog i{background:linear-gradient(90deg,#9FE0DB,var(--blue))}
.light .pprog b{background:var(--blue);box-shadow:0 0 0 5px rgba(63,197,188,.18)}
.light .ptime{color:var(--sub)}
.light .pfns{color:var(--sub)}
.scov{margin:10px auto 0;width:158px;height:158px;border-radius:26px;box-shadow:0 16px 34px rgba(63,197,188,.3)}
"""

PL02 = phone("PL-02", "歌曲播放器 · 歌词", cls=" light", tab="song", inner=f'''
<div class="scroll">
{nav("月亮摇篮曲", ic("i-dots"))}
<div class="scov crop"><img src="{LULL}"></div>
<div style="text-align:center;font-size:19px;font-weight:800;margin-top:14px" class="serif">月亮摇篮曲</div>
<div style="text-align:center;font-size:12px;color:var(--sub);margin-top:4px">摇篮曲 · 中文</div>
<div class="lyr">月亮爬上小窗台<br>星星眨眼排队来<br><span class="on">宝宝闭上小眼睛</span><br>梦里花开一片片</div>
<div class="pprog"><i style="width:58%"></i><b style="left:58%"></b></div>
<div class="ptime"><span>01:44</span><span>03:00</span></div>
<div class="pctrls" style="margin:16px 0 8px">
<div class="pbtn">{ic("i-prev")}</div>
<div class="pbtn main">{ic("i-pause")}</div>
<div class="pbtn">{ic("i-next")}</div>
</div>
<div class="pfns">
<div>{ic("i-heart")}收藏</div><div>{ic("i-refresh")}循环</div><div>{ic("i-timer")}定时</div><div>{ic("i-list")}列表</div>
</div>
</div>''')

SCENE = "../../scence/书房/书房_1.webp"
KUKU = "../../characters_transparent/酷酷/point/happy/酷酷_point_happy_02.webp"

PL03 = phone("PL-03", "教学播放器 · 横屏", cls=" dk", wide=True, inner=f'''
<div class="eland2">
<div class="etop">
<div class="esceneL"><img src="{SCENE}"><img class="echar" src="{KUKU}"></div>
<div class="ewordR">
<span style="font-size:10px;font-weight:800;color:#3E7C2B;background:#EAF6E4;padding:3px 10px;border-radius:9px">今日生字</span>
<div class="serif" style="font-size:56px;font-weight:800;line-height:1.1;color:var(--ink)">月</div>
<div style="font-size:15px;color:var(--sub)">yuè</div>
<div style="font-size:12px;color:var(--sub)">月亮 · 月光 · 明月</div>
</div>
</div>
<div class="esub">这是一个【<b>月</b>】亮的夜晚</div>
<div class="ectrl">
<div class="ebtn">{ic("i-prev")}</div>
<div class="ebtn main">{ic("i-play")}</div>
<div class="ebtn">{ic("i-next")}</div>
<div class="ebtn">{ic("i-refresh")}</div>
</div>
</div>''')
# ---------- 歌曲 Tab ----------
M01 = phone("M-01", "歌曲首页", tab="song", inner=f'''
<div class="scroll">
<div class="greet"><div class="avatar" style="box-shadow:0 4px 12px rgba(63,197,188,.35)"><img src="{LULL}"></div>
<div><div class="hi">一起唱歌吧 🎵</div><div class="big serif">酷酷音乐厅</div></div>
<div class="sbtn">{ic("i-search")}</div></div>
<div class="hero crop" style="box-shadow:0 16px 32px rgba(40,120,115,.3)"><img src="{SONG}"><div class="shade"></div>
<div class="inner"><span class="htag">🎤 合唱榜 TOP1</span><h3 class="serif">两只老虎</h3>
<div class="meta">经典儿歌 · 1分12秒</div></div>
<div class="hplay" style="background:radial-gradient(circle at 35% 30%,#7EDCD4,var(--blue) 70%,#25A39B);box-shadow:0 8px 20px rgba(63,197,188,.55)">{ic("i-play")}</div></div>
<div class="dots-i"><i class="on" style="background:var(--blue)"></i><i></i><i></i></div>
<div class="sec-h"><span class="t">歌曲分类</span><span class="m">全部 ›</span></div>
<div class="sgrid">{tile("摇篮曲", "86 首", LULL)}{tile("童话故事", "124 首", TH)}{tile("动物世界", "98 首", DW)}{tile("神话故事", "76 首", SHW)}</div>
<div class="sec-h"><span class="t">最近播放</span><span class="m">更多 ›</span></div>
{row("月亮摇篮曲", "摇篮曲 · 3分00秒", cover=LULL, play=True)}
</div>''')

M02 = phone("M-02", "歌曲多层分类", tab="song", inner=f'''
<div class="scroll">
{nav("儿歌")}
<div class="sbhead crop" style="box-shadow:0 12px 26px rgba(40,120,115,.28)"><img src="{TH}"><div class="shade"></div>
<div class="inner"><span class="htag">歌曲分类</span><h3 class="serif">唱唱儿歌</h3>
<div class="meta">4 个子分类 · 356 首歌</div></div></div>
<div style="height:16px"></div>
{row("中文儿歌", "186 首", bar="#3FC5BC")}
{row("英文儿歌", "94 首", bar="#6BCBFF")}
{row("摇篮曲", "86 首", bar="#B8A9E8")}
{row("纯音乐", "42 首", bar="#7FC96A")}
</div>''')

M03 = phone("M-03", "歌曲列表页", tab="song", inner=f'''
<div class="scroll">
{nav("摇篮曲", ic("i-search"))}
<div class="sec-h" style="margin-top:2px"><span class="t">全部歌曲</span><span class="m">86 首</span></div>
{row("月亮摇篮曲", "3分00秒", cover=LULL, play=True)}
{row("睡吧睡吧小宝贝", "2分46秒", cover=LULL, play=True)}
{row("星星点灯", "3分21秒", cover=SHW, play=True)}
{row("森林晚安曲", "4分05秒", cover=DW, play=True)}
{row("云朵上的梦", "3分33秒", cover=TH, play=True)}
{row("萤火虫之舞", "2分58秒", cover=DW, play=True)}
</div>{mini("月亮摇篮曲", "摇篮曲 · 中文", LULL)}''')
# ---------- 成长 Tab ----------
def badge(cover, name, stage, ring=""):
    inner = f'<img src="{cover}">' if cover else "?"
    return (f'<div class="badge"><div class="ring {ring}">{inner}</div>'
            f'<div class="bn">{name}</div><div class="bs">{stage}</div></div>')

G01 = phone("G-01", "成长首页 · 朋友收集册", tab="growth", inner=f'''
<div class="scroll">
<div style="text-align:center;padding:10px 20px 0">
<div style="font-size:11px;letter-spacing:3px;color:var(--sub);font-weight:800">FRIENDS COLLECTION</div>
<div class="serif" style="font-size:20px;font-weight:800;margin-top:4px">我的朋友收集册</div>
</div>
<div class="gcard" style="margin-top:12px">
<div style="font-size:13px;font-weight:800;margin-bottom:2px">已遇见 <span style="color:var(--primary)">18</span> 位朋友 · 其中 <span style="color:#57B83E">5</span> 位成了好伙伴</div>
<div class="gbar"><i style="width:20%;background:var(--s0)"></i><i style="width:35%;background:var(--s1)"></i><i style="width:25%;background:var(--s2)"></i><i style="width:20%;background:var(--s3)"></i></div>
<div class="glegend"><span><b style="background:var(--s0)"></b>未遇见 32</span><span><b style="background:var(--s1)"></b>已相识 9</span><span><b style="background:var(--s2)"></b>好朋友 4</span><span><b style="background:var(--s3)"></b>好伙伴 5</span></div>
</div>
<div class="sec-h"><span class="t">三国 · 朋友架</span><span class="m">12/20 位 ›</span></div>
<div class="bgrid" style="padding-bottom:16px">
{badge(HML, "花木兰", "好伙伴 · 综合挑战通过", "g3")}
{badge(HE, "阿貉", "好朋友 · 挑战通过", "g2")}
{badge(LION, "小狮子", "已相识 · 学习 3 次")}
{badge(CAO, "诸葛亮", "好伙伴 · 陪伴 21 天", "g3")}
{badge(Y4, "小夜灯", "已相识 · 学习 1 次")}
{badge(None, "神秘朋友", "再听 1 个故事遇见", "no")}
</div>
</div>''')

G02 = phone("G-02", "课程列表页", tab="growth", inner=f'''
<div class="scroll">
{nav("识字")}
<div class="gcard" style="margin-top:2px">
<div style="font-size:13px;font-weight:800;margin-bottom:2px">156 个字 · 四级朋友进度</div>
<div class="gbar"><i style="width:25%;background:var(--s0)"></i><i style="width:30%;background:var(--s1)"></i><i style="width:25%;background:var(--s2)"></i><i style="width:20%;background:var(--s3)"></i></div>
</div>
<div style="padding:0 16px 6px"><span class="chip on">全部</span><span class="chip">待巩固</span><span class="chip">未遇见</span></div>
{row("大", 'dà · <span style="color:#57B83E;font-weight:800">好伙伴</span>', bar="#7ED957")}
{row("月", 'yuè · <span style="color:#0A8FBF;font-weight:800">好朋友</span>', bar="#6BCBFF")}
{row("山", 'shān · <span style="color:#A67C00;font-weight:800">已相识</span>', bar="#FFD93D")}
{row("水", 'shuǐ · <span style="color:#A67C00;font-weight:800">已相识</span>', bar="#FFD93D")}
{row("火", 'huǒ · <span style="color:#8B8D9E;font-weight:800">未遇见</span>', bar="#D1D5DB")}
</div>''')

G03 = phone("G-03", "课程详情页", tab="growth", inner=f'''
<div class="scroll">
{nav("课程详情")}
<div style="text-align:center;padding:8px 0 4px">
<div class="serif" style="font-size:76px;font-weight:800;line-height:1.1">大</div>
<div style="font-size:16px;color:var(--sub);margin-top:4px">dà · 大小的大</div>
<div style="display:inline-block;margin-top:10px;background:var(--s3);color:#1A5C1A;font-size:11px;font-weight:800;padding:4px 14px;border-radius:12px">🟢 好伙伴</div>
</div>
<div class="sec-h"><span class="t">学习路径</span><span class="m">已完成 3/3</span></div>
{row("学习 1 · 听故事认字", "《一丘之貉》· 已完成 ✓", cover=HE)}
{row("学习 2 · 跟读与组词", "VIP · 已完成 ✓", cover=Y1)}
{row("学习 3 · 场景运用", "VIP · 已完成 ✓", cover=Y2)}
<div style="margin:10px 16px"><div class="btn" style="background:radial-gradient(circle at 35% 25%,#B9E89B,var(--s3) 70%,#57B83E);box-shadow:0 8px 20px rgba(126,217,87,.45)">再挑战一次 · 巩固友谊</div></div>
</div>''')
G04 = phone("G-04", "习题界面 · 听音选字", tab="growth", inner=f'''
<div class="scroll">
{nav("普通挑战", '<span style="font-size:12px;color:var(--sub);font-weight:800">3/10</span>')}
<div class="pprog" style="background:var(--line);margin:4px 20px 0"><i style="width:30%;background:linear-gradient(90deg,#B9E89B,var(--s3))"></i></div>
<div style="text-align:center;padding:26px 0 8px">
<div style="font-size:13px;color:var(--sub);font-weight:700">听一听，选出你听到的字</div>
<div class="cp" style="width:84px;height:84px;margin:18px auto 0;background:radial-gradient(circle at 35% 30%,#B9E89B,var(--s3) 70%,#57B83E);box-shadow:0 12px 28px rgba(126,217,87,.5)">
<svg class="ic" style="width:36px;height:36px"><use href="#i-vol"/></svg></div>
<div style="font-size:12px;color:var(--sub);margin-top:12px">点击再听一遍</div>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:13px;padding:16px 20px">
<div class="opt serif">大</div><div class="opt serif sel">月</div><div class="opt serif">山</div><div class="opt serif">水</div>
</div>
<div style="margin:2px 16px"><div class="btn" style="background:radial-gradient(circle at 35% 25%,#B9E89B,var(--s3) 70%,#57B83E);box-shadow:0 8px 20px rgba(126,217,87,.45)">确认答案</div></div>
</div>''')

G06 = phone("G-06", "挑战结果页", tab="growth", inner=f'''
<div class="scroll">
<div style="text-align:center;padding:22px 20px 0">
<div class="escore" style="margin:0 auto"><div style="font-size:34px;font-weight:800">90</div><div style="font-size:11px;opacity:.9">分</div></div>
<div class="serif" style="font-size:21px;font-weight:800;margin-top:16px">挑战通过，真厉害！</div>
<div style="font-size:12.5px;color:var(--sub);margin-top:6px">「月」从好朋友升级为好伙伴啦 🟢</div>
</div>
<div class="gcard" style="margin-top:16px;display:flex;align-items:center;gap:11px">
<div class="avatar" style="width:44px;height:44px"><img src="{MASCOT}"></div>
<div style="font-size:12.5px;line-height:1.7;color:#6b6255">酷酷：你把「月」字记得牢牢的，<br>今晚的故事灯为你多亮一会儿！</div>
</div>
<div class="sec-h"><span class="t">答题回顾</span><span class="m">9/10 正确</span></div>
{row("第 3 题 · 听音选字", '正确答案「月」· 你选了「月」✓', bar="#7ED957")}
{row("第 7 题 · 组词挑战", '正确答案「月光」· 再练练 ✗', bar="#F0B4B4")}
<div style="display:flex;gap:10px;margin:8px 16px">
<div class="btn ghost" style="flex:1">回去复习</div>
<div class="btn" style="flex:1;background:radial-gradient(circle at 35% 25%,#B9E89B,var(--s3) 70%,#57B83E);box-shadow:0 8px 20px rgba(126,217,87,.45)">再挑战一次</div>
</div>
</div>''')

# ---------- 家长与通用 ----------
C01 = phone("C-01", "家长中心 · 轻奢", tab="parent", inner=f'''
<div class="scroll">
{nav("家长中心")}
<div class="kid">
<div class="avatar"><img src="{MASCOT}"></div>
<div style="flex:1"><div style="font-size:15px;font-weight:800">小明</div>
<div style="font-size:11.5px;color:var(--sub);margin-top:2px">7岁 · L4 · 加入 128 天</div></div>
<span style="font-size:12px;color:var(--primary);font-weight:800">管理 ›</span></div>
<div class="grow3">
<div class="gstat"><div class="v" style="color:var(--primary)">156</div><div class="k">识字(字)</div></div>
<div class="gstat"><div class="v" style="color:var(--blue)">89</div><div class="k">英语(词)</div></div>
<div class="gstat"><div class="v" style="color:var(--green)">12</div><div class="k">拼音(课)</div></div>
</div>
<div class="gcard">
<div style="font-size:13px;font-weight:800;margin-bottom:2px">🌱 成长进度 · 识字</div>
<div class="gbar"><i style="width:25%;background:var(--s0)"></i><i style="width:30%;background:var(--s1)"></i><i style="width:25%;background:var(--s2)"></i><i style="width:20%;background:var(--s3)"></i></div>
<div class="glegend"><span><b style="background:var(--s0)"></b>未遇见</span><span><b style="background:var(--s1)"></b>已相识</span><span><b style="background:var(--s2)"></b>好朋友</span><span><b style="background:var(--s3)"></b>好伙伴</span></div>
</div>
<div class="frow"><span class="fi" style="background:#FFF3E7">{ic("i-heart")}</span>收藏管理<span class="rt">128 个收藏 ›</span></div>
<div class="frow"><span class="fi" style="background:#E0F5F3">{ic("i-clock")}</span>播放历史<span class="rt">最近 100 条 ›</span></div>
<div class="frow"><span class="fi" style="background:#EDE7FA">{ic("i-timer")}</span>定时关闭<span class="rt">已设置 30 分钟 ›</span></div>
<div class="frow" style="background:linear-gradient(135deg,#FFF8E1,#FFEFC4);border:1px solid #FFE3A3">
<span class="fi" style="background:#FFE9A8">{ic("i-crown")}</span>鎏金故事书匣<span class="rt" style="color:#B8860B">升级解锁全部 ›</span></div>
<div class="frow"><span class="fi" style="background:#F0E6D8">{ic("i-gear")}</span>账号设置<span class="rt">›</span></div>
<div style="text-align:center;font-size:10.5px;color:var(--sub);padding:8px 0 12px">v4.0.0 · 用户协议 · 隐私政策</div>
</div>''')
C05 = phone("C-05", "搜索页", tab="story", inner=f'''
<div class="scroll">
<div style="display:flex;align-items:center;gap:10px;padding:8px 16px 4px">
<div style="flex:1;height:42px;background:#fff;border:2px solid var(--primary);border-radius:22px;display:flex;align-items:center;gap:8px;padding:0 16px;font-size:13.5px;color:var(--ink)">
{ic("i-search")}<span style="color:var(--sub)">草船</span></div>
<span style="font-size:13px;color:var(--sub);font-weight:700">取消</span></div>
<div class="sec-h"><span class="t">搜索历史</span><span class="m">清空</span></div>
<div style="padding:0 16px"><span class="chip">草船借箭</span><span class="chip">小狮子</span><span class="chip">摇篮曲</span><span class="chip">月亮</span></div>
<div class="sec-h"><span class="t">🔥 热门搜索</span><span class="m">换一批</span></div>
<div style="padding:0 16px"><span class="chip on">花木兰</span><span class="chip on">三字经</span><span class="chip">不怕黑</span><span class="chip">两只老虎</span><span class="chip">恐龙</span></div>
<div class="sec-h"><span class="t">搜索结果</span><span class="m">2 个相关</span></div>
{row("草船借箭", "上下五千年 · L5 · 15分钟", cover=CAO, play=True)}
{row("草船借箭大冒险", "双界之门 · L4 · 11分钟", cover=WQN, play=True)}
</div>''')

C06 = phone("C-06", "设置页", tab="parent", inner=f'''
<div class="scroll">
{nav("设置")}
<div class="sec-h" style="margin-top:2px"><span class="t">外观</span></div>
<div class="frow"><span class="fi" style="background:#FFF3E7">{ic("i-moon")}</span>主题模式
<span class="seg" style="max-width:150px"><span class="on">浅色</span><span>深色</span><span>跟随</span></span></div>
<div class="frow"><span class="fi" style="background:#EDE7FA">{ic("i-star")}</span>睡前模式
<span class="seg" style="max-width:150px"><span class="on">定时触发</span><span>手动</span></span></div>
<div class="sec-h"><span class="t">播放</span></div>
<div class="frow"><span class="fi" style="background:#E0F5F3">{ic("i-timer")}</span>定时关闭<span class="rt">30 分钟 ›</span></div>
<div class="frow"><span class="fi" style="background:#E5F6E0">{ic("i-refresh")}</span>复习间隔
<span class="seg" style="max-width:150px"><span>7天</span><span class="on">14天</span><span>30天</span></span></div>
<div class="sec-h"><span class="t">通用</span></div>
<div class="frow"><span class="fi" style="background:#F0E6D8">{ic("i-dots")}</span>清除缓存<span class="rt">236 MB ›</span></div>
<div class="frow"><span class="fi" style="background:#F0E6D8">{ic("i-gear")}</span>关于酷酷<span class="rt">v4.0.0 ›</span></div>
</div>''')

A01 = phone("A-01", "登录页", inner=f'''
<div class="login">
<div class="lmascot"><img src="{MASCOT}"></div>
<div class="serif" style="font-size:24px;font-weight:800;margin-top:18px;letter-spacing:2px">酷酷儿童故事</div>
<div style="font-size:12.5px;color:var(--sub);margin-top:8px;line-height:1.8">每晚八点，故事灯为你点亮<br>3,000+ 绘本故事 · 儿歌 · 学科启蒙</div>
<div style="width:100%;margin-top:26px;display:flex;flex-direction:column;gap:12px">
<div class="btn wx">{ic("i-check")} 微信一键登录</div>
<div class="btn ghost">手机号登录</div>
</div>
<div style="font-size:10.5px;color:var(--sub);margin-top:auto;padding-bottom:18px;line-height:1.7">登录即代表同意《用户协议》和《隐私政策》<br>儿童个人信息受严格保护</div>
</div>''')

A03 = phone("A-03", "会员中心 · 鎏金故事书匣", cls=" gold", inner=f'''
<div class="scroll">
<div style="text-align:center;padding:14px 20px 0">
<div style="font-size:10px;letter-spacing:4px;opacity:.6;font-weight:800">STORY PREMIUM</div>
<div class="serif" style="font-size:22px;font-weight:800;margin-top:5px;color:#FFE9A8;letter-spacing:2px">鎏金故事书匣</div>
<div style="font-size:11.5px;opacity:.65;margin-top:6px">全馆 800+ 故事 · 每晚新故事 · 无广告纯净</div>
</div>
<div style="margin:16px 16px 4px;background:linear-gradient(135deg,rgba(255,233,168,.14),rgba(255,201,60,.06));
border:1px solid rgba(255,201,60,.4);border-radius:20px;padding:14px;display:flex;align-items:center;gap:12px">
<div class="avatar" style="border-color:#FFE9A8;box-shadow:0 4px 12px rgba(255,201,60,.35)"><img src="{MASCOT}"></div>
<div style="flex:1"><div style="font-size:14px;font-weight:800">小明的专属书匣</div>
<div style="font-size:10.5px;opacity:.6;margin-top:3px">会员有效期至 2026-12-31</div></div>
{ic("i-crown")}</div>
<div class="goldrow">{ic("i-book")} 名著全集 · 三国/水浒/西游随意听</div>
<div class="goldrow">{ic("i-moon")} 哄睡专辑 · 睡前故事灯专属曲目</div>
<div class="goldrow">{ic("i-star")} 学习 2/3 解锁 · 跟读与场景运用</div>
<div class="sec-h" style="margin:14px 20px 10px"><span class="t" style="color:#F5E6C8">选择书匣</span><span class="m" style="color:#FFC93C">年省 ¥40</span></div>
<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;padding:0 16px">
<div class="plan"><div style="font-size:11px;font-weight:800">月度</div><div class="pr">¥9.9</div><div class="pd">每月</div></div>
<div class="plan"><div style="font-size:11px;font-weight:800">季度</div><div class="pr">¥26</div><div class="pd">¥8.7/月</div></div>
<div class="plan on"><div style="font-size:11px;font-weight:800">年度 ★最受欢迎</div><div class="pr">¥88</div><div class="pd">¥7.3/月</div></div>
</div>
<div style="margin:16px 16px 0"><div class="btn" style="background:linear-gradient(135deg,#FFE9A8,#FFC93C);color:#5A3D00;box-shadow:0 10px 24px rgba(255,201,60,.4)">开启鎏金书匣</div></div>
<div style="text-align:center;font-size:10px;opacity:.5;padding:10px 0 14px">到期不自动续费 · 随时可取消</div>
</div>''')

U01 = phone("U", "通用状态页", tab="story", inner=f'''
<div class="scroll">
<div class="center" style="height:62%">
<div class="lmascot" style="width:110px;height:110px;opacity:.92"><img src="{MASCOT}"></div>
<div class="serif" style="font-size:17px;font-weight:800;margin-top:16px">没有找到相关内容</div>
<div style="font-size:12.5px;color:var(--sub);margin-top:8px">换个词试试？酷酷帮你再找一遍</div>
<div class="btn" style="width:180px;height:44px;margin-top:18px;font-size:13.5px">返回热门搜索</div>
</div>
<div style="padding:0 16px">
<div style="font-size:12px;font-weight:800;color:var(--sub);margin-bottom:8px">加载中 · 骨架屏</div>
<div class="row" style="box-shadow:none;border:1px solid var(--line)">
<span class="cvr" style="background:linear-gradient(90deg,#F0E6D8 25%,#E8DCC8 50%,#F0E6D8 75%)"></span>
<div class="gr"><div style="height:12px;border-radius:6px;background:#F0E6D8;width:60%"></div>
<div style="height:9px;border-radius:5px;background:#F4EBDC;width:40%;margin-top:7px"></div></div></div>
</div>
</div>''')

# ---------- 组装 ----------
HEAD = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<base href="../../production/illustrations/covers/generated/">
<title>酷酷儿童故事 — 定稿设计 v4（典藏绘本 · 日夜双主题 · 24屏）</title>
<style>{CSS}</style>
</head>
<body>"""

PAGEHEAD = """
<div class="page-head">
<h1>📖 酷酷儿童故事 — 定稿设计 v4</h1>
<p>典藏绘本骨架 · 故事灯播放器 · 日夜双主题 · 真实封面管线 · 朋友收集册 · 鎏金书匣 · 2026-07-22</p>
<span class="pill">品牌橙 #FF8C42 · 四级朋友色 · 中文衬线标题 · 全 SVG 图标</span>
</div>
<div class="note">
<b>定稿配方（融合 13 套方案之长）：</b>
① <b>典藏绘本骨架</b>：故事灯/书房/书匣叙事系统 + 中文衬线大标题（宋体系）；
② <b>日夜双主题</b>：白天暖橙奶油，睡前自动滑入深夜蓝（N-01），与定时关闭功能联动；
③ <b>真实封面</b>：全部封面取自 production 封面管线（cover_image_url），告别 emoji 占位；
④ <b>故事灯播放器</b>：圆形发光封面呼吸灯 + 封面氛围模糊铺底；
⑤ <b>朋友收集册</b>：四级朋友 → 徽章收集墙，未遇见为虚线剪影（零压力收集）；
⑥ <b>鎏金故事书匣</b>：会员页典藏化，家长区雾面轻奢（概念G）。
</div>"""

FOOTER = """
<div class="footer">
📖 定稿 v4 · 设计 Token 与 design-tokens.json 一致 · 封面路径与 10-索引与封面设计方案 对齐<br>
酷酷儿童故事 · 2026-07-22
</div>
</body>
</html>"""

GROUPS = [
    ("📖 故事 Tab（S-01 ~ S-06）", [S01, S02, S03, S04, S05, S06]),
    ("🎧 播放器与睡前（PL-01 ~ PL-03 · N-01）", [PL01, N01, PL02, PL03]),
    ("🎵 歌曲 Tab（M-01 ~ M-03）", [M01, M02, M03]),
    ("🌱 成长 Tab（G-01 ~ G-06）", [G01, G02, G03, G04, G06]),
    ("👪 家长 · 通用 · 商业化（C / A / U）", [C01, C05, C06, A01, A03, U01]),
]

def main():
    parts = [HEAD, SPRITE, PAGEHEAD]
    for title, screens in GROUPS:
        parts.append(f'<div class="group-title">{title}</div><div class="grid">' + "".join(screens) + "</div>")
    parts.append(FOOTER)
    html = "".join(parts)
    OUT.write_text(html, encoding="utf-8")
    import re
    base = (DIR / "../../production/illustrations/covers/generated").resolve()
    missing = [p for p in sorted(set(re.findall(r'src="([^"]+\.webp)"', html))) if not (base / p).exists()]
    print(f"OK -> {OUT}")
    n_screens = html.count('class="phone')
    print(f"screens: {n_screens}, size: {len(html)//1024}KB")
    print("missing covers:", missing or "无")

if __name__ == "__main__":
    main()
