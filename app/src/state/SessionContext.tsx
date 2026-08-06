import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { CONFIG } from '@/config';
import type { LoginResult, Profile } from '@/types';
import { api } from '@/services/api';
import { secureSession } from '@/services/secureSession';

interface SessionValue {
  loading: boolean;
  loggedIn: boolean;
  childId: string | null;
  profile: Profile | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  refresh: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const [loading, setLoading] = useState(true);
  const [childId, setChildId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const refresh = useCallback(async () => {
    const token = await secureSession.token();
    if (!token) { setProfile(null); return; }
    const value = await api<Profile>('/user/profile');
    setProfile(value);
  }, []);

  useEffect(() => {
    if (CONFIG.previewAccess === 'entitled') {
      setChildId(null);
      setProfile({
        user_id: 'app-preview-user', nickname: '小听众', can_access_all: true,
        entitlement_until: new Date(Date.now() + 30 * 86_400_000).toISOString(),
        membership: { status: 'active', plan_type: 'preview', end_date: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10) },
      });
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        const [token, storedChild] = await Promise.all([secureSession.token(), secureSession.childId()]);
        setChildId(storedChild);
        if (token) await refresh();
      } catch {
        await secureSession.clear();
        setChildId(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [refresh]);

  const login = useCallback(async () => {
    if (Platform.OS !== 'android' && Platform.OS !== 'ios') throw new Error('App 登录只支持 Android/iOS');
    const installationId = await secureSession.installationId();
    const result = await api<LoginResult>('/auth/app/login', {
      method: 'POST',
      body: JSON.stringify({
        installation_id: installationId,
        platform: Platform.OS,
        guardian_consent: true,
        ...CONFIG.agreements,
      }),
    });
    await secureSession.save(result.token, result.default_child_id);
    setChildId(result.default_child_id);
    await refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await secureSession.clear();
    setChildId(null);
    setProfile(null);
  }, []);

  const deleteAccount = useCallback(async () => {
    await api('/user', { method: 'DELETE', body: JSON.stringify({ confirm: true, reason: 'native_app_user_request' }) });
    await logout();
  }, [logout]);

  const value = useMemo<SessionValue>(() => ({
    loading,
    loggedIn: !!profile,
    childId,
    profile,
    login,
    logout,
    deleteAccount,
    refresh,
  }), [childId, deleteAccount, loading, login, logout, profile, refresh]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession 必须位于 SessionProvider 内');
  return value;
}
