/** Lỗi domain từ tầng DB — map sang HTTP trong route */
export class DbError extends Error {
  /**
   * @param {string} code
   * @param {string} message
   * @param {number} [status]
   */
  constructor(code, message, status = 400) {
    super(message);
    this.name = 'DbError';
    this.code = code;
    this.status = status;
  }
}

export function mapSqliteError(err) {
  if (err?.code === 'SQLITE_CONSTRAINT_UNIQUE' || err?.code === 'SQLITE_CONSTRAINT') {
    return new DbError('EMAIL_EXISTS', 'Email đã được sử dụng', 409);
  }
  return err;
}

/** Chuẩn hóa lỗi từ repository / JSON store → DbError hoặc rethrow. */
export function mapDbDomainError(err) {
  if (err instanceof DbError) return err;
  if (err?.message === 'JSON_PAYLOAD_TOO_LARGE') {
    return new DbError('PAYLOAD_TOO_LARGE', 'Dữ liệu kế hoạch quá lớn', 413);
  }
  return mapSqliteError(err);
}
