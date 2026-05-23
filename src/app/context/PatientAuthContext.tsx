import React, { createContext, useContext, useMemo } from 'react';
import { useAuthSession, type AuthUser } from '../lib/useAuthSession';

export type PatientUser = AuthUser;

type Ctx = {
  token: string | null;
  user: PatientUser | null;
  sessionReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
};

const PatientAuthContext = createContext<Ctx | null>(null);

const patientSessionConfig = {
  expectedRole: 'user',
  tokenStorageKey: 'tezca_patient_token',
  userStorageKey: 'tezca_patient_user',
  mePath: '/api/me',
  loginPath: '/api/auth/patient/login',
  registerPath: '/api/auth/register',
  wrongRoleLoginMessage: 'Tài khoản không phải bệnh nhân',
} as const;

export function PatientAuthProvider({ children }: { children: React.ReactNode }) {
  const session = useAuthSession(patientSessionConfig);

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

  return <PatientAuthContext.Provider value={value}>{children}</PatientAuthContext.Provider>;
}

export function usePatientAuth() {
  const ctx = useContext(PatientAuthContext);
  if (!ctx) throw new Error('usePatientAuth cần PatientAuthProvider');
  return ctx;
}
