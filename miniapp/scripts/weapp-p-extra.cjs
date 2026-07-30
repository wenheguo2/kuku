/**
 * weapp-p-extra.cjs — 家长线补测：1 设置页精确切深色→首页看全局深色→切回；2 家长中心会员入口→会员页
 */
const automator = require('miniprogram-automator');
const MPmod = require('miniprogram-automator/out/MiniProgram');
(MPmod.default || MPmod).prototype.checkVersion = async () => {};
const path = require('path');
const fs = require('fs');
const DIR = 'd:\\work\\work\\code\\testsuit\\公司\\工作区\\tmp\\测试截图\\weapp\\walk';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  fs.mkdirSync(DIR, { recursive: true });
  const mini = await automator.connect({ wsEndpoint: 'ws://localhost:9423' });
  console.log('CONNECTED');
  await sleep(2000);
  const shot = async (n) => { try { await mini.screenshot({ path: path.join(DIR, n + '.png') }); console.log('SHOT', n); } catch (e) { console.log('SHOT_FAIL', n); } };

  // 1 设置页：主题 seg（第一组 .seg）里点「深色」
  try { await mini.reLaunch('/pages/common/settings/index'); }
  catch (e) { await mini.evaluate(() => { wx.reLaunch({ url: '/pages/common/settings/index' }); }); }
  await sleep(3000);
  let page = await mini.currentPage();
  const segs = await page.$$('.seg .s');
  console.log('SEG count:', segs.length);
  for (const s of segs) {
    const t = await s.text();
    if (t && t.includes('深色')) { await s.tap(); console.log('TAPPED 深色'); break; }
  }
  await sleep(2000);
  await shot('p07b-设置页-深色精确');
  // 首页看全局深色
  try { await mini.reLaunch('/pages/story/index/index'); }
  catch (e) { await mini.evaluate(() => { wx.reLaunch({ url: '/pages/story/index/index' }); }); }
  await sleep(3500);
  page = await mini.currentPage();
  const dark = await page.$('.theme-dark');
  console.log('HOME_THEME_DARK:', !!dark);
  await shot('p08b-首页-深色主题');
  // 切回浅色
  try { await mini.reLaunch('/pages/common/settings/index'); }
  catch (e) { await mini.evaluate(() => { wx.reLaunch({ url: '/pages/common/settings/index' }); }); }
  await sleep(2500);
  page = await mini.currentPage();
  const segs2 = await page.$$('.seg .s');
  for (const s of segs2) {
    const t = await s.text();
    if (t && t.includes('浅色')) { await s.tap(); console.log('TAPPED 浅色'); break; }
  }
  await sleep(1500);

  // 2 家长中心 → 会员书匣行 → 会员页
  try { await mini.reLaunch('/pages/parent/index/index'); }
  catch (e) { await mini.evaluate(() => { wx.reLaunch({ url: '/pages/parent/index/index' }); }); }
  await sleep(3000);
  page = await mini.currentPage();
  const rows = await page.$$('.frow');
  for (const r of rows) {
    const t = await r.text();
    if (t && t.includes('书匣')) { await r.tap(); console.log('TAPPED 书匣'); break; }
  }
  await sleep(3000);
  page = await mini.currentPage();
  console.log('MEMBER PAGE:', page.path);
  await shot('p05b-会员页');
  await mini.disconnect();
  console.log('DONE');
})().catch((e) => { console.error('FAILED:', String((e && e.message) || e).slice(0, 300)); process.exit(1); });
