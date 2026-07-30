/**
 * weapp-verify2.cjs — 本轮批改 weapp 端全量目验：
 * 1 首页(播放钮三角/换一个钮) 2 搜索歌曲"刘备" 3 教学英语课(今日单词+立绘均分)
 * 4 音乐厅(你的播放列表+分类排序) 5 播放故事回首页(迷你栏)
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
  const shot = async (name) => { await mini.screenshot({ path: OUT + name }); console.log('SHOT', name); };
  const nav = async (fn, tag) => { try { await to(fn(), 25000, tag); } catch (e) { console.log('nav-warn', tag, String(e.message).slice(0, 30)); } };

  // 1 首页
  await nav(() => mini.reLaunch('/pages/story/index/index'), 'home');
  await sleep(9000);
  await shot('w2-home.png');

  // 2 搜索歌曲：刘备
  await nav(() => mini.navigateTo('/pages/common/search/index?scope=song'), 'search');
  await sleep(4000);
  try {
    const page = await to(mini.currentPage(), 10000, 'cp');
    const chips = await to(page.$$('.chip'), 8000, 'chips');
    for (const c of chips) {
      const t = await c.text();
      if (t && t.trim() === '刘备') { await c.tap(); break; }
    }
    await sleep(4000);
  } catch (e) { console.log('search-warn', String(e.message).slice(0, 40)); }
  await shot('w3-search-liubei.png');

  // 3 教学英语课（中阶不锁初阶免费）
  const enPath = encodeURIComponent('学科启蒙/F2英语/英语0：单词animal');
  await nav(() => mini.reLaunch(`/pages/growth/player/index?subject=${encodeURIComponent('英语')}&word=animal&path=${enPath}&study_type=study1`), 'en');
  await sleep(12000);
  await shot('w4-en-word.png');

  // 4 音乐厅
  await nav(() => mini.reLaunch('/pages/song/index/index'), 'song');
  await sleep(8000);
  await shot('w5-songhome.png');

  // 5 播放一个故事再回首页看迷你栏
  const sPath = encodeURIComponent('上下五千年/E4神话故事/哪吒');
  await nav(() => mini.reLaunch(`/pages/story/player/index?path=${sPath}&title=${encodeURIComponent('哪吒')}`), 'play');
  await sleep(9000);
  await shot('w6-player.png');
  await nav(() => mini.switchTab('/pages/story/index/index'), 'back');
  await sleep(6000);
  await shot('w7-home-minibar.png');

  await mini.disconnect();
  console.log('DONE');
})().catch((e) => { console.error('FAILED:', String(e.message).slice(0, 100)); process.exit(1); });
