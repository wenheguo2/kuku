/** weapp-night-probe.cjs — 读取 app 内时间/主题存储/夜间判定（诊断 21:43 未进夜间） */
const automator = require('miniprogram-automator');
const MPmod = require('miniprogram-automator/out/MiniProgram');
(MPmod.default || MPmod).prototype.checkVersion = async () => {};
(async () => {
  const mini = await automator.connect({ wsEndpoint: 'ws://localhost:9423' });
  const r = await mini.evaluate(() => {
    let theme = null, sleep = null;
    try { theme = wx.getStorageSync('kuku_theme'); } catch (e) {}
    try { sleep = wx.getStorageSync('kuku_sleep_deadline'); } catch (e) {}
    let keys = [];
    try { keys = wx.getStorageInfoSync().keys; } catch (e) {}
    return { hour: new Date().getHours(), now: new Date().toString(), theme, sleep, keys, sysTheme: (wx.getSystemInfoSync() || {}).theme };
  });
  console.log(JSON.stringify(r, null, 1));
  await mini.disconnect();
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
