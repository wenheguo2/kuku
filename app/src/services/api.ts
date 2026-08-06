import { CONFIG } from '@/config';
import type { ApiEnvelope } from '@/types';
import { secureSession } from './secureSession';

export class ApiError extends Error {
  constructor(message: string, readonly code: number) { super(message); }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const token = await secureSession.token();
    const response = await fetch(`${CONFIG.apiBaseUrl}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
    const body = await response.json().catch(() => null) as ApiEnvelope<T> | null;
    if (response.ok && body?.code === 0) return body.data;
    throw new ApiError(body?.message ?? `请求失败（${response.status}）`, body?.code ?? response.status);
  } finally {
    clearTimeout(timeout);
  }
}
