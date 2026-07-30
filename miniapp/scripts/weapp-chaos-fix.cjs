/**
 * weapp-chaos-fix.cjs — 混沌测试三处修复回归
 * 1 超长搜索词空态截断  2 章回作品页坏参数不显空壳头  3 播放正常时不误报"加载失败"
 */
const automator = require('miniprogram-automator');
const MPmod = require('miniprogram-automator/out/MiniProgram');
(MPmod.default || MPmod).prototype.checkVersion = async () => {};
const path = require('path');
const fs = require('fs');
const DIR = 'd:\\work\\work\\code\\testsuit\\公司\\工作区\\tmp\\测试截图\\weapp\\walk3';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const say = console.log;

(async () => {
  fs.mkdirSync(DIR, { recursive: true });
  let mini;
  for (let i = 0; i < 12; i++) {
    try { mini = await automator.connect({ wsEndpoint: 'ws://localhost:9423' }); break; }
    catch (e) { await sleep(5000); }
  }
  say('CONNECTED');
  await sleep(4000);
  const shot = async (n) => { try { await mini.screenshot({ path: path.join(DIR, n + '.png') }); say('SHOT ' + n); } catch (e) { say('SHOT_FAIL ' + n); } };
  const relaunch = async (u) => { try { await mini.reLaunch(u); } catch (e) { await mini.evaluate((x) => { wx.reLaunch({ url: x }); }, u); } await sleep(3500); };

  // 1 超长搜索词截断
  await relaunch('/pages/common/search/index?scope=story');
  let p = await mini.currentPage();
  const inp = await p.$('input');
  await inp.input('三国'.repeat(50));
  await sleep(2500);
  await shot('fix1-超长搜索词截断');

  // 2 章回作品页坏参数
  await relaunch('/pages/story/work/index');
  await sleep(1500);
  p = await mini.currentPage();
  const head = await p.$('.sbhead');
  say('BAD_PARAM_HEAD_EXISTS: ' + !!head + ' (期望 false)');
  await shot('fix2-章回坏参数无空壳头');

  // 3 播放正常时不误报失败：进正常故事播放 → 等 6s 看提示文案
  await relaunch('/pages/story/index/index');
  await sleep(2000);
  p = await mini.currentPage();
  const cont = await p.$('.cont');
  if (cont) {
    await cont.tap(); await sleep(6000);
    p = await mini.currentPage();
    const sub = await p.$('.psub-lg');
    const txt = sub ? await sub.text() : '(无提示区)';
    const bam = await mini.evaluate(() => { const b = wx.getBackgroundAudioManager(); return { paused: b.paused, dur: Math.round(b.duration || 0) }; });
    say('SUB_TEXT: ' + txt);
    say('BAM: ' + JSON.stringify(bam));
    say(txt.includes('加载失败') ? '❌ 仍误报失败' : '✔ 播放中无误报');
    await shot('fix3-播放中提示正常');
  } else say('无最近播放卡，跳过');

  await mini.disconnect();
  say('DONE');
})().catch((e) => { console.error('FAILED:', String((e && e.message) || e).slice(0, 300)); process.exit(1); });
