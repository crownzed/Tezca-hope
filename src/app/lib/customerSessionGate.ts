import { useMemo } from 'react';
import { useCustomerAuth, type CustomerUser } from '../context/CustomerAuthContext';
import { ROUTES } from '../routes';

/** Trạng thái phiên khách hàng tại seam layout — một nguồn cho toàn /app. */
export type CustomerSessionPhase = 'anonymous' | 'verifying' | 'authenticated';

export type CustomerSession = {
  phase: CustomerSessionPhase;
  token: string | null;
  user: CustomerUser | null;
  sessionReady: boolean;
  isAuthenticated: boolean;
  isAnonymous: boolean;
  isVerifying: boolean;
};

export function resolveCustomerSessionPhase(
  token: string | null,
  user: CustomerUser | null,
  sessionReady: boolean,
): CustomerSessionPhase {
  if (!token) return 'anonymous';
  if (!sessionReady) return 'verifying';
  if (!user) return 'anonymous';
  return 'authenticated';
}

export function buildCustomerSession(
  token: string | null,
  user: CustomerUser | null,
  sessionReady: boolean,
): CustomerSession {
  const phase = resolveCustomerSessionPhase(token, user, sessionReady);
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
const AUTH_REQUIRED_PREFIXES = [ROUTES.app.expertChat, ROUTES.community.root] as const;

export function customerRouteRequiresAuth(pathname: string): boolean {
  return AUTH_REQUIRED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Chỉ cho phép quay lại trong /app — tránh open redirect. */
export function resolveCustomerPostLoginPath(from: unknown): string {
  if (typeof from !== 'string') return ROUTES.app.dashboard;
  if (from.startsWith('//')) return ROUTES.app.dashboard;
  if (from.startsWith('/app') || from.startsWith('/cong-dong')) return from;
  return ROUTES.app.dashboard;
}

export function useCustomerSession(): CustomerSession & {
  login: ReturnType<typeof useCustomerAuth>['login'];
  register: ReturnType<typeof useCustomerAuth>['register'];
  logout: ReturnType<typeof useCustomerAuth>['logout'];
} {
  const auth = useCustomerAuth();
  const session = useMemo(
    () => buildCustomerSession(auth.token, auth.user, auth.sessionReady),
    [auth.token, auth.user, auth.sessionReady],
  );
  return {
    ...session,
    login: auth.login,
    register: auth.register,
    logout: auth.logout,
  };
}
