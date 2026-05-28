import React, { createContext, useContext, useMemo } from 'react';
import { useAuthSession, type AuthUser } from '../lib/useAuthSession';

export type ExpertUser = AuthUser;

type Ctx = {
  token: string | null;
  user: ExpertUser | null;
  sessionReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const ExpertAuthContext = createContext<Ctx | null>(null);

const expertSessionConfig = {
  expectedRole: 'expert',
  tokenStorageKey: 'tezca_expert_token',
  userStorageKey: 'tezca_expert_user',
  mePath: '/api/expert/me',
  loginPath: '/api/auth/expert/login',
  wrongRoleLoginMessage: 'Tài khoản không phải chuyên gia',
} as const;

export function ExpertAuthProvider({ children }: { children: React.ReactNode }) {
  const session = useAuthSession(expertSessionConfig);

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

  return <ExpertAuthContext.Provider value={value}>{children}</ExpertAuthContext.Provider>;
}

export function useExpertAuth() {
  const ctx = useContext(ExpertAuthContext);
  if (!ctx) throw new Error('useExpertAuth cần ExpertAuthProvider');
  return ctx;
}
