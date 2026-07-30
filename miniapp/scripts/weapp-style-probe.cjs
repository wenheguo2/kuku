/**
 * weapp-style-probe.cjs — 登录页夜间模式样式取证（一次性诊断脚本）
 * 读取 .muted / .chip / 协议链接 Text 的 computed color，定位夜间黑字问题
 */
const automator = require('miniprogram-automator');
const MPmod = require('miniprogram-automator/out/MiniProgram');
(MPmod.default || MPmod).prototype.checkVersion = async () => {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const mini = await automator.connect({ wsEndpoint: 'ws://localhost:9423' });
  await sleep(4000);
  try { await mini.reLaunch('/pages/common/login/index'); } catch (e) {
    // 冷启动页面栈为空时 automator.reLaunch 会抛 indexOf 异常，退回 wx.reLaunch
    console.log('reLaunch fallback:', e.message);
    await mini.evaluate(() => { wx.reLaunch({ url: '/pages/common/login/index' }); });
    await sleep(4000);
  }
  await sleep(2500);
  const page = await mini.currentPage();
  console.log('page:', page.path);

  const root = await page.$('.center');
  console.log('root class:', root ? await root.attribute('class') : '(no .center)');

  const probe = async (label, sel) => {
    const el = await page.$(sel);
    if (!el) { console.log(label, sel, '→ 未找到'); return; }
    const color = await el.style('color');
    const fs = await el.style('font-size');
    const txt = (await el.text() || '').slice(0, 12);
    console.log(`${label} [${txt}] color=${color} font-size=${fs}`);
  };
  await probe('副标题.muted ', '.muted');
  await probe('勾选.chip   ', '.chip');
  const g = await page.$('.btn-ghost');
  if (g) console.log(`btn-ghost color=${await g.style('color')} bg=${await g.style('background-color')} border=${await g.style('border-top-color')}`);
  const c = await page.$('.center');
  if (c) console.log(`center bg=${await c.style('background-color')}`);
  // 协议链接：inline color var(--color-primary)
  const texts = await page.$$('text');
  for (const t of texts) {
    const txt = await t.text();
    if (txt && txt.includes('用户协议')) {
      console.log(`协议链接 [${txt}] color=${await t.style('color')} font-size=${await t.style('font-size')}`);
      break;
    }
  }
  for (const t of texts) {
    const txt = await t.text();
    if (txt && txt.includes('我已阅读')) {
      console.log(`已阅读行 [${txt}] color=${await t.style('color')} font-size=${await t.style('font-size')}`);
      break;
    }
  }
  await mini.screenshot({ path: 'd:/work/work/code/testsuit/公司/工作区/tmp/测试截图/weapp/t07-登录页修复后.png' });
  console.log('SHOT OK');
  await mini.disconnect();
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
