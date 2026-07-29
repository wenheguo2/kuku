/**
 * weapp-home.cjs — 模拟器内直拉 _home.json 看 hot[0]（判定网络层新旧）+ 读页面 hero 文本
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
    const r = await withTimeout(mini.evaluate(() => new Promise((resolve) => {
      wx.request({
        url: 'http://localhost:3000/static/index/generated_stories/_home.json',
        dataType: 'json',
        success: (res) => resolve({ status: res.statusCode, hot0: res.data && res.data.hot && res.data.hot[0] && res.data.hot[0].title, generated: res.data && res.data.generated_at }),
        fail: (e) => resolve({ fail: e && e.errMsg }),
      });
      setTimeout(() => resolve({ timeout: true }), 10000);
    })), 20000, 'req');
    console.log('模拟器拉 _home.json:', JSON.stringify(r));
  } catch (e) { console.log('evaluate 失败:', String(e.message).slice(0, 60)); }
  try {
    const page = await withTimeout(mini.currentPage(), 12000, 'cp');
    console.log('当前页:', page.path);
    const t = await withTimeout(page.$('.hero .h-title'), 10000, 'hero');
    if (t) console.log('页面 hero 标题:', await withTimeout(t.text(), 10000, 'txt'));
    const img = await withTimeout(page.$('.hero .cover'), 10000, 'img');
    if (img) {
      const src = await withTimeout(img.attribute('src'), 10000, 'src').catch(() => '(读不到)');
      console.log('hero 封面 src:', decodeURIComponent(String(src)).slice(-70));
    } else console.log('hero 无 Image(兜底 View)');
  } catch (e) { console.log('页面查询失败:', String(e.message).slice(0, 60)); }
  console.log('DONE');
  await mini.disconnect();
})().catch((e) => { console.error('FAILED:', String((e && e.message) || e).slice(0, 200)); process.exit(1); });
