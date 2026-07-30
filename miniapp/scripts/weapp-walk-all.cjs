/**
 * weapp-walk-all.cjs — 全页面逐按钮自动化走查（功能+视觉）
 * 用法：node scripts/weapp-walk-all.cjs [phase]   phase: story|song|growth|parent|all(默认)
 * 每步截图落盘 工作区/tmp/测试截图/weapp/walk/，异常不中断（step 包装），最后输出 walk-result.log
 */
const automator = require('miniprogram-automator');
const MPmod = require('miniprogram-automator/out/MiniProgram');
(MPmod.default || MPmod).prototype.checkVersion = async () => {};
const path = require('path');
const fs = require('fs');

const PHASE = process.argv[2] || 'all';
const DIR = 'd:\\work\\work\\code\\testsuit\\公司\\工作区\\tmp\\测试截图\\weapp\\walk';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = [];
const say = (s) => { console.log(s); log.push(s); };

let mini;
const shot = async (name) => {
  try { await mini.screenshot({ path: path.join(DIR, name + '.png') }); say('📷 ' + name); }
  catch (e) { say('📷❌ ' + name + ': ' + e.message); }
};
const step = async (name, fn) => {
  try { await fn(); say('✔ ' + name); }
  catch (e) { say('❌ ' + name + ': ' + String(e.message).slice(0, 120)); }
};
const nav = async (url) => {
  try { await mini.navigateTo(url); }
  catch (e) { await mini.evaluate((u) => { wx.navigateTo({ url: u }); }, url); }
  await sleep(2000);
};
const relaunch = async (url) => {
  try { await mini.reLaunch(url); }
  catch (e) { await mini.evaluate((u) => { wx.reLaunch({ url: u }); }, url); }
  await sleep(2500);
};
const swTab = async (url) => {
  try { await mini.switchTab(url); }
  catch (e) { await mini.evaluate((u) => { wx.switchTab({ url: u }); }, url); }
  await sleep(1500);
};
const back = async () => {
  try { await mini.navigateBack(); } catch (e) { /* 已在根 */ }
  await sleep(1500);
};
const cur = async () => { try { const p = await mini.currentPage(); return p ? p.path : '(null)'; } catch (e) { return '(err)'; } };
const tapSel = async (sel, idx = 0) => {
  const page = await mini.currentPage();
  const els = await page.$$(sel);
  if (!els || els.length <= idx) throw new Error(`未找到 ${sel}[${idx}]`);
  await els[idx].tap();
  await sleep(1500);
};
const tapText = async (sel, kw) => {
  const page = await mini.currentPage();
  const els = await page.$$(sel);
  for (const el of els) {
    const t = await el.text();
    if (t && t.includes(kw)) { await el.tap(); await sleep(1500); return t; }
  }
  throw new Error(`未找到含"${kw}"的 ${sel}`);
};
const measure = async (sel) => {
  const page = await mini.currentPage();
  const el = await page.$(sel);
  if (!el) return null;
  const o = await el.offset(); const s = await el.size();
  return { top: o.top, left: o.left, w: s.width, h: s.height };
};

// ---------- Phase: story ----------
async function walkStory() {
  say('===== 故事 Tab (S-01~S-06 / PL-01) =====');
  await relaunch('/pages/story/index/index');
  await shot('s01-故事首页');

  await step('S-01 搜索入口→C-05 搜索页', async () => {
    await tapSel('.sbtn');
    say('  页: ' + await cur());
    await shot('s02-搜索页');
    // 输入关键词联想
    const page = await mini.currentPage();
    const input = await page.$('input');
    if (input) { await input.input('三国'); await sleep(1500); await shot('s03-搜索联想-三国'); }
    await back();
  });

  await step('S-01 换一换按钮', async () => {
    await tapText('.sec-h .m', '换一换');
    await shot('s04-换一换后');
  });

  await step('S-01 学科tile→S-02/S-03 下钻', async () => {
    await tapSel('.tilegrid .tile', 0);
    say('  学科页: ' + await cur());
    await shot('s05-学科页');
    // 点第一个分类行进列表
    const page = await mini.currentPage();
    const rows = await page.$$('.list-row');
    const cats = await page.$$('.cat-row');
    if (rows.length) { await rows[0].tap(); } else if (cats.length) { await cats[0].tap(); } else { const any = await page.$$('.tile'); if (any.length) await any[0].tap(); }
    await sleep(2000);
    say('  列表页: ' + await cur());
    await shot('s06-故事列表页');
  });

  await step('S-03→PL-01 播放故事', async () => {
    const page = await mini.currentPage();
    const rows = await page.$$('.list-row');
    if (!rows.length) throw new Error('列表页无条目');
    await rows[0].tap();
    await sleep(4000);
    say('  播放器: ' + await cur());
    await shot('s07-故事播放器');
  });

  await step('PL-01 播放/暂停/倍速/收藏按钮', async () => {
    const page = await mini.currentPage();
    const main = await page.$('.pbtn.main');
    if (main) { await main.tap(); await sleep(600); await main.tap(); await sleep(600); }
    const fns = await page.$$('.pfns .fn');
    if (fns[2]) { await fns[2].tap(); await sleep(500); } // 倍速
    if (fns[0]) { await fns[0].tap(); await sleep(1200); } // 收藏
    await shot('s08-播放器操作后');
    const bam = await mini.evaluate(() => { const b = wx.getBackgroundAudioManager(); return { paused: b.paused, rate: b.playbackRate, src: (b.src || '').slice(-40) }; });
    say('  BAM: ' + JSON.stringify(bam));
  });

  await step('★返回后迷你栏位置 + TabBar完整性（用户反馈问题）', async () => {
    await back(); // 回列表
    await shot('s09-返回列表-迷你栏');
    const fab = await measure('.mini-fab');
    say('  迷你栏 offset: ' + JSON.stringify(fab));
    // 回 tab 首页看 tabbar
    await swTab('/pages/story/index/index');
    await sleep(1000);
    await shot('s10-回首页-迷你栏+TabBar');
    const fab2 = await measure('.mini-fab');
    const sys = await mini.systemInfo();
    say(`  首页迷你栏: ${JSON.stringify(fab2)} 窗口高: ${sys.windowHeight}`);
  });
}

// ---------- Phase: song ----------
async function walkSong() {
  say('===== 歌曲 Tab (M-01~M-03 / PL-02) =====');
  await swTab('/pages/song/index/index');
  await shot('m01-歌曲首页');

  await step('M-01 hero 我收藏的歌', async () => {
    await tapSel('.hero');
    say('  页: ' + await cur());
    await shot('m02-hero点击后');
    if ((await cur()).includes('favorites')) await back();
    else if ((await cur()).includes('login')) await back();
  });

  await step('M-01 分类tile→M-02 子类→M-03 列表→PL-02 播放', async () => {
    await swTab('/pages/song/index/index');
    await tapSel('.tilegrid .tile', 0);
    say('  分类页: ' + await cur());
    await shot('m03-歌曲分类');
    // 两级自适应：子类 tiles 则再下钻一层
    let page = await mini.currentPage();
    const subTiles = await page.$$('.tilegrid .tile');
    if (subTiles.length) { await subTiles[0].tap(); await sleep(2500); say('  子类列表: ' + await cur()); await shot('m03b-歌曲列表'); }
    page = await mini.currentPage();
    const rows = await page.$$('.list-row');
    if (rows.length) { await rows[0].tap(); await sleep(3500); }
    say('  播放器: ' + await cur());
    await shot('m04-歌曲播放器');
  });

  await step('PL-02 模式/倍速/上下首按钮', async () => {
    const page = await mini.currentPage();
    if (!(await cur()).includes('song/player')) throw new Error('不在歌曲播放器');
    await tapText('.chip', '播放').catch(() => tapText('.chip', '循环'));
    await tapText('.chip', '倍速');
    const cb = await page.$$('.cbtn');
    if (cb.length >= 3) { await cb[2].tap(); await sleep(1500); } // 下一首
    await shot('m05-歌曲操作后');
    await back();
  });
}

// ---------- Phase: growth ----------
async function walkGrowth() {
  say('===== 成长 Tab (G-01~G-06 / PL-03) =====');
  await swTab('/pages/growth/index/index');
  await shot('g01-成长首页');

  await step('G-01 字格→PL-03 教学播放器(横屏)', async () => {
    await tapSel('.wgrid .wcell', 0);
    await sleep(3000);
    say('  教学播放器: ' + await cur());
    await shot('g02-教学播放器');
    const page = await mini.currentPage();
    const card = await page.$('.wcard');
    if (card) { await card.tap(); await sleep(800); }
    await shot('g03-教学播放器-点字卡后');
    const back1 = await page.$('.eback');
    if (back1) { await back1.tap(); await sleep(1500); } else { await back(); }
  });

  await step('G-02 学科入口→课程列表→学习/挑战按钮', async () => {
    await swTab('/pages/growth/index/index');
    await tapSel('.grow3 .gstat', 0);
    await sleep(2500);
    say('  课程页: ' + await cur());
    await shot('g04-课程列表');
    // 课程卡内找 “学习/挑战” chips
    await tapText('view', '学习 1').catch(() => tapText('text', '学习 1')).catch(() => tapText('view', '学习1')).catch(() => {});
    await sleep(2500);
    say('  点学习后: ' + await cur());
    await shot('g05-学习1后');
    if ((await cur()).includes('growth/player')) { const p = await mini.currentPage(); const b = await p.$('.eback'); if (b) { await b.tap(); await sleep(1500); } else await back(); }
  });

  await step('G-04 挑战页答题', async () => {
    if (!(await cur()).includes('growth/lesson')) { await swTab('/pages/growth/index/index'); await tapSel('.grow3 .gstat', 0); await sleep(2000); }
    await tapText('view', '挑战').catch(() => tapText('text', '挑战'));
    await sleep(2500);
    say('  挑战页: ' + await cur());
    await shot('g06-挑战页');
    const page = await mini.currentPage();
    const opts = await page.$$('.opt-card');
    if (opts.length) { await opts[0].tap(); await sleep(1800); await shot('g07-答题后'); }
    if ((await cur()).includes('challenge')) await back();
    await back();
  });

  await step('综合挑战页', async () => {
    await swTab('/pages/growth/index/index');
    await tapText('.frow', '综合挑战');
    await sleep(2500);
    say('  页: ' + await cur());
    await shot('g08-综合挑战');
    if ((await cur()).includes('comprehensive')) await back();
  });

  await step('朋友收集册', async () => {
    await swTab('/pages/growth/index/index');
    await tapText('.frow', '收集册');
    await sleep(2500);
    say('  页: ' + await cur());
    await shot('g09-朋友收集册');
    if ((await cur()).includes('collection')) await back();
  });
}

// ---------- Phase: parent ----------
async function walkParent() {
  say('===== 家长 Tab (C-01~C-06 / A-01~A-05) =====');
  await swTab('/pages/parent/index/index');
  await shot('p01-家长中心');

  const entries = [
    ['历史', 'p02-播放历史'],
    ['收藏', 'p03-我的收藏'],
    ['档案', 'p04-孩子档案'],
    ['会员', 'p05-会员页'],
  ];
  for (const [kw, name] of entries) {
    await step('家长中心入口: ' + kw, async () => {
      await swTab('/pages/parent/index/index');
      await tapText('view', kw).catch(() => tapText('text', kw));
      await sleep(2000);
      say('  页: ' + await cur());
      await shot(name);
      await back();
    });
  }

  await step('C-06 设置页 + 主题切换(夜间视觉)', async () => {
    await swTab('/pages/parent/index/index');
    await tapText('view', '设置').catch(() => tapText('text', '设置'));
    await sleep(2000);
    await shot('p06-设置页-浅色');
    // 切深色
    await tapText('.chip', '深色').catch(() => tapText('view', '深色'));
    await sleep(1200);
    await shot('p07-设置页-深色');
    // 回首页看全局夜间
    await swTab('/pages/story/index/index');
    await shot('p08-首页-深色主题');
    // 切回跟随系统
    await swTab('/pages/parent/index/index');
    await tapText('view', '设置').catch(() => tapText('text', '设置'));
    await sleep(1500);
    await tapText('.chip', '跟随').catch(() => tapText('view', '跟随'));
    await sleep(800);
    await back();
  });

  await step('A-05 注销入口 + 协议页', async () => {
    await nav('/pages/common/agreement/index?type=user');
    await shot('p09-用户协议页');
    await back();
    await nav('/pages/common/account-delete/index');
    await shot('p10-账号注销页');
    await back();
  });
}

(async () => {
  fs.mkdirSync(DIR, { recursive: true });
  mini = await automator.connect({ wsEndpoint: 'ws://localhost:9423' });
  say('已连接自动化端口, phase=' + PHASE);
  await sleep(2000);
  if (PHASE === 'all' || PHASE === 'story') await walkStory();
  if (PHASE === 'all' || PHASE === 'song') await walkSong();
  if (PHASE === 'all' || PHASE === 'growth') await walkGrowth();
  if (PHASE === 'all' || PHASE === 'parent') await walkParent();
  say('===== 走查完成 =====');
  fs.writeFileSync(path.join(DIR, 'walk-result.log'), log.join('\n'), 'utf8');
  await mini.disconnect();
})().catch((e) => {
  console.error('FAILED:', e && e.message);
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(path.join(DIR, 'walk-result.log'), log.concat(['FAILED: ' + (e && e.message)]).join('\n'), 'utf8');
  process.exit(1);
});
