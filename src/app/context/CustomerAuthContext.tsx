import React, { createContext, useContext, useMemo } from 'react';
import { useAuthSession, type AuthUser } from '../lib/useAuthSession';

export type CustomerUser = AuthUser;

type Ctx = {
  token: string | null;
  user: CustomerUser | null;
  sessionReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
};

const CustomerAuthContext = createContext<Ctx | null>(null);

const customerSessionConfig = {
  expectedRole: 'user',
  tokenStorageKey: 'tezca_customer_token',
  userStorageKey: 'tezca_customer_user',
  mePath: '/api/me',
  loginPath: '/api/auth/customer/login',
  registerPath: '/api/auth/register',
  wrongRoleLoginMessage: 'Tài khoản không phải khách hàng',
} as const;

export function CustomerAuthProvider({ children }: { children: React.ReactNode }) {
  const session = useAuthSession(customerSessionConfig);

  const value = useMemo(
    () => ({
      token: session.token,
      user: session.user,
      sessionReady: session.sessionReady,
      login: session.login,
      register: session.register!,
      logout: session.logout,
    }),
    [
      session.token,
      session.user,
      session.sessionReady,
      session.login,
      session.register,
      session.logout,
    ],
  );

  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>;
}

export function useCustomerAuth() {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error('useCustomerAuth cần CustomerAuthProvider');
  return ctx;
}
