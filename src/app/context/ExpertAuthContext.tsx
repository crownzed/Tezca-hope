import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '../lib/api';

const STORAGE = 'tezca_expert_token';
const USER_STORAGE = 'tezca_expert_user';

export type ExpertUser = { id: string; email: string; name: string; role: string };

type Ctx = {
  token: string | null;
  user: ExpertUser | null;
  /** true sau khi không có token, hoặc đã xong lần gọi GET /api/expert/me (thành công / lỗi). */
  sessionReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const ExpertAuthContext = createContext<Ctx | null>(null);

export function ExpertAuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(STORAGE));
  const [user, setUser] = useState<ExpertUser | null>(() => {
    const raw = localStorage.getItem(USER_STORAGE);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as ExpertUser;
    } catch {
      return null;
    }
  });
  const [sessionReady, setSessionReady] = useState(() => !localStorage.getItem(STORAGE));
  /** Tránh race: response của GET /me cho token cũ không được ghi đè / xóa phiên token mới (sau đăng nhập). */
  const tokenRef = useRef<string | null>(token);
  tokenRef.current = token;

  const persist = useCallback((t: string | null, u: ExpertUser | null) => {
    setToken(t);
    setUser(u);
    tokenRef.current = t;
    if (t) localStorage.setItem(STORAGE, t);
    else localStorage.removeItem(STORAGE);
    if (u) localStorage.setItem(USER_STORAGE, JSON.stringify(u));
    else localStorage.removeItem(USER_STORAGE);
  }, []);

  useEffect(() => {
    if (!token) {
      setSessionReady(true);
      return;
    }
    setSessionReady(false);
    const requestedToken = token;
    apiFetch<{ user: ExpertUser }>('/api/expert/me', { token })
      .then((r) => {
        if (tokenRef.current !== requestedToken) return;
        if (!r.user || r.user.role !== 'expert') {
          persist(null, null);
          return;
        }
        persist(requestedToken, r.user);
      })
      .catch((err) => {
        if (tokenRef.current !== requestedToken) return;
        const msg = err instanceof Error ? err.message : '';
        if (
          msg.includes('401') ||
          msg.includes('403') ||
          msg.includes('404') ||
          msg.includes('Token') ||
          msg.includes('quyền') ||
          msg.includes('Unauthorized') ||
          msg.includes('Forbidden') ||
          msg.includes('Sai email')
        ) {
          persist(null, null);
        }
      })
      .finally(() => {
        if (tokenRef.current === requestedToken) setSessionReady(true);
      });
  }, [token, persist]);

  const login = useCallback(async (email: string, password: string) => {
    const r = await apiFetch<{ token: string; user: ExpertUser }>('/api/auth/expert/login', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim(), password }),
    });
    if (r.user.role !== 'expert') throw new Error('Tài khoản không phải chuyên gia');
    tokenRef.current = r.token;
    persist(r.token, r.user);
    setSessionReady(true);
  }, [persist]);

  const logout = useCallback(() => {
    setSessionReady(true);
    persist(null, null);
  }, [persist]);

  const value = useMemo(
    () => ({ token, user, sessionReady, login, logout }),
    [token, user, sessionReady, login, logout],
  );

  return <ExpertAuthContext.Provider value={value}>{children}</ExpertAuthContext.Provider>;
}

export function useExpertAuth() {
  const ctx = useContext(ExpertAuthContext);
  if (!ctx) throw new Error('useExpertAuth cần ExpertAuthProvider');
  return ctx;
}
