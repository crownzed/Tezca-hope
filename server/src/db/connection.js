import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import { runMigrations } from './migrate.js';
import { seedDatabase } from './seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir =
  process.env.DATA_DIR ||
  (process.env.VERCEL ? '/tmp/tezca-data' : path.join(__dirname, '..', '..', 'data'));

export const DB_FILE = path.join(dataDir, 'tezca.sqlite');

export const DEMO_EXPERT_ID = 'tezca-demo-expert-0001';
export const DEMO_PATIENT_ID = 'tezca-demo-patient-0001';

/** @type {Database.Database | null} */
let dbInstance = null;

/**
 * @returns {Database.Database}
 */
export function getDb() {
  if (dbInstance) return dbInstance;
  fs.mkdirSync(dataDir, { recursive: true });
  dbInstance = new Database(DB_FILE);
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');
  dbInstance.pragma('busy_timeout = 5000');
  dbInstance.pragma('synchronous = NORMAL');
  runMigrations(dbInstance);
  const { c } = dbInstance.prepare('SELECT COUNT(*) AS c FROM users').get();
  if (c === 0) seedDatabase(dbInstance);
  return dbInstance;
}

export function initDb() {
  getDb();
}

/** @param {() => void} fn */
export function runInTransaction(fn) {
  return getDb().transaction(fn)();
}

export function closeDb() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
