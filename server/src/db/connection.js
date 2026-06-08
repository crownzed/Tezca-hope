import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
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

/** @type {Database.Database | null} */
let dbInstance = null;

/** @type {object | null} — Turso client instance */
let tursoInstance = null;

/** Flag: đã init chưa */
let initialized = false;

/**
 * Lấy DB instance (better-sqlite3 — sync).
 * @returns {Database.Database}
 */
export function getDb() {
  if (USE_TURSO && tursoInstance) {
    return tursoInstance;
  }
  if (dbInstance) return dbInstance;

  if (process.env.VERCEL && !USE_TURSO) {
    console.warn(
      '[db] ⚠️ Đang chạy trên Vercel với SQLite local (/tmp). ' +
      'Data SẼ MẤT mỗi cold start! ' +
      'Đặt TURSO_DATABASE_URL + TURSO_AUTH_TOKEN để giữ data.'
    );
  }

  fs.mkdirSync(dataDir, { recursive: true });
  dbInstance = new Database(path.join(dataDir, 'tezca.sqlite'));
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');
  dbInstance.pragma('busy_timeout = 5000');
  dbInstance.pragma('synchronous = NORMAL');
  runMigrations(dbInstance);
  const { c } = dbInstance.prepare('SELECT COUNT(*) AS c FROM users').get();
  if (c === 0) seedDatabase(dbInstance);
  return dbInstance;
}

/**
 * Init database — gọi 1 lần khi server start.
 * Hỗ trợ cả Turso (async) và better-sqlite3 (sync).
 */
export async function initDb() {
  if (initialized) return;
  initialized = true;

  if (USE_TURSO) {
    try {
      const { createClient } = await import('@libsql/client');
      tursoInstance = createClient({
        url: TURSO_URL,
        authToken: TURSO_TOKEN,
      });

      // Test connection
      await tursoInstance.execute('SELECT 1');
      console.log('[db] ✅ Turso connected:', TURSO_URL);

      // Run migrations qua Turso
      await runMigrationsAsync(tursoInstance);
      console.log('[db] ✅ Migrations hoàn tất (Turso)');

      // Seed nếu cần
      const countResult = await tursoInstance.execute('SELECT COUNT(*) AS c FROM users');
      if (countResult.rows[0]?.c === 0) {
        console.log('[db] Seeding database...');
        await seedDatabaseAsync(tursoInstance);
      }
    } catch (err) {
      console.error('[db] ❌ Turso init failed:', err.message);
      console.warn('[db] Fallback về better-sqlite3 local.');
      tursoInstance = null;
      getDb();
    }
  } else {
    getDb();
  }
}

/**
 * Chạy migrations cho Turso (async).
 * Đọc migrations từ migrate.js và execute tuần tự.
 */
async function runMigrationsAsync(client) {
  const { getMigrationStatements } = await import('./migrate.js');
  // Tạo bảng migration tracking
  await client.execute(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT DEFAULT (datetime('now'))
    )
  `);

  const statements = getMigrationStatements();
  for (const { name, sql } of statements) {
    const existing = await client.execute({
      sql: 'SELECT id FROM _migrations WHERE name = ?',
      args: [name],
    });
    if (existing.rows.length > 0) continue;

    // Execute migration
    await client.executeMultiple(sql);
    await client.execute({
      sql: 'INSERT INTO _migrations (name) VALUES (?)',
      args: [name],
    });
    console.log(`[db] Migration applied: ${name}`);
  }
}

/**
 * Seed database cho Turso (async).
 */
async function seedDatabaseAsync(client) {
  const { getSeedStatements } = await import('./seed.js');
  const statements = getSeedStatements();
  for (const { sql, args } of statements) {
    await client.execute({ sql, args: args || [] });
  }
}

/** Kiểm tra đang dùng Turso hay không */
export function isUsingTurso() {
  return USE_TURSO && tursoInstance !== null;
}

/** @param {(db: any) => any} fn */
export function runInTransaction(fn) {
  if (USE_TURSO && tursoInstance) {
    // Turso transaction — async
    return tursoInstance.transaction(async (tx) => {
      return fn(tx);
    });
  }
  return getDb().transaction(fn)();
}

export function ensureAdminFromEnv() {
  // Turso: admin seed qua initDb async
  if (USE_TURSO) return;

  const db = getDb();
  const email = process.env.TEZCA_ADMIN_EMAIL?.trim() || DEMO_ADMIN_EMAIL;
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return;

  const pw = process.env.TEZCA_ADMIN_PASSWORD?.trim() || DEMO_PASSWORD;
  db.prepare(
    `INSERT INTO users (id, email, passwordHash, role, name)
     VALUES (?, ?, ?, 'admin', 'Admin')`
  ).run(DEMO_ADMIN_ID, email, bcrypt.hashSync(pw, 10));
}

export function closeDb() {
  if (tursoInstance) {
    tursoInstance.close();
    tursoInstance = null;
  }
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
  initialized = false;
}
