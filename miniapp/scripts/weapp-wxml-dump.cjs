/** weapp-wxml-dump.cjs — 输出登录页协议链接的 outerWxml（诊断模拟器是否用旧 JS） */
const automator = require('miniprogram-automator');
const MPmod = require('miniprogram-automator/out/MiniProgram');
(MPmod.default || MPmod).prototype.checkVersion = async () => {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const mini = await automator.connect({ wsEndpoint: 'ws://localhost:9423' });
  await sleep(2000);
  try { await mini.reLaunch('/pages/common/login/index'); } catch (e) {}
  await sleep(2500);
  const page = await mini.currentPage();
  const texts = await page.$$('text');
  for (const t of texts) {
    const txt = await t.text();
    if (txt && txt.includes('用户协议')) {
      console.log(await t.outerWxml());
      break;
    }
  }
  await mini.disconnect();
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
