import { ApiError, isApiError } from './apiError';

export type AuthFailureKind = 'invalid_session' | 'forbidden_role' | 'transient';

const AUTH_MESSAGE_MARKERS = [
  'Thiếu token',
  'Token không hợp lệ',
  'Không đủ quyền',
  'Phiên không còn hợp lệ',
  'Unauthorized',
  'Forbidden',
] as const;

function messageLooksLikeAuthFailure(message: string): boolean {
  return AUTH_MESSAGE_MARKERS.some((marker) => message.includes(marker));
}

/**
 * Phân loại lỗi khi làm mới phiên (GET /me, /api/expert/me).
 * invalid_session / forbidden_role → xóa token; transient → giữ phiên (mạng, 404 routing).
 */
export function classifyAuthError(err: unknown): AuthFailureKind {
  if (isApiError(err)) {
    if (err.status === 401) return 'invalid_session';
    if (err.status === 403) return 'forbidden_role';
    if (err.status === 404) return 'transient';
    if (err.status >= 500) return 'transient';
    return 'transient';
  }

  if (err instanceof TypeError) return 'transient';

  if (err instanceof Error) {
    const msg = err.message;
    if (msg.includes('Không kết nối được')) return 'transient';
    if (/\b401\b/.test(msg)) return 'invalid_session';
    if (/\b403\b/.test(msg)) return 'forbidden_role';
    if (messageLooksLikeAuthFailure(msg)) return 'invalid_session';
  }

  return 'transient';
}

export function shouldClearSessionOnMeFailure(err: unknown): boolean {
  const kind = classifyAuthError(err);
  return kind === 'invalid_session' || kind === 'forbidden_role';
}
