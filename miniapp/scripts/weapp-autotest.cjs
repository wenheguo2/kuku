/**
 * weapp-autotest.cjs — 微信开发者工具 weapp 端自动化测试（R1-R7 复刻）
 * 用法：node scripts/weapp-autotest.cjs "<cli.bat 路径>"
 * 前置：微信开发者工具已安装；touristappid 游客模式（免登录）；automator 会用 --auto 拉起工具。
 * 覆盖：Tab 互切×5轮 / 首页换一换×5 / 故事灯(播暂×5+倍速×5+BackgroundAudioManager 实测) / 歌曲(模式×5+倍速×5) / 截图落盘。
 */
const automator = require('miniprogram-automator');
// 兼容补丁：新版 IDE 下 automator 库 checkVersion 拿不到版本号会崩(split of undefined)，跳过版本检查
const MPmod = require('miniprogram-automator/out/MiniProgram');
(MPmod.default || MPmod).prototype.checkVersion = async () => {};
const path = require('path');
const fs = require('fs');

const CLI = process.argv[2];
const PROJECT = path.resolve(__dirname, '..');
const SHOT_DIR = 'd:\\work\\work\\code\\testsuit\\公司\\工作区\\tmp\\测试截图\\weapp';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = [];
const say = (s) => { console.log(s); log.push(s); };

async function main() {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  let mini;
  if (CLI === 'connect') {
    // 已用 cli auto --auto-port 拉起 IDE（项目根用 dist/，内含 project.config.json），直连现成自动化端口
    const port = process.argv[3] || '9420';
    say('连接已启动的自动化端口 ws://localhost:' + port + ' …');
    let lastErr;
    for (let i = 1; i <= 8; i++) {
      try { mini = await automator.connect({ wsEndpoint: 'ws://localhost:' + port }); break; }
      catch (e) { lastErr = e; say(`连接重试 ${i}/8…`); await sleep(10000); }
    }
    if (!mini) throw lastErr;
  } else {
    if (!CLI || !fs.existsSync(CLI)) throw new Error('cli 路径无效: ' + CLI);
    say('启动微信开发者工具(自动化端口)…');
    mini = await automator.launch({ cliPath: CLI, projectPath: PROJECT, timeout: 120000 });
  }
  say('✔ 已连上自动化端口');
  await sleep(4000);

  const shot = async (name) => { await mini.screenshot({ path: path.join(SHOT_DIR, name + '.png') }); say('截图: ' + name); };
  const curPath = async () => (await mini.currentPage()).path;

  // R1: 4 Tab 互切 ×5 轮
  const tabs = ['pages/story/index/index', 'pages/song/index/index', 'pages/growth/index/index', 'pages/parent/index/index'];
  for (let round = 1; round <= 5; round++) {
    for (const t of tabs) {
      await mini.switchTab('/' + t);
      await sleep(500);
      const p = await curPath();
      if (p !== t) say(`❌ R1 round${round} 期望 ${t} 实际 ${p}`); 
    }
  }
  say('✔ R1 Tab 互切 20 次完成');
  await mini.switchTab('/pages/story/index/index');
  await sleep(1200);
  await shot('w01-故事首页');

  // R2: 换一换 ×5（对比推荐标题）
  let page = await mini.currentPage();
  const titlesOf = async () => {
    const els = await page.$$('.list-row .nm');
    const arr = [];
    for (const el of els.slice(0, 3)) arr.push(await el.text());
    return arr.join('|');
  };
  let prev = await titlesOf();
  for (let i = 1; i <= 5; i++) {
    const ms = await page.$$('.sec-h .m');
    let clicked = false;
    for (const m of ms) { if ((await m.text()).includes('换一换')) { await m.tap(); clicked = true; break; } }
    if (!clicked) { say('❌ R2 换一换按钮未找到'); break; }
    await sleep(500);
    const now = await titlesOf();
    say(`换一换#${i}: ${now === prev ? '❌未变化' : '✔内容更新'}`);
    prev = now;
  }

  // R3: 直达故事灯（hero 可能是章回→work 页，改用 navigateTo 带真实 path）→ 播放器按钮 + BackgroundAudioManager 实测
  await mini.navigateTo('/pages/story/player/index?path=' + encodeURIComponent('上下五千年/E1成语故事/责无旁贷') + '&title=' + encodeURIComponent('责无旁贷'));
  await sleep(4000);
  say('故事灯页: ' + (await curPath()));
  page = await mini.currentPage();
  await shot('w02-故事灯');
  // BackgroundAudioManager 状态（weapp 专属路径实测）
  const bam1 = await mini.evaluate(() => {
    const bam = wx.getBackgroundAudioManager();
    return { src: (bam.src || '').slice(0, 90), paused: bam.paused, title: bam.title, rate: bam.playbackRate };
  });
  say('BAM 初始: ' + JSON.stringify(bam1));
  // 播/暂 ×5
  for (let i = 0; i < 5; i++) { const b = await page.$('.pbtn.main'); if (b) await b.tap(); await sleep(400); }
  say('✔ R3 播/暂 ×5');
  // 倍速 ×5（读展示值 + BAM playbackRate）
  for (let i = 1; i <= 5; i++) {
    const fns = await page.$$('.pfns .fn');
    if (fns[2]) await fns[2].tap();
    await sleep(400);
    const rateTxt = fns[2] ? await fns[2].text() : '?';
    const bamRate = await mini.evaluate(() => wx.getBackgroundAudioManager().playbackRate);
    say(`倍速#${i}: 展示=${rateTxt.replace(/\s+/g, '')} BAM.playbackRate=${bamRate}`);
  }
  const bam2 = await mini.evaluate(() => { const b = wx.getBackgroundAudioManager(); return { paused: b.paused, rate: b.playbackRate }; });
  say('BAM 终态: ' + JSON.stringify(bam2));
  await shot('w03-故事灯-倍速后');

  // R4: 歌曲播放器（模式×5 + 倍速×5）
  await mini.switchTab('/pages/song/index/index');
  await sleep(1000);
  page = await mini.currentPage();
  const sHero = await page.$('.hero');
  if (sHero) { await sHero.tap(); await sleep(2500); }
  page = await mini.currentPage();
  say('歌曲播放器页: ' + (await curPath()));
  for (let i = 1; i <= 5; i++) {
    const chips = await page.$$('.chip');
    for (const c of chips) { const t = await c.text(); if (t.includes('播放') || t.includes('循环')) { await c.tap(); break; } }
    await sleep(300);
  }
  say('✔ R4 播放模式 ×5');
  for (let i = 1; i <= 5; i++) {
    const chips = await page.$$('.chip');
    for (const c of chips) { const t = await c.text(); if (t.includes('倍速')) { await c.tap(); break; } }
    await sleep(300);
  }
  const chips = await page.$$('.chip');
  for (const c of chips) { const t = await c.text(); if (t.includes('倍速')) say('歌曲倍速终值: ' + t.replace(/\s+/g, '')); }
  await shot('w04-歌曲播放器');

  // R5/R6 抽样: 成长页 + 家长页渲染与 custom-tab-bar 存在性
  await mini.switchTab('/pages/growth/index/index');
  await sleep(1000);
  await shot('w05-成长页');
  await mini.switchTab('/pages/parent/index/index');
  await sleep(1000);
  await shot('w06-家长页');
  const sys = await mini.systemInfo();
  say('systemInfo: ' + JSON.stringify({ platform: sys.platform, SDKVersion: sys.SDKVersion }));

  say('=== weapp 自动化测试完成 ===');
  fs.writeFileSync(path.join(SHOT_DIR, 'result.log'), log.join('\n'), 'utf8');
  await mini.close();
}

main().catch((e) => { console.error('FAILED:', e && e.message); fs.mkdirSync(SHOT_DIR, { recursive: true }); fs.writeFileSync(path.join(SHOT_DIR, 'result.log'), log.concat(['FAILED: ' + (e && e.message)]).join('\n'), 'utf8'); process.exit(1); });
