import { getDb } from './connection.js';

/** Tên/vai trò/chuyên ngành vẫn lấy từ SQLite (auth không chuyển Firestore). */
export function getAuthorProfile(userId) {
  const row = getDb()
    .prepare(
      `SELECT u.name, u.role, COALESCE(ep.specialty, '') AS specialty
       FROM users u
       LEFT JOIN expert_profiles ep ON ep.user_id = u.id
       WHERE u.id = ?`,
    )
    .get(userId);
  return {
    name: row?.name || 'Thành viên',
    role: row?.role || 'user',
    specialty: row?.specialty || '',
  };
}

export function searchUsersSqlite({ query, excludeUserId, limit = 15 }) {
  const trimmed = String(query || '').trim();
  const params = [excludeUserId];
  let sql = `SELECT u.id, u.name, u.role, COALESCE(ep.specialty, '') AS specialty
             FROM users u
             LEFT JOIN expert_profiles ep ON ep.user_id = u.id
             WHERE u.id != ?`;
  if (trimmed) {
    sql += ` AND u.name LIKE ? COLLATE NOCASE`;
    params.push(`%${trimmed}%`);
  }
  sql += ` ORDER BY u.name ASC LIMIT ?`;
  params.push(Math.min(Math.max(limit, 1), 30));
  return getDb()
    .prepare(sql)
    .all(...params)
    .map((r) => ({ id: r.id, name: r.name, role: r.role, specialty: r.specialty || '' }));
}
