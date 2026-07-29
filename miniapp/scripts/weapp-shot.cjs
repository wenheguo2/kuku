/**
 * weapp-shot.cjs — 最小诊断：连接后仅截图当前模拟器画面 + 报当前页（不导航，避免 reLaunch 挂起）
 * 用法：node scripts/weapp-shot.cjs <port> <名字>
 */
const automator = require('miniprogram-automator');
const MPmod = require('miniprogram-automator/out/MiniProgram');
(MPmod.default || MPmod).prototype.checkVersion = async () => {};
const path = require('path');
const fs = require('fs');
const PORT = process.argv[2] || '9423';
const NAME = process.argv[3] || 'shot';
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
  await sleep(3000);
  try {
    const page = await withTimeout(mini.currentPage(), 15000, 'currentPage');
    console.log('当前页:', page ? page.path : '(null)');
  } catch (e) { console.log('currentPage 异常:', String(e.message).slice(0, 80)); }
  try {
    await withTimeout(mini.screenshot({ path: path.join(SHOT_DIR, NAME + '.png') }), 20000, 'screenshot');
    console.log('SHOT OK:', NAME + '.png');
  } catch (e) { console.log('截图异常:', String(e.message).slice(0, 80)); }
  console.log('DONE');
  await mini.disconnect();
})().catch((e) => { console.error('FAILED:', String((e && e.message) || e).slice(0, 200)); process.exit(1); });
