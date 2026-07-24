/**
 * indexLoader.ts — 索引加载器（四级索引懒加载 + 内存缓存）
 * ★ 索引走静态资源（CDN/本地 /static），不经 /api/v1（md/11 §1）。
 * USE_MOCK=true 时返回 mock；false 时用 Taro.request 拉真实 JSON。
 */
import Taro from '@tarojs/taro';
import { CONFIG } from './config';
import { buildIndexUrl } from '@/utils/path';
import { AnyIndex, CategoryIndex, GlobalIndex, HomeIndex, SegmentsData, SubjectIndex } from '@/types/content';
import { mockCategoryIndex, mockGlobalIndex, mockHomeIndex, mockIndexByPath, mockSegments } from './mock';

const CACHE_TTL_MS = 60 * 60 * 1000;
const cache = new Map<string, { data: unknown; expiresAt: number }>();
const inflight = new Map<string, Promise<unknown>>();

async function fetchJson<T>(url: string, mock: T): Promise<T> {
  if (CONFIG.USE_MOCK) return mock;
  const cached = cache.get(url);
  if (cached && cached.expiresAt > Date.now()) return cached.data as T;
  const pending = inflight.get(url);
  if (pending) return pending as Promise<T>;

  const request = (async () => {
    const res = await Taro.request({ url, method: 'GET', timeout: 15_000 });
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw new Error(`内容索引请求失败（HTTP ${res.statusCode}）`);
    }
    if (!res.data || typeof res.data !== 'object') {
      throw new Error('内容索引格式无效');
    }
    const data = res.data as T;
    cache.set(url, { data, expiresAt: Date.now() + CACHE_TTL_MS });
    return data;
  })();
  inflight.set(url, request);
  try {
    return await request;
  } catch (error) {
    // 弱网/抖动降级：存在过期旧缓存则回退旧数据(stale-on-error)，避免直接空白/错误页
    if (cached) return cached.data as T;
    throw error;
  } finally {
    inflight.delete(url);
  }
}

export const indexLoader = {
  /** 内容版本切换或手动刷新时清空内存缓存。 */
  clearCache(): void {
    cache.clear();
    inflight.clear();
  },
  /** 全局索引 _global.json */
  loadGlobal(): Promise<GlobalIndex> {
    return fetchJson(buildIndexUrl('_global.json'), mockGlobalIndex);
  },

  /** 首页推荐 _home.json（章回大IP + 单篇池 + 热点，脚本 12 生成） */
  loadHome(): Promise<HomeIndex> {
    return fetchJson(buildIndexUrl('_home.json'), mockHomeIndex);
  },

  /** 学科索引 {subject}/_index.json */
  loadSubject(subjectId: string): Promise<SubjectIndex> {
    return fetchJson(buildIndexUrl(`${subjectId}/_index.json`), {
      subject_id: subjectId,
      subject_name: subjectId,
      categories: [
        { name: 'A1勇敢', path: `${subjectId}/A1勇敢`, entry_count: 3 },
      ],
    } as SubjectIndex);
  },

  /** 分类索引 {subject}/{category}/_index.json */
  loadCategory(subjectId: string, categoryName: string): Promise<CategoryIndex> {
    return fetchJson(buildIndexUrl(`${subjectId}/${categoryName}/_index.json`), mockCategoryIndex);
  },

  /**
   * ★ 通用：按任意层级 path 加载 _index.json（学科/分类/混合/多层/章回作品）。
   * 用于递归浏览：subject_index / category_index(standalone/mixed/multi_level) / work_index。
   * mock 模式返回 mockIndexByPath；真实模式拉 {path}/_index.json。
   */
  loadIndexByPath(path: string): Promise<AnyIndex> {
    const fallback = (mockIndexByPath[path] ?? mockCategoryIndex) as AnyIndex;
    return fetchJson(buildIndexUrl(`${path}/_index.json`), fallback);
  },

  /** 故事分段 segments.json（走 generated_stories 静态目录） */
  loadSegments(storyPath: string): Promise<SegmentsData> {
    const url = `${CONFIG.staticBaseUrl}/generated_stories/${storyPath
      .split('/')
      .map(encodeURIComponent)
      .join('/')}/segments.json`;
    return fetchJson(url, mockSegments);
  },
};
