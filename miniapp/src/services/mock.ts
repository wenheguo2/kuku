/**
 * mock.ts — 本地 mock 数据（USE_MOCK=true 时用；脱离后端跑通 UI）
 * 结构与真实索引一致，便于切换到真实静态资源零改代码。
 */
import { AnyIndex, CategoryIndex, GlobalIndex, HomeIndex, SegmentsData, SubjectIndex, WorkIndex } from '@/types/content';

export const mockGlobalIndex: GlobalIndex = {
  schema_version: '1.0',
  index_type: 'global_index',
  generated_at: '2026-07-21',
  stats: { total_subjects: 3, total_entries: 30 },
  subjects: [
    { subject_id: '品格养成', subject_name: '品格养成', category_count: 9, total_entries: 1565, cover: { cover_image_url: 'covers/generated/品格养成/品格养成.webp', cover_level: 'subject' } },
    { subject_id: '上下五千年', subject_name: '上下五千年', category_count: 8, total_entries: 2697, cover: { cover_image_url: 'covers/generated/上下五千年/上下五千年.webp', cover_level: 'subject' } },
    { subject_id: '自然科学', subject_name: '自然科学', category_count: 7, total_entries: 1331, cover: { cover_image_url: 'covers/generated/自然科学/自然科学.webp', cover_level: 'subject' } },
  ],
};

export const mockCategoryIndex: CategoryIndex = {
  schema_version: '1.0',
  index_type: 'category_index',
  structure_type: 'standalone_collection',
  display_as: 'category_card',
  path: '品格养成/A1勇敢',
  name: 'A1勇敢',
  cover: { cover_image_url: 'covers/generated/品格养成/A1勇敢/A1勇敢.webp', cover_level: 'category' },
  entry_count: 3,
  entries: [
    { entry_id: '勇敢的小狮子', title: '勇敢的小狮子', structure_type: 'standalone', display_as: 'story_card', path: '品格养成/A1勇敢/勇敢的小狮子', level: 'L3', duration_ms: 240000 },
    { entry_id: '不怕黑的兔子', title: '不怕黑的兔子', structure_type: 'standalone', display_as: 'story_card', path: '品格养成/A1勇敢/不怕黑的兔子', level: 'L2', duration_ms: 180000 },
    { entry_id: '第一次上台', title: '第一次上台', structure_type: 'standalone', display_as: 'story_card', path: '品格养成/A1勇敢/第一次上台', level: 'L4', duration_ms: 300000 },
  ],
};

export const mockSegments: SegmentsData = {
  story_id: '品格养成/A1勇敢/勇敢的小狮子',
  title: '勇敢的小狮子',
  total_duration: 240,
  full_audio_url: '', // mock 无真实音频；真实时为 audio/.../full.mp3
  segments: [
    { segment_id: 1, seq: 1, start_time: 0, end_time: 60, text: '从前有一只小狮子，它很害怕打雷……' },
    { segment_id: 2, seq: 2, start_time: 60, end_time: 140, text: '有一天，暴风雨来了，小伙伴们都躲了起来。' },
    { segment_id: 3, seq: 3, start_time: 140, end_time: 240, text: '小狮子鼓起勇气，第一次冲进雨里帮助大家。' },
  ],
};

/** mock 歌曲（含内嵌 LRC） */
export const mockSong = {
  song_id: 'S001_两只老虎',
  title: '两只老虎',
  duration: 40,
  audio_url: '',
  lrc: '[00:01.00]两只老虎 两只老虎\n[00:05.00]跑得快 跑得快\n[00:09.00]一只没有耳朵\n[00:13.00]一只没有尾巴\n[00:17.00]真奇怪 真奇怪',
};

// ============ 章回/混合/多层 索引 mock 树（演示总入口，结构同真实） ============

/** 上下五千年 学科索引（含一个 mixed 分类） */
const mockSubject_history: SubjectIndex = {
  subject_id: '上下五千年',
  subject_name: '上下五千年',
  categories: [
    { id: 'E1成语故事', name: 'E1成语故事', path: '上下五千年/E1成语故事', structure_type: 'standalone_collection', display_as: 'category_card', entry_count: 3 },
    { id: 'E3历史故事', name: 'E3历史故事', path: '上下五千年/E3历史故事', structure_type: 'mixed', display_as: 'mixed_container', entry_count: 3 },
  ],
};

/** E3历史故事：mixed（含章回作品 + 单篇） */
const mockMixedCategory: CategoryIndex = {
  schema_version: '1.0', index_type: 'category_index', structure_type: 'mixed', display_as: 'mixed_container',
  path: '上下五千年/E3历史故事', name: 'E3历史故事', entry_count: 3,
  entries: [
    { entry_id: '三国演义', title: '三国演义', structure_type: 'chaptered', display_as: 'chaptered_card', path: '上下五千年/E3历史故事/三国演义', total_chapters: 5 },
    { entry_id: '三十六计', title: '三十六计', structure_type: 'chaptered', display_as: 'chaptered_card', path: '上下五千年/E3历史故事/三十六计', total_chapters: 3 },
    { entry_id: '完璧归赵', title: '完璧归赵', structure_type: 'standalone', display_as: 'story_card', path: '上下五千年/E3历史故事/完璧归赵', level: 'L5', duration_ms: 300000 },
  ],
};

/** 三国演义：chaptered_work（总入口 + 章节列表） */
const mockWork_sanguo: WorkIndex = {
  schema_version: '1.0', index_type: 'work_index', structure_type: 'chaptered_work', display_as: 'chaptered_card',
  path: '上下五千年/E3历史故事/三国演义', work_name: '三国演义', total_chapters: 5, total_duration_ms: 3000000,
  chapters: [
    { chapter_index: 1, chapter_id: 'c1', title: '第01回 桃园结义', full_path: '上下五千年/E3历史故事/三国演义/第01回 桃园结义', level: 'L5', duration_ms: 600000 },
    { chapter_index: 2, chapter_id: 'c2', title: '第02回 温酒斩华雄', full_path: '上下五千年/E3历史故事/三国演义/第02回', level: 'L5', duration_ms: 600000 },
    { chapter_index: 3, chapter_id: 'c3', title: '第03回 三英战吕布', full_path: '上下五千年/E3历史故事/三国演义/第03回', level: 'L5', duration_ms: 620000 },
    { chapter_index: 4, chapter_id: 'c4', title: '第04回 连环计', full_path: '上下五千年/E3历史故事/三国演义/第04回', level: 'L5', duration_ms: 590000 },
    { chapter_index: 5, chapter_id: 'c5', title: '第05回 三顾茅庐', full_path: '上下五千年/E3历史故事/三国演义/第05回', level: 'L5', duration_ms: 610000 },
  ],
};

/** 其他学科的简化学科索引（均为 standalone） */
const mockSubject_simple = (subject: string, cat: string): SubjectIndex => ({
  subject_id: subject, subject_name: subject,
  categories: [{ id: cat, name: cat, path: `${subject}/${cat}`, structure_type: 'standalone_collection', display_as: 'category_card', entry_count: 3 }],
});

/** 按 path 的 mock 索引表（loadIndexByPath 用） */
export const mockIndexByPath: Record<string, AnyIndex> = {
  '上下五千年': mockSubject_history,
  '上下五千年/E1成语故事': { ...mockCategoryIndex, path: '上下五千年/E1成语故事', name: 'E1成语故事' },
  '上下五千年/E3历史故事': mockMixedCategory,
  '上下五千年/E3历史故事/三国演义': mockWork_sanguo,
  '品格养成': mockSubject_simple('品格养成', 'A1勇敢'),
  '品格养成/A1勇敢': mockCategoryIndex,
  '自然科学': mockSubject_simple('自然科学', 'D1动物'),
  '自然科学/D1动物': { ...mockCategoryIndex, path: '自然科学/D1动物', name: 'D1动物' },
};

/** mock 首页推荐（结构同 _home.json） */
export const mockHomeIndex: HomeIndex = {
  schema_version: '1.0',
  index_type: 'home_index',
  chaptered_works: [
    { title: '三国演义', path: '上下五千年/E3历史故事/三国演义', subject: '上下五千年', total_chapters: 5, cover: '' },
  ],
  standalone_picks: [
    { title: '完璧归赵', path: '上下五千年/E3历史故事/完璧归赵', subject: '上下五千年', level: 'L5', cover: '' },
    { title: '坐井观天', path: '上下五千年/E1成语故事/坐井观天', subject: '上下五千年', level: 'L4', cover: '' },
    { title: '池塘边的雄鹿', path: '神州之外/寓言/池塘边的雄鹿', subject: '神州之外', level: 'L3', cover: '' },
  ],
  hot: [
    { type: 'chaptered', title: '三国演义', path: '上下五千年/E3历史故事/三国演义', subject: '上下五千年', total_chapters: 5, cover: '' },
    { type: 'standalone', title: '坐井观天', path: '上下五千年/E1成语故事/坐井观天', subject: '上下五千年', cover: '' },
  ],
};
