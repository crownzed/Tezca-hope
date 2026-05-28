/**
 * Facade DB — giữ export ổn định cho routes; logic nằm trong ./db/*
 */
import { normalizeEmail } from './validate.js';
import { DbError, mapSqliteError } from './dbErrors.js';
import { getDb, initDb, runInTransaction, DB_FILE, DEMO_EXPERT_ID, DEMO_PATIENT_ID } from './db/connection.js';
import { getDatabaseInfo, runDatabaseDiagnostics } from './db/health.js';
export {
  ensureTrainingPlanFromWorkout,
  getTrainingPlanForPatient,
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

export function insertLiveMessage({ patientId, senderUserId, senderRole, content }) {
  const id = crypto.randomUUID();
  const ts = Date.now();
  getDb()
    .prepare(
      `INSERT INTO live_messages (id, patient_id, sender_user_id, sender_role, content, ts)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(id, patientId, senderUserId, senderRole, content, ts);
  return { id, patientId, senderUserId, senderRole, content, ts };
}
