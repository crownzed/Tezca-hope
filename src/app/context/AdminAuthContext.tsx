import React, { createContext, useContext, useMemo } from 'react';
import { useAuthSession, type AuthUser } from '../lib/useAuthSession';

export type AdminUser = AuthUser;

type Ctx = {
  token: string | null;
  user: AdminUser | null;
  sessionReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AdminAuthContext = createContext<Ctx | null>(null);

const adminSessionConfig = {
  expectedRole: 'admin',
  tokenStorageKey: 'tezca_admin_token',
  userStorageKey: 'tezca_admin_user',
  mePath: '/api/admin/me',
  loginPath: '/api/auth/admin/login',
  wrongRoleLoginMessage: 'Tài khoản không phải quản trị viên',
} as const;

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const session = useAuthSession(adminSessionConfig);
  const value = useMemo(
    () => ({
      token: session.token,
      user: session.user,
      sessionReady: session.sessionReady,
      login: session.login,
      logout: session.logout,
    }),
    [session.token, session.user, session.sessionReady, session.login, session.logout],
  );
  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth cần AdminAuthProvider');
  return ctx;
}
