/**
 * weapp-full-verify.cjs — 全流程逐页面截图验证（6步）
 */
const automator = require('miniprogram-automator');
const MPmod = require('miniprogram-automator/out/MiniProgram');
(MPmod.default || MPmod).prototype.checkVersion = async () => {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = 'd:/work/work/code/testsuit/公司/工作区/tmp/测试截图/weapp/final/';
const to = (p, ms, tag) => Promise.race([p, sleep(ms).then(() => { throw new Error('TO:' + tag); })]);
const fs = require('fs');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const mini = await automator.connect({ wsEndpoint: 'ws://localhost:9423' });
  console.log('CONNECTED');
  const nav = async (fn, tag) => { try { await to(fn(), 25000, tag); } catch (e) { console.log('nav:', tag, String(e.message).slice(0, 30)); } };
  const shot = async (name) => { await mini.screenshot({ path: OUT + name }); console.log('SHOT', name); };

  // 1 故事首页 + 迷你栏 + tabbar
  await nav(() => mini.switchTab('/pages/story/index/index'), 'home');
  await sleep(7000);
  await shot('01-home.png');

  // 2 点播放 → 播放器 → 返回首页（验 tabbar 恢复）
  let page = await to(mini.currentPage(), 10000, 'cp');
  const cp = await to(page.$('.list-row .cp'), 8000, 'cp').catch(() => null);
  if (cp) { await cp.tap(); await sleep(7000); await shot('02-player.png'); await nav(() => mini.navigateBack(), 'back'); await sleep(3000); await shot('03-home-back.png'); }

  // 3 成长首页 → 点字进教学 → 截图看退出键
  await nav(() => mini.switchTab('/pages/growth/index/index'), 'growth');
  await sleep(5000);
  page = await to(mini.currentPage(), 10000, 'cp2');
  const wcell = await to(page.$('.wcell'), 8000, 'wcell').catch(() => null);
  if (wcell) { await wcell.tap(); await sleep(10000); await shot('04-teach-eback.png'); await nav(() => mini.navigateBack(), 'back2'); await sleep(3000); }

  // 4 英语课表（验单词不溢出）
  const enUrl = `/pages/growth/lesson/index?subject=${encodeURIComponent('英语')}`;
  await nav(() => mini.navigateTo(enUrl), 'enlesson');
  await sleep(6000);
  await shot('05-en-lesson.png');
  await nav(() => mini.navigateBack(), 'back3');
  await sleep(2000);

  // 5 收集册（验空态）
  await nav(() => mini.navigateTo('/pages/growth/collection/index'), 'collection');
  await sleep(5000);
  await shot('06-collection.png');

  await mini.disconnect();
  console.log('DONE');
})().catch((e) => { console.error('FAILED:', String(e.message).slice(0, 100)); process.exit(1); });
