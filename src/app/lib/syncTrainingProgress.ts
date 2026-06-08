import { apiFetch } from './api';
import type { DashboardExercise } from './dashboardStorage';
import { stripExerciseProgress } from './dashboardStorage';
import type { TrainingPlanResponse } from './trainingPlan';

export function toProgressPayload(exercises: DashboardExercise[]) {
  return exercises.map((ex) => ({
    id: ex.id,
    completed: ex.completed,
    actualWeight: ex.actualWeight,
  }));
}

export async function syncTrainingProgressToServer(
  token: string,
  dateIso: string,
  exercises: DashboardExercise[],
  workoutStructure: DashboardExercise[],
): Promise<boolean> {
  try {
    await apiFetch<TrainingPlanResponse>('/api/me/training-plan/progress', {
      method: 'PATCH',
      token,
      body: JSON.stringify({
        date: dateIso,
        exercises: toProgressPayload(exercises),
        workout: stripExerciseProgress(workoutStructure),
      }),
    });
    return true;
  } catch {
    return false;
  }
}
