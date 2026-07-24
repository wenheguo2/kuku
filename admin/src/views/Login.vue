<!--
  Login.vue — ADM-01 后台登录
  通过后端管理员专用接口校验账号密码并签发短期 token。
-->
<template>
  <div class="login-box">
    <h2>酷酷儿童故事 · 管理后台</h2>
    <el-form>
      <el-form-item>
        <el-input v-model="username" placeholder="管理员账号" />
      </el-form-item>
      <el-form-item>
        <el-input v-model="password" type="password" placeholder="密码" />
      </el-form-item>
      <el-button type="primary" style="width: 100%" :loading="loading" @click="login">登录</el-button>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { http } from '@/api';

const username = ref('');
const password = ref('');
const loading = ref(false);
const router = useRouter();

async function login() {
  if (!username.value || !password.value) {
    ElMessage.warning('请输入账号密码');
    return;
  }
  loading.value = true;
  try {
    const result = await http.post<{ access_token: string }>('/admin/auth/login', {
      username: username.value,
      password: password.value,
    });
    if (!result?.access_token) throw new Error('登录响应异常');
    localStorage.setItem('admin_token', result.access_token);
    await router.push('/content');
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || '登录失败，请检查账号密码');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-box { max-width: 360px; margin: 160px auto; padding: 32px; box-shadow: 0 8px 28px rgba(0,0,0,0.1); border-radius: 12px; }
h2 { text-align: center; margin-bottom: 24px; }
</style>
