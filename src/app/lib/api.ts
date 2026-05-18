export function apiBase(): string {
  return (import.meta as ImportMeta & { env: { VITE_API_URL?: string } }).env.VITE_API_URL || '';
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
  let res: Response;
  try {
    res = await fetch(`${apiBase()}${path}`, { ...init, headers });
  } catch (e) {
    const base = apiBase();
    const hint = base
      ? ` Không mở được ${base} (kiểm tra API đã chạy và CORS).`
      : ' Hãy chạy API (vd: npm run dev:api — cổng 3001), hoặc docker compose, rồi tải lại trang.';
    if (e instanceof TypeError) {
      throw new Error(`Không kết nối được tới máy chủ.${hint}`);
    }
    throw e;
  }
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string; hint?: string };
    if (res.status === 405) {
      throw new Error(
        err.error ||
          'Máy chủ từ chối phương thức (405). Chạy API: npm run dev:all — đăng ký qua POST /api/auth/register.',
      );
    }
    if (res.status === 404 && path.includes('register')) {
      throw new Error(
        err.error ||
          err.hint ||
          'Không tìm thấy API đăng ký. Kiểm tra API đã chạy và URL /api/auth/register.',
      );
    }
    throw new Error(err.error || `${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export function wsUrl(token: string): string {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const host = window.location.host;
  return `${proto}://${host}/ws?token=${encodeURIComponent(token)}`;
}
