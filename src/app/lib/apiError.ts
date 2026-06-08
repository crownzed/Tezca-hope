/** Lỗi HTTP từ apiFetch — giữ status để phân loại phiên, không parse message. */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}
