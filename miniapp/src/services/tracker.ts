/**
 * tracker.ts — 前端行为埋点薄封装。
 * 埋点失败不阻断主业务，但会保留控制台告警，避免静默吞错。
 */
import { api } from './api';

export const tracker = {
  async track(event: string, properties: Record<string, unknown> = {}, childId?: string | null): Promise<void> {
    try {
      await api.post('/track', {
        event,
        ...(childId ? { child_id: childId } : {}),
        properties,
      });
    } catch (error) {
      console.warn(`[tracker] ${event} 上报失败`, error);
    }
  },
};
