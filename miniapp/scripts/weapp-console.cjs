/**
 * weapp-console.cjs — 监听模拟器 console/exception，再 reLaunch 触发，抓白屏真凶
 */
const automator = require('miniprogram-automator');
const MPmod = require('miniprogram-automator/out/MiniProgram');
(MPmod.default || MPmod).prototype.checkVersion = async () => {};
const PORT = process.argv[2] || '9423';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  let mini;
  for (let i = 1; i <= 6; i++) {
    try { mini = await automator.connect({ wsEndpoint: 'ws://localhost:' + PORT }); break; }
    catch (e) { console.log(`retry ${i}/6`); await sleep(5000); }
  }
  if (!mini) throw new Error('connect failed');
  console.log('CONNECTED');
  mini.on('console', (msg) => {
    const t = (msg && msg.type) || '?';
    if (t === 'error' || t === 'warn') {
      const args = (msg.args || []).map((a) => { try { return typeof a === 'string' ? a : JSON.stringify(a); } catch { return String(a); } }).join(' ');
      console.log(`[console.${t}]`, String(args).slice(0, 300));
    }
  });
  mini.on('exception', (exp) => {
    console.log('[exception]', String((exp && (exp.message || exp.errMsg)) || exp).slice(0, 300));
  });
  try { await mini.reLaunch('/pages/story/index/index'); } catch (e) { console.log('reLaunch err(忽略):', String(e.message).slice(0, 60)); }
  await sleep(15000);
  console.log('DONE');
  await mini.disconnect();
})().catch((e) => { console.error('FAILED:', String((e && e.message) || e).slice(0, 200)); process.exit(1); });
