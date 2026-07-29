/**
 * weapp-eland2.cjs — 教学页白屏诊断：console 监听 + DOM 探测（.eland/.wcard/.esceneL）
 */
const automator = require('miniprogram-automator');
const MPmod = require('miniprogram-automator/out/MiniProgram');
(MPmod.default || MPmod).prototype.checkVersion = async () => {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const withTimeout = (p, ms, tag) => Promise.race([p, sleep(ms).then(() => { throw new Error('TIMEOUT:' + tag); })]);

(async () => {
  const mini = await automator.connect({ wsEndpoint: 'ws://localhost:9423' });
  console.log('CONNECTED');
  mini.on('console', (msg) => {
    const t = (msg && msg.type) || '?';
    if (t === 'error' || t === 'warn') {
      const args = (msg.args || []).map((a) => { try { return typeof a === 'string' ? a : JSON.stringify(a); } catch { return String(a); } }).join(' ');
      console.log(`[${t}]`, String(args).slice(0, 200));
    }
  });
  await sleep(2000);
  try {
    const page = await withTimeout(mini.currentPage(), 12000, 'cp');
    console.log('page:', page.path);
    for (const sel of ['.eland', '.esceneL', '.wcard .w', '.esub-r .txt', '.ectrl']) {
      const el = await withTimeout(page.$(sel), 8000, sel).catch(() => null);
      if (!el) { console.log(sel, '-> 不存在'); continue; }
      let txt = '';
      try { txt = await withTimeout(el.text(), 5000, 'txt'); } catch { txt = '(no text)'; }
      let size = null;
      try { size = await withTimeout(el.size(), 5000, 'size'); } catch { size = null; }
      console.log(sel, '-> 存在', size ? `${size.width}x${size.height}` : '', String(txt).slice(0, 30));
    }
  } catch (e) { console.log('探测失败:', String(e.message).slice(0, 80)); }
  await sleep(5000);
  console.log('DONE');
  await mini.disconnect();
})().catch((e) => { console.error('FAILED:', String(e.message).slice(0, 120)); process.exit(1); });
