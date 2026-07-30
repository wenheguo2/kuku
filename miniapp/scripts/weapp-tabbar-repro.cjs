/** weapp-tabbar-repro.cjs — 复现：首页→hero播放→返回首页，检查 TabBar 是否矮半截/迷你栏遮挡 */
const automator = require('miniprogram-automator');
const MPmod = require('miniprogram-automator/out/MiniProgram');
(MPmod.default || MPmod).prototype.checkVersion = async () => {};
const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const DIR = 'd:\\work\\work\\code\\testsuit\\公司\\工作区\\tmp\\测试截图\\weapp\\walk';

(async () => {
  const mini = await automator.connect({ wsEndpoint: 'ws://localhost:9423' });
  await sleep(1500);
  const shot = (n) => mini.screenshot({ path: path.join(DIR, n + '.png') });
  const cur = async () => { try { const p = await mini.currentPage(); return p ? p.path : '(null)'; } catch (e) { return '(err)'; } };

  // 1. 回首页
  try { await mini.reLaunch('/pages/story/index/index'); } catch (e) { await mini.evaluate(() => wx.reLaunch({ url: '/pages/story/index/index' })); }
  await sleep(3000);
  await shot('r01-首页初始');

  // 2. 点 hero 播放键（今日推荐）
  let page = await mini.currentPage();
  const hplay = await page.$('.hplay');
  if (hplay) { await hplay.tap(); } else { const hero = await page.$('.hero'); if (hero) await hero.tap(); }
  await sleep(4000);
  console.log('播放入口后页面:', await cur());
  await shot('r02-hero进入');

  // 3. 若进了章回作品页，点“从第1章连续播放”或第一章
  if ((await cur()).includes('story/work')) {
    page = await mini.currentPage();
    const rows = await page.$$('.list-row');
    const views = await page.$$('view');
    let clicked = false;
    for (const v of views) { const t = await v.text(); if (t && t.includes('连续播放') && t.length < 20) { await v.tap(); clicked = true; break; } }
    if (!clicked && rows.length) await rows[0].tap();
    await sleep(4000);
    console.log('进入播放器:', await cur());
  }
  await shot('r03-播放器');

  // 4. 返回（缩成迷你栏）
  try { await mini.navigateBack(); } catch (e) {}
  await sleep(2000);
  console.log('返回后页面:', await cur());
  await shot('r04-返回后');
  // 若返回到 work 页再返回一次到首页
  if (!(await cur()).includes('story/index')) {
    try { await mini.navigateBack(); } catch (e) {}
    await sleep(2000);
  }
  console.log('最终页面:', await cur());
  await shot('r05-回到首页-看TabBar');

  // 5. 上下滑动后再截图对比（用户说滑动后恢复）
  await mini.pageScrollTo(300);
  await sleep(800);
  await mini.pageScrollTo(0);
  await sleep(800);
  await shot('r06-滑动后-看TabBar');

  await mini.disconnect();
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
