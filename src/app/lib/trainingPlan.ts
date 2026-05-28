import type { DashboardExercise } from './dashboardStorage';
import type { DayExerciseProgress } from './trainingDayProgress';

export type TrainingPlanStatus = 'pending_review' | 'approved';

export type PatientTrainingPlan = {
  patientId: string;
  sourcePlanMd: string;
  status: TrainingPlanStatus;
  exercises: DashboardExercise[];
  dailyProgress: Record<string, Record<string, DayExerciseProgress>>;
  expertNote: string;
  integratedAt: number;
  updatedAt: number;
  updatedBy: string | null;
};

export type TrainingPlanResponse = {
  plan: PatientTrainingPlan | null;
};
