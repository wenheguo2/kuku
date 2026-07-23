<!--
  Content.vue — ADM-02 内容管理
  浏览学科/分类索引（读 NestJS /static 静态索引，与小程序同源契约）。
  MVP：只读浏览；后续接内容上下架/封面替换等写操作。
-->
<template>
  <div>
    <h2>内容管理</h2>
    <el-alert type="info" :closable="false" title="索引为静态资源（/static），与小程序同一契约；此处只读浏览。" style="margin-bottom: 16px" />
    <el-table :data="subjects" border>
      <el-table-column prop="subject_name" label="学科" />
      <el-table-column prop="category_count" label="分类数" width="120" />
      <el-table-column prop="total_entries" label="条目数" width="120" />
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { http } from '@/api';

interface SubjectBrief { subject_id: string; subject_name: string; category_count: number; total_entries: number }
const subjects = ref<SubjectBrief[]>([]);

onMounted(async () => {
  try {
    const data = await http.getStatic<{ subjects: SubjectBrief[] }>('/index/generated_stories/_global.json');
    subjects.value = data.subjects || [];
  } catch {
    subjects.value = [];
    ElMessage.error('内容索引加载失败，请确认后端静态服务已启动');
  }
});
</script>
