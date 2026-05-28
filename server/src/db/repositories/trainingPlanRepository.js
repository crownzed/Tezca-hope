import { DbError } from '../../dbErrors.js';
import { getDb, runInTransaction } from '../connection.js';
import {
  JSON_LIMITS,
  parseDailyProgressJson,
  parseExercisesJson,
  stringifyJsonColumn,
} from '../jsonStore.js';
import { assertIsoDate, assertNonEmptyId } from '../validators.js';

const MAX_EXERCISES = 20;
const DAILY_HISTORY_DAYS = 120;

const SELECT_PLAN = `
  SELECT patient_id AS patientId,
         source_plan_md AS sourcePlanMd,
         status,
         exercises_json AS exercisesJson,
         COALESCE(daily_progress_json, '{}') AS dailyProgressJson,
         expert_note AS expertNote,
         integrated_at AS integratedAt,
         updated_at AS updatedAt,
         COALESCE(progress_updated_at, updated_at) AS progressUpdatedAt,
         updated_by AS updatedBy
  FROM patient_training_plans
  WHERE patient_id = ?`;

function assertPatientRole(patientId) {
  const id = assertNonEmptyId(patientId, 'patientId');
  const row = getDb()
    .prepare(`SELECT role FROM users WHERE id = ?`)
    .get(id);
  if (!row || row.role !== 'user') {
    throw new DbError('INVALID_PATIENT', 'Tài khoản bệnh nhân không hợp lệ', 400);
  }
  return id;
}

export function structureExercises(list) {
  return (list || []).slice(0, MAX_EXERCISES).map((ex, i) => ({
    id: Number(ex.id) || Date.now() + i,
    title: String(ex.title || 'Bài tập').trim().slice(0, 140),
    sets: Math.max(1, Math.min(20, Number(ex.sets) || 1)),
    reps:
      typeof ex.reps === 'string' || typeof ex.reps === 'number'
        ? String(ex.reps).slice(0, 40)
        : 'Theo kế hoạch',
    isPTLocked: ex.isPTLocked !== false,
    completed: false,
    actualWeight: String(ex.actualWeight || '').slice(0, 24),
  }));
}

function migrateLegacyProgressToDaily(exercises, daily) {
  const today = new Date().toISOString().slice(0, 10);
  if (daily[today]) return daily;
  const hasLegacy = exercises.some((ex) => ex.completed || ex.actualWeight);
  if (!hasLegacy) return daily;
  const day = {};
  for (const ex of exercises) {
    if (ex.completed || ex.actualWeight) {
      day[String(ex.id)] = {
        completed: Boolean(ex.completed),
        actualWeight: String(ex.actualWeight || '').slice(0, 24),
      };
    }
  }
  if (Object.keys(day).length) {
    return { ...daily, [today]: day };
  }
  return daily;
}

function pruneDailyProgress(daily) {
  const dates = Object.keys(daily).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  if (dates.length <= DAILY_HISTORY_DAYS) return daily;
  const keep = new Set(dates.slice(-DAILY_HISTORY_DAYS));
  const out = {};
  for (const d of dates) {
    if (keep.has(d)) out[d] = daily[d];
  }
  return out;
}

function filterDailyToExerciseIds(daily, exerciseIds) {
  const valid = new Set(exerciseIds.map(String));
  const out = {};
  for (const [date, day] of Object.entries(daily || {})) {
    const nextDay = {};
    for (const [id, prog] of Object.entries(day || {})) {
      if (valid.has(id)) nextDay[id] = prog;
    }
    if (Object.keys(nextDay).length) out[date] = nextDay;
  }
  return out;
}

function mapPlanRow(row) {
  if (!row) return null;
  const rawExercises = parseExercisesJson(row.exercisesJson);
  let dailyProgress = parseDailyProgressJson(row.dailyProgressJson);
  dailyProgress = migrateLegacyProgressToDaily(rawExercises, dailyProgress);
  dailyProgress = pruneDailyProgress(dailyProgress);
  return {
    patientId: row.patientId,
    sourcePlanMd: row.sourcePlanMd,
    status: row.status,
    exercises: structureExercises(rawExercises),
    dailyProgress,
    expertNote: row.expertNote,
    integratedAt: row.integratedAt,
    updatedAt: row.updatedAt,
    progressUpdatedAt: row.progressUpdatedAt,
    updatedBy: row.updatedBy,
  };
}

export function getTrainingPlanForPatient(patientId) {
  const id = assertNonEmptyId(patientId, 'patientId');
  const row = getDb().prepare(SELECT_PLAN).get(id);
  return mapPlanRow(row);
}

function insertPlanRow(patientId, fields) {
  const now = Date.now();
  getDb()
    .prepare(
      `INSERT INTO patient_training_plans
         (patient_id, source_plan_md, status, exercises_json, daily_progress_json,
          expert_note, integrated_at, updated_at, progress_updated_at, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      patientId,
      fields.sourcePlanMd ?? '',
      fields.status ?? 'pending_review',
      fields.exercisesJson,
      fields.dailyProgressJson ?? '{}',
      fields.expertNote ?? '',
      fields.integratedAt ?? now,
      fields.updatedAt ?? now,
      fields.progressUpdatedAt ?? 0,
      fields.updatedBy ?? null,
    );
}

function ensureTrainingPlanFromWorkoutInTx(patientId, exercises) {
  const id = assertPatientRole(patientId);
  const existing = getTrainingPlanForPatient(id);
  if (existing) return existing;

  const structured = structureExercises(exercises);
  if (!structured.length) return null;

  const still = getDb().prepare(`SELECT 1 FROM patient_training_plans WHERE patient_id = ?`).get(id);
  if (still) return getTrainingPlanForPatient(id);

  const now = Date.now();
  insertPlanRow(id, {
    sourcePlanMd: '',
    status: 'pending_review',
    exercisesJson: stringifyJsonColumn(structured, JSON_LIMITS.exercises),
    dailyProgressJson: '{}',
    integratedAt: now,
    updatedAt: now,
    progressUpdatedAt: 0,
  });
  return getTrainingPlanForPatient(id);
}

/** Tạo kế hoạch từ dashboard khi chưa có bản AI. */
export function ensureTrainingPlanFromWorkout(patientId, exercises) {
  return runInTransaction(() => ensureTrainingPlanFromWorkoutInTx(patientId, exercises));
}

export function integrateTrainingPlanFromAi(patientId, sourcePlanMd, exercises) {
  const id = assertPatientRole(patientId);
  const structured = structureExercises(exercises);
  const planMd = String(sourcePlanMd || '').slice(0, JSON_LIMITS.sourcePlanMd);
  const exercisesJson = stringifyJsonColumn(structured, JSON_LIMITS.exercises);

  return runInTransaction(() => {
    const existing = getDb().prepare(SELECT_PLAN).get(id);
    const now = Date.now();

    if (!existing) {
      insertPlanRow(id, {
        sourcePlanMd: planMd,
        status: 'pending_review',
        exercisesJson,
        dailyProgressJson: '{}',
        integratedAt: now,
        updatedAt: now,
      });
    } else {
      getDb()
        .prepare(
          `UPDATE patient_training_plans SET
             source_plan_md = ?,
             status = 'pending_review',
             exercises_json = ?,
             integrated_at = ?,
             updated_at = ?,
             updated_by = NULL
           WHERE patient_id = ?`,
        )
        .run(planMd, exercisesJson, now, now, id);
    }
    return getTrainingPlanForPatient(id);
  });
}

export function updateTrainingPlanByExpert(patientId, expertId, { exercises, status, expertNote }) {
  const pid = assertNonEmptyId(patientId, 'patientId');
  const eid = assertNonEmptyId(expertId, 'expertId');

  const existing = getTrainingPlanForPatient(pid);
  if (!existing) return null;

  const expert = getDb().prepare(`SELECT role FROM users WHERE id = ?`).get(eid);
  if (!expert || expert.role !== 'expert') {
    throw new DbError('INVALID_EXPERT', 'Phiên chuyên gia không hợp lệ', 400);
  }

  const nextStatus =
    status === 'approved' || status === 'pending_review' ? status : existing.status;
  const note =
    expertNote !== undefined && expertNote !== null
      ? String(expertNote).slice(0, JSON_LIMITS.expertNote)
      : existing.expertNote;

  const prevById = new Map(existing.exercises.map((ex) => [ex.id, ex]));
  const merged =
    exercises != null
      ? structureExercises(
          exercises.map((ex, i) => ({
            ...ex,
            id: Number(ex.id) || Date.now() + i,
            actualWeight: ex.actualWeight ?? prevById.get(Number(ex.id))?.actualWeight ?? '',
          })),
        )
      : existing.exercises;

  const dailyProgress = filterDailyToExerciseIds(
    existing.dailyProgress,
    merged.map((ex) => ex.id),
  );

  const now = Date.now();

  return runInTransaction(() => {
    getDb()
      .prepare(
        `UPDATE patient_training_plans SET
           exercises_json = ?,
           daily_progress_json = ?,
           status = ?,
           expert_note = ?,
           updated_at = ?,
           updated_by = ?
         WHERE patient_id = ?`,
      )
      .run(
        stringifyJsonColumn(merged, JSON_LIMITS.exercises),
        stringifyJsonColumn(dailyProgress, JSON_LIMITS.dailyProgress),
        nextStatus,
        note,
        now,
        eid,
        pid,
      );
    return getTrainingPlanForPatient(pid);
  });
}

export function syncTrainingPlanProgress(patientId, dateIso, items, bootstrapWorkout) {
  const pid = assertPatientRole(patientId);
  const date = assertIsoDate(dateIso);

  const patchById = new Map(
    (items || []).slice(0, MAX_EXERCISES).map((item) => [
      Number(item.id),
      {
        completed: item.completed,
        actualWeight: item.actualWeight,
      },
    ]),
  );
  if ([...patchById.keys()].some((id) => !id)) {
    throw new DbError('INVALID_EXERCISE', 'Mỗi bài tập cần id hợp lệ', 400);
  }

  return runInTransaction(() => {
    let existing = getTrainingPlanForPatient(pid);
    if (!existing) {
      existing = ensureTrainingPlanFromWorkoutInTx(pid, bootstrapWorkout);
      if (!existing) return null;
    }

    const dailyProgress = { ...(existing.dailyProgress || {}) };
    const day = { ...(dailyProgress[date] || {}) };

    for (const ex of existing.exercises) {
      const patch = patchById.get(ex.id);
      if (!patch) continue;
      day[String(ex.id)] = {
        completed: patch.completed !== undefined ? Boolean(patch.completed) : false,
        actualWeight:
          patch.actualWeight !== undefined
            ? String(patch.actualWeight).slice(0, 24)
            : (day[String(ex.id)]?.actualWeight ?? ''),
      };
    }
    dailyProgress[date] = day;

    const pruned = pruneDailyProgress(dailyProgress);
    const now = Date.now();

    getDb()
      .prepare(
        `UPDATE patient_training_plans SET
           daily_progress_json = ?,
           progress_updated_at = ?,
           updated_at = ?
         WHERE patient_id = ?`,
      )
      .run(
        stringifyJsonColumn(pruned, JSON_LIMITS.dailyProgress),
        now,
        now,
        pid,
      );

    return getTrainingPlanForPatient(pid);
  });
}
