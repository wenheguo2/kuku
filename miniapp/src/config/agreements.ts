/**
 * 协议版本单一真源：登录留痕与协议阅读页必须引用同一组版本号。
 * 法务定稿时同时替换正文和这里的版本，并同步后端 .env。
 */
export const AGREEMENT_VERSIONS = {
  user_agreement_version: '2026-07-draft',
  privacy_version: '2026-07-draft',
  children_privacy_version: '2026-07-draft',
} as const;
