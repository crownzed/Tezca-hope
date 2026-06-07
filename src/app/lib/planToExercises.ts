import type { DashboardExercise } from './dashboardStorage';
import {
  parseExercisesByDayFromPlanMarkdown,
  type ParsedPlanSchedule,
} from './trainingPlanSchedule';

export type { ParsedPlanSchedule };

/** Trích bài tập từ Markdown (gộp tất cả ngày — tương thích cũ). */
export function parseExercisesFromPlanMarkdown(plan: string): DashboardExercise[] {
  return parseExercisesByDayFromPlanMarkdown(plan).flat;
}

export { parseExercisesByDayFromPlanMarkdown };

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
