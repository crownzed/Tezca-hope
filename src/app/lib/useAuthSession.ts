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

  const [token, setToken] = useState<string | null>(() => localStorage.getItem(tokenStorageKey));
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser(userStorageKey));
  const [sessionReady, setSessionReady] = useState(() => !localStorage.getItem(tokenStorageKey));
  const tokenRef = useRef<string | null>(token);
  tokenRef.current = token;

  const persist = useCallback(
    (t: string | null, u: AuthUser | null) => {
      setToken(t);
      setUser(u);
      tokenRef.current = t;
      if (t) localStorage.setItem(tokenStorageKey, t);
      else localStorage.removeItem(tokenStorageKey);
      if (u) localStorage.setItem(userStorageKey, JSON.stringify(u));
      else localStorage.removeItem(userStorageKey);
    },
    [tokenStorageKey, userStorageKey],
  );

  useEffect(() => {
    if (!token) {
      setSessionReady(true);
      return;
    }
    setSessionReady(false);
    const requestedToken = token;
    apiFetch<{ user: AuthUser }>(mePath, { token })
      .then((r) => {
        if (tokenRef.current !== requestedToken) return;
        if (!r.user || r.user.role !== expectedRole) {
          persist(null, null);
          return;
        }
        persist(requestedToken, r.user);
      })
      .catch((err) => {
        if (tokenRef.current !== requestedToken) return;
        if (shouldClearSessionOnMeFailure(err)) persist(null, null);
      })
      .finally(() => {
        if (tokenRef.current === requestedToken) setSessionReady(true);
      });
  }, [token, persist, mePath, expectedRole]);

  const applyAuthResponse = useCallback(
    (authToken: string, authUser: AuthUser) => {
      if (authUser.role !== expectedRole) throw new Error(wrongRoleLoginMessage);
      tokenRef.current = authToken;
      persist(authToken, authUser);
      setSessionReady(true);
    },
    [expectedRole, wrongRoleLoginMessage, persist],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const r = await apiFetch<{ token: string; user: AuthUser }>(loginPath, {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      });
      applyAuthResponse(r.token, r.user);
    },
    [loginPath, applyAuthResponse],
  );

  const registerFn = useCallback(
    async (email: string, password: string, name?: string) => {
      if (!registerPath) throw new Error('Đăng ký không khả dụng cho phiên này');
      const r = await apiFetch<{ token: string; user: AuthUser }>(registerPath, {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim(),
          password,
          name: name?.trim() || undefined,
        }),
      });
      applyAuthResponse(r.token, r.user);
    },
    [registerPath, applyAuthResponse],
  );

  const logout = useCallback(() => {
    setSessionReady(true);
    persist(null, null);
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
