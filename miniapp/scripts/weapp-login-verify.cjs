/**
 * weapp-login-verify.cjs — A-01 登录链路全测
 * 1 家长中心退出登录 → 是否回到未登录态
 * 2 打开登录页：插画/按钮/协议勾选是否正常
 * 3 未勾选协议点登录 → 应被拦截（Toast）
 * 4 勾选后点微信一键登录 → 是否登录成功回首页、昵称是否回显
 * 5 手机号登录按钮 → 当前是占位（尚未开放）
 */
const automator = require('miniprogram-automator');
const MPmod = require('miniprogram-automator/out/MiniProgram');
(MPmod.default || MPmod).prototype.checkVersion = async () => {};
const path = require('path');
const fs = require('fs');
const DIR = 'd:\\work\\work\\code\\testsuit\\公司\\工作区\\tmp\\测试截图\\weapp\\login';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = [];
const say = (s) => { console.log(s); log.push(s); };

(async () => {
  fs.mkdirSync(DIR, { recursive: true });
  let mini;
  for (let i = 0; i < 12; i++) {
    try { mini = await automator.connect({ wsEndpoint: 'ws://localhost:9423' }); break; }
    catch (e) { await sleep(4000); }
  }
  say('CONNECTED');
  await sleep(4000);
  const shot = async (n) => { try { await mini.screenshot({ path: path.join(DIR, n + '.png') }); say('📷 ' + n); } catch (e) { say('📷❌ ' + n); } };
  const relaunch = async (u) => { try { await mini.reLaunch(u); } catch (e) { await mini.evaluate((x) => { wx.reLaunch({ url: x }); }, u); } await sleep(3500); };
  const P = () => mini.currentPage();
  /** 读小程序内登录态 */
  const loginState = async () => mini.evaluate(() => {
    try {
      const t = wx.getStorageSync('kuku_token') || wx.getStorageSync('token') || '';
      return { hasToken: !!t, tokenLen: String(t).length };
    } catch (e) { return { hasToken: false, tokenLen: 0 }; }
  });

  say('\n===== 1 当前登录态 =====');
  say('  storage: ' + JSON.stringify(await loginState()));
  await relaunch('/pages/parent/index/index');
  let page = await P();
  let rows = await page.$$('.frow');
  let names = [];
  for (const r of rows) names.push((await r.text()).slice(0, 20));
  say('  家长中心行: ' + names.join(' / '));
  await shot('L1-家长中心(登录态)');

  say('\n===== 2 退出登录 =====');
  page = await P();
  let logoutHit = false;
  for (const r of await page.$$('.frow')) {
    const t = await r.text();
    if (t && t.includes('退出登录')) { await r.tap(); logoutHit = true; break; }
  }
  say('  找到退出登录: ' + (logoutHit ? '✅' : '❌'));
  await sleep(2500);
  say('  退出后 storage: ' + JSON.stringify(await loginState()));
  await shot('L2-退出登录后家长中心');

  say('\n===== 3 未登录态下各页表现 =====');
  for (const [name, url] of [['收藏', '/pages/common/favorites/index'], ['历史', '/pages/common/history/index'], ['孩子档案', '/pages/common/children/index']]) {
    await relaunch(url);
    const p = await P();
    const btn = await p.$('.btn-primary');
    say(`  ${name}页 引导按钮: ${btn ? await btn.text() : '(无)'}`);
    await shot('L3-未登录-' + name);
  }

  say('\n===== 4 登录页 =====');
  await relaunch('/pages/common/login/index');
  page = await P();
  say('  页面: ' + page.path);
  const hero = await page.$('.login-bg, .login-hero, image');
  say('  插画元素: ' + (hero ? '✅ 有' : '❌ 无'));
  const green = await page.$('.btn-green');
  say('  微信一键登录按钮: ' + (green ? await green.text() : '(无)'));
  const ghost = await page.$('.btn-ghost');
  say('  手机号登录按钮: ' + (ghost ? await ghost.text() : '(无)'));
  const chip = await page.$('.chip');
  say('  协议勾选初始态: ' + (chip ? await chip.text() : '(无)'));
  await shot('L4-登录页');

  say('\n===== 5 未勾选协议直接点登录（应被拦截）=====');
  const before = await loginState();
  await green.tap();
  await sleep(2500);
  const after = await loginState();
  say(`  点击前 hasToken=${before.hasToken} → 点击后 hasToken=${after.hasToken}`);
  say('  拦截结果: ' + (!after.hasToken ? '✅ 已拦截（未登录）' : '❌ 未拦截，直接登录了'));
  say('  当前页: ' + (await P()).path);
  await shot('L5-未勾选点登录');

  say('\n===== 6 勾选协议 → 微信一键登录 =====');
  page = await P();
  const chip2 = await page.$('.chip');
  if (chip2) { await chip2.tap(); await sleep(1200); say('  勾选后文案: ' + await chip2.text()); }
  await shot('L6-已勾选');
  const green2 = await page.$('.btn-green');
  await green2.tap();
  await sleep(5000);
  const st = await loginState();
  say('  登录后 storage: ' + JSON.stringify(st));
  say('  当前页: ' + (await P()).path);
  await shot('L7-登录后');

  say('\n===== 7 登录态回写检查（首页昵称 / 家长中心）=====');
  await relaunch('/pages/story/index/index');
  page = await P();
  const hi = await page.$('.greet .hi');
  say('  首页问候: ' + (hi ? await hi.text() : '(无)'));
  await shot('L8-登录后首页');
  await relaunch('/pages/parent/index/index');
  page = await P();
  const kid = await page.$('.kid');
  say('  家长中心孩子卡: ' + (kid ? (await kid.text()).slice(0, 30) : '(无)'));
  const rows2 = await page.$$('.frow');
  const has_logout = [];
  for (const r of rows2) has_logout.push((await r.text()).slice(0, 12));
  say('  行: ' + has_logout.join(' / '));
  await shot('L9-登录后家长中心');

  say('\n===== 8 手机号登录（占位）=====');
  await relaunch('/pages/common/login/index');
  page = await P();
  const ghost2 = await page.$('.btn-ghost');
  if (ghost2) { await ghost2.tap(); await sleep(2000); say('  点击后仍在: ' + (await P()).path + '（预期：Toast 提示尚未开放，不跳转）'); }
  await shot('L10-手机号登录点击');

  fs.writeFileSync(path.join(DIR, 'login-verify.log'), log.join('\n'), 'utf8');
  await mini.disconnect();
  say('\nDONE');
})().catch((e) => { console.error('FAILED:', String((e && e.message) || e).slice(0, 250)); process.exit(1); });
