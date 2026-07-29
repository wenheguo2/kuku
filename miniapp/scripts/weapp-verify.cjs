/**
 * weapp-verify.cjs — 连接已开 IDE（不拉起不退出）：首页 tile 数 + 学科页分类封面 + 截图
 * 用法：node scripts/weapp-verify.cjs <port>
 */
const automator = require('miniprogram-automator');
const MPmod = require('miniprogram-automator/out/MiniProgram');
(MPmod.default || MPmod).prototype.checkVersion = async () => {};
const path = require('path');
const fs = require('fs');
const PORT = process.argv[2] || '9423';
const SHOT_DIR = 'd:\\work\\work\\code\\testsuit\\公司\\工作区\\tmp\\测试截图\\weapp';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const withTimeout = (p, ms, tag) => Promise.race([p, sleep(ms).then(() => { throw new Error('TIMEOUT:' + tag); })]);

(async () => {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  let mini;
  for (let i = 1; i <= 6; i++) {
    try { mini = await automator.connect({ wsEndpoint: 'ws://localhost:' + PORT }); break; }
    catch (e) { console.log(`retry ${i}/6`); await sleep(5000); }
  }
  if (!mini) throw new Error('connect failed（IDE 未开自动化端口）');
  console.log('CONNECTED');
  await sleep(2000);

  // 首页：真实索引 9 学科
  try { await withTimeout(mini.reLaunch('/pages/story/index/index'), 30000, 'relaunch'); } catch (e) { console.log('reLaunch:', e.message); }
  await sleep(5000);
  try {
    const page = await withTimeout(mini.currentPage(), 12000, 'cp');
    const tiles = await withTimeout(page.$$('.tilegrid .tile'), 12000, 'tiles');
    console.log('首页学科 tile 数(真实=9):', tiles.length);
  } catch (e) { console.log('首页查询失败:', String(e.message).slice(0, 60)); }
  try { await withTimeout(mini.screenshot({ path: path.join(SHOT_DIR, 'v10-home.png') }), 20000, 's1'); console.log('SHOT v10-home'); } catch (e) { console.log('shot1 fail'); }

  // 学科页：分类行真封面（.list-row .cvr 图片数）
  try { await withTimeout(mini.navigateTo('/pages/story/subject/index?subject=' + encodeURIComponent('上下五千年')), 30000, 'nav'); } catch (e) { console.log('nav:', e.message); }
  await sleep(5000);
  try {
    const page = await withTimeout(mini.currentPage(), 12000, 'cp2');
    const cvrs = await withTimeout(page.$$('.list-row .cvr'), 12000, 'cvrs');
    console.log('分类行封面图数(应=8):', cvrs.length);
    if (cvrs[0]) {
      const src = await withTimeout(cvrs[0].attribute('src'), 10000, 'src');
      console.log('首个封面 src:', String(src).slice(0, 90));
    }
  } catch (e) { console.log('学科页查询失败:', String(e.message).slice(0, 60)); }
  try { await withTimeout(mini.screenshot({ path: path.join(SHOT_DIR, 'v11-subject.png') }), 20000, 's2'); console.log('SHOT v11-subject'); } catch (e) { console.log('shot2 fail'); }
  console.log('DONE');
  await mini.disconnect();
})().catch((e) => { console.error('FAILED:', String((e && e.message) || e).slice(0, 200)); process.exit(1); });
