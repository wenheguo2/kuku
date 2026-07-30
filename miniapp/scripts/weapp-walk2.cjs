/**
 * weapp-walk2.cjs — 第二轮无死角深度走查（补上一轮未覆盖交互）
 * 用法：node scripts/weapp-walk2.cjs a|b
 *  a: 故事深度(hero/作品页/连续播/章节/迷你栏展开/多层下钻/定时入口) + 搜索三范围/空态 + 歌曲深度(分页/循环播/上一首/取消收藏)
 *  b: 成长深度(英语宫格/学习挡/控制条/挑战答满→结果页/收集册stage下钻) + 家长深度(收藏页签/设置全控件/登录勾选/会员选档)
 * 原生弹窗(ActionSheet/showModal)不可自动化点击 → 只验入口存在，不触发。
 */
const automator = require('miniprogram-automator');
const MPmod = require('miniprogram-automator/out/MiniProgram');
(MPmod.default || MPmod).prototype.checkVersion = async () => {};
const path = require('path');
const fs = require('fs');
const PHASE = process.argv[2] || 'a';
const DIR = 'd:\\work\\work\\code\\testsuit\\公司\\工作区\\tmp\\测试截图\\weapp\\walk2';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = [];
const say = (s) => { console.log(s); log.push(s); };
let mini;
const shot = async (n) => { try { await mini.screenshot({ path: path.join(DIR, n + '.png') }); say('📷 ' + n); } catch (e) { say('📷❌ ' + n); } };
const step = async (n, fn) => { try { await fn(); say('✔ ' + n); } catch (e) { say('❌ ' + n + ': ' + String(e.message).slice(0, 120)); } };
const relaunch = async (u) => { try { await mini.reLaunch(u); } catch (e) { await mini.evaluate((x) => { wx.reLaunch({ url: x }); }, u); } await sleep(3000); };
const nav = async (u) => { try { await mini.navigateTo(u); } catch (e) { await mini.evaluate((x) => { wx.navigateTo({ url: x }); }, u); } await sleep(2500); };
const back = async () => { try { await mini.navigateBack(); } catch (e) {} await sleep(1800); };
const cur = async () => { try { const p = await mini.currentPage(); return p ? p.path : '(null)'; } catch (e) { return '(err)'; } };
const P = async () => mini.currentPage();
const tapSel = async (sel, idx = 0) => { const p = await P(); const els = await p.$$(sel); if (!els || els.length <= idx) throw new Error('未找到 ' + sel + '[' + idx + ']'); await els[idx].tap(); await sleep(1800); };
const tapTextIn = async (sel, kw) => { const p = await P(); const els = await p.$$(sel); for (const el of els) { const t = await el.text(); if (t && t.includes(kw)) { await el.tap(); await sleep(1800); return t; } } throw new Error('未找到含"' + kw + '"的 ' + sel); };

async function phaseA() {
  say('===== A1 故事深度 =====');
  await relaunch('/pages/story/index/index');
  await step('日间复位', async () => { const p = await P(); if (await p.$('.theme-dark')) { await tapSel('.sbtn', 0); } });

  await step('hero今日推荐→S-04章回作品页', async () => {
    await tapSel('.hero');
    say('  页: ' + await cur());
    await shot('r2s01-章回作品页');
  });
  await step('S-04 从第1章连续播放→PL-01', async () => {
    await tapTextIn('.btn-primary', '连续播放');
    await sleep(2500);
    say('  页: ' + await cur());
    await shot('r2s02-连续播放-播放器');
  });
  await step('PL-01 下滑收起→迷你栏→再展开', async () => {
    await tapSel('.pnav view', 0); // down 收起
    await sleep(2000);
    say('  收起后页: ' + await cur());
    await shot('r2s03-收起后迷你栏');
    await tapSel('.mini-fab');
    await sleep(2200);
    say('  展开后页: ' + await cur());
    await shot('r2s04-迷你栏展开');
    if ((await cur()).includes('player')) await back();
  });
  await step('S-04 章节目录点第2章(标题清洗)', async () => {
    if (!(await cur()).includes('story/work')) { await relaunch('/pages/story/index/index'); await tapSel('.hero'); }
    await tapSel('.list-row', 1);
    await sleep(2500);
    await shot('r2s05-第2章播放器');
    await back();
  });
  await step('PL-01 定时按钮→设置页', async () => {
    if (!(await cur()).includes('story/work')) throw new Error('不在作品页');
    await tapSel('.list-row', 0); await sleep(2500);
    await tapTextIn('.pfns .fn', '定时');
    say('  页: ' + await cur());
    await shot('r2s06-定时到设置页');
    await back(); await back(); await back();
  });
  await step('多层学科(神州之外)下钻', async () => {
    await nav('/pages/story/subject/index?subject=' + encodeURIComponent('神州之外'));
    await shot('r2s07-神州之外学科页');
    const p = await P();
    const rows = await p.$$('.list-row');
    const tiles = await p.$$('.tile');
    if (rows.length) await rows[0].tap(); else if (tiles.length) await tiles[0].tap();
    await sleep(2500);
    say('  下钻页: ' + await cur());
    await shot('r2s08-多层下钻列表');
    await back(); await back();
  });

  say('===== A2 搜索深度 =====');
  await step('搜索-空结果态', async () => {
    await nav('/pages/common/search/index?scope=story');
    const p = await P(); const inp = await p.$('input');
    await inp.input('zzz不存在的词'); await sleep(2000);
    await shot('r2s09-搜索空结果');
  });
  await step('搜索-西游→点结果跳转', async () => {
    const p = await P(); const inp = await p.$('input');
    await inp.input('西游'); await sleep(2000);
    await shot('r2s10-搜索西游');
    await tapSel('.list-row', 0);
    await sleep(2500);
    say('  跳转页: ' + await cur());
    await shot('r2s11-搜索结果跳转');
    await back(); await back();
  });
  await step('搜索-song范围', async () => {
    await nav('/pages/common/search/index?scope=song');
    const p = await P(); const inp = await p.$('input');
    await inp.input('生日'); await sleep(2000);
    await shot('r2s12-搜索歌曲范围');
    await back();
  });
  await step('搜索-growth范围', async () => {
    await nav('/pages/common/search/index?scope=growth');
    const p = await P(); const inp = await p.$('input');
    await inp.input('一'); await sleep(2000);
    await shot('r2s13-搜索成长范围');
    await back();
  });

  say('===== A3 歌曲深度 =====');
  await step('歌曲列表-再加载分页', async () => {
    await relaunch('/pages/song/list/index?path=' + encodeURIComponent('瞎编的歌曲/小孩儿/中文歌曲') + '&title=' + encodeURIComponent('中文歌曲'));
    const p = await P();
    const more = await p.$('.btn-ghost');
    if (!more) throw new Error('无再加载按钮(可能条目<50)');
    // ScrollView 内直接 tap（automator 可点不可见元素）
    await more.tap(); await sleep(2000);
    const rows = await (await P()).$$('.list-row');
    say('  加载后行数: ' + rows.length);
    await shot('r2s14-分页加载后');
  });
  await step('循环播放胶囊→整列表循环', async () => {
    await tapSel('.loop-pill');
    await sleep(3000);
    say('  页: ' + await cur());
    const p = await P();
    const chips = await p.$$('.chip');
    const texts = [];
    for (const c of chips) texts.push(await c.text());
    say('  chips: ' + texts.join('|'));
    await shot('r2s15-循环播放模式');
  });
  await step('PL-02 上一首+收藏两次(收藏↔取消)', async () => {
    if (!(await cur()).includes('song/player')) throw new Error('不在歌曲播放器');
    await tapSel('.cbtn', 0); // 上一首
    await sleep(2000);
    await tapTextIn('.chip', '收藏'); await sleep(1500);
    await shot('r2s16-收藏后');
    await tapTextIn('.chip', '已收藏'); await sleep(1500);
    await shot('r2s17-取消收藏后');
    await back();
  });
  await step('歌曲首页最近播放卡', async () => {
    await relaunch('/pages/song/index/index');
    await sleep(1500); // 等历史接口回来再渲染最近播放
    await tapSel('.list-row', 0); // ★歌曲首页最近播放是 list-row 不是 cont
    await sleep(2500);
    say('  页: ' + await cur());
    await shot('r2s18-最近播放进播放器');
    await back();
  });
}

async function phaseB() {
  say('===== B1 成长深度 =====');
  await step('英语单词宫格→教学播放器', async () => {
    await relaunch('/pages/growth/index/index');
    const p = await P();
    const grids = await p.$$('.wgrid');
    say('  wgrid 组数: ' + grids.length);
    const cells = await p.$$('.wgrid.en .wcell');
    if (cells.length) { await cells[0].tap(); } else { const all = await p.$$('.wcell'); if (all.length > 12) await all[12].tap(); else throw new Error('未找到英语格'); }
    await sleep(3500);
    say('  页: ' + await cur());
    await shot('r2g01-英语教学播放器');
  });
  await step('教学播放器-学习挡切换+控制条', async () => {
    if (!(await cur()).includes('growth/player')) throw new Error('不在教学播放器');
    const p = await P();
    const tabs = await p.$$('.elvl .c');
    const tt = []; for (const t of tabs) tt.push(await t.text());
    say('  学习挡: ' + tt.join('|'));
    if (tabs.length > 1) { await tabs[1].tap(); await sleep(2500); await shot('r2g02-切学习挡后'); }
    const btns = await (await P()).$$('.ebtn');
    say('  控制键数: ' + btns.length);
    if (btns.length >= 4) { await btns[2].tap(); await sleep(1200); await btns[0].tap(); await sleep(1200); await btns[3].tap(); await sleep(1200); }
    await shot('r2g03-控制条操作后');
    const bk = await (await P()).$('.eback');
    if (bk) { await bk.tap(); await sleep(1800); }
  });
  await step('挑战答满4题→结果页', async () => {
    await relaunch('/pages/growth/lesson/index?subject=' + encodeURIComponent('识字'));
    await tapSel('.btn-green', 0); // 去挑战
    await sleep(2800);
    say('  页: ' + await cur());
    for (let i = 0; i < 6; i++) {
      const p = await P();
      const opts = await p.$$('.opt');
      const cards = opts.length ? opts : await p.$$('.opt-card');
      if (!cards.length) break; // 已到结果页
      await cards[0].tap(); await sleep(1200);
      const btns = await p.$$('.btn-green');
      let tapped = false;
      for (const b of btns) {
        const t = await b.text();
        if (t && (t.includes('下一题') || t.includes('提交答案'))) { await b.tap(); tapped = true; break; }
      }
      await sleep(2000);
      if (!tapped) break;
    }
    await shot('r2g04-挑战结果页');
  });
  await step('收集册stage下钻(好朋友筛选)', async () => {
    await relaunch('/pages/growth/lesson/index?subject=' + encodeURIComponent('识字') + '&stage=2');
    await shot('r2g05-收集册好朋友筛选');
  });

  say('===== B2 家长深度 =====');
  await step('收藏页签切换+连播全部', async () => {
    await relaunch('/pages/common/favorites/index');
    await shot('r2p01-收藏-故事段');
    await tapTextIn('.chip', '歌曲');
    await shot('r2p02-收藏-歌曲段');
    await tapTextIn('.chip', '故事');
    const p = await P();
    const all = await p.$('.btn-primary');
    if (all) { await all.tap(); await sleep(3000); say('  连播页: ' + await cur()); await shot('r2p03-连播全部收藏'); await back(); }
    await back();
  });
  await step('设置-睡前模式/故事灯/定时chip全控件', async () => {
    await relaunch('/pages/common/settings/index');
    await tapTextIn('.seg .s', '定时触发');
    await shot('r2p04-睡前定时触发');
    await tapTextIn('.seg .s', '手动');
    await sleep(1000);
    // 故事灯 开→验证→关
    await tapTextIn('.seg .s', '开');
    await sleep(1500);
    await shot('r2p05-故事灯开');
    const dark = await (await P()).$('.theme-dark');
    say('  故事灯开后 theme-dark: ' + !!dark);
    await tapTextIn('.seg .s', '关');
    await sleep(1000);
    // 睡眠定时 15分 → 还原 30分
    await tapTextIn('.chip', '15 分');
    await shot('r2p06-定时15分');
    await tapTextIn('.chip', '30 分');
  });
  await step('登录页勾选态+儿童信息规则链接', async () => {
    await nav('/pages/common/login/index');
    await tapTextIn('.chip', '请勾选同意');
    await shot('r2p07-已勾选同意');
    await tapTextIn('.agree-t', '儿童信息规则');
    say('  页: ' + await cur());
    await shot('r2p08-儿童信息规则页');
    await back(); await back();
  });
  await step('会员页选档切换', async () => {
    await nav('/pages/common/member/index');
    await tapSel('.plan', 0); // 月度
    await shot('r2p09-会员选月度');
    await tapSel('.plan', 2); // 年度还原
    await back();
  });
}

(async () => {
  fs.mkdirSync(DIR, { recursive: true });
  mini = await automator.connect({ wsEndpoint: 'ws://localhost:9423' });
  say('连接成功 phase=' + PHASE);
  await sleep(2500);
  if (PHASE === 'a') await phaseA(); else await phaseB();
  say('===== 完成 =====');
  fs.writeFileSync(path.join(DIR, 'walk2-' + PHASE + '.log'), log.join('\n'), 'utf8');
  await mini.disconnect();
})().catch((e) => {
  console.error('FAILED:', e && e.message);
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(path.join(DIR, 'walk2-' + PHASE + '.log'), log.concat(['FAILED: ' + (e && e.message)]).join('\n'), 'utf8');
  process.exit(1);
});
