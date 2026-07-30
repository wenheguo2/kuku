/**
 * weapp-nitpick2.cjs — 吹毛求疵修复轻量回归（最少 reLaunch，避免 IDE 路由失联）
 * 只验：对比度 6 项 + 热区 4 项
 */
const automator = require('miniprogram-automator');
const MPmod = require('miniprogram-automator/out/MiniProgram');
(MPmod.default || MPmod).prototype.checkVersion = async () => {};
const path = require('path');
const fs = require('fs');
const DIR = 'd:\\work\\work\\code\\testsuit\\公司\\工作区\\tmp\\测试截图\\weapp\\walk4';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = [];
const say = (s) => { console.log(s); log.push(s); };
const lum = (rgb) => {
  const m = String(rgb).match(/\d+(\.\d+)?/g);
  if (!m || m.length < 3) return null;
  const [r, g, b] = m.slice(0, 3).map((v) => { const c = Number(v) / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (fg, bg) => { const a = lum(fg); const b = lum(bg); if (a === null || b === null) return null; const hi = Math.max(a, b); const lo = Math.min(a, b); return (hi + 0.05) / (lo + 0.05); };

(async () => {
  fs.mkdirSync(DIR, { recursive: true });
  let mini;
  for (let i = 0; i < 15; i++) {
    try { mini = await automator.connect({ wsEndpoint: 'ws://localhost:9423' }); break; }
    catch (e) { await sleep(4000); }
  }
  say('连接成功');
  await sleep(3000);
  // 只做一次 reLaunch，其余靠页内导航
  try { await mini.reLaunch('/pages/story/index/index'); } catch (e) { await mini.evaluate(() => { wx.reLaunch({ url: '/pages/story/index/index' }); }); }
  await sleep(5000);
  let page = await mini.currentPage();
  say('当前页: ' + (page && page.path));

  const probe = async (label, sel, fallbackBg) => {
    const p = await mini.currentPage();
    const el = await p.$(sel);
    if (!el) { say(`  ${label}: 缺失`); return; }
    const fg = await el.style('color');
    let bg = await el.style('background-color');
    if (!bg || /rgba?\(0, 0, 0, 0\)|transparent/.test(bg)) bg = fallbackBg;
    const fsz = await el.style('font-size');
    const c = contrast(fg, bg);
    const need = parseFloat(fsz) >= 18 ? 3.0 : 4.5;
    say(`  ${label}: ${c ? c.toFixed(2) : '?'}:1 (需${need}) ${c >= need ? '✓' : '✗'} [${fg} on ${bg}, ${fsz}]`);
  };
  const hit = async (label, sel) => {
    const p = await mini.currentPage();
    const el = await p.$(sel);
    if (!el) { say(`  ${label}: 缺失`); return; }
    const s = await el.size();
    const ok = s.height >= 43.5 && s.width >= 43.5;
    say(`  ${label}: ${Math.round(s.width)}x${Math.round(s.height)}px ${ok ? '✓' : '✗(<44)'}`);
  };

  say('\n[对比度-日间]');
  await probe('问候小字 .hi', '.greet .hi', 'rgb(255,249,240)');
  await probe('章回副标 .scard .ds', '.scard .ds', 'rgb(255,249,240)');
  await probe('最近播放描述 .cont .ds', '.cont .ds', 'rgb(255,255,255)');
  say('\n[热区-首页]');
  await hit('夜间开关 .sbtn', '.sbtn');
  await hit('换一个 .htag', '.htag');
  await hit('更多/换一换 .sec-h .m', '.sec-h .m');
  await hit('分享横条 .share-bar', '.share-bar');
  await mini.screenshot({ path: path.join(DIR, 'fix-首页热区对比度.png') });
  say('SHOT 首页');

  // 页内导航到歌曲列表（switchTab + tap，不用 reLaunch）
  try { await mini.switchTab('/pages/song/index/index'); } catch (e) { await mini.evaluate(() => { wx.switchTab({ url: '/pages/song/index/index' }); }); }
  await sleep(3000);
  page = await mini.currentPage();
  const tile = await page.$('.tilegrid .tile');
  if (tile) { await tile.tap(); await sleep(2500); const p2 = await mini.currentPage(); const sub = await p2.$('.tilegrid .tile'); if (sub) { await sub.tap(); await sleep(3000); } }
  say('\n[歌曲列表] 页: ' + (await mini.currentPage()).path);
  await hit('循环胶囊 .loop-pill', '.loop-pill');
  await probe('胶囊文字 .loop-pill .tx', '.loop-pill .tx', 'rgb(255,255,255)');
  await probe('列表副标 .list-row .ds', '.list-row .ds', 'rgb(255,255,255)');
  await mini.screenshot({ path: path.join(DIR, 'fix-歌曲列表胶囊.png') });
  say('SHOT 歌曲列表');

  // 设置页 seg 热区
  try { await mini.navigateTo('/pages/common/settings/index'); } catch (e) { await mini.evaluate(() => { wx.navigateTo({ url: '/pages/common/settings/index' }); }); }
  await sleep(3000);
  say('\n[设置页] 页: ' + (await mini.currentPage()).path);
  await hit('分段控件 .seg .s', '.seg .s');
  await mini.screenshot({ path: path.join(DIR, 'fix-设置页seg热区.png') });
  say('SHOT 设置页');

  fs.writeFileSync(path.join(DIR, 'nitpick2.log'), log.join('\n'), 'utf8');
  await mini.disconnect();
  say('DONE');
})().catch((e) => {
  console.error('FAILED:', e && e.message);
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(path.join(DIR, 'nitpick2.log'), log.concat(['FAILED: ' + (e && e.message)]).join('\n'), 'utf8');
  process.exit(1);
});
