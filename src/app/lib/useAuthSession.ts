import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from './api';
import { shouldClearSessionOnMeFailure } from './authFailureClassifier';

export type AuthUser = { id: string; email: string; name: string; role: string };

export type AuthSessionConfig = {
  expectedRole: string;
  tokenStorageKey: string;
  userStorageKey: string;
  mePath: string;
  loginPath: string;
  wrongRoleLoginMessage: string;
  registerPath?: string;
};

function readStoredUser(key: string): AuthUser | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

/** Lấy refreshToken key từ token key */
function refreshKeyFrom(tokenKey: string): string {
  return tokenKey.replace(/_token$/, '_refresh_token');
}

/** Decode JWT payload không verify (chỉ đọc exp) */
function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]!.replace(/-/g, '+').replace(/_/g, '/')));
    return payload;
  } catch {
    return null;
  }
}

/** Token sẽ hết hạn trong vòng N ms? */
function tokenExpiresWithin(token: string, ms: number): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return false;
  return payload.exp * 1000 - Date.now() < ms;
}

export type AuthSessionState = {
  token: string | null;
  user: AuthUser | null;
  sessionReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  register?: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
};

export function useAuthSession(config: AuthSessionConfig): AuthSessionState {
  const {
    expectedRole,
    tokenStorageKey,
    userStorageKey,
    mePath,
    loginPath,
    wrongRoleLoginMessage,
    registerPath,
  } = config;

  const refreshTokenKey = refreshKeyFrom(tokenStorageKey);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(tokenStorageKey));
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser(userStorageKey));
  const [sessionReady, setSessionReady] = useState(() => {
    const hasToken = !!localStorage.getItem(tokenStorageKey);
    const hasUser = !!localStorage.getItem(userStorageKey);
    // Có token + user cache → sẵn sàng ngay (optimistic), verify chạy nền
    return !hasToken || hasUser;
  });
  const tokenRef = useRef<string | null>(token);
  tokenRef.current = token;
  const refreshingRef = useRef(false);

  const persist = useCallback(
    (t: string | null, u: AuthUser | null, rt?: string | null) => {
      setToken(t);
      setUser(u);
      tokenRef.current = t;
      if (t) localStorage.setItem(tokenStorageKey, t);
      else localStorage.removeItem(tokenStorageKey);
      if (u) localStorage.setItem(userStorageKey, JSON.stringify(u));
      else localStorage.removeItem(userStorageKey);
      // Refresh token
      if (rt !== undefined) {
        if (rt) localStorage.setItem(refreshTokenKey, rt);
        else localStorage.removeItem(refreshTokenKey);
      }
    },
    [tokenStorageKey, userStorageKey, refreshTokenKey],
  );

  /** Gọi /api/auth/refresh để lấy access token mới */
  const doRefresh = useCallback(async (): Promise<string | null> => {
    if (refreshingRef.current) return null;
    const rt = localStorage.getItem(refreshTokenKey);
    if (!rt) return null;
    refreshingRef.current = true;
    try {
      const r = await apiFetch<{ token: string }>('/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: rt }),
      });
      persist(r.token, user, undefined);
      return r.token;
    } catch {
      // Refresh token hết hạn → logout
      persist(null, null, null);
      return null;
    } finally {
      refreshingRef.current = false;
    }
  }, [refreshTokenKey, persist, user]);

  // Auto-refresh: kiểm tra mỗi 5 phút, refresh khi access token còn <10 phút
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      const current = tokenRef.current;
      if (current && tokenExpiresWithin(current, 10 * 60 * 1000)) {
        doRefresh();
      }
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [token, doRefresh]);

  useEffect(() => {
    if (!token) {
      setSessionReady(true);
      return;
    }
    // Có user cache → KHÔNG block UI, verify chạy nền (stale-while-revalidate)
    const hasCachedUser = !!readStoredUser(userStorageKey);
    if (!hasCachedUser) setSessionReady(false);
    const requestedToken = token;
    apiFetch<{ user: AuthUser }>(mePath, { token })
      .then((r) => {
        if (tokenRef.current !== requestedToken) return;
        if (!r.user || r.user.role !== expectedRole) {
          persist(null, null, null);
          return;
        }
        persist(requestedToken, r.user);
      })
      .catch(async (err) => {
        if (tokenRef.current !== requestedToken) return;
        // Nếu 401 → thử refresh trước khi logout
        if (err?.status === 401) {
          const newToken = await doRefresh();
          if (newToken) return; // refresh thành công, token state đã cập nhật
        }
        if (shouldClearSessionOnMeFailure(err)) persist(null, null, null);
      })
      .finally(() => {
        if (tokenRef.current === requestedToken) setSessionReady(true);
      });
  }, [token, persist, mePath, expectedRole, doRefresh]);

  const applyAuthResponse = useCallback(
    (authToken: string, authUser: AuthUser, authRefreshToken?: string) => {
      if (authUser.role !== expectedRole) throw new Error(wrongRoleLoginMessage);
      tokenRef.current = authToken;
      persist(authToken, authUser, authRefreshToken || null);
      setSessionReady(true);
    },
    [expectedRole, wrongRoleLoginMessage, persist],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const r = await apiFetch<{ token: string; refreshToken?: string; user: AuthUser }>(loginPath, {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      });
      applyAuthResponse(r.token, r.user, r.refreshToken);
    },
    [loginPath, applyAuthResponse],
  );

  const registerFn = useCallback(
    async (email: string, password: string, name?: string) => {
      if (!registerPath) throw new Error('Đăng ký không khả dụng cho phiên này');
      const r = await apiFetch<{ token: string; refreshToken?: string; user: AuthUser }>(registerPath, {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim(),
          password,
          name: name?.trim() || undefined,
        }),
      });
      applyAuthResponse(r.token, r.user, r.refreshToken);
    },
    [registerPath, applyAuthResponse],
  );

  const logout = useCallback(() => {
    setSessionReady(true);
    persist(null, null, null);
  }, [persist]);

  return {
    token,
    user,
    sessionReady,
    login,
    register: registerPath ? registerFn : undefined,
    logout,
  };
}
