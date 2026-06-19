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
  day?: number | null;
  group?: string | null;
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

/**
 * Guest: dùng sessionStorage (refresh = xóa sạch, dữ liệu trắng)
 * Logged in: dùng localStorage (cache) + Firebase sync
 */
function getStorage(userId: string | null): Storage {
  return userId ? localStorage : sessionStorage;
}

function readJson<T>(k: string, fallback: T, userId: string | null = null): T {
  try {
    const storage = getStorage(userId);
    const raw = storage.getItem(k);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(k: string, value: unknown, userId: string | null = null) {
  const storage = getStorage(userId);
  storage.setItem(k, JSON.stringify(value));
}

export function loadDashboardExercises(userId: string | null): DashboardExercise[] {
  const list = readJson<DashboardExercise[]>(key('tezca_dashboard_exercises_v1', userId), [], userId);
  // Guest: luôn trả về trắng (không có dữ liệu mặc định)
  if (!userId) {
    return list.length > 0 ? stripExerciseProgress(list) : [];
  }
  const base = list.length > 0 ? list : DEFAULT_EXERCISES.map((e) => ({ ...e }));
  return stripExerciseProgress(base);
}

export function loadDailyProgressLocal(userId: string | null): DailyProgressMap {
  return readJson<DailyProgressMap>(key('tezca_dashboard_daily_v1', userId), {}, userId);
}

export function saveDailyProgressLocal(userId: string | null, map: DailyProgressMap) {
  writeJson(key('tezca_dashboard_daily_v1', userId), map, userId);
}

export function saveDashboardExercises(userId: string | null, exercises: DashboardExercise[]) {
  writeJson(key('tezca_dashboard_exercises_v1', userId), exercises, userId);
}

/** Cấu trúc bài tập (không lưu completed theo ngày — dùng trainingDayProgress). */
export function stripExerciseProgress(exercises: DashboardExercise[]): DashboardExercise[] {
  return exercises.map((ex) => ({ ...ex, completed: false }));
}

export function loadFoodLog(userId: string | null): FoodLogItem[] {
  // Guest: trả về mảng rỗng (dữ liệu trắng)
  const fallback = userId ? defaultFoodLogSeed() : [];
  const raw = readJson<FoodLogItem[]>(key('tezca_dashboard_food_v1', userId), fallback, userId);
  return normalizeFoodLog(raw);
}

export function saveFoodLog(userId: string | null, log: FoodLogItem[]) {
  writeJson(key('tezca_dashboard_food_v1', userId), normalizeFoodLog(log), userId);
}
