import { createHash, randomBytes } from 'node:crypto';
import { getDb } from './connection.js';

const TOKEN_TTL_MS = 60 * 60 * 1000;

function hashToken(raw) {
  return createHash('sha256').update(raw).digest('hex');
}

/** Tạo token đặt lại mật khẩu (trả về chuỗi gửi cho người dùng). */
export function createPasswordResetToken(userId) {
  const raw = randomBytes(32).toString('hex');
  const tokenHash = hashToken(raw);
  const now = Date.now();
  const expiresAt = now + TOKEN_TTL_MS;
  const db = getDb();
  db.prepare(`DELETE FROM password_reset_tokens WHERE user_id = ?`).run(userId);
  db.prepare(
    `INSERT INTO password_reset_tokens (token_hash, user_id, expires_at, created_at)
     VALUES (?, ?, ?, ?)`,
  ).run(tokenHash, userId, expiresAt, now);
  return raw;
}

/** Tiêu thụ token hợp lệ; trả về userId hoặc null. */
export function consumePasswordResetToken(rawToken) {
  const token = String(rawToken || '').trim();
  if (!token) return null;
  const tokenHash = hashToken(token);
  const db = getDb();
  const row = db
    .prepare(
      `SELECT user_id AS userId, expires_at AS expiresAt
       FROM password_reset_tokens WHERE token_hash = ?`,
    )
    .get(tokenHash);
  if (!row || row.expiresAt < Date.now()) {
    db.prepare(`DELETE FROM password_reset_tokens WHERE token_hash = ?`).run(tokenHash);
    return null;
  }
  db.prepare(`DELETE FROM password_reset_tokens WHERE user_id = ?`).run(row.userId);
  return row.userId;
}

export function updateUserPasswordHash(userId, passwordHash) {
  getDb()
    .prepare(`UPDATE users SET password_hash = ? WHERE id = ?`)
    .run(passwordHash, userId);
}
