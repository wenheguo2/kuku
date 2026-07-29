/**
 * weapp-img.cjs — weapp 内直测封面图 URL 连通性（wx.request 拿 statusCode/Content-Type）
 * 用法：node scripts/weapp-img.cjs <port>
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
  const test = (url) => mini.evaluate((u) => new Promise((resolve) => {
    wx.request({
      url: u,
      responseType: 'arraybuffer',
      success: (res) => resolve('OK ' + res.statusCode + ' type=' + ((res.header && (res.header['Content-Type'] || res.header['content-type'])) || '?') + ' bytes=' + (res.data && res.data.byteLength)),
      fail: (err) => resolve('FAIL ' + (err && err.errMsg)),
    });
    setTimeout(() => resolve('TIMEOUT-10s'), 10000);
  }), url);
  const enc = (p) => p.split('/').map(encodeURIComponent).join('/');
  const img1 = 'http://localhost:3000/static/' + enc('illustrations/covers/generated/上下五千年/E1成语故事/E1成语故事.webp');
  console.log('分类封面:', await withTimeout(test(img1), 20000, 'img1'));
  const img2 = 'http://localhost:3000/static/' + enc('illustrations/covers/generated/上下五千年/E1成语故事/责无旁贷/责无旁贷.webp');
  console.log('故事封面:', await withTimeout(test(img2), 20000, 'img2'));
  console.log('DONE');
  await mini.disconnect();
})().catch((e) => { console.error('FAILED:', String((e && e.message) || e).slice(0, 200)); process.exit(1); });
