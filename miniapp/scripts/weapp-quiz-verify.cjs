// 截图挑战页第2、3题：验证前端修复（标题不写答案、看字题展示字）
const automator = require('miniprogram-automator');
const MPmod = require('miniprogram-automator/out/MiniProgram');
(MPmod.default || MPmod).prototype.checkVersion = async () => {};
const path = require('path');
const fs = require('fs');
const DIR = 'd:\\work\\work\\code\\testsuit\\公司\\工作区\\tmp\\测试截图\\weapp\\quiz';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  fs.mkdirSync(DIR, { recursive: true });
  let mini;
  for (let i = 0; i < 12; i++) {
    try { mini = await automator.connect({ wsEndpoint: 'ws://localhost:9423' }); break; }
    catch (e) { await sleep(4000); }
  }
  console.log('CONNECTED');
  await sleep(4000);

  const shot = async (n) => { try { await mini.screenshot({ path: path.join(DIR, n + '.png') }); console.log('SHOT', n); } catch (e) { console.log('SHOT_FAIL', n); } };

  for (const [subject, lesson] of [['识字', "识字0：学写'的'字"], ['英语', '英语0：单词animal']]) {
    const url = `/pages/growth/challenge/index?subject=${encodeURIComponent(subject)}&word_id=${encodeURIComponent(lesson)}&word_text=${encodeURIComponent(subject === '识字' ? '的' : 'animal')}`;
    try { await mini.reLaunch(url); } catch (e) { await mini.evaluate((u) => { wx.reLaunch({ url: u }); }, url); }
    await sleep(5000);
    let page = await mini.currentPage();
    // 标题
    const title = await page.$('.brand-title');
    console.log(`\n[${subject}] 标题:`, title ? await title.text() : '(无)');
    // 逐题截图
    for (let step = 1; step <= 4; step++) {
      page = await mini.currentPage();
      const label = await page.$('.card text');
      const stemEls = await page.$$('.card text');
      const texts = [];
      for (const e of stemEls.slice(0, 3)) texts.push((await e.text()).slice(0, 60));
      console.log(`  第${step}题 卡内文本:`, texts.join(' || '));
      await shot(`${subject}-第${step}题`);
      // 选第一个选项再下一题
      const opts = await page.$$('.opt-card');
      if (opts.length) { await opts[0].tap(); await sleep(900); }
      const btns = await page.$$('.btn-green');
      let moved = false;
      for (const b of btns) {
        const t = await b.text();
        if (t && t.includes('下一题')) { await b.tap(); moved = true; break; }
      }
      await sleep(1800);
      if (!moved) break;
    }
  }
  await mini.disconnect();
  console.log('\nDONE');
})().catch((e) => { console.error('FAILED:', String((e && e.message) || e).slice(0, 250)); process.exit(1); });
