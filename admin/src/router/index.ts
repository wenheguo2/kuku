/**
 * router/index.ts — 后台路由（ADM-01 登录 / ADM-02 内容 / ADM-03 统计）
 * 未登录守卫：无 admin_token 跳登录。
 */
import { createRouter, createWebHistory } from 'vue-router';

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
  if (to.path !== '/login' && !token) return '/login';
  return true;
});
