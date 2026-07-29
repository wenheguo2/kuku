/**
 * weapp-full.cjs — 微信开发者工具全维度测试（功能/点击/边界/空错态 + 全程截图供视觉目检）
 * 用法：node scripts/weapp-full.cjs <port>
 * 口径：只用稳定同步型 automator API（switchTab/navigateTo/reLaunch/$$ /text/tap/screenshot），
 *       不用 callWxMethod 异步与 evaluate（新版 IDE 下不稳定）；单步失败不中断，最终输出问题清单。
 */
const automator = require('miniprogram-automator');
const MPmod = require('miniprogram-automator/out/MiniProgram');
(MPmod.default || MPmod).prototype.checkVersion = async () => {};
const path = require('path');
const fs = require('fs');
const PORT = process.argv[2] || '9430';
const SHOT_DIR = 'd:\\work\\work\\code\\testsuit\\公司\\工作区\\tmp\\测试截图\\weapp-full';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = [];
const issues = [];
const say = (s) => { console.log(s); log.push(s); };
const bad = (s) => { console.log('❌ ' + s); issues.push(s); log.push('❌ ' + s); };

(async () => {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  let mini;
  for (let i = 1; i <= 20; i++) {
    try { mini = await automator.connect({ wsEndpoint: 'ws://localhost:' + PORT }); break; }
    catch (e) { console.log(`retry ${i}/20`); await sleep(10000); }
  }
  if (!mini) throw new Error('connect failed');
  say('CONNECTED');
  await sleep(3000);
  // 就绪探针：IDE 连上后需等编译完成，否则首个操作会 timeout——轻探 currentPage 直到不报错
  let ready = false;
  for (let i = 1; i <= 30; i++) {
    try {
      const p = await Promise.race([
        mini.currentPage(),
        new Promise((_, rej) => setTimeout(() => rej(new Error('probe-timeout')), 8000)),
      ]);
      if (p) { ready = true; say('IDE 就绪 (probe ' + i + '次)'); break; }
    } catch (e) { /* 编译中 */ }
    await sleep(6000);
  }
  if (!ready) { say('⚠ 30 次探针均未就绪，仍尝试继续'); }
  const shot = async (n) => { try { await mini.screenshot({ path: path.join(SHOT_DIR, n + '.png') }); say('shot ' + n); } catch (e) { bad('截图失败 ' + n + ': ' + String(e.message).slice(0, 60)); } };
  const step = async (name, fn) => { try { await fn(); } catch (e) { bad(name + ': ' + String((e && e.message) || e).slice(0, 100)); } };
  let page;

  // ===== W1 首页（真实索引/封面/换一换/学科网格） =====
  await step('W1 首页', async () => {
    await mini.reLaunch('/pages/story/index/index');
    await sleep(4000);
    page = await mini.currentPage();
    const retry = await page.$('.state-btn');
    if (retry) { await retry.tap(); await sleep(4000); page = await mini.currentPage(); }
    const tiles = await page.$$('.tilegrid .tile');
    say('学科 tile 数: ' + tiles.length + (tiles.length === 9 ? ' ✓' : ''));
    if (tiles.length !== 9) bad('首页学科 tile 应为 9，实际 ' + tiles.length);
    const cps = await page.$$('.cp');
    say('推荐行播放圆钮 .cp 数: ' + cps.length);
    if (cps.length === 0) bad('首页无播放圆钮（③疑似复现）');
    await shot('W01-首页顶部');
  });

  // 换一换 ×5
  await step('W1b 换一换', async () => {
    page = await mini.currentPage();
    const titlesOf = async () => { const els = await page.$$('.list-row .nm'); const a = []; for (const el of els.slice(0, 3)) a.push(await el.text()); return a.join('|'); };
    let prev = await titlesOf();
    let changed = 0;
    for (let i = 1; i <= 5; i++) {
      const ms = await page.$$('.sec-h .m');
      for (const m of ms) { if ((await m.text()).includes('换一换')) { await m.tap(); break; } }
      await sleep(500);
      const now = await titlesOf();
      if (now !== prev) changed++;
      prev = now;
    }
    say('换一换×5 内容更新次数: ' + changed + '/5');
    if (changed < 4) bad('换一换更新率低: ' + changed + '/5');
  });

  // ===== W2 故事灯（布局/播放/倍速/真音频走时） =====
  await step('W2 故事灯', async () => {
    await mini.navigateTo('/pages/story/player/index?path=' + encodeURIComponent('上下五千年/E1成语故事/责无旁贷') + '&title=' + encodeURIComponent('责无旁贷'));
    await sleep(9000);
    page = await mini.currentPage();
    const times = await page.$$('.ptime text');
    const t0 = times[0] ? await times[0].text() : '?';
    const t1 = times[1] ? await times[1].text() : '?';
    say(`故事灯进度 ${t0}/${t1}` + (t0 !== '0:00' && t0 !== '?' ? ' (真音频在播✓)' : ''));
    if (t0 === '0:00' || t0 === '?') bad('故事灯 9 秒后进度未走时: ' + t0 + '/' + t1);
    await shot('W02-故事灯');
    // 倍速 ×5
    for (let i = 1; i <= 5; i++) { const fns = await page.$$('.pfns .fn'); if (fns[2]) await fns[2].tap(); await sleep(350); }
    const fns = await page.$$('.pfns .fn');
    const rateTxt = fns[2] ? (await fns[2].text()).replace(/\s+/g, '') : '?';
    say('倍速×5 终值: ' + rateTxt + (rateTxt.includes('1.0') ? ' (循环回1.0✓)' : ''));
    if (!rateTxt.includes('1.0')) bad('倍速五连点未回 1.0: ' + rateTxt);
    // 播/暂 ×4（回到播放态）
    for (let i = 0; i < 4; i++) { const b = await page.$('.pbtn.main'); if (b) await b.tap(); await sleep(300); }
    await shot('W03-故事灯-操作后');
  });

  // ===== W3 章回 work 页 + 边界：超长标题列表 =====
  await step('W3 章回页', async () => {
    await mini.navigateTo('/pages/story/work/index?path=' + encodeURIComponent('上下五千年/E3历史故事/三国演义') + '&title=' + encodeURIComponent('三国演义'));
    await sleep(4000);
    page = await mini.currentPage();
    const rows = await page.$$('.list-row');
    say('三国演义章节行: ' + rows.length + (rows.length >= 50 ? ' ✓(分批渲染首批)' : ''));
    if (rows.length === 0) bad('work 页无章节行');
    await shot('W04-章回作品页');
    if (rows[0]) { await rows[0].tap(); await sleep(6000); say('第1章进入: ' + (await mini.currentPage()).path); await shot('W05-第一章故事灯'); }
  });

  // ===== W4 边界：不存在的故事 path（错误态） =====
  await step('W4 错误态', async () => {
    await mini.navigateTo('/pages/story/player/index?path=' + encodeURIComponent('不存在学科/不存在分类/不存在故事') + '&title=' + encodeURIComponent('不存在故事'));
    await sleep(5000);
    await shot('W06-不存在故事错误态');
    await mini.navigateBack().catch(() => {});
    await sleep(800);
    await mini.navigateBack().catch(() => {});
    await sleep(800);
  });

  // ===== W5 搜索（结果/无结果空态） =====
  await step('W5 搜索', async () => {
    await mini.navigateTo('/pages/common/search/index?scope=story');
    await sleep(2500);
    page = await mini.currentPage();
    const input = await page.$('input');
    if (!input) { bad('搜索页无输入框'); return; }
    await input.input('三国');
    await sleep(900);
    let rows = await page.$$('.list-row');
    say('搜"三国"命中: ' + rows.length + ' 条');
    if (rows.length === 0) bad('搜索"三国"无结果');
    await shot('W07-搜索命中');
    await input.input('zzzz不存在词');
    await sleep(900);
    rows = await page.$$('.list-row');
    say('搜索无结果态行数: ' + rows.length + '(期望0)');
    await shot('W08-搜索空态');
    await mini.navigateBack().catch(() => {});
    await sleep(800);
  });

  // ===== W6 歌曲（首页/播放器/模式/倍速） =====
  await step('W6 歌曲', async () => {
    await mini.switchTab('/pages/song/index/index');
    await sleep(2000);
    await shot('W09-歌曲首页');
    page = await mini.currentPage();
    const hero = await page.$('.hero');
    if (hero) { await hero.tap(); await sleep(3000); }
    page = await mini.currentPage();
    for (let i = 1; i <= 5; i++) { const chips = await page.$$('.chip'); for (const c of chips) { const t = await c.text(); if (t.includes('播放') || t.includes('循环')) { await c.tap(); break; } } await sleep(300); }
    for (let i = 1; i <= 5; i++) { const chips = await page.$$('.chip'); for (const c of chips) { if ((await c.text()).includes('倍速')) { await c.tap(); break; } } await sleep(300); }
    const chips = await page.$$('.chip');
    for (const c of chips) { const t = await c.text(); if (t.includes('倍速')) say('歌曲倍速终值: ' + t.replace(/\s+/g, '')); }
    await shot('W10-歌曲播放器');
    await mini.navigateBack().catch(() => {});
    await sleep(800);
  });

  // ===== W7 成长（收集册/lesson/筛选空态/教学播放器） =====
  await step('W7 成长', async () => {
    await mini.switchTab('/pages/growth/index/index');
    await sleep(2000);
    await shot('W11-成长页');
    await mini.navigateTo('/pages/growth/lesson/index?subject=' + encodeURIComponent('识字'));
    await sleep(3000);
    page = await mini.currentPage();
    // 筛选空态边界：好伙伴(未登录无进度→空)
    const chipsAll = await page.$$('.chip');
    for (const c of chipsAll) { if ((await c.text()).trim() === '好伙伴') { await c.tap(); break; } }
    await sleep(600);
    const emptyRows = await page.$$('.list-row');
    say('lesson 筛"好伙伴"行数: ' + emptyRows.length + '(未登录期望0+空文案)');
    await shot('W12-lesson筛选空态');
    for (const c of await page.$$('.chip')) { if ((await c.text()).trim() === '全部') { await c.tap(); break; } }
    await sleep(500);
    const playS = await page.$('.play-s');
    if (playS) { await playS.tap(); await sleep(3500); say('教学播放器: ' + (await mini.currentPage()).path); await shot('W13-教学播放器'); await mini.navigateBack().catch(() => {}); await sleep(800); }
    await mini.navigateBack().catch(() => {});
    await sleep(800);
  });

  // ===== W8 家长/设置/会员（含未登录态） =====
  await step('W8 家长线', async () => {
    await mini.switchTab('/pages/parent/index/index');
    await sleep(2000);
    await shot('W14-家长页');
    await mini.navigateTo('/pages/common/settings/index');
    await sleep(2000);
    await shot('W15-设置页');
    await mini.navigateBack().catch(() => {});
    await sleep(800);
    await mini.navigateTo('/pages/common/member/index');
    await sleep(2500);
    await shot('W16-会员页');
    await mini.navigateBack().catch(() => {});
    await sleep(600);
  });

  say('=== 全维度测试完成 ===');
  say(issues.length ? ('问题清单(' + issues.length + '): \n- ' + issues.join('\n- ')) : '本轮无脚本级问题，视觉待截图目检');
  fs.writeFileSync(path.join(SHOT_DIR, 'result.log'), log.join('\n'), 'utf8');
  await mini.disconnect();
})().catch((e) => { console.error('FAILED:', String((e && e.message) || e).slice(0, 200)); try { fs.mkdirSync(SHOT_DIR, { recursive: true }); fs.writeFileSync(path.join(SHOT_DIR, 'result.log'), log.concat(['FAILED']).join('\n'), 'utf8'); } catch (_) {} process.exit(1); });
