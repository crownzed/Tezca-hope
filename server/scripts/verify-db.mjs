/**
 * Kiểm tra kết nối SQLite: file, schema, PRAGMA, seed, training plan, giao dịch ghi.
 * Chạy: npm run verify:db   (từ thư mục server)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.chdir(path.join(__dirname, '..'));

const {
  initDb,
  getDb,
  DB_FILE,
  findUserByEmail,
  listBmiForUser,
  canExpertAccessPatient,
  runDatabaseDiagnostics,
  getTrainingPlanForPatient,
  syncTrainingPlanProgress,
  ensureTrainingPlanFromWorkout,
} = await import('../src/db.js');

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
    if (bmi.length < 1) fail('Seed BMI trống cho patient@');

    getDb().prepare(`DELETE FROM patient_training_plans WHERE patient_id = ?`).run(patient.id);

    const testDate = '2098-06-15';
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

    const reloaded = getTrainingPlanForPatient(patient.id);
    report.checks.trainingPlanReloaded = Boolean(reloaded?.patientId);
    report.checks.trainingDailyKeys = Object.keys(reloaded?.dailyProgress || {}).length;

    const daily = { ...(reloaded.dailyProgress || {}) };
    delete daily[testDate];
    getDb()
      .prepare(`UPDATE patient_training_plans SET daily_progress_json = ? WHERE patient_id = ?`)
      .run(JSON.stringify(daily), patient.id);
    report.checks.trainingCleanup = true;
  }
} catch (e) {
  fail(e instanceof Error ? e.message : String(e));
}

console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
