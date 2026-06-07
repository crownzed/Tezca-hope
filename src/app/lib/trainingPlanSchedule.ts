import type { DashboardExercise } from './dashboardStorage';
import { buildWeekDaysWithIso } from './trainingDayProgress';

export type TrainingScheduleV2 = {
  v: 2;
  byDay: Record<string, DashboardExercise[]>;
};

export type ParsedPlanSchedule = {
  mode: 'daily' | 'shared';
  byDay: Record<string, DashboardExercise[]>;
  /** Danh sách phẳng (shared = mọi ngày giống nhau; daily = gộp để tương thích). */
  flat: DashboardExercise[];
};

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function structureExerciseList(titles: string[], idBase: number): DashboardExercise[] {
  return titles.slice(0, 12).map((title, i) => ({
    id: idBase + i,
    title,
    sets: 1,
    reps: 'Theo kế hoạch',
    isPTLocked: true,
    completed: false,
    actualWeight: '',
  }));
}

const DAY_HEADER =
  /^(?:#{1,3}\s*)?(?:\*\*)?(?:ngày|ngay)\s*(\d{1,2})|^(?:#{1,3}\s*)?(?:thứ|thu)\s*([2-7]|hai|ba|tư|tu|năm|nam|sáu|sau|bảy|bay|cn|chủ nhật)|^(?:#{1,3}\s*)?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i;

function dayIndexFromHeader(line: string): number | null {
  const trimmed = line.trim().replace(/^#+\s*/, '').replace(/\*\*/g, '');
  const ngay = trimmed.match(/^(?:ngày|ngay)\s*(\d{1,2})/i);
  if (ngay) {
    const n = Number(ngay[1]);
    if (n >= 1 && n <= 7) return n - 1;
  }
  const thu = trimmed.match(/^(?:thứ|thu)\s*([2-7]|hai|ba|tư|tu|năm|nam|sáu|sau|bảy|bay|cn|chủ nhật)/i);
  if (thu) {
    const map: Record<string, number> = {
      '2': 0,
      hai: 0,
      '3': 1,
      ba: 1,
      '4': 2,
      tư: 2,
      tu: 2,
      '5': 3,
      năm: 3,
      nam: 3,
      '6': 4,
      sáu: 4,
      sau: 4,
      '7': 5,
      bảy: 5,
      bay: 5,
      cn: 6,
      'chủ nhật': 6,
    };
    const key = thu[1]!.toLowerCase();
    if (key in map) return map[key]!;
  }
  const en = trimmed.match(/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
  if (en) {
    const map: Record<string, number> = {
      monday: 0,
      tuesday: 1,
      wednesday: 2,
      thursday: 3,
      friday: 4,
      saturday: 5,
      sunday: 6,
    };
    return map[en[1]!.toLowerCase()] ?? null;
  }
  return null;
}

function extractBulletTitle(line: string): string | null {
  const trimmed = line.trim();
  const bullet = trimmed.match(/^[-*]\s+(.+)$/);
  if (!bullet) return null;
  let title = bullet[1]!.replace(/\*\*/g, '').trim();
  title = title.replace(/^\[[ x]\]\s*/i, '').trim();
  if (title.length < 4) return null;
  if (title.length > 140) title = `${title.slice(0, 137)}…`;
  return title;
}

/** Trích bài tập theo từng ngày từ Markdown; không lặp tiêu đề giữa các ngày. */
export function parseExercisesByDayFromPlanMarkdown(plan: string): ParsedPlanSchedule {
  const lines = plan.split('\n');
  let inMotion = false;
  const buckets: string[][] = Array.from({ length: 7 }, () => []);
  let currentDay: number | null = null;
  const seenGlobal = new Set<string>();

  const pushTitle = (dayIdx: number, title: string) => {
    const key = normalizeTitle(title);
    if (seenGlobal.has(key)) return;
    seenGlobal.add(key);
    buckets[dayIdx]!.push(title);
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^###\s+/.test(trimmed)) {
      const heading = trimmed.replace(/^###\s+/, '').toLowerCase();
      inMotion = /vận động|van dong|tập luyện|tap luyen|hoạt động thể|exercise/.test(heading);
      const dayIdx = dayIndexFromHeader(trimmed);
      if (dayIdx != null) {
        inMotion = true;
        currentDay = dayIdx;
      }
      continue;
    }
    if (/^##\s+/.test(trimmed)) {
      const dayIdx = dayIndexFromHeader(trimmed);
      if (dayIdx != null) {
        inMotion = true;
        currentDay = dayIdx;
        continue;
      }
    }
    const inlineDay = dayIndexFromHeader(trimmed);
    if (inlineDay != null && /ngày|thứ|monday|tuesday|wednesday|thursday|friday|saturday|sunday/i.test(trimmed)) {
      inMotion = true;
      currentDay = inlineDay;
      continue;
    }
    if (!inMotion) continue;

    const title = extractBulletTitle(line);
    if (!title) continue;
    const dayIdx = currentDay ?? 0;
    pushTitle(dayIdx, title);
  }

  const hasPerDay = buckets.some((b) => b.length > 0);
  if (!hasPerDay) {
    const flatTitles: string[] = [];
    for (const line of lines) {
      const title = extractBulletTitle(line);
      if (!title) continue;
      const raw = title.toLowerCase();
      if (
        !/(phút|phut|buổi|buoi|đi bộ|di bo|squat|cardio|tập|tap|zone|hiit|yoga|mobility|kháng|khang)/.test(
          raw,
        )
      ) {
        continue;
      }
      const key = normalizeTitle(title);
      if (seenGlobal.has(key)) continue;
      seenGlobal.add(key);
      flatTitles.push(title);
    }
    if (flatTitles.length === 0) {
      return { mode: 'shared', byDay: {}, flat: [] };
    }
    const byDay: Record<string, DashboardExercise[]> = {};
    const week = buildWeekDaysWithIso();
    const idBase = Date.now();
    flatTitles.forEach((title, i) => {
      const dayIdx = i % 7;
      const iso = week[dayIdx]?.isoDate;
      if (!iso) return;
      if (!byDay[iso]) byDay[iso] = [];
      byDay[iso].push(
        structureExerciseList([title], idBase + dayIdx * 100 + byDay[iso]!.length)[0]!,
      );
    });
    const flat = Object.values(byDay).flat();
    return { mode: 'daily', byDay, flat };
  }

  const week = buildWeekDaysWithIso();
  const byDay: Record<string, DashboardExercise[]> = {};
  const idBase = Date.now();
  buckets.forEach((titles, dayIdx) => {
    if (!titles.length) return;
    const iso = week[dayIdx]?.isoDate;
    if (!iso) return;
    byDay[iso] = structureExerciseList(titles, idBase + dayIdx * 1000);
  });
  const flat = Object.values(byDay).flat();
  return { mode: 'daily', byDay, flat };
}

export function weekIsoDates(): string[] {
  return buildWeekDaysWithIso().map((d) => d.isoDate);
}

export function attachScheduleToWeek(
  byDay: Record<string, DashboardExercise[]>,
  weekIsos: string[] = weekIsoDates(),
): Record<string, DashboardExercise[]> {
  const out: Record<string, DashboardExercise[]> = {};
  for (let i = 0; i < weekIsos.length; i++) {
    const iso = weekIsos[i]!;
    const list = byDay[iso];
    if (list?.length) {
      out[iso] = list;
      continue;
    }
    const fromIndex = Object.values(byDay)[i];
    if (fromIndex?.length) out[iso] = fromIndex;
  }
  return out;
}

export function isScheduleV2(raw: unknown): raw is TrainingScheduleV2 {
  return (
    raw !== null &&
    typeof raw === 'object' &&
    !Array.isArray(raw) &&
    (raw as TrainingScheduleV2).v === 2 &&
    typeof (raw as TrainingScheduleV2).byDay === 'object'
  );
}

export function normalizePlanExercisesFromApi(
  exercises: DashboardExercise[],
  exercisesByDay?: Record<string, DashboardExercise[]>,
): ParsedPlanSchedule {
  if (exercisesByDay && Object.keys(exercisesByDay).length > 0) {
    const attached = attachScheduleToWeek(exercisesByDay);
    return {
      mode: 'daily',
      byDay: attached,
      flat: Object.values(attached).flat(),
    };
  }
  const week = weekIsoDates();
  const byDay: Record<string, DashboardExercise[]> = {};
  for (const iso of week) {
    byDay[iso] = exercises.map((ex) => ({ ...ex, completed: false }));
  }
  return { mode: 'shared', byDay, flat: exercises };
}

export function getExercisesForIso(
  schedule: ParsedPlanSchedule,
  iso: string,
): DashboardExercise[] {
  const list = schedule.byDay[iso];
  if (list?.length) return list.map((ex) => ({ ...ex }));
  if (schedule.mode === 'shared' && schedule.flat.length) {
    return schedule.flat.map((ex) => ({ ...ex, completed: false }));
  }
  return [];
}

export function toScheduleV2Payload(byDay: Record<string, DashboardExercise[]>) {
  const stripped: Record<string, Omit<DashboardExercise, 'completed'>[]> = {};
  for (const [iso, list] of Object.entries(byDay)) {
    stripped[iso] = list.map(({ completed: _c, ...rest }) => rest);
  }
  return { v: 2 as const, byDay: stripped };
}
