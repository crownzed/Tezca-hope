import type { DashboardExercise } from './dashboardStorage';

function detectDayNumber(line: string): number | null {
  const m = line.match(/ng[àa]y\s*(\d{1,2})/i);
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 1 && n <= 7 ? n : null;
}

function isMotionHeading(trimmed: string): boolean {
  if (!/^#{2,4}\s+/.test(trimmed)) return false;
  const heading = trimmed.replace(/^#{2,4}\s+/, '').toLowerCase();
  return /vận động|van dong|tập luyện|tap luyen|hoạt động thể|exercise|lịch tập|lich tap|danh sách bài/.test(
    heading,
  );
}

function cleanTitle(raw: string): string {
  return raw.replace(/\*\*/g, '').trim().replace(/^\[[ x]\]\s*/i, '').trim();
}

/** Trích mục vận động từ Markdown kế hoạch AI → bài tập, kèm số ngày (1..7) nếu có. */
export function parseExercisesFromPlanMarkdown(plan: string): DashboardExercise[] {
  const lines = plan.split('\n');
  let currentDay: number | null = null;
  let inMotion = false;
  const collected: { title: string; day: number | null }[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (/^#{1,6}\s+/.test(trimmed) || /^\*\*.*\*\*$/.test(trimmed)) {
      const day = detectDayNumber(trimmed);
      if (day) {
        currentDay = day;
        inMotion = true;
        continue;
      }
      inMotion = isMotionHeading(trimmed);
      if (/^#{2,3}\s+/.test(trimmed) && !isMotionHeading(trimmed)) {
        currentDay = null;
      }
      continue;
    }

    if (!inMotion && currentDay == null) continue;

    const bullet = trimmed.match(/^[-*]\s+(.+)$/) || trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (!bullet) continue;
    const title = cleanTitle(bullet[1]!);
    if (title.length < 4) continue;
    collected.push({ title: title.length > 140 ? `${title.slice(0, 137)}…` : title, day: currentDay });
  }

  if (collected.length === 0) {
    for (const line of lines) {
      const trimmed = line.trim();
      const bullet = trimmed.match(/^[-*]\s+(.+)$/);
      if (!bullet) continue;
      const raw = bullet[1]!.toLowerCase();
      if (
        !/(phút|phut|buổi|buoi|đi bộ|di bo|squat|cardio|tập|tap|zone|hiit|yoga|mobility|kháng|khang|hiệp|hiep|rep|set)/.test(
          raw,
        )
      ) {
        continue;
      }
      const title = cleanTitle(bullet[1]!);
      if (title.length < 4 || title.length > 140) continue;
      collected.push({ title, day: null });
    }
  }

  const baseId = Date.now();
  return collected.slice(0, 60).map((item, i) => ({
    id: baseId + i,
    title: item.title,
    sets: 1,
    reps: 'Theo kế hoạch',
    day: item.day,
    isPTLocked: true,
    completed: false,
    actualWeight: '',
  }));
}

export function mergeExerciseCompletion(
  local: DashboardExercise[],
  fromServer: Omit<DashboardExercise, 'completed'>[],
): DashboardExercise[] {
  const doneByTitle = new Map(local.filter((e) => e.completed).map((e) => [e.title, true]));
  const doneById = new Map(local.filter((e) => e.completed).map((e) => [e.id, true]));
  return fromServer.map((ex) => ({
    ...ex,
    completed: Boolean(doneById.get(ex.id) || doneByTitle.get(ex.title)),
  }));
}
