/**
 * userStore.ts — 用户会话状态（Zustand）
 * 职责：登录（微信 code 换 token）、恢复登录态、登出；持有 selectedChildId（4 Tab 共用）。
 * MVP：登录后端自动建默认档案，返回 default_child_id。
 */
import { create } from 'zustand';
import Taro from '@tarojs/taro';
import { api } from '@/services/api';
import { ChildStore, TokenStore } from '@/services/storage';
import { player } from '@/services/audioPlayer';
import { clearPlaybackReports } from '@/services/playbackQueue';
import { usePlayerStore } from './playerStore';
import { AGREEMENT_VERSIONS } from '@/config/agreements';
import { tracker } from '@/services/tracker';

interface LoginResp {
  token: string;
  expires_in: number;
  user: { user_id: string; nickname: string | null; is_new: boolean };
  default_child_id: string;
}

interface ProfileResp {
  user_id: string;
  nickname: string | null;
  free_until?: string | null;
  can_access_all?: boolean;
  entitlement_until?: string | null;
  membership: { status: string; plan_type?: string; end_date?: string };
}

interface UserState {
  token: string | null;
  userId: string | null;
  nickname: string | null;
  selectedChildId: string | null;
  membershipStatus: string;
  membershipPlan: string | null;
  membershipEndDate: string | null;
  /** ★免费畅听截止时间 ISO（来自 /user/profile）；now<freeUntil 即免费期内 */
  freeUntil: string | null;
  /** ★是否可全站畅听（会员 active || 免费期内），后端统一口径 */
  canAccessAll: boolean;
  /** ★统一权益到期 ISO（赠送与会员较晚者），供“还剩 N 天”展示 */
  entitlementUntil: string | null;
  /** ★拉新：待绑定的邀请人 userId（从分享链接 launch query 捕获，登录时上报） */
  pendingInviter: string | null;
  isLogin: boolean;
  restore: () => void;
  refreshProfile: () => Promise<void>;
  login: () => Promise<void>;
  logout: () => void;
  setSelectedChild: (id: string) => void;
  setPendingInviter: (id: string) => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  token: null,
  userId: null,
  nickname: null,
  selectedChildId: null,
  membershipStatus: 'none',
  membershipPlan: null,
  membershipEndDate: null,
  freeUntil: null,
  canAccessAll: false,
  entitlementUntil: null,
  pendingInviter: null,
  isLogin: false,

  /** 启动时从本地缓存恢复 */
  restore: () => {
    const token = TokenStore.get();
    const childId = ChildStore.get();
    set({ token, isLogin: !!token, selectedChildId: childId });
    if (token) void get().refreshProfile().catch((error) => console.warn('恢复用户资料失败', error));
  },

  refreshProfile: async () => {
    if (!TokenStore.get()) return;
    const profile = await api.get<ProfileResp>('/user/profile');
    set({
      userId: profile.user_id,
      nickname: profile.nickname,
      membershipStatus: profile.membership.status,
      membershipPlan: profile.membership.plan_type ?? null,
      membershipEndDate: profile.membership.end_date ?? null,
      freeUntil: profile.free_until ?? null,
      canAccessAll: profile.can_access_all ?? (profile.membership.status === 'active'),
      entitlementUntil: profile.entitlement_until ?? null,
    });
  },

  /** 微信登录：wx.login 取 code → 后端换 token */
  login: async () => {
    const { code } = await Taro.login();
    const inviter = get().pendingInviter;
    const resp = await api.post<LoginResp>('/auth/login', {
      code,
      guardian_consent: true,
      ...AGREEMENT_VERSIONS,
      ...(inviter ? { inviter } : {}),
    });
    TokenStore.set(resp.token);
    ChildStore.set(resp.default_child_id);
    set({
      token: resp.token,
      userId: resp.user.user_id,
      nickname: resp.user.nickname,
      selectedChildId: resp.default_child_id,
      isLogin: true,
      pendingInviter: null,
    });
    void tracker.track('auth_login', { is_new: resp.user.is_new }, resp.default_child_id);
    void get().refreshProfile().catch((error) => console.warn('刷新用户资料失败', error));
  },

  logout: () => {
    TokenStore.clear();
    ChildStore.clear();
    player.destroy();
    usePlayerStore.getState().reset();
    clearPlaybackReports();
    set({
      token: null,
      userId: null,
      nickname: null,
      selectedChildId: null,
      membershipStatus: 'none',
      membershipPlan: null,
      membershipEndDate: null,
      freeUntil: null,
      canAccessAll: false,
      entitlementUntil: null,
      isLogin: false,
    });
  },

  setSelectedChild: (id: string) => {
    ChildStore.set(id);
    clearPlaybackReports(); // 切孩子清去重集，保证新孩子的播放重新计入其历史/成长
    set({ selectedChildId: id });
  },

  /** ★捕获分享链接带入的邀请人（已登录则忽略，邀请仅对新用户首次注册生效） */
  setPendingInviter: (id: string) => {
    if (!id || get().isLogin) return;
    set({ pendingInviter: id });
  },
}));

api.setUnauthorizedHandler(() => useUserStore.getState().logout());
