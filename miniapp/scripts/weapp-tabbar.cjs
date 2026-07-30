/**
 * weapp-tabbar.cjs — 复现"点播放按钮后底部 tabbar 消失"：
 * switchTab 首页 → navigateTo 播放器 → navigateBack 回首页 → 截图查 tabbar
 */
const automator = require('miniprogram-automator');
const MPmod = require('miniprogram-automator/out/MiniProgram');
(MPmod.default || MPmod).prototype.checkVersion = async () => {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = 'd:/work/work/code/testsuit/公司/工作区/tmp/测试截图/weapp/';
const to = (p, ms, tag) => Promise.race([p, sleep(ms).then(() => { throw new Error('TO:' + tag); })]);

(async () => {
  const mini = await automator.connect({ wsEndpoint: 'ws://localhost:9423' });
  console.log('CONNECTED');
  const nav = async (fn, tag) => { try { await to(fn(), 25000, tag); } catch (e) { console.log('nav-warn', tag, String(e.message).slice(0, 30)); } };

  await nav(() => mini.switchTab('/pages/story/index/index'), 'home');
  await sleep(6000);
  const sPath = encodeURIComponent('上下五千年/E4神话故事/哪吒');
  await nav(() => mini.navigateTo(`/pages/story/player/index?path=${sPath}&title=${encodeURIComponent('哪吒')}`), 'play');
  await sleep(8000);
  await nav(() => mini.navigateBack(), 'back');
  await sleep(5000);
  const page = await to(mini.currentPage(), 10000, 'cp');
  console.log('route:', page.path);
  await mini.screenshot({ path: OUT + 'w8-tabbar-check.png' });
  console.log('SHOT w8-tabbar-check.png');
  await mini.disconnect();
})().catch((e) => { console.error('FAILED:', String(e.message).slice(0, 100)); process.exit(1); });
