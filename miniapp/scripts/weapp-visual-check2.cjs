/** weapp-visual-check2.cjs — 视觉回归2：首页分享条 / 家长中心新图标+分享条 / 设置页新图标 / 迷你栏两态 / 歌曲播放器分享chip */
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

  await go('/pages/story/index/index');
  await sleep(1500);
  await shot('w201-首页-分享条');

  await go('/pages/parent/index/index');
  await shot('w202-家长中心-新图标+分享条');

  await go('/pages/common/settings/index');
  await shot('w203-设置页-新图标');

  // 播放故事 → 返回 → 迷你栏两态图
  await mini.evaluate(() => wx.navigateTo({ url: '/pages/story/player/index?path=' + encodeURIComponent('上下五千年/E1成语故事/责无旁贷') + '&title=' + encodeURIComponent('责无旁贷') }));
  await sleep(4500);
  await shot('w204-故事灯-分享真按钮');
  try { await mini.navigateBack(); } catch (e) {}
  await sleep(2000);
  await shot('w205-返回后-迷你栏播放中态');

  // 歌曲播放器分享 chip
  await go('/pages/song/player/index');
  await sleep(2000);
  await shot('w206-歌曲播放器-分享chip');
  await mini.disconnect();
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
