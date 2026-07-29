/**
 * weapp-final.cjs — 封面终验：reLaunch 首页 + 学科页，等待图片加载后截图
 */
const automator = require('miniprogram-automator');
const MPmod = require('miniprogram-automator/out/MiniProgram');
(MPmod.default || MPmod).prototype.checkVersion = async () => {};
const path = require('path');
const PORT = process.argv[2] || '9423';
const SHOT_DIR = 'd:\\work\\work\\code\\testsuit\\公司\\工作区\\tmp\\测试截图\\weapp';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const withTimeout = (p, ms, tag) => Promise.race([p, sleep(ms).then(() => { throw new Error('TIMEOUT:' + tag); })]);

(async () => {
  let mini;
  for (let i = 1; i <= 6; i++) {
    try { mini = await automator.connect({ wsEndpoint: 'ws://localhost:' + PORT }); break; }
    catch (e) { console.log(`retry ${i}/6`); await sleep(5000); }
  }
  if (!mini) throw new Error('connect failed');
  console.log('CONNECTED');
  await sleep(2000);
  try { await withTimeout(mini.reLaunch('/pages/story/index/index'), 30000, 'r1'); } catch (e) { console.log('reLaunch1:', String(e.message).slice(0, 50)); }
  await sleep(9000);
  await withTimeout(mini.screenshot({ path: path.join(SHOT_DIR, 'v20-home-final.png') }), 20000, 's1');
  console.log('SHOT v20-home-final');
  try { await withTimeout(mini.reLaunch('/pages/story/subject/index?subject=' + encodeURIComponent('上下五千年')), 30000, 'r2'); } catch (e) { console.log('reLaunch2:', String(e.message).slice(0, 50)); }
  await sleep(8000);
  await withTimeout(mini.screenshot({ path: path.join(SHOT_DIR, 'v21-subject-final.png') }), 20000, 's2');
  console.log('SHOT v21-subject-final');
  console.log('DONE');
  await mini.disconnect();
})().catch((e) => { console.error('FAILED:', String((e && e.message) || e).slice(0, 200)); process.exit(1); });
