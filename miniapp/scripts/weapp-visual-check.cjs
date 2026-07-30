/** weapp-visual-check.cjs — 视觉回归：首页TabBar新图标 / 登录页插画 / 歌曲播放器收藏chip / 设置页seg */
const automator = require('miniprogram-automator');
const MPmod = require('miniprogram-automator/out/MiniProgram');
(MPmod.default || MPmod).prototype.checkVersion = async () => {};
const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const DIR = 'd:\\work\\work\\code\\testsuit\\公司\\工作区\\tmp\\测试截图\\weapp\\walk';

(async () => {
  const mini = await automator.connect({ wsEndpoint: 'ws://localhost:9423' });
  await sleep(3000);
  const shot = (n) => mini.screenshot({ path: path.join(DIR, n + '.png') });
  const go = async (url, sw = false) => {
    try { if (sw) await mini.switchTab(url); else await mini.reLaunch(url); }
    catch (e) { await mini.evaluate((u) => wx.reLaunch({ url: u }), url); }
    await sleep(2500);
  };

  await go('/pages/story/index/index');
  await sleep(2000);
  await shot('v01-首页-新Tab图标');

  await go('/pages/common/login/index');
  await shot('v02-登录页-插画版');

  // 歌曲播放器（带收藏chip）
  await go('/pages/story/index/index');
  await mini.evaluate(() => wx.switchTab({ url: '/pages/song/index/index' }));
  await sleep(2000);
  let page = await mini.currentPage();
  const tiles = await page.$$('.tilegrid .tile');
  if (tiles.length) { await tiles[0].tap(); await sleep(2200); }
  page = await mini.currentPage();
  const subTiles = await page.$$('.tilegrid .tile');
  if (subTiles.length) { await subTiles[0].tap(); await sleep(2200); }
  page = await mini.currentPage();
  const rows = await page.$$('.list-row');
  if (rows.length) { await rows[0].tap(); await sleep(3500); }
  const p = await mini.currentPage();
  console.log('歌曲播放器:', p ? p.path : null);
  await shot('v03-歌曲播放器-收藏chip');

  // 设置页 seg 修复效果
  await go('/pages/common/settings/index');
  await shot('v04-设置页-seg修复后');
  page = await mini.currentPage();
  const segs = await page.$$('.seg .s');
  for (const s of segs.slice(0, 5)) console.log('chip:', await s.text(), '| class:', await s.attribute('class'));
  await mini.disconnect();
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
