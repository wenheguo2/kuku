/**
 * config.ts — 前端运行配置
 * 开发期指向本地 NestJS（API + /static 静态资源，替代 CDN）。
 * USE_MOCK=true 时索引/内容走本地 mock，可脱离后端独立跑通 UI。
 */
declare const __KUKU_API_BASE_URL__: string;
declare const __KUKU_STATIC_BASE_URL__: string;
declare const __KUKU_USE_MOCK__: boolean;
declare const __KUKU_RELEASE__: boolean;

export const CONFIG = {
  /** 业务接口前缀（对齐 md/11：/api/v1） */
  apiBaseUrl: __KUKU_API_BASE_URL__,
  /** 静态资源（索引/音频/图片），开发期为 NestJS /static，生产为 CDN */
  staticBaseUrl: __KUKU_STATIC_BASE_URL__,
  /** true=索引/内容用 mock（脱离后端跑 UI）；接后端切 false */
  USE_MOCK: __KUKU_USE_MOCK__,
  /** 只有通过 config/index.ts 发布门禁后才为 true。 */
  IS_RELEASE: __KUKU_RELEASE__,
};
