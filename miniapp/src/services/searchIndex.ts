/**
 * searchIndex.ts — 条目级搜索索引服务（脚本13产出，2026-07-29）
 * _search_story.json / _search_song.json：{list:[{t:标题,p:path,s:学科/分类,c?:1章回}]}
 * 万级条目 1~2MB：首次搜索时懒拉 + 模块级缓存 + in-flight 去重；调用方本地 includes 过滤限条数。
 */
import Taro from '@tarojs/taro';
import { buildIndexUrl } from '@/utils/path';

export interface SearchItem { t: string; p: string; s: string; c?: number }

const cache: Record<string, SearchItem[]> = {};
const inflight: Record<string, Promise<SearchItem[]>> = {};

async function loadSearchList(kind: 'story' | 'song'): Promise<SearchItem[]> {
  const key = kind;
  if (cache[key]) return cache[key];
  if (key in inflight) return inflight[key];
  const url = buildIndexUrl(`_search_${kind}.json`);
  inflight[key] = Taro.request({ url, dataType: 'json' })
    .then((res) => {
      const list = res.statusCode === 200 ? ((res.data as { list?: SearchItem[] }).list ?? []) : [];
      cache[key] = list;
      return list;
    })
    .finally(() => { delete inflight[key]; });
  return inflight[key];
}

/** 条目级检索：标题 includes 匹配，限 limit 条（大小写不敏感对英文友好） */
export async function searchEntries(kind: 'story' | 'song', q: string, limit = 30): Promise<SearchItem[]> {
  if (!q) return [];
  const list = await loadSearchList(kind);
  const lq = q.toLowerCase();
  const out: SearchItem[] = [];
  for (const it of list) {
    if (it.t.toLowerCase().includes(lq)) {
      out.push(it);
      if (out.length >= limit) break;
    }
  }
  return out;
}
