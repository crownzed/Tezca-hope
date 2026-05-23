import type { DashboardExercise } from './dashboardStorage';

/** Trích mục vận động từ Markdown kế hoạch AI → bài tập cho Chiến dịch tập luyện. */
export function parseExercisesFromPlanMarkdown(plan: string): DashboardExercise[] {
  const lines = plan.split('\n');
  let inMotion = false;
  const titles: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^###\s+/.test(trimmed)) {
      const heading = trimmed.replace(/^###\s+/, '').toLowerCase();
      inMotion = /vận động|van dong|tập luyện|tap luyen|hoạt động thể|exercise/.test(heading);
      continue;
    }
    if (!inMotion) continue;
    const bullet = trimmed.match(/^[-*]\s+(.+)$/);
    if (!bullet) continue;
    let title = bullet[1]!.replace(/\*\*/g, '').trim();
    title = title.replace(/^\[[ x]\]\s*/i, '').trim();
    if (title.length < 4) continue;
    if (title.length > 140) title = `${title.slice(0, 137)}…`;
    titles.push(title);
  }

  if (titles.length === 0) {
    for (const line of lines) {
      const trimmed = line.trim();
      const bullet = trimmed.match(/^[-*]\s+(.+)$/);
      if (!bullet) continue;
      const raw = bullet[1]!.toLowerCase();
      if (
        !/(phút|phut|buổi|buoi|đi bộ|di bo|squat|cardio|tập|tap|zone|hiit|yoga|mobility|kháng|khang)/.test(
          raw,
        )
      ) {
        continue;
      }
      let title = bullet[1]!.replace(/\*\*/g, '').trim();
      if (title.length < 4 || title.length > 140) continue;
      titles.push(title);
    }
  }

  const baseId = Date.now();
  return titles.slice(0, 12).map((title, i) => ({
    id: baseId + i,
    title,
    sets: 1,
    reps: 'Theo kế hoạch',
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
