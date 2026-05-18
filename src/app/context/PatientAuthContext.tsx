import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '../lib/api';

const STORAGE = 'tezca_patient_token';
const USER_STORAGE = 'tezca_patient_user';

export type PatientUser = { id: string; email: string; name: string; role: string };

type Ctx = {
  token: string | null;
  user: PatientUser | null;
  /** true sau khi không có token, hoặc đã xong GET /api/me (thành công / lỗi mạng). */
  sessionReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
};

const PatientAuthContext = createContext<Ctx | null>(null);

export function PatientAuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(STORAGE));
  const [user, setUser] = useState<PatientUser | null>(() => {
    const raw = localStorage.getItem(USER_STORAGE);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as PatientUser;
    } catch {
      return null;
    }
  });
  const [sessionReady, setSessionReady] = useState(() => !localStorage.getItem(STORAGE));
  const tokenRef = useRef<string | null>(token);
  tokenRef.current = token;

  const persist = useCallback((t: string | null, u: PatientUser | null) => {
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
    apiFetch<{ user: PatientUser }>('/api/me', { token })
      .then((r) => {
        if (tokenRef.current !== requestedToken) return;
        if (!r.user || r.user.role !== 'user') {
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
          msg.includes('Token') ||
          msg.includes('quyền') ||
          msg.includes('Unauthorized') ||
          msg.includes('Forbidden')
        ) {
          persist(null, null);
        }
      })
      .finally(() => {
        if (tokenRef.current === requestedToken) setSessionReady(true);
      });
  }, [token, persist]);

  const login = useCallback(async (email: string, password: string) => {
    const r = await apiFetch<{ token: string; user: PatientUser }>('/api/auth/patient/login', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim(), password }),
    });
    if (r.user.role !== 'user') throw new Error('Tài khoản không phải bệnh nhân');
    tokenRef.current = r.token;
    persist(r.token, r.user);
    setSessionReady(true);
  }, [persist]);

  const register = useCallback(async (email: string, password: string, name?: string) => {
    const r = await apiFetch<{ token: string; user: PatientUser }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    tokenRef.current = r.token;
    persist(r.token, r.user);
    setSessionReady(true);
  }, [persist]);

  const logout = useCallback(() => {
    setSessionReady(true);
    persist(null, null);
  }, [persist]);

  const value = useMemo(
    () => ({ token, user, sessionReady, login, register, logout }),
    [token, user, sessionReady, login, register, logout],
  );

  return <PatientAuthContext.Provider value={value}>{children}</PatientAuthContext.Provider>;
}

export function usePatientAuth() {
  const ctx = useContext(PatientAuthContext);
  if (!ctx) throw new Error('usePatientAuth cần PatientAuthProvider');
  return ctx;
}
