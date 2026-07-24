/**
 * router/index.ts — 后台路由（ADM-01 登录 / ADM-02 内容 / ADM-03 统计）
 * 未登录守卫：无 admin_token 或 token 已过期跳登录。
 */
import { createRouter, createWebHistory } from 'vue-router';

/** 本地解码 JWT 的 exp（秒），无法解析视为已过期。仅做过期判断，签名校验仍在后端。 */
function isTokenValid(token: string): boolean {
  try {
    // JWT payload 为 base64url（含 -/_、无 padding），需转回标准 base64 再补齐 padding 后才能 atob
    const seg = (token.split('.')[1] ?? '').replace(/-/g, '+').replace(/_/g, '/');
    const padded = seg.padEnd(Math.ceil(seg.length / 4) * 4, '=');
    const payload = JSON.parse(atob(padded));
    return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/content' },
    { path: '/login', component: () => import('@/views/Login.vue') },
    { path: '/content', component: () => import('@/views/Content.vue') },
    { path: '/stats', component: () => import('@/views/Stats.vue') },
  ],
});

router.beforeEach((to) => {
  const token = localStorage.getItem('admin_token');
  if (to.path !== '/login' && !(token && isTokenValid(token))) {
    // 过期或缺失都清掉，避免带着废 token 进后台壳再吃 401 闪一下
    localStorage.removeItem('admin_token');
    return '/login';
  }
  return true;
});
