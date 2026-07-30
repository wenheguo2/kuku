/**
 * weapp-dark-verify.cjs — 验证夜间态文字可读性修复（首页切夜间截图，再切回）
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
  let mini;
  for (let i = 1; i <= 12; i++) {
    try { mini = await automator.connect({ wsEndpoint: 'ws://localhost:9423' }); break; }
    catch (e) { console.log(`retry ${i}`); await sleep(5000); }
  }
  if (!mini) throw new Error('connect failed');
  console.log('CONNECTED');
  await sleep(4000);
  try { await mini.reLaunch('/pages/story/index/index'); }
  catch (e) { await mini.evaluate(() => { wx.reLaunch({ url: '/pages/story/index/index' }); }); }
  await sleep(4500);
  let page = await mini.currentPage();
  const btn = await page.$('.sbtn');
  await btn.tap(); await sleep(2500);
  // 读 .big 计算色确认变白
  page = await mini.currentPage();
  const big = await page.$('.greet .big');
  if (big) console.log('BIG_COLOR:', await big.style('color'));
  const nm = await page.$('.scard .nm');
  if (nm) console.log('SCARD_NM_COLOR:', await nm.style('color'));
  await mini.screenshot({ path: path.join(DIR, 'n8-夜间态文字修复.png') });
  console.log('SHOT OK');
  const btn2 = await page.$('.sbtn');
  await btn2.tap(); await sleep(2000); // 切回日间
  await mini.disconnect();
  console.log('DONE');
})().catch((e) => { console.error('FAILED:', String((e && e.message) || e).slice(0, 300)); process.exit(1); });
