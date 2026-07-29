/**
 * weapp-nav.cjs — 空页面栈修复：循环 reLaunch 首页直到页面栈非空，再截图学科页
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
  const count = () => mini.evaluate(() => (typeof getCurrentPages === 'function' ? getCurrentPages().length : -1));
  for (let i = 1; i <= 8; i++) {
    let n = -1;
    try { n = await withTimeout(count(), 10000, 'count'); } catch (e) { /* ignore */ }
    console.log(`round ${i}: pageCount=${n}`);
    if (n > 0) break;
    try { await withTimeout(mini.reLaunch('/pages/story/index/index'), 25000, 'reLaunch'); } catch (e) { console.log('reLaunch err:', String(e.message).slice(0, 50)); }
    await sleep(6000);
  }
  await sleep(6000);
  await withTimeout(mini.screenshot({ path: path.join(SHOT_DIR, 'v30-home.png') }), 20000, 's1');
  console.log('SHOT v30-home');
  try { await withTimeout(mini.reLaunch('/pages/story/subject/index?subject=' + encodeURIComponent('上下五千年')), 25000, 'nav'); } catch (e) { console.log('nav err:', String(e.message).slice(0, 50)); }
  await sleep(7000);
  await withTimeout(mini.screenshot({ path: path.join(SHOT_DIR, 'v31-subject.png') }), 20000, 's2');
  console.log('SHOT v31-subject');
  console.log('DONE');
  await mini.disconnect();
})().catch((e) => { console.error('FAILED:', String((e && e.message) || e).slice(0, 200)); process.exit(1); });
