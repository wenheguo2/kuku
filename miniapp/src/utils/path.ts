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
