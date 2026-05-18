import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../lib/api';

const STORAGE = 'tezca_patient_token';
const USER_STORAGE = 'tezca_patient_user';

export type PatientUser = { id: string; email: string; name: string; role: string };

type Ctx = {
  token: string | null;
  user: PatientUser | null;
  loading: boolean;
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
  const [loading, setLoading] = useState(false);

  const persist = useCallback((t: string | null, u: PatientUser | null) => {
    setToken(t);
    setUser(u);
    if (t) localStorage.setItem(STORAGE, t);
    else localStorage.removeItem(STORAGE);
    if (u) localStorage.setItem(USER_STORAGE, JSON.stringify(u));
    else localStorage.removeItem(USER_STORAGE);
  }, []);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    apiFetch<{ user: PatientUser }>('/api/me', { token })
      .then((r) => persist(token, r.user))
      .catch((err) => {
        const msg = err instanceof Error ? err.message : '';
        if (msg.includes('401') || msg.includes('Token') || msg.includes('quyền')) persist(null, null);
      })
      .finally(() => setLoading(false));
  }, [token, persist]);

  const login = useCallback(async (email: string, password: string) => {
    const r = await apiFetch<{ token: string; user: PatientUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (r.user.role !== 'user') throw new Error('Tài khoản không phải bệnh nhân');
    persist(r.token, r.user);
  }, [persist]);

  const register = useCallback(async (email: string, password: string, name?: string) => {
    const r = await apiFetch<{ token: string; user: PatientUser }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    persist(r.token, r.user);
  }, [persist]);

  const logout = useCallback(() => persist(null, null), [persist]);

  const value = useMemo(
    () => ({ token, user, loading, login, register, logout }),
    [token, user, loading, login, register, logout],
  );

  return <PatientAuthContext.Provider value={value}>{children}</PatientAuthContext.Provider>;
}

export function usePatientAuth() {
  const ctx = useContext(PatientAuthContext);
  if (!ctx) throw new Error('usePatientAuth cần PatientAuthProvider');
  return ctx;
}
