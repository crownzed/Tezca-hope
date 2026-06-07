import type { DashboardExercise } from './dashboardStorage';
import type { DayExerciseProgress } from './trainingDayProgress';

export type TrainingPlanStatus = 'pending_review' | 'approved';

export type CustomerTrainingPlan = {
  customerId: string;
  sourcePlanMd: string;
  status: TrainingPlanStatus;
  exercises: DashboardExercise[];
  /** Bài tập riêng theo từng ngày (ISO). Có khi scheduleMode = daily. */
  exercisesByDay?: Record<string, DashboardExercise[]>;
  scheduleMode?: 'daily' | 'shared';
  dailyProgress: Record<string, Record<string, DayExerciseProgress>>;
  expertNote: string;
  integratedAt: number;
  updatedAt: number;
  updatedBy: string | null;
};

export type TrainingPlanResponse = {
  plan: CustomerTrainingPlan | null;
};
