// 验证通用 ShareBar 接入：歌曲首页 / 成长首页 / 故事首页 三处按钮存在且样式一致
const automator = require('miniprogram-automator');
const MPmod = require('miniprogram-automator/out/MiniProgram');
(MPmod.default || MPmod).prototype.checkVersion = async () => {};
const path = require('path');
const fs = require('fs');
const DIR = 'd:\\work\\work\\code\\testsuit\\公司\\工作区\\tmp\\测试截图\\weapp\\walk4';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  fs.mkdirSync(DIR, { recursive: true });
  const mini = await automator.connect({ wsEndpoint: 'ws://localhost:9423' });
  await sleep(2500);
  const check = async (name, tabUrl, shotName) => {
    try { await mini.switchTab(tabUrl); } catch (e) { await mini.evaluate((u) => { wx.switchTab({ url: u }); }, tabUrl); }
    await sleep(3500);
    const p = await mini.currentPage();
    const btn = await p.$('.share-bar');
    if (!btn) { console.log(`${name}: ❌ 无分享按钮`); return; }
    const s = await btn.size();
    const t = await btn.text();
    console.log(`${name}: ✓ "${t}" ${Math.round(s.width)}x${Math.round(s.height)}px`);
    await mini.screenshot({ path: path.join(DIR, shotName + '.png') });
  };
  await check('故事首页', '/pages/story/index/index', 'share-故事首页');
  await check('歌曲首页', '/pages/song/index/index', 'share-歌曲首页');
  await check('成长首页', '/pages/growth/index/index', 'share-成长首页');
  await check('家长中心', '/pages/parent/index/index', 'share-家长中心');
  await mini.disconnect();
  console.log('DONE');
})().catch((e) => { console.error('FAILED:', String((e && e.message) || e).slice(0, 200)); process.exit(1); });
