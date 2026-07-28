/**
 * content.ts — 内容/索引数据模型（★ 对齐真实索引结构，见 md/20 §1.3）
 * subject_id 为中文；分类/故事索引含 structure_type/display_as/path/cover/entries。
 */

export interface Cover {
  cover_image_url: string; // 相对路径，经 buildAssetUrl 拼绝对
  cover_level: 'subject' | 'category' | 'story';
}

/** 全局索引 _global.json */
export interface GlobalIndex {
  schema_version: string;
  index_type: string;
  generated_at: string;
  stats: { total_subjects: number; total_entries: number };
  subjects: SubjectBrief[];
}

export interface SubjectBrief {
  subject_id: string; // 中文学科名
  subject_name: string;
  category_count: number;
  total_entries: number;
  cover?: Cover;
}

/** 学科索引 _index.json（分类列表） */
export interface SubjectIndex {
  subject_id: string;
  subject_name: string;
  categories: CategoryBrief[];
  cover?: Cover;
}

export interface CategoryBrief {
  id?: string;
  name: string;
  path?: string;
  structure_type?: string;
  display_as?: string;
  entry_count?: number;
  cover?: Cover;
}

/** 分类索引：故事/合集条目（multi_level 时用 sub_categories 而非 entries） */
export interface CategoryIndex {
  schema_version: string;
  index_type: string;
  structure_type: 'standalone_collection' | 'chaptered_work' | 'mixed' | 'multi_level' | 'txt_collection';
  display_as: string;
  path: string;
  name: string;
  cover?: Cover;
  entry_count?: number;
  entries?: EntryItem[];
  sub_category_count?: number;
  sub_categories?: CategoryBrief[]; // multi_level 子分类（无 path，需拼 {parent.path}/{id}）
}

export interface EntryItem {
  entry_id: string;
  title: string;
  structure_type: string; // standalone / chaptered / collection / nested_category ...
  display_as: string; // story_card / chaptered_card / collection_card / nested_category ...
  path: string; // 中文相对路径
  level?: string;
  duration_ms?: number;
  char_count?: number;
  total_chapters?: number; // chaptered 作品的总章节数
  cover?: Cover;
}

/** 章回作品的单个章节（work_index.chapters[]） */
export interface ChapterItem {
  chapter_index: number;
  chapter_id: string;
  title: string;
  full_path: string; // 章节音频/segments 路径
  level?: string;
  duration_ms?: number;
  char_count?: number;
  cover?: Cover;
}

/** 章回作品索引（index_type=work_index，如 三国演义 的总入口） */
export interface WorkIndex {
  schema_version: string;
  index_type: 'work_index';
  structure_type: 'chaptered_work';
  display_as: string;
  path: string;
  work_name: string;
  cover?: Cover;
  total_chapters: number;
  total_duration_ms?: number;
  chapters: ChapterItem[];
}

/** 任意层级索引（按 index_type 归一化后处理） */
export type AnyIndex = SubjectIndex | CategoryIndex | WorkIndex;

/** 首页推荐索引 _home.json（脚本 12 生成；cover 为相对路径字符串） */
export interface HomeWork {
  title: string;
  path: string;
  subject: string;
  total_chapters: number;
  cover: string;
}
export interface HomePick {
  title: string;
  path: string;
  subject: string;
  level?: string;
  duration_ms?: number;
  cover: string;
}
export interface HomeHot {
  type: 'chaptered' | 'standalone';
  title: string;
  path: string;
  subject: string;
  total_chapters?: number;
  cover: string;
}
export interface HomeIndex {
  schema_version?: string;
  index_type?: string;
  chaptered_works: HomeWork[];
  standalone_picks: HomePick[];
  hot: HomeHot[];
}

/** 故事分段 segments.json */
export interface SegmentsData {
  story_id: string;
  title: string;
  total_duration?: number;
  cover_url?: string;
  full_audio_url?: string;
  segments: SegmentItem[];
}

export interface SegmentItem {
  segment_id?: number | string;
  /** 真实产出 segments.json 的段 id（如 group_read_0/scene_1） */
  id?: string;
  seq?: number;
  start_time?: number;
  end_time?: number;
  /** 真实产出：毫秒时间轴（start_ms 多为 0，需按 duration_ms 累计推算） */
  start_ms?: number;
  duration_ms?: number;
  audio_url?: string;
  text?: string;
}

/** ★非故事学科（歌曲归歌曲 tab、学科启蒙归成长 tab）：故事 tab 学科网格/story 搜索一律过滤，Tab 隔离原则 */
export const NON_STORY_SUBJECT_IDS = ['瞎编的歌曲', '学科启蒙'];
