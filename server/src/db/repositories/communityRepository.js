import { getDb } from '../connection.js';

function mapCommunityPostRow(row, viewerId) {
  if (!row) return null;
  const liked = viewerId
    ? Boolean(
        getDb()
          .prepare(`SELECT 1 FROM community_post_likes WHERE post_id = ? AND user_id = ?`)
          .get(row.id, viewerId),
      )
    : false;
  return {
    id: row.id,
    userId: row.user_id,
    authorName: row.author_name || row.user_name || 'Thành viên',
    authorRole: row.author_role || row.user_role || 'user',
    topic: row.topic,
    content: row.content,
    imageUrl: row.image_url || '',
    likesCount: row.likes_count,
    likedByMe: liked,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    commentCount: row.comment_count ?? 0,
    threadReplyCount: row.thread_reply_count ?? 0,
    parentPostId: row.parent_post_id || null,
  };
}

const POST_STATS_SQL = `
  (SELECT COUNT(*) FROM community_comments c WHERE c.post_id = p.id AND c.status = 'published') AS comment_count,
  (SELECT COUNT(*) FROM community_posts r WHERE r.parent_post_id = p.id AND r.status = 'published') AS thread_reply_count
`;

const ROOT_POSTS_ONLY = ` AND (p.parent_post_id IS NULL)`;

export function listCommunityPosts({ topic, limit = 30, beforeTs, viewerId, includeHidden = false } = {}) {
  const params = [];
  let sql = `
    SELECT p.*, u.name AS author_name, u.role AS author_role,
      ${POST_STATS_SQL}
    FROM community_posts p
    JOIN users u ON u.id = p.user_id
    WHERE 1=1
    ${ROOT_POSTS_ONLY}
  `;
  if (!includeHidden) {
    sql += ` AND p.status = 'published'`;
  }
  if (topic) {
    sql += ` AND p.topic = ?`;
    params.push(topic);
  }
  if (beforeTs) {
    sql += ` AND p.created_at < ?`;
    params.push(beforeTs);
  }
  sql += ` ORDER BY p.created_at DESC LIMIT ?`;
  params.push(Math.min(Math.max(limit, 1), 50));
  const rows = getDb().prepare(sql).all(...params);
  return rows.map((r) => mapCommunityPostRow(r, viewerId));
}

export function getCommunityPostById(postId, viewerId, { includeHidden = false } = {}) {
  let sql = `
    SELECT p.*, u.name AS author_name, u.role AS author_role,
      ${POST_STATS_SQL}
    FROM community_posts p
    JOIN users u ON u.id = p.user_id
    WHERE p.id = ?
  `;
  if (!includeHidden) sql += ` AND p.status = 'published'`;
  const row = getDb().prepare(sql).get(postId);
  return mapCommunityPostRow(row, viewerId);
}

export function createCommunityPost({ id, userId, topic, content, imageUrl = '', parentPostId = null }) {
  const now = Date.now();
  getDb()
    .prepare(
      `INSERT INTO community_posts (id, user_id, topic, content, image_url, likes_count, status, created_at, updated_at, parent_post_id)
       VALUES (?, ?, ?, ?, ?, 0, 'published', ?, ?, ?)`,
    )
    .run(id, userId, topic, content, imageUrl, now, now, parentPostId);
  return getCommunityPostById(id, userId);
}

export function createCommunityThreadReply({ id, userId, parentPostId, content, imageUrl = '' }) {
  const parent = getDb()
    .prepare(`SELECT id, topic FROM community_posts WHERE id = ? AND status = 'published'`)
    .get(parentPostId);
  if (!parent) return null;
  return createCommunityPost({
    id,
    userId,
    topic: parent.topic,
    content,
    imageUrl,
    parentPostId,
  });
}

export function listCommunityThreadReplies(parentPostId, { beforeTs, limit = 30, viewerId } = {}) {
  const params = [parentPostId];
  let sql = `
    SELECT p.*, u.name AS author_name, u.role AS author_role,
      ${POST_STATS_SQL}
    FROM community_posts p
    JOIN users u ON u.id = p.user_id
    WHERE p.parent_post_id = ? AND p.status = 'published'
  `;
  if (beforeTs) {
    sql += ` AND p.created_at > ?`;
    params.push(beforeTs);
  }
  sql += ` ORDER BY p.created_at ASC LIMIT ?`;
  params.push(Math.min(Math.max(limit, 1), 50));
  const rows = getDb().prepare(sql).all(...params);
  return rows.map((r) => mapCommunityPostRow(r, viewerId));
}

export function setCommunityPostStatus(postId, status) {
  const now = Date.now();
  const result = getDb()
    .prepare(`UPDATE community_posts SET status = ?, updated_at = ? WHERE id = ?`)
    .run(status, now, postId);
  return result.changes > 0;
}

export function deleteCommunityPost(postId, userId, isAdmin = false) {
  const row = getDb().prepare(`SELECT user_id FROM community_posts WHERE id = ?`).get(postId);
  if (!row) return false;
  if (!isAdmin && row.user_id !== userId) return false;
  getDb().prepare(`DELETE FROM community_posts WHERE id = ?`).run(postId);
  return true;
}

export function listCommunityComments(postId, { includeHidden = false } = {}) {
  let sql = `
    SELECT c.*, u.name AS author_name, u.role AS author_role
    FROM community_comments c
    JOIN users u ON u.id = c.user_id
    WHERE c.post_id = ?
  `;
  if (!includeHidden) sql += ` AND c.status = 'published'`;
  sql += ` ORDER BY c.created_at ASC`;
  const rows = getDb().prepare(sql).all(postId);
  return rows.map((r) => ({
    id: r.id,
    postId: r.post_id,
    userId: r.user_id,
    authorName: r.author_name,
    authorRole: r.author_role,
    content: r.content,
    status: r.status,
    createdAt: r.created_at,
  }));
}

export function createCommunityComment({ id, postId, userId, content }) {
  const post = getDb().prepare(`SELECT id FROM community_posts WHERE id = ? AND status = 'published'`).get(postId);
  if (!post) return null;
  const now = Date.now();
  getDb()
    .prepare(
      `INSERT INTO community_comments (id, post_id, user_id, content, status, created_at)
       VALUES (?, ?, ?, ?, 'published', ?)`,
    )
    .run(id, postId, userId, content, now);
  const row = getDb()
    .prepare(
      `SELECT c.*, u.name AS author_name, u.role AS author_role
       FROM community_comments c JOIN users u ON u.id = c.user_id WHERE c.id = ?`,
    )
    .get(id);
  return {
    id: row.id,
    postId: row.post_id,
    userId: row.user_id,
    authorName: row.author_name,
    authorRole: row.author_role,
    content: row.content,
    status: row.status,
    createdAt: row.created_at,
  };
}

export function toggleCommunityPostLike(postId, userId) {
  const post = getDb().prepare(`SELECT id FROM community_posts WHERE id = ?`).get(postId);
  if (!post) return null;
  const existing = getDb()
    .prepare(`SELECT 1 FROM community_post_likes WHERE post_id = ? AND user_id = ?`)
    .get(postId, userId);
  if (existing) {
    getDb().prepare(`DELETE FROM community_post_likes WHERE post_id = ? AND user_id = ?`).run(postId, userId);
    getDb()
      .prepare(
        `UPDATE community_posts SET likes_count = CASE WHEN likes_count > 0 THEN likes_count - 1 ELSE 0 END WHERE id = ?`,
      )
      .run(postId);
    return { liked: false };
  }
  getDb()
    .prepare(`INSERT INTO community_post_likes (post_id, user_id, created_at) VALUES (?, ?, ?)`)
    .run(postId, userId, Date.now());
  getDb().prepare(`UPDATE community_posts SET likes_count = likes_count + 1 WHERE id = ?`).run(postId);
  return { liked: true };
}

export function createCommunityReport({ id, targetType, targetId, reporterId, reason }) {
  getDb()
    .prepare(
      `INSERT INTO community_reports (id, target_type, target_id, reporter_id, reason, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
    )
    .run(id, targetType, targetId, reporterId, reason, Date.now());
  return { id, targetType, targetId, status: 'pending' };
}

export function listCommunityReports({ status } = {}) {
  let sql = `
    SELECT r.*, u.name AS reporter_name
    FROM community_reports r
    JOIN users u ON u.id = r.reporter_id
    WHERE 1=1
  `;
  const params = [];
  if (status) {
    sql += ` AND r.status = ?`;
    params.push(status);
  }
  sql += ` ORDER BY r.created_at DESC LIMIT 100`;
  return getDb()
    .prepare(sql)
    .all(...params)
    .map((r) => ({
      id: r.id,
      targetType: r.target_type,
      targetId: r.target_id,
      reporterId: r.reporter_id,
      reporterName: r.reporter_name,
      reason: r.reason,
      status: r.status,
      createdAt: r.created_at,
    }));
}

export function updateCommunityReportStatus(reportId, status) {
  const result = getDb()
    .prepare(`UPDATE community_reports SET status = ? WHERE id = ?`)
    .run(status, reportId);
  return result.changes > 0;
}

export function listCommunityRoomMessages(topic, { sinceTs, limit = 80 } = {}) {
  const params = [topic];
  let sql = `
    SELECT m.*, u.name AS author_name, u.role AS author_role
    FROM community_room_messages m
    JOIN users u ON u.id = m.user_id
    WHERE m.topic = ? AND m.status = 'published'
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
      topic: r.topic,
      userId: r.user_id,
      authorName: r.author_name,
      authorRole: r.author_role,
      content: r.content,
      createdAt: r.created_at,
    }));
}

export function insertCommunityRoomMessage({ id, topic, userId, content }) {
  const now = Date.now();
  getDb()
    .prepare(
      `INSERT INTO community_room_messages (id, topic, user_id, content, status, created_at)
       VALUES (?, ?, ?, ?, 'published', ?)`,
    )
    .run(id, topic, userId, content, now);
  const row = getDb()
    .prepare(
      `SELECT m.*, u.name AS author_name, u.role AS author_role
       FROM community_room_messages m JOIN users u ON u.id = m.user_id WHERE m.id = ?`,
    )
    .get(id);
  return {
    id: row.id,
    topic: row.topic,
    userId: row.user_id,
    authorName: row.author_name,
    authorRole: row.author_role,
    content: row.content,
    createdAt: row.created_at,
  };
}

export function hideCommunityComment(commentId) {
  const result = getDb()
    .prepare(`UPDATE community_comments SET status = 'hidden' WHERE id = ?`)
    .run(commentId);
  return result.changes > 0;
}

export function deleteCommunityComment(commentId) {
  const result = getDb().prepare(`DELETE FROM community_comments WHERE id = ?`).run(commentId);
  return result.changes > 0;
}

export function getCommunityCommentById(commentId) {
  const row = getDb()
    .prepare(`SELECT id, post_id AS postId FROM community_comments WHERE id = ?`)
    .get(commentId);
  return row || null;
}

export function followCommunityUser(followerId, followingId) {
  if (followerId === followingId) return false;
  const now = Date.now();
  getDb()
    .prepare(
      `INSERT OR IGNORE INTO community_user_follows (follower_id, following_id, created_at) VALUES (?, ?, ?)`,
    )
    .run(followerId, followingId, now);
  return true;
}

export function unfollowCommunityUser(followerId, followingId) {
  getDb()
    .prepare(`DELETE FROM community_user_follows WHERE follower_id = ? AND following_id = ?`)
    .run(followerId, followingId);
}

export function listFollowedCommunityUserIds(followerId) {
  const rows = getDb()
    .prepare(`SELECT following_id FROM community_user_follows WHERE follower_id = ?`)
    .all(followerId);
  return rows.map((r) => r.following_id);
}

export function isFollowingCommunityUser(followerId, followingId) {
  const row = getDb()
    .prepare(
      `SELECT 1 AS ok FROM community_user_follows WHERE follower_id = ? AND following_id = ?`,
    )
    .get(followerId, followingId);
  return Boolean(row);
}

export function followCommunityTopic(userId, topic) {
  const now = Date.now();
  getDb()
    .prepare(
      `INSERT OR IGNORE INTO community_topic_follows (user_id, topic, created_at) VALUES (?, ?, ?)`,
    )
    .run(userId, topic, now);
}

export function unfollowCommunityTopic(userId, topic) {
  getDb()
    .prepare(`DELETE FROM community_topic_follows WHERE user_id = ? AND topic = ?`)
    .run(userId, topic);
}

export function listFollowedCommunityTopics(userId) {
  const rows = getDb()
    .prepare(`SELECT topic FROM community_topic_follows WHERE user_id = ? ORDER BY created_at DESC`)
    .all(userId);
  return rows.map((r) => r.topic);
}

export function isCommunityTopicFollowed(userId, topic) {
  const row = getDb()
    .prepare(`SELECT 1 AS ok FROM community_topic_follows WHERE user_id = ? AND topic = ?`)
    .get(userId, topic);
  return Boolean(row);
}

export function listCommunityFeed({
  mode = 'for_you',
  topic,
  limit = 30,
  beforeTs,
  viewerId,
} = {}) {
  const params = [];
  let sql = `
    SELECT p.*, u.name AS author_name, u.role AS author_role,
      ${POST_STATS_SQL}
    FROM community_posts p
    JOIN users u ON u.id = p.user_id
    WHERE p.status = 'published'
    ${ROOT_POSTS_ONLY}
  `;

  if (topic) {
    sql += ` AND p.topic = ?`;
    params.push(topic);
  }

  if (mode === 'following' && viewerId) {
    sql += ` AND (
      p.user_id IN (SELECT following_id FROM community_user_follows WHERE follower_id = ?)
      OR p.topic IN (SELECT topic FROM community_topic_follows WHERE user_id = ?)
    )`;
    params.push(viewerId, viewerId);
  }

  if (beforeTs) {
    sql += ` AND p.created_at < ?`;
    params.push(beforeTs);
  }

  if (mode === 'for_you') {
    sql += ` ORDER BY (CASE WHEN u.role IN ('expert', 'admin') THEN 0 ELSE 1 END), p.created_at DESC LIMIT ?`;
  } else {
    sql += ` ORDER BY p.created_at DESC LIMIT ?`;
  }
  params.push(Math.min(Math.max(limit, 1), 50));

  const rows = getDb().prepare(sql).all(...params);
  return rows.map((r) => mapCommunityPostRow(r, viewerId));
}
