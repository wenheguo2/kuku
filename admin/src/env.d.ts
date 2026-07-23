/**
 * env.d.ts — 类型 shims
 * 让 TS 识别 .vue 单文件组件与 Vite 客户端类型（依赖安装后生效）。
 */
/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
  export default component;
}
