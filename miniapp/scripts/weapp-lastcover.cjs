/**
 * weapp-lastcover.cjs — 验证故事首页「最近播放」封面回退链
 * 连接 9423 → reLaunch 故事首页 → 读 .cont .cvr 的 src → 截图
 */
const automator = require('miniprogram-automator');
const MPmod = require('miniprogram-automator/out/MiniProgram');
(MPmod.default || MPmod).prototype.checkVersion = async () => {};
const path = require('path');
const fs = require('fs');
const SHOT_DIR = 'd:\\work\\work\\code\\testsuit\\公司\\工作区\\tmp\\测试截图\\weapp\\walk';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  let mini;
  for (let i = 1; i <= 12; i++) {
    try { mini = await automator.connect({ wsEndpoint: 'ws://localhost:9423' }); break; }
    catch (e) { console.log(`retry ${i}/12`); await sleep(5000); }
  }
  if (!mini) throw new Error('connect failed');
  console.log('CONNECTED');
  await sleep(4000);
  try { await mini.reLaunch('/pages/story/index/index'); }
  catch (e) { await mini.evaluate(() => { wx.reLaunch({ url: '/pages/story/index/index' }); }); }
  await sleep(5000);
  const page = await mini.currentPage();
  console.log('PAGE:', page && page.path);
  // 最近播放卡片
  const cont = await page.$('.cont');
  console.log('HAS_RECENT_CARD:', !!cont);
  if (cont) {
    const img = await page.$('.cont .cvr');
    if (img) {
      const tag = await img.tagName;
      let src = '';
      try { src = await img.attribute('src'); } catch (e) {}
      console.log('CVR_TAG:', tag, 'SRC:', src || '(no src → 兜底色块View)');
      // 标题
      try { const nm = await page.$('.cont .nm'); console.log('TITLE:', await nm.text()); } catch (e) {}
    } else {
      console.log('CVR: not found');
    }
  }
  await mini.screenshot({ path: path.join(SHOT_DIR, 'z-最近播放封面修复.png') });
  console.log('SHOT OK');
  await mini.disconnect();
})().catch((e) => { console.error('FAILED:', String((e && e.message) || e).slice(0, 300)); process.exit(1); });
