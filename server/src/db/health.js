import fs from 'fs';
import { getDb, DB_FILE } from './connection.js';

export function getDatabaseInfo() {
  const db = getDb();
  const tables = db
    .prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`,
    )
    .all()
    .map((r) => r.name);

  const rowCounts = {};
  for (const name of tables) {
    rowCounts[name] = db.prepare(`SELECT COUNT(*) AS c FROM "${name}"`).get().c;
  }

  const migrations = db
    .prepare(`SELECT version, name, applied_at AS appliedAt FROM schema_migrations ORDER BY version`)
    .all();

  return {
    file: DB_FILE,
    exists: fs.existsSync(DB_FILE),
    sizeBytes: fs.existsSync(DB_FILE) ? fs.statSync(DB_FILE).size : 0,
    journalMode: db.pragma('journal_mode', { simple: true }),
    synchronous: db.pragma('synchronous', { simple: true }),
    foreignKeysOn: db.pragma('foreign_keys', { simple: true }) === 1,
    busyTimeoutMs: db.pragma('busy_timeout', { simple: true }),
    tables,
    rowCounts,
    migrations,
  };
}

/** Kiểm tra kết nối + schema + ghi thử (không để lại dữ liệu). */
export function runDatabaseDiagnostics() {
  const report = { ok: true, errors: [], checks: {} };
  const fail = (msg) => {
    report.ok = false;
    report.errors.push(msg);
  };

  try {
    const db = getDb();
    db.prepare('SELECT 1 AS ok').get();

    const integrityRows = db.prepare('PRAGMA integrity_check').all();
    const integrityOk =
      integrityRows.length === 1 && integrityRows[0].integrity_check === 'ok';
    report.checks.integrityCheck = integrityOk ? 'ok' : integrityRows;
    if (!integrityOk) fail('PRAGMA integrity_check failed');

    const info = getDatabaseInfo();
    report.checks = { ...report.checks, ...info };

    const requiredTables = [
      'users',
      'assignments',
      'bmi_entries',
      'mood_entries',
      'bot_messages',
      'live_messages',
      'audit_log',
      'schema_migrations',
      'patient_training_plans',
    ];
    const missing = requiredTables.filter((t) => !info.tables.includes(t));
    if (missing.length) fail(`Missing tables: ${missing.join(', ')}`);

    const latestMigration = info.migrations[info.migrations.length - 1];
    report.checks.latestMigration = latestMigration;
    if (!latestMigration || latestMigration.version < 5) {
      fail('Migrations chưa chạy đủ (cần >= v5 training_plan_indexes)');
    }

    const patient = db
      .prepare(`SELECT id FROM users WHERE role = 'user' LIMIT 1`)
      .get();
    if (patient) {
      const pid = patient.id;
      const hadPlan = db
        .prepare(`SELECT patient_id FROM patient_training_plans WHERE patient_id = ?`)
        .get(pid);

      db.transaction(() => {
        const testDate = '2099-12-31';
        const now = Date.now();
        db.prepare(
          `INSERT INTO patient_training_plans
             (patient_id, source_plan_md, status, exercises_json, daily_progress_json,
              expert_note, integrated_at, updated_at, progress_updated_at)
           VALUES (?, '', 'pending_review', ?, '{}', '', ?, ?, ?)
           ON CONFLICT(patient_id) DO UPDATE SET
             exercises_json = excluded.exercises_json,
             daily_progress_json = '{}',
             updated_at = excluded.updated_at`,
        ).run(
          pid,
          JSON.stringify([
            {
              id: 9001,
              title: 'DB verify',
              sets: 1,
              reps: 1,
              isPTLocked: false,
              completed: false,
              actualWeight: '',
            },
          ]),
          now,
          now,
          now,
        );

        const daily = JSON.stringify({
          [testDate]: { '9001': { completed: true, actualWeight: '10kg' } },
        });
        db.prepare(
          `UPDATE patient_training_plans SET daily_progress_json = ?, progress_updated_at = ? WHERE patient_id = ?`,
        ).run(daily, Date.now(), pid);

        const row = db
          .prepare(`SELECT daily_progress_json FROM patient_training_plans WHERE patient_id = ?`)
          .get(pid);
        const parsed = JSON.parse(row.daily_progress_json || '{}');
        if (!parsed[testDate]?.['9001']?.completed) {
          throw new Error('daily_progress round-trip failed');
        }

        if (!hadPlan) {
          db.prepare(`DELETE FROM patient_training_plans WHERE patient_id = ?`).run(pid);
        } else {
          db.prepare(
            `UPDATE patient_training_plans SET daily_progress_json = '{}' WHERE patient_id = ?`,
          ).run(pid);
        }
      })();
      report.checks.trainingPlanReadWrite = true;
    }
  } catch (e) {
    fail(e instanceof Error ? e.message : String(e));
  }

  return report;
}
