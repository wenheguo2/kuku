/**
 * weapp-nitpick.cjs — 第四轮「吹毛求疵」量化度量
 * 用法：node scripts/weapp-nitpick.cjs
 * 不靠肉眼：读 offset/size/computedStyle 做数值断言
 *  1 触控热区 ≥44px(=88rpx) 合规率
 *  2 日/夜双模式文字对比度 WCAG AA(4.5:1) 计算
 *  3 列表行左对齐一致性（left 值离散度）
 *  4 迷你浮球与页面关键按钮的遮挡判定（矩形相交）
 *  5 底部安全区：TabBar 底边 vs 窗口高
 *  6 三播放器主控键尺寸一致性
 *  7 四 Tab 头部首元素 top 一致性
 *  8 超长文字截断实测（章节标题/歌名）
 */
const automator = require('miniprogram-automator');
const MPmod = require('miniprogram-automator/out/MiniProgram');
(MPmod.default || MPmod).prototype.checkVersion = async () => {};
const path = require('path');
const fs = require('fs');
const DIR = 'd:\\work\\work\\code\\testsuit\\公司\\工作区\\tmp\\测试截图\\weapp\\walk4';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = [];
const findings = [];
const say = (s) => { console.log(s); log.push(s); };
const bad = (s) => { console.log('🔴 ' + s); findings.push(s); log.push('🔴 ' + s); };
let mini;
const shot = async (n) => { try { await mini.screenshot({ path: path.join(DIR, n + '.png') }); } catch (e) {} };
const step = async (n, fn) => { say('\n--- ' + n + ' ---'); try { await fn(); } catch (e) { say('  (step异常) ' + String(e.message).slice(0, 120)); } };
const relaunch = async (u) => { try { await mini.reLaunch(u); } catch (e) { await mini.evaluate((x) => { wx.reLaunch({ url: x }); }, u); } await sleep(3200); };
const P = async () => mini.currentPage();

/** rgb字符串 → 相对亮度 */
const lum = (rgb) => {
  const m = String(rgb).match(/\d+(\.\d+)?/g);
  if (!m || m.length < 3) return null;
  const [r, g, b] = m.slice(0, 3).map((v) => {
    const c = Number(v) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (fg, bg) => {
  const l1 = lum(fg); const l2 = lum(bg);
  if (l1 === null || l2 === null) return null;
  const hi = Math.max(l1, l2); const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
};

/** 批量测热区：返回 [{sel, i, w, h}] 不合规项 */
async function checkHitArea(page, sels, minPx = 44) {
  const out = [];
  for (const sel of sels) {
    const els = await page.$$(sel);
    for (let i = 0; i < Math.min(els.length, 6); i++) {
      try {
        const s = await els[i].size();
        if (s.height < minPx - 0.5 || s.width < minPx - 0.5) out.push({ sel, i, w: Math.round(s.width), h: Math.round(s.height) });
      } catch (e) {}
    }
  }
  return out;
}

(async () => {
  fs.mkdirSync(DIR, { recursive: true });
  mini = await automator.connect({ wsEndpoint: 'ws://localhost:9423' });
  say('连接成功');
  await sleep(2500);
  const sys = await mini.systemInfo();
  say(`窗口: ${sys.windowWidth}x${sys.windowHeight} 像素比${sys.pixelRatio} 安全区底=${sys.safeArea ? Math.round(sys.safeArea.bottom) : '?'} 屏高=${sys.screenHeight}`);

  await step('1 触控热区合规（阈值44px=88rpx）', async () => {
    await relaunch('/pages/story/index/index');
    let page = await P();
    if (await page.$('.theme-dark')) { const b = await page.$('.sbtn'); await b.tap(); await sleep(1500); page = await P(); }
    const violations = await checkHitArea(page, ['.sbtn', '.cp', '.hplay', '.htag', '.sec-h .m', '.share-bar']);
    if (violations.length) violations.forEach((v) => bad(`故事首页热区不足: ${v.sel}[${v.i}] = ${v.w}x${v.h}px (<44)`));
    else say('  故事首页: 全部达标 ✓');
    // 歌曲列表 loop-pill
    await relaunch('/pages/song/list/index?path=' + encodeURIComponent('瞎编的歌曲/小孩儿/中文歌曲') + '&title=' + encodeURIComponent('中文歌曲'));
    const p2 = await P();
    const v2 = await checkHitArea(p2, ['.loop-pill', '.cp', '.btn-ghost']);
    if (v2.length) v2.forEach((v) => bad(`歌曲列表热区不足: ${v.sel}[${v.i}] = ${v.w}x${v.h}px`));
    else say('  歌曲列表: 全部达标 ✓');
    // 设置页 seg/chip
    await relaunch('/pages/common/settings/index');
    const p3 = await P();
    const v3 = await checkHitArea(p3, ['.seg .s', '.chip', '.frow .im']);
    if (v3.length) v3.forEach((v) => bad(`设置页热区不足: ${v.sel}[${v.i}] = ${v.w}x${v.h}px`));
    else say('  设置页: 全部达标 ✓');
  });

  await step('2 文字对比度 WCAG AA (阈值4.5, 大字3.0)', async () => {
    const probe = async (label, sel, bgSel) => {
      const page = await P();
      const el = await page.$(sel);
      if (!el) { say(`  ${label}: 元素缺失 ${sel}`); return; }
      const fg = await el.style('color');
      let bg = await el.style('background-color');
      if (!bg || /rgba?\(0, 0, 0, 0\)|transparent/.test(bg)) {
        const bgEl = bgSel ? await page.$(bgSel) : null;
        bg = bgEl ? await bgEl.style('background-color') : 'rgb(255,249,240)';
        if (!bg || /rgba?\(0, 0, 0, 0\)|transparent/.test(bg)) bg = 'rgb(255,249,240)';
      }
      const fsz = await el.style('font-size');
      const c = contrast(fg, bg);
      const big = parseFloat(fsz) >= 18; // 18px+ 视为大字
      const need = big ? 3.0 : 4.5;
      const ok = c !== null && c >= need;
      say(`  ${label}: ${fg} on ${bg} 字号${fsz} → ${c ? c.toFixed(2) : '?'}:1 (需${need}) ${ok ? '✓' : '✗'}`);
      if (!ok && c !== null) bad(`对比度不足 ${label}: ${c.toFixed(2)}:1 < ${need} (${fg} on ${bg}, ${fsz})`);
    };
    // 日间
    await relaunch('/pages/story/index/index');
    let page = await P();
    if (await page.$('.theme-dark')) { const b = await page.$('.sbtn'); await b.tap(); await sleep(1500); }
    say(' [日间]');
    await probe('首页问候小字 .hi', '.greet .hi', '.page-v4');
    await probe('首页大标题 .big', '.greet .big', '.page-v4');
    await probe('章回卡副标 .scard .ds', '.scard .ds', '.page-v4');
    await probe('最近播放描述 .cont .ds', '.cont .ds', '.cont');
    await relaunch('/pages/song/list/index?path=' + encodeURIComponent('瞎编的歌曲/小孩儿/中文歌曲') + '&title=' + encodeURIComponent('中文歌曲'));
    await probe('列表行副标 .list-row .ds', '.list-row .ds', '.list-row');
    await probe('循环胶囊文字 .loop-pill .tx', '.loop-pill .tx', '.loop-pill');
    await probe('计数 .muted', '.muted', '.page-v4');
    // 夜间
    await relaunch('/pages/story/index/index');
    const pg = await P();
    const btn = await pg.$('.sbtn');
    await btn.tap(); await sleep(2000);
    say(' [夜间]');
    await probe('夜-问候小字 .hi', '.greet .hi', '.page-v4');
    await probe('夜-大标题 .big', '.greet .big', '.page-v4');
    await probe('夜-章回副标 .scard .ds', '.scard .ds', '.page-v4');
    await probe('夜-最近播放描述', '.cont .ds', '.cont');
    await shot('n4-夜间对比度取样');
    const b2 = await (await P()).$('.sbtn');
    await b2.tap(); await sleep(1500); // 切回日间
  });

  await step('3 列表左对齐一致性', async () => {
    await relaunch('/pages/story/index/index');
    const page = await P();
    const lefts = [];
    for (const sel of ['.share-bar', '.cont', '.sec-h', '.list-row', '.tilegrid']) {
      const el = await page.$(sel);
      if (el) { const o = await el.offset(); lefts.push({ sel, left: Math.round(o.left * 10) / 10 }); }
    }
    say('  各区块左边距: ' + lefts.map((x) => `${x.sel}=${x.left}`).join(', '));
    const vals = lefts.map((x) => x.left);
    const spread = Math.max(...vals) - Math.min(...vals);
    if (spread > 4) bad(`首页区块左对齐不齐: 最大差 ${spread}px (${lefts.map((x) => x.sel + '=' + x.left).join(' / ')})`);
    else say(`  对齐良好，最大差 ${spread}px ✓`);
  });

  await step('4 迷你浮球遮挡判定', async () => {
    // 先播一个故事产生浮球
    await relaunch('/pages/story/index/index');
    let page = await P();
    const cont = await page.$('.cont');
    if (cont) { await cont.tap(); await sleep(3500); try { await mini.navigateBack(); } catch (e) {} await sleep(2000); }
    page = await P();
    const fab = await page.$('.mini-fab');
    if (!fab) { say('  无浮球（可能已关闭），跳过'); return; }
    const fo = await fab.offset(); const fs2 = await fab.size();
    const R = { l: fo.left, t: fo.top, r: fo.left + fs2.width, b: fo.top + fs2.height };
    say(`  浮球矩形: left=${Math.round(R.l)} top=${Math.round(R.t)} ${Math.round(fs2.width)}x${Math.round(fs2.height)}`);
    const targets = ['.cont .cp', '.scard', '.list-row .cp', '.sec-h .m', '.share-bar'];
    let hit = 0;
    for (const sel of targets) {
      const els = await page.$$(sel);
      for (let i = 0; i < Math.min(els.length, 4); i++) {
        const o = await els[i].offset(); const s = await els[i].size();
        const T = { l: o.left, t: o.top, r: o.left + s.width, b: o.top + s.height };
        const inter = !(T.r < R.l || T.l > R.r || T.b < R.t || T.t > R.b);
        if (inter) { hit++; bad(`浮球遮挡可点元素: ${sel}[${i}] (元素 top=${Math.round(T.t)} left=${Math.round(T.l)})`); }
      }
    }
    if (!hit) say('  未遮挡任何可点元素 ✓');
    await shot('n4-浮球遮挡检查');
  });

  await step('5 底部安全区 / TabBar', async () => {
    const page = await P();
    const tb = await page.$('.custom-tab-bar, .tabbar-v4, .tbwrap');
    if (!tb) { say('  自定义 TabBar 选择器未命中（weapp 原生 custom-tab-bar 在独立层，属正常）'); }
    else {
      const o = await tb.offset(); const s = await tb.size();
      say(`  TabBar: top=${Math.round(o.top)} 高=${Math.round(s.height)} 底=${Math.round(o.top + s.height)} 窗口高=${sys.windowHeight}`);
      if (o.top + s.height > sys.windowHeight + 1) bad(`TabBar 超出窗口底 ${Math.round(o.top + s.height - sys.windowHeight)}px`);
    }
    // 内容底部留白：最后一个元素底边是否被 TabBar 压
    const tiles = await page.$$('.tilegrid .tile');
    if (tiles.length) {
      const last = tiles[tiles.length - 1];
      const o = await last.offset(); const s = await last.size();
      say(`  末个学科tile底边=${Math.round(o.top + s.height)}（页面可滚，仅记录）`);
    }
  });

  await step('6 三播放器主控键尺寸一致性', async () => {
    const sizes = {};
    await relaunch('/pages/story/index/index');
    let page = await P();
    const c = await page.$('.cont');
    if (c) { await c.tap(); await sleep(3500); const p = await P(); const m = await p.$('.pbtn.main'); if (m) { const s = await m.size(); sizes['故事PL-01'] = `${Math.round(s.width)}x${Math.round(s.height)}`; } try { await mini.navigateBack(); } catch (e) {} await sleep(1500); }
    await relaunch('/pages/song/index/index');
    page = await P();
    const row = await page.$('.list-row');
    if (row) { await row.tap(); await sleep(3500); const p = await P(); const m = await p.$('.cbtn.main'); if (m) { const s = await m.size(); sizes['歌曲PL-02'] = `${Math.round(s.width)}x${Math.round(s.height)}`; } try { await mini.navigateBack(); } catch (e) {} await sleep(1500); }
    await relaunch('/pages/growth/index/index');
    page = await P();
    const cell = await page.$('.wgrid .wcell');
    if (cell) { await cell.tap(); await sleep(3500); const p = await P(); const btns = await p.$$('.ebtn'); if (btns.length > 1) { const s = await btns[1].size(); sizes['教学PL-03'] = `${Math.round(s.width)}x${Math.round(s.height)}`; } const bk = await p.$('.eback'); if (bk) { await bk.tap(); await sleep(1500); } }
    say('  主控键尺寸: ' + JSON.stringify(sizes));
    say('  注：PL-03 为横屏物理像素体系，与竖屏 rpx 体系不可直接比较');
  });

  await step('7 四 Tab 头部首元素 top 一致性', async () => {
    const tops = {};
    const pairs = [
      ['story', '/pages/story/index/index', '.greet'],
      ['song', '/pages/song/index/index', '.greet'],
      ['growth', '/pages/growth/index/index', '.growth-card, .sec-h, .grow3'],
      ['parent', '/pages/parent/index/index', '.kid'],
    ];
    for (const [name, url, sel] of pairs) {
      await relaunch(url);
      const page = await P();
      const el = await page.$(sel);
      if (el) { const o = await el.offset(); tops[name] = Math.round(o.top * 10) / 10; }
      else tops[name] = 'n/a';
    }
    say('  首元素 top: ' + JSON.stringify(tops));
    const nums = Object.values(tops).filter((v) => typeof v === 'number');
    const spread = Math.max(...nums) - Math.min(...nums);
    if (spread > 24) bad(`四 Tab 头部起始高度差异过大: ${spread}px ${JSON.stringify(tops)}`);
    else say(`  差异 ${spread}px（各页头部结构不同，≤24px 可接受）`);
  });

  await step('8 超长文字截断实测', async () => {
    // 章回长标题（东周列国志章节名较长）
    await relaunch('/pages/story/work/index?path=' + encodeURIComponent('上下五千年/E3历史故事/东周列国志') + '&title=' + encodeURIComponent('东周列国志'));
    const page = await P();
    const nms = await page.$$('.list-row .nm');
    let over = 0;
    for (let i = 0; i < Math.min(nms.length, 5); i++) {
      const t = await nms[i].text();
      const s = await nms[i].size();
      const ov = await nms[i].style('text-overflow');
      const ws = await nms[i].style('white-space');
      say(`  [${i}] "${String(t).slice(0, 28)}" 宽${Math.round(s.width)} 高${Math.round(s.height)} overflow=${ov} ws=${ws}`);
      if (s.height > 30) over++; // 单行 nm 约 21-24px，超过说明折行
    }
    if (over) bad(`章节标题存在折行/换行挤压 ${over} 处（应单行省略）`);
    else say('  标题均单行省略 ✓');
    await shot('n4-长标题截断');
  });

  say('\n===== 骨头清单(' + findings.length + ') =====');
  findings.forEach((f, i) => say((i + 1) + '. ' + f));
  fs.writeFileSync(path.join(DIR, 'nitpick.log'), log.join('\n'), 'utf8');
  await mini.disconnect();
})().catch((e) => {
  console.error('FAILED:', e && e.message);
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(path.join(DIR, 'nitpick.log'), log.concat(['FAILED: ' + (e && e.message)]).join('\n'), 'utf8');
  process.exit(1);
});
