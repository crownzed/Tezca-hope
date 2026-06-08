import { initDb, getDb } from '../src/db/connection.js';
import { runMigrations } from '../src/db/migrate.js';

initDb();
runMigrations(getDb());
const rows = getDb()
  .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'community%'`)
  .all();
console.log(rows.map((r) => r.name).join(', '));
