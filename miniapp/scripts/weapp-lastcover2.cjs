/**
 * weapp-lastcover2.cjs — 实测章回章节回退链：播三国演义第1章 → 回首页验证最近播放封面
 */
const automator = require('miniprogram-automator');
const MPmod = require('miniprogram-automator/out/MiniProgram');
(MPmod.default || MPmod).prototype.checkVersion = async () => {};
const path = require('path');
const fs = require('fs');
const SHOT_DIR = 'd:\\work\\work\\code\\testsuit\\公司\\工作区\\tmp\\测试截图\\weapp\\walk';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const mini = await automator.connect({ wsEndpoint: 'ws://localhost:9423' });
  console.log('CONNECTED');
  await sleep(2000);
  try { await mini.reLaunch('/pages/story/index/index'); }
  catch (e) { await mini.evaluate(() => { wx.reLaunch({ url: '/pages/story/index/index' }); }); }
  await sleep(4000);
  let page = await mini.currentPage();
  // 章回推荐第一张卡（三十六计）→ 作品页
  const card = await page.$('.scard');
  if (!card) throw new Error('no .scard');
  await card.tap(); await sleep(3000);
  page = await mini.currentPage();
  console.log('WORK PAGE:', page.path);
  // 第1章播放
  const row = await page.$('.list-row');
  if (!row) throw new Error('no .list-row');
  await row.tap(); await sleep(5000);
  page = await mini.currentPage();
  console.log('PLAYER PAGE:', page.path);
  await sleep(3000); // 等历史上报
  // 回首页
  try { await mini.reLaunch('/pages/story/index/index'); }
  catch (e) { await mini.evaluate(() => { wx.reLaunch({ url: '/pages/story/index/index' }); }); }
  await sleep(6000); // 等 onError 回退完成
  page = await mini.currentPage();
  const img = await page.$('.cont .cvr');
  if (img) {
    let src = ''; try { src = await img.attribute('src'); } catch (e) {}
    console.log('CVR_SRC:', decodeURIComponent(src || '(色块)'));
    try { const nm = await page.$('.cont .nm'); console.log('TITLE:', await nm.text()); } catch (e) {}
  } else console.log('CVR not found');
  await mini.screenshot({ path: path.join(SHOT_DIR, 'z-章回最近播放回退链.png') });
  console.log('SHOT OK');
  await mini.disconnect();
})().catch((e) => { console.error('FAILED:', String((e && e.message) || e).slice(0, 300)); process.exit(1); });
