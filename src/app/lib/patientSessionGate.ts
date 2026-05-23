import { useMemo } from 'react';
import { usePatientAuth, type PatientUser } from '../context/PatientAuthContext';
import { ROUTES } from '../routes';

/** Trạng thái phiên bệnh nhân tại seam layout — một nguồn cho toàn /app. */
export type PatientSessionPhase = 'anonymous' | 'verifying' | 'authenticated';

export type PatientSession = {
  phase: PatientSessionPhase;
  token: string | null;
  user: PatientUser | null;
  sessionReady: boolean;
  isAuthenticated: boolean;
  isAnonymous: boolean;
  isVerifying: boolean;
};

export function resolvePatientSessionPhase(
  token: string | null,
  user: PatientUser | null,
  sessionReady: boolean,
): PatientSessionPhase {
  if (!token) return 'anonymous';
  if (!sessionReady) return 'verifying';
  if (!user) return 'anonymous';
  return 'authenticated';
}

export function buildPatientSession(
  token: string | null,
  user: PatientUser | null,
  sessionReady: boolean,
): PatientSession {
  const phase = resolvePatientSessionPhase(token, user, sessionReady);
  return {
    phase,
    token,
    user,
    sessionReady,
    isAuthenticated: phase === 'authenticated',
    isAnonymous: phase === 'anonymous',
    isVerifying: phase === 'verifying',
  };
}

/** Đường dẫn bắt buộc đăng nhập (không dùng chế độ guest). */
const AUTH_REQUIRED_PREFIXES = [ROUTES.app.expertChat] as const;

export function patientRouteRequiresAuth(pathname: string): boolean {
  return AUTH_REQUIRED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Chỉ cho phép quay lại trong /app — tránh open redirect. */
export function resolvePatientPostLoginPath(from: unknown): string {
  if (typeof from !== 'string' || !from.startsWith('/app')) return ROUTES.app.root;
  if (from.startsWith('//')) return ROUTES.app.root;
  return from;
}

export function usePatientSession(): PatientSession & {
  login: ReturnType<typeof usePatientAuth>['login'];
  register: ReturnType<typeof usePatientAuth>['register'];
  logout: ReturnType<typeof usePatientAuth>['logout'];
} {
  const auth = usePatientAuth();
  const session = useMemo(
    () => buildPatientSession(auth.token, auth.user, auth.sessionReady),
    [auth.token, auth.user, auth.sessionReady],
  );
  return {
    ...session,
    login: auth.login,
    register: auth.register,
    logout: auth.logout,
  };
}
