/**
 * weapp-icons-verify.cjs — 验证本轮改动：
 * 1 故事首页夜间按钮两态  2 歌曲列表循环播放新胶囊  3 设置页新图标  4 家长中心隐私图标  5 孩子档案页
 */
const automator = require('miniprogram-automator');
const MPmod = require('miniprogram-automator/out/MiniProgram');
(MPmod.default || MPmod).prototype.checkVersion = async () => {};
const path = require('path');
const fs = require('fs');
const DIR = 'd:\\work\\work\\code\\testsuit\\公司\\工作区\\tmp\\测试截图\\weapp\\walk';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  fs.mkdirSync(DIR, { recursive: true });
  let mini;
  for (let i = 1; i <= 12; i++) {
    try { mini = await automator.connect({ wsEndpoint: 'ws://localhost:9423' }); break; }
    catch (e) { console.log(`retry ${i}`); await sleep(5000); }
  }
  if (!mini) throw new Error('connect failed');
  console.log('CONNECTED');
  await sleep(4000);
  const shot = async (n) => { await mini.screenshot({ path: path.join(DIR, n + '.png') }); console.log('SHOT', n); };
  const relaunch = async (u) => { try { await mini.reLaunch(u); } catch (e) { await mini.evaluate((x) => { wx.reLaunch({ url: x }); }, u); } await sleep(4000); };
  const navTo = async (u) => { try { await mini.navigateTo(u); } catch (e) { await mini.evaluate((x) => { wx.navigateTo({ url: x }); }, u); } await sleep(3000); };

  // 1 夜间按钮两态
  await relaunch('/pages/story/index/index');
  let page = await mini.currentPage();
  await shot('n1-首页日间态');
  const btn = await page.$('.sbtn');
  await btn.tap(); await sleep(2500);
  await shot('n2-首页夜间态-应显日间图标');
  const btn2 = await (await mini.currentPage()).$('.sbtn');
  await btn2.tap(); await sleep(2500); // 切回日间
  await shot('n3-切回日间态');

  // 2 歌曲列表循环播放胶囊（两级下钻到中文歌曲）
  await relaunch('/pages/song/index/index');
  page = await mini.currentPage();
  const tile = await page.$('.tilegrid .tile');
  if (tile) { await tile.tap(); await sleep(3000); }
  page = await mini.currentPage();
  let sub = await page.$('.tilegrid .tile');
  if (sub) { await sub.tap(); await sleep(3500); }
  page = await mini.currentPage();
  const pill = await page.$('.loop-pill');
  console.log('LOOP_PILL:', !!pill);
  await shot('n4-歌曲列表循环播放新胶囊');

  // 3 设置页
  await relaunch('/pages/common/settings/index');
  await shot('n5-设置页新图标');

  // 4 家长中心
  await relaunch('/pages/parent/index/index');
  await shot('n6-家长中心隐私图标');

  // 5 孩子档案
  await navTo('/pages/common/children/index');
  await shot('n7-孩子档案页');

  await mini.disconnect();
  console.log('DONE');
})().catch((e) => { console.error('FAILED:', String((e && e.message) || e).slice(0, 300)); process.exit(1); });
