<!--
  App.vue — 后台主框架
  登录页无侧栏；其余页用 Element Plus 布局（侧栏菜单 + 内容区）。
-->
<template>
  <div v-if="isLoginPage" class="login-wrap">
    <router-view />
  </div>
  <el-container v-else style="height: 100vh">
    <el-aside width="200px" style="background: #FF8C42; color: #fff">
      <div style="padding: 20px; font-size: 20px; font-weight: bold">酷酷后台</div>
      <el-menu :default-active="route.path" router background-color="#FF8C42" text-color="#fff" active-text-color="#FFD93D">
        <el-menu-item index="/content">内容管理</el-menu-item>
        <el-menu-item index="/stats">数据统计</el-menu-item>
        <el-menu-item @click="logout">退出登录</el-menu-item>
      </el-menu>
    </el-aside>
    <el-main>
      <router-view />
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const isLoginPage = computed(() => route.path === '/login');

function logout() {
  localStorage.removeItem('admin_token');
  router.replace('/login');
}
</script>
