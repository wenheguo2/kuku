/**
 * weapp-verify3.cjs — ①教学页退出键实操 ②tabbar 延迟时序复现（真实点击路径）
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

  // ① 教学页退出键实操（当前已在教学页）
  let page = await to(mini.currentPage(), 10000, 'cp');
  console.log('当前页:', page.path);
  if (page.path.includes('growth/player')) {
    const back = await to(page.$('.eback'), 8000, 'eback').catch(() => null);
    console.log('退出键存在:', !!back);
    if (back) { await back.tap(); await sleep(4000); page = await to(mini.currentPage(), 10000, 'cp2'); console.log('退出后页面:', page.path); }
  }

  // ② tabbar 时序：首页 → 真实点击播放钮 → 播放器左上返回 → 连拍
  await nav(() => mini.switchTab('/pages/story/index/index'), 'home');
  await sleep(6000);
  page = await to(mini.currentPage(), 10000, 'cp3');
  const cp = await to(page.$('.list-row .cp'), 8000, 'cp-btn').catch(() => null);
  if (!cp) { console.log('未找到播放钮'); await mini.disconnect(); return; }
  await cp.tap();
  await sleep(7000);
  page = await to(mini.currentPage(), 10000, 'cp4');
  console.log('播放器页:', page.path);
  // 点左上 down 返回（pnav 第一个可点 View）
  const downBtn = await to(page.$('.pnav view'), 8000, 'down').catch(() => null);
  if (downBtn) { await downBtn.tap(); } else { await nav(() => mini.navigateBack(), 'back'); }
  await sleep(300);
  await mini.screenshot({ path: OUT + 't0.png' }); console.log('SHOT t0(+0.3s)');
  await sleep(1700);
  await mini.screenshot({ path: OUT + 't2.png' }); console.log('SHOT t2(+2s)');
  await sleep(3000);
  await mini.screenshot({ path: OUT + 't5.png' }); console.log('SHOT t5(+5s)');
  await mini.disconnect();
  console.log('DONE');
})().catch((e) => { console.error('FAILED:', String(e.message).slice(0, 100)); process.exit(1); });
