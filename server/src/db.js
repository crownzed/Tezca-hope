/**
 * Facade DB — giữ export ổn định cho routes; logic nằm trong ./db/*
 */
import bcrypt from 'bcryptjs';
import { normalizeEmail } from './validate.js';
import { DbError, mapSqliteError } from './dbErrors.js';
import { getDb, initDb, runInTransaction, DB_FILE, DEMO_EXPERT_ID, DEMO_PATIENT_ID } from './db/connection.js';
import { getDatabaseInfo, runDatabaseDiagnostics } from './db/health.js';
import { grantUserRole } from './db/customerDomain.js';
export {
  ensureTrainingPlanFromWorkout,
  getTrainingPlanForCustomer,
  integrateTrainingPlanFromAi,
  syncTrainingPlanProgress,
  structureExercises,
  updateTrainingPlanByExpert,
} from './db/repositories/trainingPlanRepository.js';

export {
  listLiveMessagesForCustomer,
  listLiveMessagesForCustomerSince,
  getExpertsForCustomer,
  canExpertAccessCustomer,
  getCustomerIdsForExpert,
  assignExpertToCustomer,
  removeExpertCustomerAssignment,
  listAvailableExperts,
  listExpertRequestsForCustomer,
  requestExpertAssignment,
  listPendingCustomersForExpert,
  decideExpertAssignment,
  getCustomerHealthProfile,
  upsertCustomerHealthProfile,
  listCustomersWithProfiles,
  listExpertsWithProfiles,
  listAssignmentRelations,
  upsertCustomerProfile,
  upsertExpertProfile,
  createExpertAccount,
  updateExpertAccount,
  setExpertActive,
  deleteExpertAccount,
  deleteCustomerAccount,
  isExpertAccountActive,
  updateUserRole,
  listUserGrantedRoles,
  userHasRoleGrant,
  userCanLoginAsRole,
  grantUserRole,
  revokeUserRole,
} from './db/customerDomain.js';

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

export function canExpertAccessPatient(expertId, patientId) {
  const row = getDb()
    .prepare(`SELECT 1 AS ok FROM assignments WHERE expert_id = ? AND patient_id = ?`)
    .get(expertId, patientId);
  return !!row;
}

export function pushAudit({ actorId, role, action, patientId, meta }) {
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
      patientId || null,
      meta != null ? JSON.stringify(meta) : null,
    );
}

export function getPatientIdsForExpert(expertId) {
  return getDb()
    .prepare(`SELECT patient_id AS id FROM assignments WHERE expert_id = ?`)
    .all(expertId)
    .map((r) => r.id);
}

export function assignExpertToPatient(expertId, patientId) {
  const p = findUserById(patientId);
  if (!p || p.role !== 'user') return { ok: false, error: 'invalid_patient' };
  const e = findUserById(expertId);
  if (!e || e.role !== 'expert') return { ok: false, error: 'invalid_expert' };
  getDb()
    .prepare(`INSERT OR IGNORE INTO assignments (expert_id, patient_id) VALUES (?, ?)`)
    .run(expertId, patientId);
  return { ok: true };
}

export function removeExpertPatientAssignment(expertId, patientId) {
  getDb()
    .prepare(`DELETE FROM assignments WHERE expert_id = ? AND patient_id = ?`)
    .run(expertId, patientId);
}

export function getExpertsForPatient(patientId) {
  return getDb()
    .prepare(
      `SELECT u.id AS id, u.email AS email, u.name AS name
       FROM assignments a
       JOIN users u ON u.id = a.expert_id
       WHERE a.patient_id = ?
       ORDER BY u.name`,
    )
    .all(patientId);
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
  return getDb()
    .prepare(
      `SELECT id, user_id AS userId, date, mood_label AS moodLabel, mood_score AS moodScore, note
       FROM mood_entries WHERE user_id = ? ORDER BY date DESC`,
    )
    .all(userId);
}

export function upsertMoodEntry(row) {
  runInTransaction(() => {
    const db = getDb();
    db.prepare(`DELETE FROM mood_entries WHERE user_id = ? AND date = ?`).run(row.userId, row.date);
    db.prepare(
      `INSERT INTO mood_entries (id, user_id, date, mood_label, mood_score, note) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(row.id, row.userId, row.date, row.moodLabel, row.moodScore, row.note);
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

export function listLiveMessagesForPatient(patientId) {
  return getDb()
    .prepare(
      `SELECT id, patient_id AS patientId, sender_user_id AS senderUserId,
              sender_role AS senderRole, content, ts
       FROM live_messages WHERE patient_id = ? ORDER BY ts ASC`,
    )
    .all(patientId);
}

export function listLiveMessagesForPatientSince(patientId, sinceTs) {
  const since = Number(sinceTs) || 0;
  return getDb()
    .prepare(
      `SELECT id, patient_id AS patientId, sender_user_id AS senderUserId,
              sender_role AS senderRole, content, ts
       FROM live_messages WHERE patient_id = ? AND ts > ? ORDER BY ts ASC`,
    )
    .all(patientId, since);
}

export function getLastLiveMessageMap(patientIds) {
  const map = new Map();
  if (!patientIds?.length) return map;
  const stmt = getDb().prepare(
    `SELECT id, patient_id AS patientId, sender_user_id AS senderUserId,
            sender_role AS senderRole, content, ts
     FROM live_messages WHERE patient_id = ?
     ORDER BY ts DESC LIMIT 1`,
  );
  for (const pid of patientIds) {
    const row = stmt.get(pid);
    if (row) map.set(pid, row);
  }
  return map;
}

export function insertLiveMessage({ patientId, customerId, senderUserId, senderRole, content }) {
  const cid = customerId ?? patientId;
  const id = crypto.randomUUID();
  const ts = Date.now();
  const role =
    senderRole === 'patient' || senderRole === 'user' ? 'customer' : senderRole;
  getDb()
    .prepare(
      `INSERT INTO live_messages (id, patient_id, sender_user_id, sender_role, content, ts)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(id, cid, senderUserId, role, content, ts);
  return { id, patientId: cid, customerId: cid, senderUserId, senderRole: role, content, ts };
}

/** Bootstrap admin — env ưu tiên; trên Vercel demo dùng admin@tezca.vn / TezcaDemo#2026. */
export function ensureAdminFromEnv() {
  const onVercel = Boolean(process.env.VERCEL);
  const demoBootstrap = onVercel && process.env.TEZCA_SEED_DEMO !== '0';

  let email = normalizeEmail(
    process.env.TEZCA_ADMIN_EMAIL || process.env.ADMIN_EMAIL,
  );
  let password = process.env.TEZCA_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

  if (!email && demoBootstrap) {
    email = normalizeEmail(process.env.TEZCA_DEMO_ADMIN_EMAIL || 'admin@tezca.vn');
  }
  if (!password && demoBootstrap) {
    password = process.env.TEZCA_DEMO_PASSWORD || 'TezcaDemo#2026';
  }
  if (!email || !password) return;

  const demoAdminEmail = normalizeEmail('admin@tezca.vn');
  const name = String(process.env.TEZCA_ADMIN_NAME || 'Quản trị viên').trim().slice(0, 120);
  const hash = bcrypt.hashSync(String(password), 10);
  const syncPassword =
    process.env.TEZCA_ADMIN_SYNC_PASSWORD === '1' ||
    process.env.TEZCA_ADMIN_SYNC_PASSWORD === 'true' ||
    (demoBootstrap && email === demoAdminEmail);

  let user = findUserByEmail(email);
  if (!user) {
    const id =
      email === demoAdminEmail ? 'tezca-demo-admin-0001' : crypto.randomUUID();
    insertUser({ id, email, passwordHash: hash, role: 'admin', name });
    user = findUserByEmail(email);
  } else if (syncPassword) {
    getDb()
      .prepare(`UPDATE users SET password_hash = ? WHERE id = ?`)
      .run(hash, user.id);
  }

  if (user) {
    grantUserRole(user.id, 'admin');
    if (user.role !== 'admin' && (process.env.TEZCA_ADMIN_PRIMARY_ROLE === 'admin' || email === demoAdminEmail)) {
      getDb().prepare(`UPDATE users SET role = 'admin' WHERE id = ?`).run(user.id);
    }
  }
}

/** Đăng ký nhận tin landing — trả { created: true } nếu email mới. */
export function subscribeNewsletter(email, source = 'landing') {
  const normalized = normalizeEmail(email);
  if (!normalized) throw new DbError('INVALID_EMAIL', 'Email không hợp lệ', 400);
  const now = Date.now();
  try {
    const result = getDb()
      .prepare(
        `INSERT INTO newsletter_subscribers (email, source, created_at) VALUES (?, ?, ?)`,
      )
      .run(normalized, String(source || 'landing').slice(0, 64), now);
    return { created: result.changes > 0 };
  } catch (err) {
    if (err?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return { created: false };
    }
    throw mapSqliteError(err);
  }
}

export {
  listCommunityPosts,
  getCommunityPostById,
  createCommunityPost,
  deleteCommunityPost,
  setCommunityPostStatus,
  listCommunityComments,
  createCommunityComment,
  hideCommunityComment,
  deleteCommunityComment,
  getCommunityCommentById,
  toggleCommunityPostLike,
  createCommunityReport,
  listCommunityReports,
  updateCommunityReportStatus,
  listCommunityRoomMessages,
  insertCommunityRoomMessage,
  listCommunityFeed,
  followCommunityUser,
  unfollowCommunityUser,
  listFollowedCommunityUserIds,
  isFollowingCommunityUser,
  followCommunityTopic,
  unfollowCommunityTopic,
  listFollowedCommunityTopics,
  listCommunityThreadReplies,
  createCommunityThreadReply,
} from './db/repositories/communityRepository.js';

export {
  listCommunityAnnouncementMessages,
  insertCommunityAnnouncementMessage,
  getOrCreateCommunityDmThread,
  listCommunityDmThreads,
  getCommunityDmThreadForUser,
  listCommunityDmMessages,
  insertCommunityDmMessage,
  searchCommunityMembers,
  listRoomMentionCandidates,
} from './db/repositories/communityExtendedRepository.js';
