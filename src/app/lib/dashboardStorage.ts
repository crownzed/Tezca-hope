import type { DailyProgressMap } from './trainingDayProgress';

export type DashboardExercise = {
  id: number;
  title: string;
  sets: number;
  reps: number | string;
  isPTLocked: boolean;
  completed: boolean;
  actualWeight: string;
};

export type FoodLogItem = {
  id: number;
  name: string;
  pro: number;
  carb: number;
  cal: number;
};

export type NutritionTotals = {
  pro: number;
  carb: number;
  cal: number;
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

const TARGET_NUTRITION: NutritionTotals = { pro: 160, carb: 250, cal: 2200 };

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
  return readJson<FoodLogItem[]>(key('tezca_dashboard_food_v1', userId), [
    { id: 1, name: 'Phở bò (sáng)', pro: 25, carb: 45, cal: 350 },
  ]);
}

export function saveFoodLog(userId: string | null, log: FoodLogItem[]) {
  writeJson(key('tezca_dashboard_food_v1', userId), log);
}

export function sumNutrition(log: FoodLogItem[]): NutritionTotals {
  return log.reduce(
    (acc, f) => ({
      pro: acc.pro + f.pro,
      carb: acc.carb + f.carb,
      cal: acc.cal + f.cal,
    }),
    { pro: 0, carb: 0, cal: 0 },
  );
}

export function getTargetNutrition(): NutritionTotals {
  return { ...TARGET_NUTRITION };
}

export function estimateMacrosFromInput(input: string): NutritionTotals {
  const text = input.toLowerCase();
  if (
    text.includes('gà') ||
    text.includes('bò') ||
    text.includes('trứng') ||
    text.includes('whey') ||
    text.includes('cá') ||
    text.includes('thịt')
  ) {
    return { pro: 30, carb: 5, cal: 220 };
  }
  if (text.includes('cơm') || text.includes('phở') || text.includes('bánh') || text.includes('mì')) {
    return { pro: 8, carb: 55, cal: 400 };
  }
  if (text.includes('rau') || text.includes('salad') || text.includes('trái cây')) {
    return { pro: 2, carb: 15, cal: 80 };
  }
  return { pro: 5, carb: 20, cal: 150 };
}
