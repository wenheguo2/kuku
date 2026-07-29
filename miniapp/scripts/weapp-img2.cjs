/**
 * weapp-img2.cjs — 首页停留 12s 后截图 + 读 hero/章回卡 Image 实际 src
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
  await sleep(12000); // 给足图片加载时间
  try {
    const page = await withTimeout(mini.currentPage(), 12000, 'cp');
    console.log('当前页:', page.path);
    const heroImg = await withTimeout(page.$('.hero .cover'), 10000, 'hero');
    if (heroImg) {
      const src = await withTimeout(heroImg.attribute('src'), 10000, 'src');
      console.log('hero src:', String(src).slice(0, 120));
    } else console.log('hero .cover 不存在(可能兜底 View)');
    const card = await withTimeout(page.$('.scard .cvr'), 10000, 'scard');
    if (card) {
      const tag = await withTimeout(card.attribute('src'), 10000, 'src2').catch(() => '(无src=兜底View)');
      console.log('章回卡 src:', String(tag).slice(0, 120));
    }
  } catch (e) { console.log('查询失败:', String(e.message).slice(0, 80)); }
  await withTimeout(mini.screenshot({ path: path.join(SHOT_DIR, 'v12-home-after12s.png') }), 20000, 'shot');
  console.log('SHOT v12');
  console.log('DONE');
  await mini.disconnect();
})().catch((e) => { console.error('FAILED:', String((e && e.message) || e).slice(0, 200)); process.exit(1); });
