/**
 * config/index.ts — Taro 编译配置
 * 输出 weapp/h5；SCSS 全局变量注入；@ 别名指向 src。
 */
const path = require('path');

const isDevelopment = process.env.NODE_ENV === 'development';
const releaseFlag = process.env.TARO_APP_RELEASE;
const isRelease = releaseFlag === 'true';
const apiBaseUrl = process.env.TARO_APP_API_BASE_URL
  || (isRelease ? 'https://api.example.com/api/v1' : 'http://localhost:3000/api/v1');
const staticBaseUrl = process.env.TARO_APP_STATIC_BASE_URL
  || (isRelease ? 'https://cdn.example.com' : 'http://localhost:3000/static');
const useMock = process.env.TARO_APP_USE_MOCK
  ? process.env.TARO_APP_USE_MOCK === 'true'
  : !isRelease;

if (isRelease) {
  const errors = [];
  if (useMock) errors.push('TARO_APP_USE_MOCK 必须为 false');
  if (!apiBaseUrl.startsWith('https://') || apiBaseUrl.includes('example.com')) errors.push('API 地址必须是真实 HTTPS 域名');
  if (!staticBaseUrl.startsWith('https://') || staticBaseUrl.includes('example.com')) errors.push('静态资源地址必须是真实 HTTPS 域名');
  if (!process.env.TARO_APP_APPID || process.env.TARO_APP_APPID === 'touristappid') errors.push('缺少真实 TARO_APP_APPID');
  if (process.env.TARO_APP_AGREEMENTS_FINAL !== 'true') errors.push('协议仍为开发草案，需法务定稿后设置 TARO_APP_AGREEMENTS_FINAL=true');
  if (errors.length) throw new Error(`小程序 release 配置校验失败：${errors.join('；')}`);
}

const config = {
  projectName: 'kuku-stories-miniapp',
  date: '2026-7-22',
  designWidth: 750,
  deviceRatio: { 640: 2.34 / 2, 750: 1, 828: 1.81 / 2, 375: 2 / 1 },
  sourceRoot: 'src',
  outputRoot: 'dist',
  plugins: [] as unknown[],
  defineConstants: {
    __KUKU_API_BASE_URL__: JSON.stringify(apiBaseUrl),
    __KUKU_STATIC_BASE_URL__: JSON.stringify(staticBaseUrl),
    __KUKU_USE_MOCK__: JSON.stringify(useMock),
    __KUKU_RELEASE__: JSON.stringify(isRelease),
  },
  alias: {
    '@': path.resolve(__dirname, '..', 'src'),
  },
  copy: { patterns: [] as unknown[], options: {} },
  framework: 'react',
  compiler: 'webpack5',
  cache: { enable: false },
  sass: {
    // 全局注入 SCSS 变量/mixin，页面无需重复 @import
    resource: [path.resolve(__dirname, '..', 'src/styles/variables.scss')],
  },
  mini: {
    postcss: {
      pxtransform: { enable: true, config: {} },
      cssModules: { enable: false },
    },
    // Node 24 下 Taro 的 webpackbar(ProgressPlugin 子类) 触发 schema 校验错误，删除该进度条插件（仅影响构建进度显示）
    webpackChain(chain: any) {
      if (chain.plugins.has('webpackbar')) chain.plugins.delete('webpackbar');
    },
  },
  h5: {
    publicPath: '/',
    staticDirectory: 'static',
    postcss: {
      autoprefixer: { enable: true },
      cssModules: { enable: false },
    },
    webpackChain(chain: any) {
      if (chain.plugins.has('webpackbar')) chain.plugins.delete('webpackbar');
    },
  },
};

module.exports = function (merge: (...args: any[]) => unknown) {
  if (process.env.NODE_ENV === 'development') {
    return merge({}, config, require('./dev'));
  }
  return merge({}, config, require('./prod'));
};
