/**
 * global.d.ts — 全局类型声明
 * 声明 Taro 编译期全局宏 defineAppConfig/definePageConfig，及 SCSS 模块与环境变量。
 */
declare function defineAppConfig(config: Record<string, unknown>): Record<string, unknown>;
declare function definePageConfig(config: Record<string, unknown>): Record<string, unknown>;

declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production';
    TARO_ENV: 'weapp' | 'h5' | 'rn' | 'swan' | 'alipay' | 'tt' | 'qq';
    API_BASE_URL?: string;
    STATIC_BASE_URL?: string;
  }
}

declare module '*.scss';
declare module '*.png';
declare module '*.webp';
declare module '*.jpg';
