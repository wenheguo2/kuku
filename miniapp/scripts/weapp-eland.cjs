/**
 * weapp-eland.cjs — 教学播放器横屏布局验证（识字'的'课）：导航+截图
 */
const automator = require('miniprogram-automator');
const MPmod = require('miniprogram-automator/out/MiniProgram');
(MPmod.default || MPmod).prototype.checkVersion = async () => {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  let mini;
  for (let i = 0; i < 6; i++) {
    try { mini = await automator.connect({ wsEndpoint: 'ws://localhost:9423' }); break; }
    catch (e) { await sleep(5000); }
  }
  if (!mini) throw new Error('connect fail');
  console.log('CONNECTED');
  const path = "学科启蒙/F1识字/识字0：学写'的'字";
  const url = '/pages/growth/player/index?subject=' + encodeURIComponent('识字') + '&word=' + encodeURIComponent('的') + '&path=' + encodeURIComponent(path) + '&study_type=study1';
  try { await Promise.race([mini.reLaunch(url), sleep(25000)]); } catch (e) { console.log('nav:', String(e.message).slice(0, 40)); }
  await sleep(10000);
  await mini.screenshot({ path: 'd:\\work\\work\\code\\testsuit\\公司\\工作区\\tmp\\测试截图\\weapp\\v50-eland.png' });
  console.log('SHOT v50-eland');
  await mini.disconnect();
})().catch((e) => { console.error('FAILED:', String(e.message).slice(0, 100)); process.exit(1); });
