// 微信开发者工具 IDE 启动器：quit + auto（指南 §2.2/2.3 的 Electron 引导展开）
const { spawn, execFileSync } = require('child_process');
const net = require('net');

const EXE = 'D:\\soft\\微信助手\\微信web开发者工具\\微信开发者工具.exe';
const CLI = 'D:\\soft\\微信助手\\微信web开发者工具\\resources\\app.asar.unpacked\\js\\common\\cli\\index.js';
const DIST = 'd:\\work\\work\\code\\testsuit\\公司\\项目\\酷酷儿童故事\\miniapp\\dist';
const BOOT = "const e=process.argv[1],a=process.argv.slice(2).filter(function(x){return x!=='--electron'});if(!process.env.cwd)process.env.cwd=process.cwd();process.argv=[process.execPath,'--ms-enable-electron-run-as-node',e,'--electron'].concat(a);require(e)";

const env = { ...process.env, ELECTRON_RUN_AS_NODE: '1', cwd: process.cwd() };

function run(args, waitMs) {
  return new Promise((resolve) => {
    const p = spawn(EXE, ['-e', BOOT, CLI, ...args], { env, stdio: 'inherit' });
    const t = setTimeout(() => { resolve('TIMEOUT'); }, waitMs);
    p.on('exit', (c) => { clearTimeout(t); resolve(c); });
  });
}

function checkPort(port) {
  return new Promise((resolve) => {
    const s = net.connect(port, 'localhost');
    s.on('connect', () => { s.destroy(); resolve(true); });
    s.on('error', () => resolve(false));
    setTimeout(() => { s.destroy(); resolve(false); }, 2000);
  });
}

(async () => {
  const cmd = process.argv[2] || 'auto';
  if (cmd === 'quit') {
    console.log('QUIT exit=', await run(['quit'], 30000));
    return;
  }
  // quit 先关旧实例
  console.log('QUIT exit=', await run(['quit'], 30000));
  await new Promise((r) => setTimeout(r, 3000));
  console.log('AUTO exit=', await run(['auto', '--project', DIST, '--auto-port', '9423'], 90000));
  for (let i = 0; i < 20; i++) {
    if (await checkPort(9423)) { console.log('PORT_9423=UP'); return; }
    await new Promise((r) => setTimeout(r, 3000));
  }
  console.log('PORT_9423=DOWN');
})();
