/**
 * weapp-net.cjs — weapp 网络诊断：点首页重试 → 截图；再 evaluate wx.request 直测 localhost:3000 连通性
 * 用法：node scripts/weapp-net.cjs <port>
 */
const automator = require('miniprogram-automator');
const MPmod = require('miniprogram-automator/out/MiniProgram');
(MPmod.default || MPmod).prototype.checkVersion = async () => {};
const path = require('path');
const fs = require('fs');
const PORT = process.argv[2] || '9423';
const SHOT_DIR = 'd:\\work\\work\\code\\testsuit\\公司\\工作区\\tmp\\测试截图\\weapp';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const withTimeout = (p, ms, tag) => Promise.race([p, sleep(ms).then(() => { throw new Error('TIMEOUT:' + tag); })]);

(async () => {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  let mini;
  for (let i = 1; i <= 12; i++) {
    try { mini = await automator.connect({ wsEndpoint: 'ws://localhost:' + PORT }); break; }
    catch (e) { console.log(`retry ${i}/12`); await sleep(5000); }
  }
  if (!mini) throw new Error('connect failed');
  console.log('CONNECTED');
  await sleep(2000);

  // currentPage 偶发超时：多试几轮
  let page = null;
  for (let i = 0; i < 5 && !page; i++) {
    try { page = await withTimeout(mini.currentPage(), 12000, 'currentPage'); } catch (e) { console.log('currentPage try', i, 'fail'); await sleep(3000); }
  }
  if (page) {
    console.log('当前页:', page.path);
    try {
      const btn = await withTimeout(page.$('.state-btn'), 10000, '$state-btn');
      if (btn) { await withTimeout(btn.tap(), 10000, 'tap'); console.log('已点重试'); await sleep(5000); }
      else console.log('无重试按钮');
    } catch (e) { console.log('点重试失败:', String(e.message).slice(0, 60)); }
    try {
      page = await withTimeout(mini.currentPage(), 10000, 'cp2');
      const tiles = await withTimeout(page.$$('.tilegrid .tile'), 10000, 'tiles');
      console.log('学科 tile 数(真实=9):', tiles.length);
    } catch (e) { console.log('tile 查询失败:', String(e.message).slice(0, 60)); }
  }
  try { await withTimeout(mini.screenshot({ path: path.join(SHOT_DIR, 'd02-after-retry.png') }), 20000, 'shot'); console.log('SHOT OK'); } catch (e) { console.log('截图失败'); }

  // 直测 wx.request 连通性（回调 API 用 evaluate 包 Promise 不可靠，改 callWxMethod 之前实测超时，这里用 page.waitFor+全局变量法）
  try {
    const r = await withTimeout(mini.evaluate(() => new Promise((resolve) => {
      wx.request({
        url: 'http://localhost:3000/static/index/generated_stories/_global.json',
        success: (res) => resolve('OK status=' + res.statusCode),
        fail: (err) => resolve('FAIL ' + (err && err.errMsg)),
      });
      setTimeout(() => resolve('TIMEOUT-10s'), 10000);
    })), 20000, 'evaluate');
    console.log('wx.request 直测:', r);
  } catch (e) { console.log('evaluate 失败:', String(e.message).slice(0, 60)); }
  console.log('DONE');
  await mini.disconnect();
})().catch((e) => { console.error('FAILED:', String((e && e.message) || e).slice(0, 200)); process.exit(1); });
