/**
 * ide-recompile-probe.cjs — 实测哪种 CLI 方式能真正触发重新编译
 * 判定标准：改动后的样式值能否被 automator 读到（.seg .s 高度是否 >=44px）
 * 方案A：close --project 再 auto --project
 * 方案B：automator.launch（cliPath 走 cli.bat，node 环境下不受 PowerShell 递归影响）
 */
const { spawn } = require('child_process');
const net = require('net');

const EXE = 'D:\\soft\\微信助手\\微信web开发者工具\\微信开发者工具.exe';
const CLI = 'D:\\soft\\微信助手\\微信web开发者工具\\resources\\app.asar.unpacked\\js\\common\\cli\\index.js';
const DIST = 'd:\\work\\work\\code\\testsuit\\公司\\项目\\酷酷儿童故事\\miniapp\\dist';
const BOOT = "const e=process.argv[1],a=process.argv.slice(2).filter(function(x){return x!=='--electron'});if(!process.env.cwd)process.env.cwd=process.cwd();process.argv=[process.execPath,'--ms-enable-electron-run-as-node',e,'--electron'].concat(a);require(e)";
const env = { ...process.env, ELECTRON_RUN_AS_NODE: '1', cwd: process.cwd() };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function cli(args, waitMs = 60000) {
  return new Promise((resolve) => {
    let out = '';
    const p = spawn(EXE, ['-e', BOOT, CLI, ...args], { env });
    p.stdout.on('data', (d) => { out += d.toString(); });
    p.stderr.on('data', (d) => { out += d.toString(); });
    const t = setTimeout(() => { resolve({ code: 'TIMEOUT', out }); }, waitMs);
    p.on('exit', (c) => { clearTimeout(t); resolve({ code: c, out }); });
  });
}
const port = (n) => new Promise((r) => {
  const s = net.connect(n, 'localhost');
  s.on('connect', () => { s.destroy(); r(true); });
  s.on('error', () => r(false));
  setTimeout(() => { s.destroy(); r(false); }, 2000);
});

/** 读 .seg .s 高度验证是否已用新代码（修复后应 >=44px，旧代码 33px） */
async function verify(tag) {
  const automator = require('miniprogram-automator');
  const MPmod = require('miniprogram-automator/out/MiniProgram');
  (MPmod.default || MPmod).prototype.checkVersion = async () => {};
  try {
    const mini = await automator.connect({ wsEndpoint: 'ws://localhost:9423' });
    await sleep(3000);
    try { await mini.reLaunch('/pages/common/settings/index'); }
    catch (e) { await mini.evaluate(() => { wx.reLaunch({ url: '/pages/common/settings/index' }); }); }
    await sleep(3500);
    const p = await mini.currentPage();
    const el = await p.$('.seg .s');
    const s = el ? await el.size() : null;
    console.log(`[${tag}] .seg .s = ${s ? Math.round(s.width) + 'x' + Math.round(s.height) : 'null'} → ${s && s.height >= 43.5 ? '✅ 新代码已生效' : '❌ 仍是旧代码'}`);
    await mini.disconnect();
    return !!(s && s.height >= 43.5);
  } catch (e) {
    console.log(`[${tag}] automator 异常: ${String(e.message).slice(0, 90)}`);
    return false;
  }
}

(async () => {
  console.log('=== 方案A：close --project 再 auto ===');
  const r1 = await cli(['close', '--project', DIST], 40000);
  console.log('close →', r1.code, r1.out.replace(/\s+/g, ' ').slice(0, 160));
  await sleep(4000);
  const r2 = await cli(['auto', '--project', DIST, '--auto-port', '9423'], 90000);
  console.log('auto  →', r2.code, r2.out.replace(/\s+/g, ' ').slice(0, 200));
  for (let i = 0; i < 12 && !(await port(9423)); i++) await sleep(3000);
  console.log('9423 =', await port(9423) ? 'UP' : 'DOWN');
  await sleep(6000);
  if (await verify('方案A')) { console.log('\n>>> 结论：close+auto 可行，无需控制电脑'); return; }

  console.log('\n=== 方案B：automator.launch（自带编译）===');
  const automator = require('miniprogram-automator');
  const MPmod = require('miniprogram-automator/out/MiniProgram');
  (MPmod.default || MPmod).prototype.checkVersion = async () => {};
  await cli(['quit'], 30000);
  await sleep(5000);
  try {
    const mini = await automator.launch({
      cliPath: 'D:\\soft\\微信助手\\微信web开发者工具\\cli.bat',
      projectPath: DIST,
      port: 9423,
      timeout: 120000,
    });
    console.log('launch 成功');
    await sleep(5000);
    try { await mini.reLaunch('/pages/common/settings/index'); } catch (e) {}
    await sleep(3500);
    const p = await mini.currentPage();
    const el = await p.$('.seg .s');
    const s = el ? await el.size() : null;
    console.log(`[方案B] .seg .s = ${s ? Math.round(s.width) + 'x' + Math.round(s.height) : 'null'} → ${s && s.height >= 43.5 ? '✅ 新代码已生效' : '❌ 仍是旧代码'}`);
    await mini.disconnect();
  } catch (e) {
    console.log('launch 失败:', String(e.message).slice(0, 200));
  }
})();
