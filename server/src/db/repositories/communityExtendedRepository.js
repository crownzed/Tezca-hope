import { getDb } from '../connection.js';

function dmPair(userId1, userId2) {
  return userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];
}

export function listCommunityAnnouncementMessages({ sinceTs, limit = 80 } = {}) {
  const params = [];
  let sql = `
    SELECT m.*, u.name AS author_name, u.role AS author_role
    FROM community_announcement_messages m
    JOIN users u ON u.id = m.user_id
    WHERE m.status = 'published'
  `;
  if (sinceTs) {
    sql += ` AND m.created_at > ?`;
    params.push(sinceTs);
  }
  sql += ` ORDER BY m.created_at ASC LIMIT ?`;
  params.push(Math.min(Math.max(limit, 1), 120));
  return getDb()
    .prepare(sql)
    .all(...params)
    .map((r) => ({
      id: r.id,
      userId: r.user_id,
      authorName: r.author_name,
      authorRole: r.author_role,
      content: r.content,
      createdAt: r.created_at,
    }));
}

export function insertCommunityAnnouncementMessage({ id, userId, content }) {
  const now = Date.now();
  getDb()
    .prepare(
      `INSERT INTO community_announcement_messages (id, user_id, content, status, created_at)
       VALUES (?, ?, ?, 'published', ?)`,
    )
    .run(id, userId, content, now);
  const row = getDb()
    .prepare(
      `SELECT m.*, u.name AS author_name, u.role AS author_role
       FROM community_announcement_messages m
       JOIN users u ON u.id = m.user_id WHERE m.id = ?`,
    )
    .get(id);
  return {
    id: row.id,
    userId: row.user_id,
    authorName: row.author_name,
    authorRole: row.author_role,
    content: row.content,
    createdAt: row.created_at,
  };
}

export function getOrCreateCommunityDmThread(userId1, userId2) {
  if (userId1 === userId2) return null;
  const [userA, userB] = dmPair(userId1, userId2);
  const existing = getDb()
    .prepare(`SELECT id, user_a, user_b, created_at, updated_at FROM community_dm_threads WHERE user_a = ? AND user_b = ?`)
    .get(userA, userB);
  if (existing) return mapDmThreadRow(existing, userId1);

  const id = crypto.randomUUID();
  const now = Date.now();
  getDb()
    .prepare(
      `INSERT INTO community_dm_threads (id, user_a, user_b, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
    )
    .run(id, userA, userB, now, now);
  const row = getDb()
    .prepare(`SELECT id, user_a, user_b, created_at, updated_at FROM community_dm_threads WHERE id = ?`)
    .get(id);
  return mapDmThreadRow(row, userId1);
}

function mapDmThreadRow(row, viewerId) {
  if (!row) return null;
  const otherUserId = row.user_a === viewerId ? row.user_b : row.user_a;
  const other = getDb()
    .prepare(`SELECT id, name, role FROM users WHERE id = ?`)
    .get(otherUserId);
  const last = getDb()
    .prepare(
      `SELECT content, created_at, sender_id FROM community_dm_messages
       WHERE thread_id = ? AND status = 'published' ORDER BY created_at DESC LIMIT 1`,
    )
    .get(row.id);
  // Mốc đã đọc của người xem (theo vị trí a/b)
  const myLastRead = row.user_a === viewerId ? row.last_read_a : row.last_read_b;
  // Đếm tin chưa đọc: do người khác gửi & sau mốc đã đọc
  const unreadRow = getDb()
    .prepare(
      `SELECT COUNT(*) AS c FROM community_dm_messages
       WHERE thread_id = ? AND status = 'published' AND sender_id != ? AND created_at > ?`,
    )
    .get(row.id, viewerId, myLastRead || 0);
  return {
    id: row.id,
    otherUserId,
    otherUserName: other?.name || 'Thành viên',
    otherUserRole: other?.role || 'user',
    lastMessage: last?.content || '',
    lastMessageAt: last?.created_at || row.updated_at,
    lastSenderId: last?.sender_id || null,
    unreadCount: unreadRow ? Number(unreadRow.c) : 0,
    lastReadAt: myLastRead || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listCommunityDmThreads(viewerId) {
  const rows = getDb()
    .prepare(
      `SELECT id, user_a, user_b, created_at, updated_at FROM community_dm_threads
       WHERE user_a = ? OR user_b = ?
       ORDER BY updated_at DESC LIMIT 80`,
    )
    .all(viewerId, viewerId);
  return rows.map((r) => mapDmThreadRow(r, viewerId)).filter(Boolean);
}

export function getCommunityDmThreadForUser(threadId, viewerId) {
  const row = getDb()
    .prepare(`SELECT id, user_a, user_b, created_at, updated_at FROM community_dm_threads WHERE id = ?`)
    .get(threadId);
  if (!row) return null;
  if (row.user_a !== viewerId && row.user_b !== viewerId) return null;
  return mapDmThreadRow(row, viewerId);
}

export function listCommunityDmMessages(threadId, viewerId, { sinceTs, limit = 80 } = {}) {
  const thread = getCommunityDmThreadForUser(threadId, viewerId);
  if (!thread) return null;
  const params = [threadId];
  let sql = `
    SELECT m.*, u.name AS author_name, u.role AS author_role
    FROM community_dm_messages m
    JOIN users u ON u.id = m.sender_id
    WHERE m.thread_id = ? AND m.status = 'published'
  `;
  if (sinceTs) {
    sql += ` AND m.created_at > ?`;
    params.push(sinceTs);
  }
  sql += ` ORDER BY m.created_at ASC LIMIT ?`;
  params.push(Math.min(Math.max(limit, 1), 120));
  const rows = getDb().prepare(sql).all(...params);
  return rows.map((r) => ({
    id: r.id,
    threadId: r.thread_id,
    senderId: r.sender_id,
    authorName: r.author_name,
    authorRole: r.author_role,
    content: r.content,
    createdAt: r.created_at,
  }));
}

export function insertCommunityDmMessage({ id, threadId, senderId, content }) {
  const thread = getDb()
    .prepare(`SELECT id, user_a, user_b FROM community_dm_threads WHERE id = ?`)
    .get(threadId);
  if (!thread) return null;
  if (thread.user_a !== senderId && thread.user_b !== senderId) return null;

  const now = Date.now();
  getDb()
    .prepare(
      `INSERT INTO community_dm_messages (id, thread_id, sender_id, content, status, created_at)
       VALUES (?, ?, ?, ?, 'published', ?)`,
    )
    .run(id, threadId, senderId, content, now);
  getDb()
    .prepare(`UPDATE community_dm_threads SET updated_at = ? WHERE id = ?`)
    .run(now, threadId);

  const row = getDb()
    .prepare(
      `SELECT m.*, u.name AS author_name, u.role AS author_role
       FROM community_dm_messages m JOIN users u ON u.id = m.sender_id WHERE m.id = ?`,
    )
    .get(id);
  return {
    id: row.id,
    threadId: row.thread_id,
    senderId: row.sender_id,
    authorName: row.author_name,
    authorRole: row.author_role,
    content: row.content,
    createdAt: row.created_at,
  };
}

// Đánh dấu đã đọc toàn bộ thread cho người xem
export function markCommunityDmThreadRead(threadId, viewerId) {
  const row = getDb()
    .prepare(`SELECT id, user_a, user_b FROM community_dm_threads WHERE id = ?`)
    .get(threadId);
  if (!row) return null;
  if (row.user_a !== viewerId && row.user_b !== viewerId) return null;
  const now = Date.now();
  const col = row.user_a === viewerId ? 'last_read_a' : 'last_read_b';
  getDb()
    .prepare(`UPDATE community_dm_threads SET ${col} = ? WHERE id = ?`)
    .run(now, threadId);
  return { ok: true, readAt: now };
}

// Tổng số tin nhắn DM chưa đọc toàn cục của người dùng
export function countUnreadCommunityDm(viewerId) {
  const rows = getDb()
    .prepare(
      `SELECT id, user_a, user_b, last_read_a, last_read_b FROM community_dm_threads
       WHERE user_a = ? OR user_b = ?`,
    )
    .all(viewerId, viewerId);
  let total = 0;
  const stmt = getDb().prepare(
    `SELECT COUNT(*) AS c FROM community_dm_messages
     WHERE thread_id = ? AND status = 'published' AND sender_id != ? AND created_at > ?`,
  );
  for (const r of rows) {
    const myLastRead = r.user_a === viewerId ? r.last_read_a : r.last_read_b;
    const c = stmt.get(r.id, viewerId, myLastRead || 0);
    total += c ? Number(c.c) : 0;
  }
  return total;
}

export function searchCommunityMembers({ query, excludeUserId, limit = 15 }) {
  const trimmed = String(query || '').trim();
  const params = [excludeUserId];
  let sql = `SELECT id, name, role FROM users WHERE id != ?`;
  if (trimmed) {
    sql += ` AND name LIKE ? COLLATE NOCASE`;
    params.push(`%${trimmed}%`);
  }
  sql += ` ORDER BY name ASC LIMIT ?`;
  params.push(Math.min(Math.max(limit, 1), 30));
  return getDb()
    .prepare(sql)
    .all(...params)
    .map((r) => ({ id: r.id, name: r.name, role: r.role }));
}

export function listRoomMentionCandidates(topic, { query, limit = 12 } = {}) {
  const trimmed = String(query || '').trim();
  const params = [topic];
  let sql = `
    SELECT DISTINCT u.id, u.name, u.role
    FROM community_room_messages m
    JOIN users u ON u.id = m.user_id
    WHERE m.topic = ? AND m.status = 'published'
  `;
  if (trimmed) {
    sql += ` AND u.name LIKE ? COLLATE NOCASE`;
    params.push(`%${trimmed}%`);
  }
  sql += ` ORDER BY u.name ASC LIMIT ?`;
  params.push(Math.min(Math.max(limit, 1), 20));
  const fromRoom = getDb().prepare(sql).all(...params);

  if (!trimmed || fromRoom.length >= limit) return fromRoom;

  const extraParams = [trimmed];
  let extraSql = `SELECT id, name, role FROM users WHERE name LIKE ? COLLATE NOCASE ORDER BY name ASC LIMIT ?`;
  extraParams.push(limit);
  const extras = getDb()
    .prepare(extraSql)
    .all(...extraParams)
    .filter((u) => !fromRoom.some((r) => r.id === u.id));

  const merged = [...fromRoom];
  for (const u of extras) {
    if (merged.length >= limit) break;
    merged.push(u);
  }
  return merged;
}
