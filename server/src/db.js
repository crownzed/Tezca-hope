import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
export const DB_FILE = path.join(dataDir, 'tezca.sqlite');

/** @type {Database.Database | null} */
let dbInstance = null;

export function getDb() {
  if (dbInstance) return dbInstance;
  fs.mkdirSync(dataDir, { recursive: true });
  dbInstance = new Database(DB_FILE);
  dbInstance.pragma('journal_mode = WAL');
  migrate(dbInstance);
  const { c } = dbInstance.prepare('SELECT COUNT(*) AS c FROM users').get();
  if (c === 0) seedDatabase(dbInstance);
  return dbInstance;
}

/** Khởi tạo kết nối + schema (gọi khi start server) */
export function initDb() {
  getDb();
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('user', 'expert')),
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS assignments (
      expert_id TEXT NOT NULL,
      patient_id TEXT NOT NULL,
      PRIMARY KEY (expert_id, patient_id),
      FOREIGN KEY (expert_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS bmi_entries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      height_cm REAL NOT NULL,
      weight_kg REAL NOT NULL,
      bmi REAL NOT NULL,
      UNIQUE (user_id, date),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS mood_entries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      mood_label TEXT NOT NULL,
      mood_score INTEGER NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      UNIQUE (user_id, date),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS bot_messages (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      ts INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS live_messages (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      sender_user_id TEXT NOT NULL,
      sender_role TEXT NOT NULL CHECK (sender_role IN ('expert', 'patient')),
      content TEXT NOT NULL,
      ts INTEGER NOT NULL,
      FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      ts INTEGER NOT NULL,
      actor_id TEXT NOT NULL,
      role TEXT NOT NULL,
      action TEXT NOT NULL,
      patient_id TEXT,
      meta TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_bmi_user ON bmi_entries(user_id);
    CREATE INDEX IF NOT EXISTS idx_mood_user ON mood_entries(user_id);
    CREATE INDEX IF NOT EXISTS idx_bot_user ON bot_messages(user_id);
    CREATE INDEX IF NOT EXISTS idx_live_patient ON live_messages(patient_id);
  `);
}

function seedDatabase(db) {
  const hash = bcrypt.hashSync('TezcaDemo#2026', 10);
  const expertId = crypto.randomUUID();
  const patientId = crypto.randomUUID();
  const today = new Date().toISOString().slice(0, 10);

  const insUser = db.prepare(
    `INSERT INTO users (id, email, password_hash, role, name) VALUES (?, ?, ?, ?, ?)`,
  );
  const insAssign = db.prepare(`INSERT INTO assignments (expert_id, patient_id) VALUES (?, ?)`);
  const insBmi = db.prepare(
    `INSERT INTO bmi_entries (id, user_id, date, height_cm, weight_kg, bmi) VALUES (?, ?, ?, ?, ?, ?)`,
  );
  const insMood = db.prepare(
    `INSERT INTO mood_entries (id, user_id, date, mood_label, mood_score, note) VALUES (?, ?, ?, ?, ?, ?)`,
  );
  const insBot = db.prepare(
    `INSERT INTO bot_messages (id, user_id, role, content, ts) VALUES (?, ?, ?, ?, ?)`,
  );

  const tx = db.transaction(() => {
    insUser.run(expertId, 'expert@tezca.vn', hash, 'expert', 'BS. Minh Anh');
    insUser.run(patientId, 'patient@tezca.vn', hash, 'user', 'Nguyễn Minh Khang');
    insAssign.run(expertId, patientId);

    const bmis = [
      [addDays(today, -14), 168, 62, round1(62 / (1.68 * 1.68))],
      [addDays(today, -7), 168, 61, round1(61 / (1.68 * 1.68))],
      [today, 168, 60.5, round1(60.5 / (1.68 * 1.68))],
    ];
    for (const [d, h, w, b] of bmis) {
      insBmi.run(crypto.randomUUID(), patientId, d, h, w, b);
    }

    insMood.run(crypto.randomUUID(), patientId, addDays(today, -2), 'Ổn', 4, 'Ngủ đủ 7 tiếng.');
    insMood.run(crypto.randomUUID(), patientId, addDays(today, -1), 'Bình thường', 3, 'Hơi căng vì deadline.');
    insMood.run(crypto.randomUUID(), patientId, today, 'Ổn', 4, '');

    insBot.run(
      crypto.randomUUID(),
      patientId,
      'user',
      'Dạo này em hay mệt buổi chiều.',
      Date.now() - 86400000 * 2,
    );
    insBot.run(
      crypto.randomUUID(),
      patientId,
      'assistant',
      'Bạn có thể thử nghỉ ngắn 10 phút, uống nước và đi bộ nhẹ. Nếu kéo dài, hãy trao đổi với chuyên gia trên Tezca.',
      Date.now() - 86400000 * 2 + 1000,
    );
  });
  tx();
}

function addDays(isoDate, delta) {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

export function findUserByEmail(email) {
  const row = getDb()
    .prepare(
      `SELECT id, email, password_hash AS passwordHash, role, name FROM users WHERE email = ? COLLATE NOCASE`,
    )
    .get(String(email).trim());
  return row || null;
}

export function findUserById(id) {
  const row = getDb()
    .prepare(`SELECT id, email, password_hash AS passwordHash, role, name FROM users WHERE id = ?`)
    .get(id);
  return row || null;
}

export function insertUser(user) {
  getDb()
    .prepare(`INSERT INTO users (id, email, password_hash, role, name) VALUES (?, ?, ?, ?, ?)`)
    .run(user.id, user.email, user.passwordHash, user.role, user.name);
}

export function canExpertAccessPatient(expertId, patientId) {
  const row = getDb()
    .prepare(
      `SELECT 1 AS ok FROM assignments WHERE expert_id = ? AND patient_id = ?`,
    )
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

/** Gán bệnh nhân (role user) cho chuyên gia. Trả { ok, error? } */
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

/** Danh sách chuyên gia đang được gán với bệnh nhân */
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
  const db = getDb();
  db.prepare(`DELETE FROM bmi_entries WHERE user_id = ? AND date = ?`).run(row.userId, row.date);
  db.prepare(
    `INSERT INTO bmi_entries (id, user_id, date, height_cm, weight_kg, bmi) VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(row.id, row.userId, row.date, row.heightCm, row.weightKg, row.bmi);
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
  const db = getDb();
  db.prepare(`DELETE FROM mood_entries WHERE user_id = ? AND date = ?`).run(row.userId, row.date);
  db.prepare(
    `INSERT INTO mood_entries (id, user_id, date, mood_label, mood_score, note) VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(row.id, row.userId, row.date, row.moodLabel, row.moodScore, row.note);
}

export function listBotMessagesForUser(userId) {
  return getDb()
    .prepare(
      `SELECT id, role, content, ts FROM bot_messages WHERE user_id = ? ORDER BY ts ASC`,
    )
    .all(userId);
}

export function replaceBotMessagesForUser(userId, messages) {
  const db = getDb();
  const del = db.prepare(`DELETE FROM bot_messages WHERE user_id = ?`);
  const ins = db.prepare(
    `INSERT INTO bot_messages (id, user_id, role, content, ts) VALUES (?, ?, ?, ?, ?)`,
  );
  const tx = db.transaction(() => {
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
  tx();
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
