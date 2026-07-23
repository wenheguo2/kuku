/**
 * 跨平台 release 构建入口：强制打开 config/index.ts 的正式发布门禁。
 */
const { spawnSync } = require('child_process');

const taroBin = require.resolve('@tarojs/cli/bin/taro');
const result = spawnSync(process.execPath, [taroBin, 'build', '--type', 'weapp'], {
  stdio: 'inherit',
  env: { ...process.env, TARO_APP_RELEASE: 'true' },
});

process.exit(result.status ?? 1);
