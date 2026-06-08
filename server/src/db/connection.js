import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import BetterSqlite3 from 'better-sqlite3';
import LibsqlDatabase from 'libsql';
import bcrypt from 'bcryptjs';
import { runMigrations } from './migrate.js';
import { seedDatabase } from './seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Database connection — hỗ trợ 2 backend:
 *
 * 1. better-sqlite3 (local/Docker/VPS) — sync, file-based
 * 2. Turso/LibSQL (Vercel/serverless) — persistent cloud SQLite
 *
 * Ưu tiên:
 * - Nếu có TURSO_DATABASE_URL + TURSO_AUTH_TOKEN → dùng Turso (data persistent)
 * - Nếu không → better-sqlite3 local file
 *
 * ⚠️ Vercel + better-sqlite3 = data mất mỗi cold start!
 * Luôn set TURSO env khi deploy Vercel production.
 */

const TURSO_URL = process.env.TURSO_DATABASE_URL?.trim();
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN?.trim();
const USE_TURSO = Boolean(TURSO_URL && TURSO_TOKEN);

const dataDir =
  process.env.DATA_DIR ||
  (process.env.VERCEL ? '/tmp/tezca-data' : path.join(__dirname, '..', '..', 'data'));

export const DB_FILE = USE_TURSO ? TURSO_URL : path.join(dataDir, 'tezca.sqlite');

export const DEMO_EXPERT_ID = 'tezca-demo-expert-0001';
export const DEMO_CUSTOMER_ID = 'tezca-demo-patient-0001';
export const DEMO_ADMIN_ID = 'tezca-demo-admin-0001';
/** @deprecated */ export const DEMO_PATIENT_ID = DEMO_CUSTOMER_ID;

export const DEMO_PASSWORD = 'Tezca@2025';
export const DEMO_ADMIN_EMAIL = 'admin@tezca.vn';

/** @type {import('better-sqlite3').Database | import('libsql').Database | null} */
let dbInstance = null;

/** Flag: đã init chưa */
let initialized = false;

/**
 * Lấy DB instance (better-sqlite3 hoặc libsql — sync API).
 * @returns {import('better-sqlite3').Database}
 */
export function getDb() {
  if (dbInstance) return dbInstance;

  if (USE_TURSO) {
    // libsql: sync API tương thích better-sqlite3, data sync lên Turso
    const syncDir = process.env.VERCEL ? '/tmp/tezca-data' : dataDir;
    fs.mkdirSync(syncDir, { recursive: true });
    const localPath = path.join(syncDir, 'tezca.sqlite');
    dbInstance = new LibsqlDatabase(localPath, {
      syncUrl: TURSO_URL,
      authToken: TURSO_TOKEN,
    });
    dbInstance.pragma('journal_mode = WAL');
    dbInstance.pragma('foreign_keys = ON');
    dbInstance.pragma('busy_timeout = 5000');
    dbInstance.pragma('synchronous = NORMAL');
    // Sync từ remote về local
    dbInstance.sync();
    console.log('[db] ✅ libsql connected (sync mode):', TURSO_URL);
  } else {
    if (process.env.VERCEL) {
      console.warn(
        '[db] ⚠️ Đang chạy trên Vercel với SQLite local (/tmp). ' +
        'Data SẼ MẤT mỗi cold start! ' +
        'Đặt TURSO_DATABASE_URL + TURSO_AUTH_TOKEN để giữ data.'
      );
    }
    fs.mkdirSync(dataDir, { recursive: true });
    dbInstance = new BetterSqlite3(path.join(dataDir, 'tezca.sqlite'));
    dbInstance.pragma('journal_mode = WAL');
    dbInstance.pragma('foreign_keys = ON');
    dbInstance.pragma('busy_timeout = 5000');
    dbInstance.pragma('synchronous = NORMAL');
  }

  runMigrations(dbInstance);
  const { c } = dbInstance.prepare('SELECT COUNT(*) AS c FROM users').get();
  if (c === 0) seedDatabase(dbInstance);

  // Sync lại sau khi seed/migrate
  if (USE_TURSO && dbInstance.sync) {
    dbInstance.sync();
  }

  return dbInstance;
}

/**
 * Init database — gọi 1 lần khi server start.
 * Giờ chỉ cần gọi getDb() vì libsql xử lý sync.
 */
export async function initDb() {
  if (initialized) return;
  initialized = true;
  getDb();
}

/** Kiểm tra đang dùng Turso hay không */
export function isUsingTurso() {
  return USE_TURSO;
}

/** @param {(db: any) => any} fn */
export function runInTransaction(fn) {
  return getDb().transaction(fn)();
}

export function ensureAdminFromEnv() {
  const db = getDb();
  const email = process.env.TEZCA_ADMIN_EMAIL?.trim() || DEMO_ADMIN_EMAIL;
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return;

  const pw = process.env.TEZCA_ADMIN_PASSWORD?.trim() || DEMO_PASSWORD;
  db.prepare(
    `INSERT INTO users (id, email, password_hash, role, name, created_at)
     VALUES (?, ?, ?, 'admin', 'Admin', ?)`
  ).run(DEMO_ADMIN_ID, email, bcrypt.hashSync(pw, 10), Date.now());
}

export function closeDb() {
  if (dbInstance) {
    // libsql: sync lên remote trước khi đóng
    if (USE_TURSO && dbInstance.sync) {
      try { dbInstance.sync(); } catch {}
    }
    dbInstance.close();
    dbInstance = null;
  }
  initialized = false;
}
