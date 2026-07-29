/**
 * path.ts — 资源 URL 拼接
 * ★ 决策方式A（md/20 §1.3）：索引/物理目录用中文，拼 URL 时对每段 encodeURIComponent，
 *   解决"中文入 URL"。索引内的 cover_image_url/path 均为相对路径，统一经此函数拼成绝对地址。
 */
import { CONFIG } from '@/services/config';

/** 对路径逐段编码（保留 / 分隔符），前接 staticBaseUrl */
export function buildAssetUrl(relPath: string): string {
  if (!relPath) return '';
  if (/^https?:\/\//.test(relPath)) return relPath; // 已是绝对地址
  const clean = relPath.replace(/^\/+/, '');
  const encoded = clean
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
  return `${CONFIG.staticBaseUrl}/${encoded}`;
}

/** 索引文件地址：index/generated_stories/... */
export function buildIndexUrl(relPath: string): string {
  return buildAssetUrl(`index/generated_stories/${relPath}`);
}

/**
 * 封面地址：索引里的 cover_image_url 形如 `covers/generated/{学科}/...webp`，
 * 物理位于 production/illustrations/ 下，故拼 `illustrations/` 前缀。空值返回 ''。
 */
export function buildCoverUrl(coverImageUrl?: string | null): string {
  if (!coverImageUrl) return '';
  if (/^https?:\/\//.test(coverImageUrl)) return coverImageUrl;
  const clean = coverImageUrl.replace(/^\/+/, '');
  const rel = clean.startsWith('illustrations/') ? clean : `illustrations/${clean}`;
  return buildAssetUrl(rel);
}

/**
 * 按故事 path 推导封面地址（封面目录镜像 generated_stories：covers/generated/{path}/{末段}.jpg）。
 * 用于只有 path 没有索引 cover 的场景（历史/收藏/直达链接）；章节级 path 可能 404，消费方需兜底。
 */
export function guessCoverFromPath(storyPath?: string | null): string {
  if (!storyPath) return '';
  const clean = storyPath.replace(/^\/+|\/+$/g, '');
  const name = clean.split('/').filter(Boolean).pop();
  if (!name) return '';
  return buildCoverUrl(`covers/generated/${clean}/${name}.jpg`);
}

/**
 * 章节展示标题清洗：部分内容库章节 title 带文件名式前缀（如「三字经001-001_第1段_人之初性本善」）。
 * 仅在命中「编号-编号_(第N段_)?」模式时剥离前缀，正常标题（如三国「第001回 …」）不受影响。
 */
export function cleanChapterTitle(title?: string | null): string {
  if (!title) return '';
  const m = title.match(/^[^_]*\d+\s*-\s*\d+_(?:第?\d+段?_)?(.+)$/);
  return m && m[1] ? m[1] : title;
}
