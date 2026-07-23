<!--
  Stats.vue — ADM-03 数据统计
  从后端实时聚合 events、综合挑战与订单数据。
-->
<template>
  <div>
    <h2>数据统计</h2>
    <el-row :gutter="16">
      <el-col :span="6" v-for="c in cards" :key="c.label">
        <el-card>
          <div style="font-size: 28px; font-weight: bold; color: #FF8C42">{{ c.value }}</div>
          <div style="color: #8B8D9E">{{ c.label }}</div>
        </el-card>
      </el-col>
    </el-row>
    <el-alert type="info" :closable="false" style="margin-top: 16px"
      :title="`统计日期：${date || '—'}；付费转化按当日已支付订单数 / 当日订单数计算。`" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { http } from '@/api';

interface AdminStats {
  date: string;
  active_users: number;
  story_plays: number;
  challenge_passes: number;
  paid_orders: number;
  payment_conversion: number;
}

const date = ref('');
const cards = ref([
  { label: '今日活跃用户', value: '0' },
  { label: '故事播放次数', value: '0' },
  { label: '挑战通过次数', value: '0' },
  { label: '付费转化', value: '0.00%' },
]);

onMounted(async () => {
  try {
    const stats = await http.get<AdminStats>('/admin/stats');
    date.value = stats.date;
    cards.value = [
      { label: '今日活跃用户', value: String(stats.active_users) },
      { label: '故事播放次数', value: String(stats.story_plays) },
      { label: '挑战通过次数', value: String(stats.challenge_passes) },
      { label: '付费转化', value: `${(stats.payment_conversion * 100).toFixed(2)}%` },
    ];
  } catch {
    ElMessage.error('统计数据加载失败');
  }
});
</script>
