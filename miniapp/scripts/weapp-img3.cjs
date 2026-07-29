/**
 * weapp-img3.cjs — wx.getImageInfo 走图片管线直测（区分网络层 OK 但图片层失败的场景）
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
  const info = (url) => mini.evaluate((u) => new Promise((resolve) => {
    wx.getImageInfo({
      src: u,
      success: (r) => resolve('OK ' + r.width + 'x' + r.height + ' type=' + r.type),
      fail: (e) => resolve('FAIL ' + (e && e.errMsg)),
    });
    setTimeout(() => resolve('TIMEOUT-10s'), 10000);
  }), url);
  const enc = (p) => p.split('/').map(encodeURIComponent).join('/');
  console.log('webp编码路径:', await withTimeout(info('http://localhost:3000/static/' + enc('illustrations/covers/generated/上下五千年/上下五千年.webp')), 20000, 'a'));
  console.log('localhost png(非webp无中文):', await withTimeout(info('http://localhost:3000/static/' + enc('illustrations/covers/generated/载入1.png')), 20000, 'b'));
  console.log('127.0.0.1 webp:', await withTimeout(info('http://127.0.0.1:3000/static/' + enc('illustrations/covers/generated/上下五千年/上下五千年.webp')), 20000, 'c'));
  console.log('https 公网图:', await withTimeout(info('https://res.wx.qq.com/wxdoc/dist/assets/img/demo.ef5c5bef.jpg'), 20000, 'd'));
  console.log('DONE');
  await mini.disconnect();
})().catch((e) => { console.error('FAILED:', String((e && e.message) || e).slice(0, 200)); process.exit(1); });
