export const CONFIG = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/api/v1',
  staticBaseUrl: process.env.EXPO_PUBLIC_STATIC_BASE_URL ?? 'http://localhost:3000/static',
  release: process.env.EXPO_PUBLIC_APP_RELEASE === 'true',
  previewAccess: process.env.EXPO_PUBLIC_APP_RELEASE === 'true' ? null : process.env.EXPO_PUBLIC_APP_PREVIEW_ACCESS ?? null,
  agreements: {
    user_agreement_version: process.env.EXPO_PUBLIC_USER_AGREEMENT_VERSION ?? '2026-07-draft',
    privacy_version: process.env.EXPO_PUBLIC_PRIVACY_VERSION ?? '2026-07-draft',
    children_privacy_version: process.env.EXPO_PUBLIC_CHILDREN_PRIVACY_VERSION ?? '2026-07-draft',
  },
} as const;

export function encodePath(path: string): string {
  return path.replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/');
}

export function assetUrl(path?: string | null): string {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;
  return `${CONFIG.staticBaseUrl}/${encodePath(path)}`;
}

export function coverUrl(path?: string | null): string {
  if (!path) return '';
  const clean = path.replace(/^\/+/, '');
  return assetUrl(clean.startsWith('illustrations/') ? clean : `illustrations/${clean}`);
}

export function indexUrl(path: string): string {
  return assetUrl(`index/generated_stories/${path}`);
}
