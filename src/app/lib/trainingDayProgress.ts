import type { DashboardExercise } from './dashboardStorage';

export type DayExerciseProgress = {
  completed: boolean;
  actualWeight: string;
};

/** ISO date (YYYY-MM-DD) → exercise id → tiến độ */
export type DailyProgressMap = Record<string, Record<number, DayExerciseProgress>>;

export type WeekDayChip = {
  id: number;
  label: string;
  date: string;
  isoDate: string;
  isToday: boolean;
};

function toLocalIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function buildWeekDaysWithIso(): WeekDayChip[] {
  const today = new Date();
  const dow = today.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  const labels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const ids = [1, 2, 3, 4, 5, 6, 0];
  return ids.map((id, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      id,
      label: labels[i]!,
      date: String(d.getDate()),
      isoDate: toLocalIsoDate(d),
      isToday: d.toDateString() === today.toDateString(),
    };
  });
}

export function isoDateForWeekDayId(weekDayId: number, weekDays: WeekDayChip[]): string {
  return weekDays.find((d) => d.id === weekDayId)?.isoDate ?? new Date().toISOString().slice(0, 10);
}

/**
 * "Ngày N" trong kế hoạch AI (1..7) map theo thứ tự tuần:
 * Ngày 1 = chip đầu tiên (T2) ... Ngày 7 = CN.
 * @returns chỉ số 1-based của ngày trong tuần, hoặc null nếu không khớp.
 */
export function planDayForIso(isoDate: string, weekDays: WeekDayChip[]): number | null {
  const idx = weekDays.findIndex((d) => d.isoDate === isoDate);
  return idx === -1 ? null : idx + 1;
}

/**
 * Lọc bài tập thuộc về một ngày kế hoạch cụ thể.
 * - Bài có `day` khớp → hiển thị đúng ngày đó.
 * - Bài không gắn ngày (`day` null/undefined) → hiển thị mọi ngày (bài chung).
 * - Nếu kế hoạch KHÔNG có bài nào gắn ngày (legacy/phẳng) → trả toàn bộ cho mọi ngày.
 */
export function exercisesForPlanDay(
  base: DashboardExercise[],
  planDay: number | null,
): DashboardExercise[] {
  const anyTagged = base.some((ex) => ex.day != null);
  if (!anyTagged || planDay == null) return base;
  return base.filter((ex) => ex.day == null || ex.day === planDay);
}

export function countDayDone(
  base: DashboardExercise[],
  day?: Record<number, DayExerciseProgress>,
): { done: number; total: number } {
  const total = base.length;
  if (!total) return { done: 0, total: 0 };
  const done = base.filter((ex) => Boolean(day?.[ex.id]?.completed)).length;
  return { done, total };
}

export function applyDayProgress(
  base: DashboardExercise[],
  day?: Record<number, DayExerciseProgress>,
): DashboardExercise[] {
  if (!day) {
    return base.map((ex) => ({ ...ex, completed: false }));
  }
  return base.map((ex) => {
    const p = day[ex.id];
    if (!p) return { ...ex, completed: false };
    return {
      ...ex,
      completed: Boolean(p.completed),
      actualWeight: p.actualWeight ?? ex.actualWeight,
    };
  });
}

export function extractDayProgress(exercises: DashboardExercise[]): Record<number, DayExerciseProgress> {
  const day: Record<number, DayExerciseProgress> = {};
  for (const ex of exercises) {
    day[ex.id] = {
      completed: ex.completed,
      actualWeight: ex.actualWeight,
    };
  }
  return day;
}

/** Chuẩn hóa từ API (key string) → key number */
export function normalizeDailyProgressFromApi(
  raw: Record<string, Record<string, DayExerciseProgress>> | undefined,
): DailyProgressMap {
  if (!raw) return {};
  const out: DailyProgressMap = {};
  for (const [date, byId] of Object.entries(raw)) {
    const day: Record<number, DayExerciseProgress> = {};
    for (const [id, prog] of Object.entries(byId || {})) {
      day[Number(id)] = {
        completed: Boolean(prog.completed),
        actualWeight: String(prog.actualWeight || ''),
      };
    }
    out[date] = day;
  }
  return out;
}

export function toApiDailyProgress(map: DailyProgressMap): Record<string, Record<string, DayExerciseProgress>> {
  const out: Record<string, Record<string, DayExerciseProgress>> = {};
  for (const [date, byId] of Object.entries(map)) {
    const day: Record<string, DayExerciseProgress> = {};
    for (const [id, prog] of Object.entries(byId)) {
      day[String(id)] = prog;
    }
    out[date] = day;
  }
  return out;
}
