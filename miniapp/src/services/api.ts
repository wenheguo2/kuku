/**
 * api.ts — HTTP 请求封装（对齐 md/11 §0.3 包络）
 * 职责：Taro.request 封装；自动加 JWT；解 {code,message,data}；401 跳登录；错误 toast。
 */
import Taro from '@tarojs/taro';
import { CONFIG } from './config';
import { TokenStore } from './storage';

export interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
}

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';
let loginRedirecting = false;
let unauthorizedHandler: (() => void) | null = null;

/** 带业务码的错误，页面可据 code 做差异处理（如 403 会员门控） */
export interface ApiError extends Error {
  code?: number;
}

async function request<T>(method: Method, path: string, data?: Record<string, unknown>): Promise<T> {
  const token = TokenStore.get();
  const res = await Taro.request({
    url: `${CONFIG.apiBaseUrl}${path}`,
    method,
    data,
    header: {
      'content-type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    timeout: 15_000,
  });

  const body = res.data && typeof res.data === 'object' ? res.data as ApiEnvelope<T> : null;
  if (res.statusCode >= 200 && res.statusCode < 300 && body?.code === 0) {
    return body.data;
  }

  // 业务错误处理
  const code = body?.code || res.statusCode;
  if (code === 401) {
    if (unauthorizedHandler) unauthorizedHandler();
    else TokenStore.clear();
    if (!loginRedirecting) {
      loginRedirecting = true;
      Taro.reLaunch({ url: '/pages/common/login/index' })
        .catch((error) => console.warn('跳转登录页失败', error))
        .finally(() => { loginRedirecting = false; });
    }
    const e = new Error('未登录或登录已过期') as ApiError;
    e.code = 401;
    throw e;
  }
  const msg = body?.message || `请求失败(${res.statusCode})`;
  // 403 会员门控：不弹 toast，交由页面展示“会员专属”锁定态
  if (code !== 403) {
    Taro.showToast({ title: msg, icon: 'none' });
  }
  const err = new Error(msg) as ApiError;
  err.code = code;
  throw err;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, data?: Record<string, unknown>) => request<T>('POST', path, data),
  put: <T>(path: string, data?: Record<string, unknown>) => request<T>('PUT', path, data),
  del: <T>(path: string, data?: Record<string, unknown>) => request<T>('DELETE', path, data),
  setUnauthorizedHandler: (handler: () => void) => {
    unauthorizedHandler = handler;
  },
};
