/**
 * weapp-g-challenge.cjs — 精确复测：课程页「去挑战」→ G-04 挑战页答题 → 结果
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
  try { await mini.reLaunch('/pages/growth/lesson/index?subject=识字'); }
  catch (e) { await mini.evaluate(() => { wx.reLaunch({ url: '/pages/growth/lesson/index?subject=' + encodeURIComponent('识字') }); }); }
  await sleep(3500);
  let page = await mini.currentPage();
  console.log('PAGE:', page.path);
  const btns = await page.$$('.btn-green');
  console.log('BTN_GREEN count:', btns.length);
  if (!btns.length) throw new Error('无去挑战按钮');
  await btns[0].tap();
  await sleep(3000);
  page = await mini.currentPage();
  console.log('AFTER TAP:', page.path);
  await mini.screenshot({ path: path.join(DIR, 'g10-挑战页-精确.png') });
  // 答题：点第一个选项
  const opts = await page.$$('.opt');
  const optCards = await page.$$('.opt-card');
  const useOpts = opts.length ? opts : optCards;
  console.log('OPTIONS:', useOpts.length);
  if (useOpts.length) {
    await useOpts[0].tap();
    await sleep(2000);
    await mini.screenshot({ path: path.join(DIR, 'g11-答题后-精确.png') });
    console.log('ANSWERED');
  }
  await mini.disconnect();
  console.log('DONE');
})().catch((e) => { console.error('FAILED:', String((e && e.message) || e).slice(0, 300)); process.exit(1); });
