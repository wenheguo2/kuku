/**
 * weapp-diag.cjs — 微信端网络诊断 + 四问题复验截图（同会话内配合 cli auto 使用）
 * 用法：node scripts/weapp-diag.cjs <port>
 */
const automator = require('miniprogram-automator');
const MPmod = require('miniprogram-automator/out/MiniProgram');
(MPmod.default || MPmod).prototype.checkVersion = async () => {};
const path = require('path');
const fs = require('fs');
const PORT = process.argv[2] || '9423';
const SHOT_DIR = 'd:\\work\\work\\code\\testsuit\\公司\\工作区\\tmp\\测试截图\\weapp';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  let mini;
  for (let i = 1; i <= 20; i++) {
    try { mini = await automator.connect({ wsEndpoint: 'ws://localhost:' + PORT }); break; }
    catch (e) { console.log(`retry ${i}/20`); await sleep(10000); }
  }
  if (!mini) throw new Error('connect failed');
  console.log('CONNECTED');
  await sleep(3000);

  // 首页重试 + 截图（②封面复验；页面能出真实数据即证明域名校验已过）
  await mini.reLaunch('/pages/story/index/index');
  await sleep(3500);
  let page = await mini.currentPage();
  const retryBtn = await page.$('.state-btn');
  if (retryBtn) { await retryBtn.tap(); await sleep(3500); }
  page = await mini.currentPage();
  const tiles = await page.$$('.tilegrid .tile');
  console.log('首页学科 tile 数(真实索引=9):', tiles.length);
  await mini.screenshot({ path: path.join(SHOT_DIR, 'v01-首页复验.png') });
  console.log('shot v01');

  // ③播放三角复验：首页可视区 .cp 圆钮
  const cps = await page.$$('.cp');
  console.log('.cp 圆钮数量:', cps.length);

  // ④故事灯布局复验 + 真音频播放判定（播 8 秒后读进度时间文本）
  await mini.navigateTo('/pages/story/player/index?path=' + encodeURIComponent('上下五千年/E1成语故事/责无旁贷') + '&title=' + encodeURIComponent('责无旁贷'));
  await sleep(8000);
  page = await mini.currentPage();
  const times = await page.$$('.ptime text');
  const t0 = times[0] ? await times[0].text() : '?';
  const t1 = times[1] ? await times[1].text() : '?';
  console.log('故事灯进度:', t0, '/', t1, (t0 !== '0:00' ? '(真音频在播✓)' : '(未走时⚠)'));
  await mini.screenshot({ path: path.join(SHOT_DIR, 'v02-故事灯复验.png') });
  console.log('shot v02');
  console.log('DONE');
  await mini.disconnect();
})().catch((e) => { console.error('FAILED:', String((e && e.message) || e).slice(0, 200)); process.exit(1); });
