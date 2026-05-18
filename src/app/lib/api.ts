export function apiBase(): string {
  return (import.meta as ImportMeta & { env: { VITE_API_URL?: string } }).env.VITE_API_URL || '';
}

async function parseErrorResponse(res: Response, path: string) {
  const err = (await res.json().catch(() => ({}))) as { error?: string; hint?: string };
  if (res.status === 405) {
    throw new Error(
      err.error ||
        'Máy chủ từ chối phương thức (405). Chạy `npm run dev:all` (API + Vite). Đăng ký cần POST /api/auth/register.',
    );
  }
  if (res.status === 404 && path.includes('register')) {
    throw new Error(
      err.error ||
        err.hint ||
        'Không tìm thấy API đăng ký. Chạy `npm run dev:all` và thử lại.',
    );
  }
  throw new Error(err.error || `${res.status} ${res.statusText}`);
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
  const pathsToTry =
    method === 'POST' && path.includes('register')
      ? ['/api/auth/register', '/api/register']
      : [path];

  let lastRes: Response | null = null;

  for (let i = 0; i < pathsToTry.length; i++) {
    const p = pathsToTry[i];
    let res: Response;
    try {
      res = await fetch(`${apiBase()}${p}`, { ...init, headers });
    } catch (e) {
      const base = apiBase();
      const hint = base
        ? ` Không mở được ${base} (kiểm tra API đã chạy và CORS).`
        : ' Hãy chạy `npm run dev:all` (API cổng 3001 + Vite 5173), rồi tải lại trang.';
      if (e instanceof TypeError) {
        throw new Error(`Không kết nối được tới máy chủ.${hint}`);
      }
      throw e;
    }

    if (res.ok) {
      return res.json() as Promise<T>;
    }

    lastRes = res;
    const retry =
      i < pathsToTry.length - 1 && (res.status === 404 || res.status === 405);
    if (!retry) {
      await parseErrorResponse(res, p);
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
