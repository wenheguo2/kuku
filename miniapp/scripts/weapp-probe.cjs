/**
 * weapp-probe.cjs — 白屏探针：evaluate 读当前路由/getApp/页面 data 与全局错误
 */
const automator = require('miniprogram-automator');
const MPmod = require('miniprogram-automator/out/MiniProgram');
(MPmod.default || MPmod).prototype.checkVersion = async () => {};
const PORT = process.argv[2] || '9423';
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
  try {
    const r = await withTimeout(mini.evaluate(() => {
      const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : null;
      return {
        hasApp: typeof getApp === 'function' && !!getApp(),
        pageCount: pages ? pages.length : -1,
        route: pages && pages.length ? pages[pages.length - 1].route : '(none)',
      };
    }), 15000, 'eval');
    console.log('probe:', JSON.stringify(r));
  } catch (e) { console.log('evaluate 失败:', String(e.message).slice(0, 80)); }
  try {
    const sys = await withTimeout(mini.systemInfo(), 10000, 'sys');
    console.log('SDKVersion:', sys.SDKVersion, 'platform:', sys.platform);
  } catch (e) { console.log('systemInfo 失败:', String(e.message).slice(0, 60)); }
  console.log('DONE');
  await mini.disconnect();
})().catch((e) => { console.error('FAILED:', String((e && e.message) || e).slice(0, 200)); process.exit(1); });
