/**
 * api/index.ts — 后台 HTTP 客户端
 * getStatic：读 NestJS /static 静态索引（与小程序同一契约）。
 * api.*：调 /api/v1 管理接口（带独立 admin_token）。
 */
import axios from 'axios';

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const instance = axios.create({ baseURL: apiBaseUrl, timeout: 10000 });

instance.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('admin_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && window.location.pathname !== '/login') {
      localStorage.removeItem('admin_token');
      window.location.assign('/login');
    }
    return Promise.reject(error);
  },
);

/** 解包标准包络 {code,message,data}：命中则总取 data（即使为 null），非标准响应原样返回。 */
function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'code' in payload && 'data' in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

export const http = {
  /** 读静态索引（开发经 vite proxy 或直连 3000/static） */
  async getStatic<T>(path: string): Promise<T> {
    const res = await instance.get<T>(`/static${path}`);
    return res.data;
  },
  async get<T>(path: string): Promise<T> {
    const res = await instance.get(`/api/v1${path}`);
    return unwrap<T>(res.data);
  },
  async post<T>(path: string, body?: unknown): Promise<T> {
    const res = await instance.post(`/api/v1${path}`, body);
    return unwrap<T>(res.data);
  },
};
