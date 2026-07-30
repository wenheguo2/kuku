/** weapp-regress.cjs — 回归验证：设置页seg视觉/深色切换生效/迷你栏中部位置 */
const automator = require('miniprogram-automator');
const MPmod = require('miniprogram-automator/out/MiniProgram');
(MPmod.default || MPmod).prototype.checkVersion = async () => {};
const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const DIR = 'd:\\work\\work\\code\\testsuit\\公司\\工作区\\tmp\\测试截图\\weapp\\walk';

(async () => {
  const mini = await automator.connect({ wsEndpoint: 'ws://localhost:9423' });
  await sleep(3000);
  const shot = (n) => mini.screenshot({ path: path.join(DIR, n + '.png') });
  const go = async (url) => { try { await mini.reLaunch(url); } catch (e) { await mini.evaluate((u) => wx.reLaunch({ url: u }), url); } await sleep(2500); };

  // 1. 设置页视觉 + 主题选中态
  await go('/pages/common/settings/index');
  let page = await mini.currentPage();
  const segItems = await page.$$('.seg .s');
  console.log('seg 分段数:', segItems.length);
  for (const s of segItems.slice(0, 3)) {
    const cls = await s.attribute('class');
    console.log('  chip:', (await s.text()), '| class:', cls);
  }
  await shot('z01-设置页-修复后');

  // 2. 点“深色” → 主题即时生效
  for (const s of segItems) {
    if ((await s.text()) === '深色') { await s.tap(); break; }
  }
  await sleep(1200);
  await shot('z02-设置页-点深色后');
  // 回首页验证全局夜间
  await go('/pages/story/index/index');
  page = await mini.currentPage();
  const root = await page.$('.page-v4');
  console.log('首页根类(期待含 theme-dark 的父级):', root ? await root.attribute('class') : 'null');
  await shot('z03-首页-深色主题');

  // 3. 播放故事 → 返回 → 迷你栏位置
  await mini.evaluate(() => wx.navigateTo({ url: '/pages/story/player/index?path=' + encodeURIComponent('上下五千年/E1成语故事/责无旁贷') + '&title=' + encodeURIComponent('责无旁贷') }));
  await sleep(4500);
  try { await mini.navigateBack(); } catch (e) {}
  await sleep(2000);
  page = await mini.currentPage();
  const fab = await page.$('.mini-fab');
  if (fab) {
    const o = await fab.offset(); const s = await fab.size();
    const sys = await mini.systemInfo();
    console.log(`迷你栏 top=${o.top} (窗口高 ${sys.windowHeight}) → ${(o.top / sys.windowHeight * 100).toFixed(0)}% 高度处`);
  } else console.log('迷你栏未找到');
  await shot('z04-返回后-迷你栏+TabBar-深色');

  // 4. 主题切回跟随
  await go('/pages/common/settings/index');
  page = await mini.currentPage();
  const seg2 = await page.$$('.seg .s');
  for (const s of seg2) { if ((await s.text()) === '跟随') { await s.tap(); break; } }
  await sleep(800);
  await shot('z05-设置页-切回跟随');
  await mini.disconnect();
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
