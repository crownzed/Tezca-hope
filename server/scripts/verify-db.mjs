/**
 * Kiểm tra kết nối SQLite: file, schema, PRAGMA, seed, truy vấn mẫu.
 * Chạy: node scripts/verify-db.mjs   (từ thư mục server)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.chdir(path.join(__dirname, '..'));

const { initDb, getDb, DB_FILE, findUserByEmail, listBmiForUser, canExpertAccessPatient } =
  await import('../src/db.js');

const report = { ok: true, errors: [], checks: {} };

function fail(msg) {
  report.ok = false;
  report.errors.push(msg);
}

try {
  initDb();
  const db = getDb();

  report.checks.dbFile = DB_FILE;
  report.checks.fileExists = fs.existsSync(DB_FILE);
  report.checks.fileSizeBytes = report.checks.fileExists ? fs.statSync(DB_FILE).size : 0;

  const journal = db.pragma('journal_mode', { simple: true });
  report.checks.journalMode = journal;

  db.pragma('foreign_keys = ON');
  report.checks.foreignKeysOn = db.pragma('foreign_keys', { simple: true }) === 1;

  const integrityRows = db.prepare('PRAGMA integrity_check').all();
  const integrityOk =
    integrityRows.length === 1 && integrityRows[0].integrity_check === 'ok';
  report.checks.integrityCheck = integrityOk ? 'ok' : integrityRows;

  if (!integrityOk) fail('PRAGMA integrity_check không phải ok');

  const tables = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`)
    .all()
    .map((r) => r.name);

  const expected = [
    'assignments',
    'audit_log',
    'bmi_entries',
    'bot_messages',
    'live_messages',
    'mood_entries',
    'schema_migrations',
    'users',
  ];
  const missing = expected.filter((t) => !tables.includes(t));
  report.checks.tablesFound = tables;
  report.checks.tablesExpected = expected;
  if (missing.length) fail(`Thiếu bảng: ${missing.join(', ')}`);

  const counts = {};
  for (const name of tables) {
    counts[name] = db.prepare(`SELECT COUNT(*) AS c FROM "${name}"`).get().c;
  }
  report.checks.rowCounts = counts;

  if (counts.users < 1) fail('Bảng users rỗng (seed có thể lỗi)');

  const expert = findUserByEmail('expert@tezca.vn');
  const patient = findUserByEmail('patient@tezca.vn');
  report.checks.seedExpert = !!expert;
  report.checks.seedPatient = !!patient;
  if (!expert || !patient) fail('Thiếu user seed expert@ / patient@');

  if (expert && patient) {
    const canSee = canExpertAccessPatient(expert.id, patient.id);
    report.checks.expertCanAccessSeedPatient = canSee;
    if (!canSee) fail('Assignment expert–patient seed không đúng');

    const bmi = listBmiForUser(patient.id);
    report.checks.patientBmiRows = bmi.length;
    if (bmi.length < 1) fail('Seed BMI trống cho patient@');

    const writeTest = db.transaction(() => {
      const id = crypto.randomUUID();
      db.prepare(
        `INSERT INTO bmi_entries (id, user_id, date, height_cm, weight_kg, bmi) VALUES (?, ?, '2099-01-01', 170, 70, 24.2)`,
      ).run(id, patient.id);
      db.prepare(`DELETE FROM bmi_entries WHERE id = ?`).run(id);
    });
    writeTest();
    report.checks.readWriteTransaction = true;
  }
} catch (e) {
  fail(String(e));
}

console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
