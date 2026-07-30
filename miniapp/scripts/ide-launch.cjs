/**
 * ide-launch.cjs — 微信开发者工具启动器（构建后一条命令搞定，无需手点编译）
 * 用法：node scripts/ide-launch.cjs        # 关项目→重开→等自动化端口（会重新编译 dist）
 *       node scripts/ide-launch.cjs quit   # 彻底关闭工具
 *
 * ★ 核心：用 `close --project`（关项目窗口）而不是 `quit`。
 *   quit 不会真正结束 IDE 进程（服务端口仍在），随后的 auto 只是连回旧实例、旧编译产物，
 *   表现为"automator 能 connect 但所有调用超时"——实测踩过，别再用 quit 做重载。
 */
const { spawn } = require('child_process');
const net = require('net');

const EXE = 'D:\\soft\\微信助手\\微信web开发者工具\\微信开发者工具.exe';
const CLI = 'D:\\soft\\微信助手\\微信web开发者工具\\resources\\app.asar.unpacked\\js\\common\\cli\\index.js';
const DIST = 'd:\\work\\work\\code\\testsuit\\公司\\项目\\酷酷儿童故事\\miniapp\\dist';
const PORT = 9423;
// cli.bat 的等效展开：用 IDE 自带 Electron 以 Node 模式跑内部 CLI（PowerShell 直跑 cli.bat 会递归爆栈）
const BOOT = "const e=process.argv[1],a=process.argv.slice(2).filter(function(x){return x!=='--electron'});if(!process.env.cwd)process.env.cwd=process.cwd();process.argv=[process.execPath,'--ms-enable-electron-run-as-node',e,'--electron'].concat(a);require(e)";
const env = { ...process.env, ELECTRON_RUN_AS_NODE: '1', cwd: process.cwd() };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function cli(args, waitMs) {
  return new Promise((resolve) => {
    const p = spawn(EXE, ['-e', BOOT, CLI, ...args], { env, stdio: 'inherit' });
    const t = setTimeout(() => resolve('TIMEOUT'), waitMs);
    p.on('exit', (c) => { clearTimeout(t); resolve(c); });
  });
}
const portUp = () => new Promise((r) => {
  const s = net.connect(PORT, 'localhost');
  s.on('connect', () => { s.destroy(); r(true); });
  s.on('error', () => r(false));
  setTimeout(() => { s.destroy(); r(false); }, 2000);
});

(async () => {
  if ((process.argv[2] || '') === 'quit') {
    console.log('QUIT =', await cli(['quit'], 30000));
    return;
  }
  console.log('CLOSE =', await cli(['close', '--project', DIST], 40000)); // ★关项目窗口，迫使下次打开重新编译
  await sleep(4000);
  console.log('AUTO  =', await cli(['auto', '--project', DIST, '--auto-port', String(PORT)], 90000));
  for (let i = 0; i < 15; i++) {
    if (await portUp()) { console.log(`PORT_${PORT}=UP（已重新编译，可直接跑 automator 脚本）`); return; }
    await sleep(3000);
  }
  console.log(`PORT_${PORT}=DOWN`);
})();
