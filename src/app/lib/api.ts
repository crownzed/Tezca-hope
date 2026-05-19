type ViteEnv = ImportMeta & {
  env: {
    VITE_API_URL?: string;
    VITE_API_PROXY_PORT?: string;
    DEV: boolean;
    PROD: boolean;
    BASE_URL?: string;
  };
};

function isLocalDevHost(): boolean {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1';
}

export type AuthGatewayOp = 'patient-login' | 'expert-login' | 'register' | 'login';

export function apiBase(): string {
  const env = (import.meta as ViteEnv).env;
  const explicit = env.VITE_API_URL?.replace(/\/$/, '');
  if (explicit) return explicit;
  return '';
}

function authOpForPath(path: string): AuthGatewayOp | null {
  if (path.includes('patient/login')) return 'patient-login';
  if (path.includes('expert/login')) return 'expert-login';
  if (path.includes('register')) return 'register';
  if (path.includes('/auth/login')) return 'login';
  return null;
}

const GATEWAY_TARGETS: { url: string; gateway?: boolean }[] = [
  { url: '/api/auth/gateway', gateway: true },
  { url: '/api', gateway: true },
];

/**
 * Trên host (Vercel / Apache): chỉ gateway — tránh POST REST rơi vào static → 405.
 * Local dev: thử REST trước rồi gateway.
 */
function authPostTargets(path: string): { url: string; gateway?: boolean }[] {
  const op = authOpForPath(path);
  if (!op) return [{ url: path }];

  const hosted = (import.meta as ViteEnv).env.PROD && !isLocalDevHost();
  if (hosted) {
    const hostedTargets: { url: string; gateway?: boolean }[] = [...GATEWAY_TARGETS];
    if (op === 'expert-login') {
      hostedTargets.push({ url: '/api/auth/expert/login' });
    } else if (op === 'patient-login') {
      hostedTargets.push({ url: '/api/auth/patient/login' });
    }
    return hostedTargets;
  }

  const targets: { url: string; gateway?: boolean }[] = [...GATEWAY_TARGETS];

  if (op === 'patient-login') {
    targets.push({ url: '/api/auth/patient/login' }, { url: '/api/auth/login' });
  } else if (op === 'expert-login') {
    targets.push({ url: '/api/auth/expert/login' }, { url: '/api/auth/login' });
  } else if (op === 'register') {
    targets.push({ url: '/api/auth/register' }, { url: '/api/register' });
  } else if (op === 'login') {
    targets.push({ url: '/api/auth/login' });
  }

  return targets;
}

function devDirectApiBases(): string[] {
  const env = (import.meta as ViteEnv).env;
  if (!env.DEV || apiBase()) return [];
  const port = env.VITE_API_PROXY_PORT || '3001';
  return [`http://127.0.0.1:${port}`];
}

async function parseErrorResponse(res: Response, path: string) {
  const err = (await res.json().catch(() => ({}))) as { error?: string; hint?: string };
  if (res.status === 405) {
    throw new Error(
      err.error ||
        'Máy chủ từ chối POST (405). Trên host cần proxy /api → Node (xem deploy/website/apache-snippet.conf). Local: chạy `npm run dev`.',
    );
  }
  if (res.status === 404 && (path.includes('register') || path.includes('auth'))) {
    throw new Error(
      err.error || err.hint || 'Không tìm thấy API. Chạy `npm run dev:all` và thử lại.',
    );
  }
  throw new Error(err.error || `${res.status} ${res.statusText}`);
}

async function doFetch(
  base: string,
  target: { url: string; gateway?: boolean },
  init: RequestInit,
  headers: Headers,
  op: AuthGatewayOp | null,
): Promise<Response> {
  let body = init.body;
  if (target.gateway && op && typeof body === 'string') {
    try {
      const parsed = JSON.parse(body) as Record<string, unknown>;
      body = JSON.stringify({ op, ...parsed });
    } catch {
      body = JSON.stringify({ op });
    }
  }
  return fetch(`${base}${target.url}`, { ...init, headers, body });
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const { token, ...init } = options;
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (
    init.body &&
    typeof init.body === 'string' &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }

  const method = (init.method || 'GET').toUpperCase();
  const isAuthPost = method === 'POST' && Boolean(authOpForPath(path));
  const targets = isAuthPost ? authPostTargets(path) : [{ url: path }];
  const op = authOpForPath(path);

  const bases = [apiBase(), ...devDirectApiBases()].filter(
    (b, i, arr) => b !== undefined && arr.indexOf(b) === i,
  );
  if (bases.length === 0) bases.push('');

  let lastRes: Response | null = null;

  for (const base of bases) {
    for (let i = 0; i < targets.length; i++) {
      const target = targets[i]!;
      let res: Response;
      try {
        res = await doFetch(base, target, init, headers, op);
      } catch (e) {
        const hint = apiBase()
          ? ` Không mở được ${apiBase()} (kiểm tra API đã chạy và CORS).`
          : ' Hãy chạy `npm run dev:all` (API + Vite), rồi tải lại trang.';
        if (e instanceof TypeError) {
          throw new Error(`Không kết nối được tới máy chủ.${hint}`);
        }
        throw e;
      }

      if (res.ok) {
        return res.json() as Promise<T>;
      }

      lastRes = res;
      const hasMoreTargets = i < targets.length - 1;
      const hasMoreBases = base !== bases[bases.length - 1];
      const retry =
        (hasMoreTargets || hasMoreBases) && (res.status === 404 || res.status === 405);
      if (!retry) {
        await parseErrorResponse(res, target.url);
      }
    }
  }

  if (lastRes) await parseErrorResponse(lastRes, path);
  throw new Error('Yêu cầu API thất bại');
}

export function wsUrl(token: string): string {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const host = window.location.host;
  return `${proto}://${host}/ws?token=${encodeURIComponent(token)}`;
}
