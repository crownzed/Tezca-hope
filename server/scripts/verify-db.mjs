/**
 * Kiểm tra kết nối SQLite: file, schema, PRAGMA, seed, training plan, giao dịch ghi.
 * Chạy: npm run verify:db   (từ thư mục server)
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.chdir(path.join(__dirname, '..'));

const dbModule = await import('../src/db.js');
const {
  initDb,
  getDb,
  findUserByEmail,
  listBmiForUser,
  upsertBmiEntry,
  canExpertAccessPatient,
  runDatabaseDiagnostics,
  getTrainingPlanForCustomer,
  syncTrainingPlanProgress,
  ensureTrainingPlanFromWorkout,
} = dbModule;

const report = { ok: true, errors: [], checks: {} };

function fail(msg) {
  report.ok = false;
  report.errors.push(msg);
}

try {
  initDb();
  const db = getDb();

  report.checks.dbFile = dbModule.DB_FILE;
  report.checks.fileExists = fs.existsSync(dbModule.DB_FILE);
  report.checks.fileSizeBytes = report.checks.fileExists ? fs.statSync(dbModule.DB_FILE).size : 0;

  const deep = runDatabaseDiagnostics();
  report.checks.diagnostics = deep.checks;
  if (!deep.ok) {
    for (const e of deep.errors) fail(e);
  }

  const expert = findUserByEmail('expert@tezca.vn');
  const patient = findUserByEmail('patient@tezca.vn');
  report.checks.seedExpert = !!expert;
  report.checks.seedPatient = !!patient;
  if (!expert || !patient) fail('Thiếu user seed expert@ / patient@');

  if (expert && patient) {
    if (!canExpertAccessPatient(expert.id, patient.id)) {
      fail('Assignment expert–patient seed không đúng');
    }
    const bmi = listBmiForUser(patient.id);
    report.checks.patientBmiRows = bmi.length;
    if (bmi.length < 1) {
      const testBmiDate = '2098-06-14';
      upsertBmiEntry({
        id: crypto.randomUUID(),
        userId: patient.id,
        date: testBmiDate,
        heightCm: 168,
        weightKg: 61,
        bmi: 21.6,
      });
      const roundTrip = listBmiForUser(patient.id).some((e) => e.date === testBmiDate && e.bmi === 21.6);
      if (!roundTrip) fail('BMI round-trip failed');
      getDb().prepare(`DELETE FROM bmi_entries WHERE user_id = ? AND date = ?`).run(patient.id, testBmiDate);
    }
    report.checks.bmiRoundTrip = true;

    const existingPlan = getDb()
      .prepare(`SELECT * FROM patient_training_plans WHERE patient_id = ?`)
      .get(patient.id);

    const testDate = '2098-06-15';
    try {
      getDb().prepare(`DELETE FROM patient_training_plans WHERE patient_id = ?`).run(patient.id);

      const plan = ensureTrainingPlanFromWorkout(patient.id, [
        {
          id: 88001,
          title: 'Verify squat',
          sets: 3,
          reps: 8,
          isPTLocked: true,
          completed: false,
          actualWeight: '60kg',
        },
      ]);
      if (!plan?.exercises?.length) fail('ensureTrainingPlanFromWorkout failed');

      if (plan?.exercises?.length) {
        const synced = syncTrainingPlanProgress(
          patient.id,
          testDate,
          [{ id: 88001, completed: true, actualWeight: '62kg' }],
          plan.exercises,
        );
        const dayEntry = synced?.dailyProgress?.[testDate];
        const done =
          dayEntry?.['88001']?.completed === true || dayEntry?.[88001]?.completed === true;
        if (!done) {
          fail('syncTrainingPlanProgress daily round-trip failed');
        }
      }

      const reloaded = getTrainingPlanForCustomer(patient.id);
      report.checks.trainingPlanReloaded = Boolean(reloaded?.customerId);
      report.checks.trainingDailyKeys = Object.keys(reloaded?.dailyProgress || {}).length;
    } finally {
      if (existingPlan) {
        getDb()
          .prepare(
            `INSERT OR REPLACE INTO patient_training_plans
               (patient_id, source_plan_md, status, exercises_json, daily_progress_json,
                expert_note, integrated_at, updated_at, progress_updated_at, updated_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            existingPlan.patient_id,
            existingPlan.source_plan_md,
            existingPlan.status,
            existingPlan.exercises_json,
            existingPlan.daily_progress_json,
            existingPlan.expert_note,
            existingPlan.integrated_at,
            existingPlan.updated_at,
            existingPlan.progress_updated_at,
            existingPlan.updated_by,
          );
      } else {
        getDb().prepare(`DELETE FROM patient_training_plans WHERE patient_id = ?`).run(patient.id);
      }
      report.checks.trainingCleanup = true;
    }
  }
} catch (e) {
  fail(e instanceof Error ? e.message : String(e));
}

console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
