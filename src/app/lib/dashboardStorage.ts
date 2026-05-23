import type { DailyProgressMap } from './trainingDayProgress';
import {
  defaultFoodLogSeed,
  normalizeFoodLog,
  type FoodLogItem,
  type NutritionTotals,
} from './nutritionEngine';

export type { FoodLogItem, NutritionTotals } from './nutritionEngine';
export {
  analyzeFoodInput,
  estimateFromMeatId,
  estimateMacrosFromInput,
  foodLogForDay,
  MEAT_CATALOG,
  MEAT_CATALOG_GROUPS,
  resolveDailyNutritionTargets,
  sumNutrition,
  todayIsoLocal,
  nutritionProgressPct,
  type FoodEstimateResult,
  type MeatPickOption,
  type MeatCatalogGroup,
} from './nutritionEngine';

export type DashboardExercise = {
  id: number;
  title: string;
  sets: number;
  reps: number | string;
  isPTLocked: boolean;
  completed: boolean;
  actualWeight: string;
};

const DEFAULT_EXERCISES: DashboardExercise[] = [
  { id: 1, title: 'Squat với Tạ Đòn', sets: 4, reps: 8, isPTLocked: true, completed: false, actualWeight: '80kg' },
  { id: 2, title: 'Romanian Deadlift', sets: 3, reps: 10, isPTLocked: true, completed: false, actualWeight: '' },
  { id: 3, title: 'Hip Thrust', sets: 3, reps: 12, isPTLocked: true, completed: false, actualWeight: '' },
  {
    id: 4,
    title: 'Đi bộ trên dốc (Cardio)',
    sets: 1,
    reps: '15 phút',
    isPTLocked: false,
    completed: false,
    actualWeight: 'Bodyweight',
  },
];

function key(base: string, userId: string | null) {
  return userId ? `${base}_${userId}` : `${base}_guest`;
}

function readJson<T>(k: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(k);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(k: string, value: unknown) {
  localStorage.setItem(k, JSON.stringify(value));
}

export function loadDashboardExercises(userId: string | null): DashboardExercise[] {
  const list = readJson<DashboardExercise[]>(key('tezca_dashboard_exercises_v1', userId), []);
  const base = list.length > 0 ? list : DEFAULT_EXERCISES.map((e) => ({ ...e }));
  return stripExerciseProgress(base);
}

export function loadDailyProgressLocal(userId: string | null): DailyProgressMap {
  return readJson<DailyProgressMap>(key('tezca_dashboard_daily_v1', userId), {});
}

export function saveDailyProgressLocal(userId: string | null, map: DailyProgressMap) {
  writeJson(key('tezca_dashboard_daily_v1', userId), map);
}

export function saveDashboardExercises(userId: string | null, exercises: DashboardExercise[]) {
  writeJson(key('tezca_dashboard_exercises_v1', userId), exercises);
}

/** Cấu trúc bài tập (không lưu completed theo ngày — dùng trainingDayProgress). */
export function stripExerciseProgress(exercises: DashboardExercise[]): DashboardExercise[] {
  return exercises.map((ex) => ({ ...ex, completed: false }));
}

export function loadFoodLog(userId: string | null): FoodLogItem[] {
  const raw = readJson<FoodLogItem[]>(key('tezca_dashboard_food_v1', userId), defaultFoodLogSeed());
  return normalizeFoodLog(raw);
}

export function saveFoodLog(userId: string | null, log: FoodLogItem[]) {
  writeJson(key('tezca_dashboard_food_v1', userId), normalizeFoodLog(log));
}
