/**
 * Facade DB — giữ export ổn định cho routes; logic nằm trong ./db/*
 */
import { normalizeEmail } from './validate.js';
import bcrypt from 'bcryptjs';
import { DbError, mapSqliteError } from './dbErrors.js';
import { getDb, initDb, runInTransaction, DB_FILE, DEMO_EXPERT_ID, DEMO_PATIENT_ID } from './db/connection.js';
import { getDatabaseInfo, runDatabaseDiagnostics } from './db/health.js';
export {
  ensureTrainingPlanFromWorkout,
  getTrainingPlanForCustomer,
  integrateTrainingPlanFromAi,
  syncTrainingPlanProgress,
  structureExercises,
  updateTrainingPlanByExpert,
} from './db/repositories/trainingPlanRepository.js';

export { getDb, initDb, runInTransaction, DB_FILE, DEMO_EXPERT_ID, DEMO_PATIENT_ID, getDatabaseInfo, runDatabaseDiagnostics };

export function findUserByEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  const row = getDb()
    .prepare(
      `SELECT id, email, password_hash AS passwordHash, role, name, created_at AS createdAt
       FROM users WHERE email = ? COLLATE NOCASE`,
    )
    .get(normalized);
  return row || null;
}

export function findUserById(id) {
  const row = getDb()
    .prepare(`SELECT id, email, password_hash AS passwordHash, role, name FROM users WHERE id = ?`)
    .get(id);
  return row || null;
}

export function listUsersByRole(role) {
  const normalizedRole = String(role || '').trim();
  return getDb()
    .prepare(
      `SELECT id, email, role, name, created_at AS createdAt
       FROM users
       WHERE (? = '' OR role = ?)
       ORDER BY created_at DESC`,
    )
    .all(normalizedRole, normalizedRole);
}

export function insertUser(user) {
  const email = normalizeEmail(user.email);
  if (!email) throw new DbError('INVALID_EMAIL', 'Email không hợp lệ', 400);
  const now = Date.now();
  try {
    getDb()
      .prepare(
        `INSERT INTO users (id, email, password_hash, role, name, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(user.id, email, user.passwordHash, user.role, user.name, user.createdAt ?? now);
  } catch (err) {
    throw mapSqliteError(err);
  }
}

export function ensureAdminFromEnv() {
  const email = normalizeEmail(process.env.ADMIN_EMAIL || '');
  const password = String(process.env.ADMIN_PASSWORD || '');
  if (!email || !password) return { enabled: false };
  let user = findUserByEmail(email);
  const hash = bcrypt.hashSync(password, 10);
  if (!user) {
    insertUser({
      id: crypto.randomUUID(),
      email,
      passwordHash: hash,
      role: 'admin',
      name: 'System Admin',
    });
    return { enabled: true, created: true, email };
  }
  if (user.role !== 'admin') {
    getDb()
      .prepare(`UPDATE users SET role = 'admin', password_hash = ? WHERE id = ?`)
      .run(hash, user.id);
    return { enabled: true, created: false, promoted: true, email };
  }
  return { enabled: true, created: false, email };
}

function nowTs() {
  return Date.now();
}

export function upsertCustomerProfile(userId, profile = {}) {
  const now = nowTs();
  getDb()
    .prepare(
      `INSERT INTO customer_profiles
        (user_id, full_name, gender, dob, phone, address, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         full_name = excluded.full_name,
         gender = excluded.gender,
         dob = excluded.dob,
         phone = excluded.phone,
         address = excluded.address,
         notes = excluded.notes,
         updated_at = excluded.updated_at`,
    )
    .run(
      userId,
      String(profile.fullName || ''),
      String(profile.gender || ''),
      String(profile.dob || ''),
      String(profile.phone || ''),
      String(profile.address || ''),
      String(profile.notes || ''),
      now,
      now,
    );
}

export function upsertExpertProfile(userId, profile = {}) {
  const now = nowTs();
  getDb()
    .prepare(
      `INSERT INTO expert_profiles
        (user_id, full_name, gender, specialty, license_no, bio, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         full_name = excluded.full_name,
         gender = excluded.gender,
         specialty = excluded.specialty,
         license_no = excluded.license_no,
         bio = excluded.bio,
         is_active = excluded.is_active,
         updated_at = excluded.updated_at`,
    )
    .run(
      userId,
      String(profile.fullName || ''),
      String(profile.gender || ''),
      String(profile.specialty || ''),
      String(profile.licenseNo || ''),
      String(profile.bio || ''),
      profile.isActive === false ? 0 : 1,
      now,
      now,
    );
}

export function getCustomerProfile(userId) {
  return (
    getDb()
      .prepare(
        `SELECT user_id AS userId, full_name AS fullName, gender, dob, phone, address, notes
         FROM customer_profiles WHERE user_id = ?`,
      )
      .get(userId) || null
  );
}

export function getExpertProfile(userId) {
  return (
    getDb()
      .prepare(
        `SELECT user_id AS userId, full_name AS fullName, gender, specialty,
                license_no AS licenseNo, bio, is_active AS isActive
         FROM expert_profiles WHERE user_id = ?`,
      )
      .get(userId) || null
  );
}

export function listAvailableExperts() {
  return getDb()
    .prepare(
      `SELECT u.id, u.email, u.name, ep.full_name AS fullName, ep.specialty, ep.bio
       FROM users u
       LEFT JOIN expert_profiles ep ON ep.user_id = u.id
       WHERE u.role = 'expert' AND COALESCE(ep.is_active, 1) = 1
       ORDER BY COALESCE(ep.full_name, u.name)`,
    )
    .all();
}

export function listCustomersWithProfiles() {
  return getDb()
    .prepare(
      `SELECT u.id, u.email, u.role, u.name,
              cp.full_name AS fullName, cp.gender, cp.dob, cp.phone, cp.address, cp.notes
       FROM users u
       LEFT JOIN customer_profiles cp ON cp.user_id = u.id
       WHERE u.role = 'user'
       ORDER BY COALESCE(cp.full_name, u.name)`,
    )
    .all();
}

export function listExpertsWithProfiles() {
  return getDb()
    .prepare(
      `SELECT u.id, u.email, u.role, u.name,
              ep.full_name AS fullName, ep.gender, ep.specialty, ep.license_no AS licenseNo,
              ep.bio, COALESCE(ep.is_active, 1) AS isActive
       FROM users u
       LEFT JOIN expert_profiles ep ON ep.user_id = u.id
       WHERE u.role = 'expert'
       ORDER BY COALESCE(ep.full_name, u.name)`,
    )
    .all();
}

export function listAssignmentRelations(filters = {}) {
  const status = String(filters.status || '').trim();
  return getDb()
    .prepare(
      `SELECT a.id, a.expert_id AS expertId, a.customer_id AS customerId, a.status, a.requested_by AS requestedBy,
              a.created_at AS createdAt, a.updated_at AS updatedAt,
              eu.name AS expertName, eu.email AS expertEmail,
              cu.name AS customerName, cu.email AS customerEmail
       FROM expert_customer_assignments a
       JOIN users eu ON eu.id = a.expert_id
       JOIN users cu ON cu.id = a.customer_id
       WHERE (? = '' OR a.status = ?)
       ORDER BY a.updated_at DESC`,
    )
    .all(status, status);
}

export function updateUserRole(userId, role) {
  const allowed = new Set(['user', 'expert', 'admin']);
  if (!allowed.has(role)) throw new DbError('INVALID_ROLE', 'Role không hợp lệ', 400);
  const result = getDb().prepare(`UPDATE users SET role = ? WHERE id = ?`).run(role, userId);
  return { ok: result.changes > 0 };
}

export function hasUserRole(userId, role) {
  const normalizedRole = String(role || '').trim();
  if (!normalizedRole) return false;
  const row = getDb()
    .prepare(
      `SELECT 1 AS ok
       FROM users u
       WHERE u.id = ?
         AND (
           u.role = ?
           OR EXISTS (
             SELECT 1
             FROM user_role_grants g
             WHERE g.user_id = u.id AND g.role = ?
           )
         )`,
    )
    .get(userId, normalizedRole, normalizedRole);
  return Boolean(row);
}

export function listUserGrantedRoles(userId) {
  return getDb()
    .prepare(
      `SELECT role
       FROM user_role_grants
       WHERE user_id = ?
       ORDER BY role`,
    )
    .all(userId)
    .map((r) => r.role);
}

export function grantUserRole(userId, role) {
  const allowed = new Set(['user', 'expert', 'admin']);
  if (!allowed.has(role)) throw new DbError('INVALID_ROLE', 'Role không hợp lệ', 400);
  const user = findUserById(userId);
  if (!user) return { ok: false, reason: 'user_not_found' };
  if (user.role === role) return { ok: true, already: true };
  const result = getDb()
    .prepare(
      `INSERT OR IGNORE INTO user_role_grants (user_id, role, created_at)
       VALUES (?, ?, ?)`,
    )
    .run(userId, role, Date.now());
  return { ok: true, granted: result.changes > 0 };
}

export function revokeUserRole(userId, role) {
  const user = findUserById(userId);
  if (!user) return { ok: false, reason: 'user_not_found' };
  if (user.role === role) {
    return { ok: false, reason: 'primary_role' };
  }
  const result = getDb()
    .prepare(`DELETE FROM user_role_grants WHERE user_id = ? AND role = ?`)
    .run(userId, role);
  return { ok: true, revoked: result.changes > 0 };
}

export function upsertCustomerHealthProfile(userId, profile = {}) {
  const now = nowTs();
  getDb()
    .prepare(
      `INSERT INTO customer_health_profiles
        (user_id, current_conditions, medical_history, allergies, medications, contraindications, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         current_conditions = excluded.current_conditions,
         medical_history = excluded.medical_history,
         allergies = excluded.allergies,
         medications = excluded.medications,
         contraindications = excluded.contraindications,
         updated_at = excluded.updated_at`,
    )
    .run(
      userId,
      String(profile.currentConditions || ''),
      String(profile.medicalHistory || ''),
      String(profile.allergies || ''),
      String(profile.medications || ''),
      String(profile.contraindications || ''),
      now,
    );
}

export function getCustomerHealthProfile(userId) {
  return (
    getDb()
      .prepare(
        `SELECT user_id AS userId,
                current_conditions AS currentConditions,
                medical_history AS medicalHistory,
                allergies,
                medications,
                contraindications,
                updated_at AS updatedAt
         FROM customer_health_profiles
         WHERE user_id = ?`,
      )
      .get(userId) || null
  );
}

function normalizeLiveSenderRole(role) {
  return role === 'patient' ? 'customer' : role;
}

function mapLiveMessageRow(row) {
  if (!row) return row;
  return {
    ...row,
    customerId: row.customerId ?? row.patientId,
    senderRole: normalizeLiveSenderRole(row.senderRole),
  };
}

export function canExpertAccessCustomer(expertId, customerId) {
  const row = getDb()
    .prepare(
      `SELECT 1 AS ok
       FROM expert_customer_assignments
       WHERE expert_id = ? AND customer_id = ? AND status = 'accepted'`,
    )
    .get(expertId, customerId);
  return !!row;
}

export function pushAudit({ actorId, role, action, customerId, meta }) {
  getDb()
    .prepare(
      `INSERT INTO audit_log (id, ts, actor_id, role, action, patient_id, meta) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      crypto.randomUUID(),
      Date.now(),
      actorId,
      role,
      action,
      customerId || null,
      meta != null ? JSON.stringify(meta) : null,
    );
}

export function getCustomerIdsForExpert(expertId) {
  return getDb()
    .prepare(
      `SELECT customer_id AS id
       FROM expert_customer_assignments
       WHERE expert_id = ? AND status = 'accepted'`,
    )
    .all(expertId)
    .map((r) => r.id);
}

export function assignExpertToCustomer(expertId, customerId, requestedBy = 'expert') {
  const p = findUserById(customerId);
  if (!p || p.role !== 'user') return { ok: false, error: 'invalid_customer' };
  const e = findUserById(expertId);
  if (!e || e.role !== 'expert') return { ok: false, error: 'invalid_expert' };
  const now = nowTs();
  getDb()
    .prepare(
      `INSERT INTO expert_customer_assignments
        (id, expert_id, customer_id, status, requested_by, created_at, updated_at)
       VALUES (?, ?, ?, 'accepted', ?, ?, ?)
       ON CONFLICT(expert_id, customer_id) DO UPDATE SET
         status = 'accepted',
         requested_by = excluded.requested_by,
         updated_at = excluded.updated_at`,
    )
    .run(crypto.randomUUID(), expertId, customerId, requestedBy, now, now);
  return { ok: true };
}

export function removeExpertCustomerAssignment(expertId, customerId) {
  getDb()
    .prepare(
      `UPDATE expert_customer_assignments
       SET status = 'revoked', updated_at = ?
       WHERE expert_id = ? AND customer_id = ?`,
    )
    .run(nowTs(), expertId, customerId);
}

export function requestExpertAssignment(customerId, expertId) {
  const customer = findUserById(customerId);
  if (!customer || customer.role !== 'user') return { ok: false, error: 'invalid_customer' };
  const expert = findUserById(expertId);
  if (!expert || expert.role !== 'expert') return { ok: false, error: 'invalid_expert' };
  const now = nowTs();
  getDb()
    .prepare(
      `INSERT INTO expert_customer_assignments
        (id, expert_id, customer_id, status, requested_by, created_at, updated_at)
       VALUES (?, ?, ?, 'requested', 'customer', ?, ?)
       ON CONFLICT(expert_id, customer_id) DO UPDATE SET
         status = CASE
           WHEN expert_customer_assignments.status = 'accepted' THEN 'accepted'
           ELSE 'requested'
         END,
         requested_by = 'customer',
         updated_at = excluded.updated_at`,
    )
    .run(crypto.randomUUID(), expertId, customerId, now, now);
  return { ok: true };
}

export function decideExpertAssignment(expertId, customerId, action) {
  const status = action === 'approve' ? 'accepted' : 'rejected';
  const result = getDb()
    .prepare(
      `UPDATE expert_customer_assignments
       SET status = ?, updated_at = ?
       WHERE expert_id = ? AND customer_id = ?`,
    )
    .run(status, nowTs(), expertId, customerId);
  return { ok: result.changes > 0 };
}

export function listPendingCustomersForExpert(expertId) {
  return getDb()
    .prepare(
      `SELECT a.customer_id AS id, u.email, u.name, a.created_at AS requestedAt
       FROM expert_customer_assignments a
       JOIN users u ON u.id = a.customer_id
       WHERE a.expert_id = ? AND a.status = 'requested'
       ORDER BY a.created_at DESC`,
    )
    .all(expertId);
}

export function listExpertRequestsForCustomer(customerId) {
  return getDb()
    .prepare(
      `SELECT a.id, a.expert_id AS expertId, a.status, a.requested_by AS requestedBy,
              a.updated_at AS updatedAt, u.name AS expertName, u.email AS expertEmail
       FROM expert_customer_assignments a
       JOIN users u ON u.id = a.expert_id
       WHERE a.customer_id = ?
       ORDER BY a.updated_at DESC`,
    )
    .all(customerId);
}

export function getExpertsForCustomer(customerId) {
  return getDb()
    .prepare(
      `SELECT u.id AS id, u.email AS email, u.name AS name
       FROM expert_customer_assignments a
       JOIN users u ON u.id = a.expert_id
       WHERE a.customer_id = ? AND a.status = 'accepted'
       ORDER BY u.name`,
    )
    .all(customerId);
}

export function listBmiForUser(userId) {
  return getDb()
    .prepare(
      `SELECT id, user_id AS userId, date, height_cm AS heightCm, weight_kg AS weightKg, bmi
       FROM bmi_entries WHERE user_id = ? ORDER BY date DESC`,
    )
    .all(userId);
}

export function upsertBmiEntry(row) {
  runInTransaction(() => {
    const db = getDb();
    db.prepare(`DELETE FROM bmi_entries WHERE user_id = ? AND date = ?`).run(row.userId, row.date);
    db.prepare(
      `INSERT INTO bmi_entries (id, user_id, date, height_cm, weight_kg, bmi) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(row.id, row.userId, row.date, row.heightCm, row.weightKg, row.bmi);
  });
}

export function listMoodsForUser(userId) {
  const cols = getDb().prepare(`PRAGMA table_info(mood_entries)`).all();
  const hasEmoji = cols.some((c) => c.name === 'mood_emoji');
  const emojiSelect = hasEmoji ? ', mood_emoji AS moodEmoji' : '';
  return getDb()
    .prepare(
      `SELECT id, user_id AS userId, date, mood_label AS moodLabel, mood_score AS moodScore${emojiSelect},
              note, free_text AS freeText
       FROM mood_entries WHERE user_id = ? ORDER BY date DESC`,
    )
    .all(userId);
}

export function upsertMoodEntry(row) {
  runInTransaction(() => {
    const db = getDb();
    db.prepare(`DELETE FROM mood_entries WHERE user_id = ? AND date = ?`).run(row.userId, row.date);
    const cols = db.prepare(`PRAGMA table_info(mood_entries)`).all();
    const hasEmoji = cols.some((c) => c.name === 'mood_emoji');
    const freeText = String(row.freeText || '').slice(0, 2000);
    if (hasEmoji) {
      db.prepare(
        `INSERT INTO mood_entries (id, user_id, date, mood_label, mood_score, mood_emoji, note, free_text)
         VALUES (?, ?, ?, ?, ?, ?, '', ?)`,
      ).run(
        row.id,
        row.userId,
        row.date,
        row.moodLabel,
        row.moodScore,
        String(row.moodEmoji || ''),
        freeText,
      );
    } else {
      db.prepare(
        `INSERT INTO mood_entries (id, user_id, date, mood_label, mood_score, note, free_text) VALUES (?, ?, ?, ?, ?, '', ?)`,
      ).run(row.id, row.userId, row.date, row.moodLabel, row.moodScore, freeText);
    }
  });
}

export function listBotMessagesForUser(userId) {
  return getDb()
    .prepare(`SELECT id, role, content, ts FROM bot_messages WHERE user_id = ? ORDER BY ts ASC`)
    .all(userId);
}

export function replaceBotMessagesForUser(userId, messages) {
  runInTransaction(() => {
    const db = getDb();
    const del = db.prepare(`DELETE FROM bot_messages WHERE user_id = ?`);
    const ins = db.prepare(
      `INSERT INTO bot_messages (id, user_id, role, content, ts) VALUES (?, ?, ?, ?, ?)`,
    );
    del.run(userId);
    for (const m of messages) {
      if (!m.role || !m.content) continue;
      ins.run(
        m.id || crypto.randomUUID(),
        userId,
        m.role === 'assistant' ? 'assistant' : 'user',
        String(m.content),
        Number(m.ts) || Date.now(),
      );
    }
  });
}

export function listLiveMessagesForCustomer(customerId) {
  return getDb()
    .prepare(
      `SELECT id, patient_id AS customerId, sender_user_id AS senderUserId,
              sender_role AS senderRole, content, ts
       FROM live_messages WHERE patient_id = ? ORDER BY ts ASC`,
    )
    .all(customerId)
    .map(mapLiveMessageRow);
}

export function listLiveMessagesForCustomerSince(customerId, sinceTs) {
  const since = Number(sinceTs) || 0;
  return getDb()
    .prepare(
      `SELECT id, patient_id AS customerId, sender_user_id AS senderUserId,
              sender_role AS senderRole, content, ts
       FROM live_messages WHERE patient_id = ? AND ts > ? ORDER BY ts ASC`,
    )
    .all(customerId, since)
    .map(mapLiveMessageRow);
}

export function getLastLiveMessageMap(customerIds) {
  const map = new Map();
  if (!customerIds?.length) return map;
  const stmt = getDb().prepare(
    `SELECT id, patient_id AS customerId, sender_user_id AS senderUserId,
            sender_role AS senderRole, content, ts
     FROM live_messages WHERE patient_id = ?
     ORDER BY ts DESC LIMIT 1`,
  );
  for (const cid of customerIds) {
    const row = stmt.get(cid);
    if (row) map.set(cid, mapLiveMessageRow(row));
  }
  return map;
}

function normalizeStoredSenderRole(role) {
  if (role === 'expert') return 'expert';
  return 'customer';
}

export function insertLiveMessage({ customerId, senderUserId, senderRole, content }) {
  const id = crypto.randomUUID();
  const ts = Date.now();
  const storedRole = normalizeStoredSenderRole(senderRole);
  getDb()
    .prepare(
      `INSERT INTO live_messages (id, patient_id, sender_user_id, sender_role, content, ts)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(id, customerId, senderUserId, storedRole, content, ts);
  return mapLiveMessageRow({
    id,
    customerId,
    senderUserId,
    senderRole: storedRole,
    content,
    ts,
  });
}

export function subscribeNewsletter(email, source = 'landing') {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    throw new DbError('INVALID_EMAIL', 'Email không hợp lệ', 400);
  }
  const now = Date.now();
  const result = getDb()
    .prepare(
      `INSERT OR IGNORE INTO newsletter_subscribers (email, source, created_at) VALUES (?, ?, ?)`,
    )
    .run(normalized, String(source || 'landing').slice(0, 64), now);
  return { email: normalized, created: result.changes > 0 };
}

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
  };
}

export function listCommunityPosts({ topic, limit = 30, beforeTs, viewerId, includeHidden = false } = {}) {
  const params = [];
  let sql = `
    SELECT p.*, u.name AS author_name, u.role AS author_role,
      (SELECT COUNT(*) FROM community_comments c WHERE c.post_id = p.id AND c.status = 'published') AS comment_count
    FROM community_posts p
    JOIN users u ON u.id = p.user_id
    WHERE 1=1
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
      (SELECT COUNT(*) FROM community_comments c WHERE c.post_id = p.id AND c.status = 'published') AS comment_count
    FROM community_posts p
    JOIN users u ON u.id = p.user_id
    WHERE p.id = ?
  `;
  if (!includeHidden) sql += ` AND p.status = 'published'`;
  const row = getDb().prepare(sql).get(postId);
  return mapCommunityPostRow(row, viewerId);
}

export function createCommunityPost({ id, userId, topic, content, imageUrl = '' }) {
  const now = Date.now();
  getDb()
    .prepare(
      `INSERT INTO community_posts (id, user_id, topic, content, image_url, likes_count, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, 'published', ?, ?)`,
    )
    .run(id, userId, topic, content, imageUrl, now, now);
  return getCommunityPostById(id, userId);
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
