/**
 * weapp-chaos.cjs — 第三轮「没事找事」破坏性测试
 * 用法：node scripts/weapp-chaos.cjs a|b
 *  a: 坏参数轰炸(9) + 输入边界(3)
 *  b: 连点压力(6) + 播放边界(2) + 深色残留(2)
 * 全程收集 console error/exception；每步截图；step 包装不中断。
 */
const automator = require('miniprogram-automator');
const MPmod = require('miniprogram-automator/out/MiniProgram');
(MPmod.default || MPmod).prototype.checkVersion = async () => {};
const path = require('path');
const fs = require('fs');
const PHASE = process.argv[2] || 'a';
const DIR = 'd:\\work\\work\\code\\testsuit\\公司\\工作区\\tmp\\测试截图\\weapp\\walk3';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = [];
const errors = [];
const say = (s) => { console.log(s); log.push(s); };
let mini;
const shot = async (n) => { try { await mini.screenshot({ path: path.join(DIR, n + '.png') }); say('📷 ' + n); } catch (e) { say('📷❌ ' + n); } };
const step = async (n, fn) => { try { await fn(); say('✔ ' + n); } catch (e) { say('❌ ' + n + ': ' + String(e.message).slice(0, 140)); } };
const relaunch = async (u) => { try { await mini.reLaunch(u); } catch (e) { await mini.evaluate((x) => { wx.reLaunch({ url: x }); }, u); } await sleep(3000); };
const nav = async (u) => { try { await mini.navigateTo(u); } catch (e) { try { await mini.evaluate((x) => { wx.navigateTo({ url: x }); }, u); } catch (e2) {} } await sleep(2500); };
const back = async () => { try { await mini.navigateBack(); } catch (e) {} await sleep(1500); };
const cur = async () => { try { const p = await mini.currentPage(); return p ? p.path : '(null)'; } catch (e) { return '(err)'; } };
const P = async () => mini.currentPage();
const enc = encodeURIComponent;

async function phaseA() {
  say('===== A 坏参数轰炸 =====');
  const badPages = [
    ['x01-故事播放器-无参数', '/pages/story/player/index'],
    ['x02-故事播放器-不存在path', '/pages/story/player/index?path=' + enc('不存在学科/不存在故事') + '&title=' + enc('坏数据')],
    ['x03-章回作品页-无参数', '/pages/story/work/index'],
    ['x04-歌曲播放器-不存在id', '/pages/song/player/index?id=' + enc('瞎编的歌曲/不存在/不存在歌') + '&title=' + enc('幽灵歌')],
    ['x05-歌曲列表-不存在path', '/pages/song/list/index?path=' + enc('不存在分类/子类') + '&title=' + enc('幽灵分类')],
    ['x06-教学播放器-不存在课', '/pages/growth/player/index?subject=' + enc('识字') + '&word=' + enc('龘') + '&path=' + enc('不存在/龘')],
    ['x07-课程列表-不存在学科', '/pages/growth/lesson/index?subject=' + enc('量子力学')],
    ['x08-协议页-非法type', '/pages/common/agreement/index?type=hack"><script>'],
    ['x09-搜索页-非法scope', '/pages/common/search/index?scope=__weird__'],
  ];
  for (const [name, url] of badPages) {
    await step(name, async () => {
      await relaunch(url);
      say('  页: ' + await cur());
      await shot(name);
    });
  }

  say('===== C 输入边界 =====');
  await step('x10-搜索特殊字符', async () => {
    await relaunch('/pages/common/search/index?scope=story');
    const p = await P(); const inp = await p.$('input');
    await inp.input('\'"%/\\🦄<b>');
    await sleep(2000);
    await shot('x10-搜索特殊字符');
  });
  await step('x11-搜索超长100字', async () => {
    const p = await P(); const inp = await p.$('input');
    await inp.input('三国'.repeat(50));
    await sleep(2000);
    await shot('x11-搜索超长串');
  });
  await step('x12-清空输入恢复初始', async () => {
    const p = await P(); const inp = await p.$('input');
    await inp.input('');
    await sleep(1500);
    await shot('x12-清空后初始态');
  });
}

async function phaseB() {
  say('===== B 连点压力 =====');
  await step('x13-换一个连点5次', async () => {
    await relaunch('/pages/story/index/index');
    const p = await P();
    if (await p.$('.theme-dark')) { const b = await p.$('.sbtn'); await b.tap(); await sleep(1200); }
    for (let i = 0; i < 5; i++) {
      const els = await (await P()).$$('.htag');
      for (const el of els) { const t = await el.text(); if (t && t.includes('换一个')) { await el.tap(); break; } }
      await sleep(400);
    }
    await sleep(1500);
    await shot('x13-换一个连点后');
  });
  await step('x14-换一换连点5次', async () => {
    for (let i = 0; i < 5; i++) {
      const els = await (await P()).$$('.sec-h .m');
      for (const el of els) { const t = await el.text(); if (t && t.includes('换一换')) { await el.tap(); break; } }
      await sleep(300);
    }
    await sleep(1200);
    await shot('x14-换一换连点后');
  });
  await step('x15-播放键连点10次+倍速轮一圈', async () => {
    const p0 = await P();
    const rows = await p0.$$('.list-row');
    if (rows.length) { await rows[0].tap(); await sleep(3000); }
    const p = await P();
    const main = await p.$('.pbtn.main');
    for (let i = 0; i < 10; i++) { await main.tap(); await sleep(150); }
    await sleep(1500);
    const fns = await p.$$('.pfns .fn');
    if (fns[2]) for (let i = 0; i < 5; i++) { await fns[2].tap(); await sleep(300); } // 倍速轮一圈回1.0
    const bam = await mini.evaluate(() => { const b = wx.getBackgroundAudioManager(); return { paused: b.paused, rate: b.playbackRate }; });
    say('  BAM: ' + JSON.stringify(bam));
    await shot('x15-连点轰炸后播放器');
  });
  await step('x16-收藏连点3次(防重)', async () => {
    const p = await P();
    const fns = await p.$$('.pfns .fn');
    if (fns[0]) { for (let i = 0; i < 3; i++) { await fns[0].tap(); await sleep(500); } }
    await shot('x16-收藏连点后');
    await back();
  });
  await step('x17-四Tab快速连切2轮', async () => {
    const tabs = ['/pages/story/index/index', '/pages/song/index/index', '/pages/growth/index/index', '/pages/parent/index/index'];
    for (let r = 0; r < 2; r++) for (const t of tabs) { try { await mini.switchTab(t); } catch (e) { await mini.evaluate((x) => { wx.switchTab({ url: x }); }, t); } await sleep(500); }
    say('  最终页: ' + await cur());
    await shot('x17-连切后家长页');
  });
  await step('x18-深导航栈12层(微信上限10)', async () => {
    await relaunch('/pages/story/index/index');
    let depth = 0;
    for (let i = 0; i < 12; i++) {
      try { await mini.navigateTo('/pages/common/agreement/index?type=user'); depth++; }
      catch (e) { say('  第' + (i + 1) + '层被拒: ' + String(e.message).slice(0, 60)); break; }
      await sleep(500);
    }
    say('  实际入栈: ' + depth + ' 层, 当前页: ' + await cur());
    await shot('x18-深栈顶层');
    for (let i = 0; i < depth; i++) { await back(); }
  });

  say('===== D 播放边界 =====');
  await step('x19-seek到结尾触发自动下一篇', async () => {
    await relaunch('/pages/story/index/index');
    const p0 = await P();
    if (await p0.$('.theme-dark')) { const b = await p0.$('.sbtn'); await b.tap(); await sleep(1200); }
    const cont = await p0.$('.cont');
    if (!cont) throw new Error('无最近播放卡');
    await cont.tap(); await sleep(3500);
    const before = await mini.evaluate(() => { const b = wx.getBackgroundAudioManager(); return (b.src || '').slice(-50); });
    await mini.evaluate(() => { const b = wx.getBackgroundAudioManager(); if (b.duration > 2) b.seek(b.duration - 1.5); });
    await sleep(6000);
    const after = await mini.evaluate(() => { const b = wx.getBackgroundAudioManager(); return (b.src || '').slice(-50); });
    say('  before: ' + before);
    say('  after : ' + after + (before === after ? ' (未切换)' : ' (已自动切下一篇✓)'));
    await shot('x19-seek结尾后');
    await back();
  });
  await step('x20-迷你栏✕关闭后浮球消失', async () => {
    await relaunch('/pages/story/index/index');
    const p = await P();
    const close = await p.$('.mini-fab .x, .mini-x');
    if (close) { await close.tap(); await sleep(1500); }
    else {
      const els = await p.$$('.mini-fab view');
      if (els.length) { await els[els.length - 1].tap(); await sleep(1500); }
    }
    const fab = await (await P()).$('.mini-fab');
    say('  关闭后浮球存在: ' + !!fab);
    await shot('x20-关闭迷你栏后');
  });

  say('===== E 深色残留 =====');
  await step('x21-深色下教学播放器+登录页', async () => {
    await relaunch('/pages/common/settings/index');
    const p = await P();
    const segs = await p.$$('.seg .s');
    for (const s of segs) { const t = await s.text(); if (t && t.includes('深色')) { await s.tap(); break; } }
    await sleep(1500);
    await relaunch('/pages/growth/index/index');
    const cells = await (await P()).$$('.wgrid .wcell');
    if (cells.length) { await cells[0].tap(); await sleep(3500); await shot('x21-深色-教学播放器'); const bk = await (await P()).$('.eback'); if (bk) { await bk.tap(); await sleep(1500); } }
    await nav('/pages/common/login/index');
    await shot('x22-深色-登录页');
    await back();
    // 恢复浅色→跟随
    await relaunch('/pages/common/settings/index');
    const segs2 = await (await P()).$$('.seg .s');
    for (const s of segs2) { const t = await s.text(); if (t && t.includes('跟随')) { await s.tap(); break; } }
    await sleep(1000);
  });
}

(async () => {
  fs.mkdirSync(DIR, { recursive: true });
  mini = await automator.connect({ wsEndpoint: 'ws://localhost:9423' });
  // 收集 console 错误与未捕获异常
  mini.on('console', (msg) => { if (msg && (msg.type === 'error')) errors.push('[console.error] ' + String(msg.args && msg.args.join ? msg.args.join(' ') : msg.text).slice(0, 200)); });
  mini.on('exception', (exp) => { errors.push('[exception] ' + String(exp && exp.message).slice(0, 200)); });
  say('连接成功 phase=' + PHASE);
  await sleep(2500);
  if (PHASE === 'a') await phaseA(); else await phaseB();
  say('===== console错误汇总(' + errors.length + ') =====');
  errors.slice(0, 30).forEach((e) => say(e));
  fs.writeFileSync(path.join(DIR, 'chaos-' + PHASE + '.log'), log.concat(errors).join('\n'), 'utf8');
  await mini.disconnect();
})().catch((e) => {
  console.error('FAILED:', e && e.message);
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(path.join(DIR, 'chaos-' + PHASE + '.log'), log.concat(errors, ['FAILED: ' + (e && e.message)]).join('\n'), 'utf8');
  process.exit(1);
});
