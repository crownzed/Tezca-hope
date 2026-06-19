import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import BetterSqlite3 from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { loadEnv } from '../loadEnv.js';
import { runMigrations } from './migrate.js';
import { seedDatabase } from './seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

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

let envLoaded = false;

function ensureEnvLoaded() {
  if (envLoaded) return;
  loadEnv();
  envLoaded = true;
}

function resolveDbConfig() {
  ensureEnvLoaded();
  const tursoUrl = process.env.TURSO_DATABASE_URL?.trim();
  const tursoToken = process.env.TURSO_AUTH_TOKEN?.trim();
  const useTurso = Boolean(tursoUrl && tursoToken);
  const dataDir =
    process.env.DATA_DIR ||
    (process.env.VERCEL ? '/tmp/tezca-data' : path.join(__dirname, '..', '..', 'data'));
  const dbFile = useTurso ? tursoUrl : path.join(dataDir, 'tezca.sqlite');
  DB_FILE = dbFile;
  return { tursoUrl, tursoToken, useTurso, dataDir, dbFile };
}

function loadLibsqlDatabase() {
  try {
    const mod = require('libsql');
    return mod.default || mod.Database || mod;
  } catch (err) {
    throw new Error(
      '[db] TURSO_DATABASE_URL/TURSO_AUTH_TOKEN đã được set nhưng package libsql chưa được cài. Chạy: cd server && npm install',
    );
  }
}

export let DB_FILE = path.join(__dirname, '..', '..', 'data', 'tezca.sqlite');

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

  const { tursoUrl, tursoToken, useTurso, dataDir } = resolveDbConfig();

  if (useTurso) {
    // libsql: sync API tương thích better-sqlite3, data sync lên Turso
    const LibsqlDatabase = loadLibsqlDatabase();
    const syncDir = process.env.VERCEL ? '/tmp/tezca-data' : dataDir;
    fs.mkdirSync(syncDir, { recursive: true });
    const localPath = path.join(syncDir, 'tezca.sqlite');
    dbInstance = new LibsqlDatabase(localPath, {
      syncUrl: tursoUrl,
      authToken: tursoToken,
      // Tự pull thay đổi từ remote về replica mỗi 60s (cho instance warm).
      syncInterval: 60,
    });
    dbInstance.pragma('journal_mode = WAL');
    dbInstance.pragma('foreign_keys = ON');
    dbInstance.pragma('busy_timeout = 5000');
    dbInstance.pragma('synchronous = NORMAL');
    // Sync từ remote về local
    dbInstance.sync();
    console.log('[db] ✅ libsql connected (sync mode):', tursoUrl);
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
  if (useTurso && dbInstance.sync) {
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
  return resolveDbConfig().useTurso;
}

let lastSyncAt = 0;
const SYNC_THROTTLE_MS = 2000;

/**
 * Pull thay đổi mới nhất từ remote Turso về replica cục bộ.
 *
 * Lý do cần thiết: trên serverless (Vercel) mỗi instance giữ một bản replica
 * riêng, chỉ được sync() một lần lúc cold start. Writes luôn đẩy thẳng lên
 * remote primary, nhưng instance KHÁC sẽ không thấy dữ liệu mới (vd: bài
 * cộng đồng vừa đăng) cho tới khi nó sync lại — gây cảm giác "không lưu được".
 * Gọi hàm này trước các read để đọc dữ liệu mới, có throttle để tránh sync
 * quá dày (mỗi request một round-trip mạng).
 *
 * No-op khi dùng better-sqlite3 local (đã là nguồn sự thật duy nhất).
 * @param {{ force?: boolean }} [opts]
 */
export function maybeSync({ force = false } = {}) {
  if (!isUsingTurso() || !dbInstance || typeof dbInstance.sync !== 'function') return;
  const now = Date.now();
  if (!force && now - lastSyncAt < SYNC_THROTTLE_MS) return;
  lastSyncAt = now;
  try {
    dbInstance.sync();
  } catch (err) {
    console.warn('[db] sync failed:', err instanceof Error ? err.message : err);
  }
}

/** @param {(db: any) => any} fn */
export function runInTransaction(fn) {
  return getDb().transaction(fn)();
}

export function ensureAdminFromEnv() {
  const db = getDb();
  const email = (process.env.TEZCA_ADMIN_EMAIL || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const pw = (process.env.TEZCA_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || '').trim();
  if (!email || !pw) return;

  const existing = db.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE').get(email);
  const id = existing?.id || crypto.randomUUID();
  if (!existing) {
    const name = String(process.env.TEZCA_ADMIN_NAME || 'Admin').trim().slice(0, 120);
    db.prepare(
      `INSERT INTO users (id, email, password_hash, role, name, created_at)
       VALUES (?, ?, ?, 'admin', ?, ?)`,
    ).run(id, email, bcrypt.hashSync(pw, 10), name, Date.now());
  }
  db.prepare(
    `INSERT OR IGNORE INTO user_role_grants (user_id, role, created_at) VALUES (?, 'admin', ?)`,
  ).run(id, Date.now());
}

export function closeDb() {
  if (dbInstance) {
    // libsql: sync lên remote trước khi đóng
    if (isUsingTurso() && dbInstance.sync) {
      try { dbInstance.sync(); } catch {}
    }
    dbInstance.close();
    dbInstance = null;
  }
  initialized = false;
}
