import type { ActivityLevel } from '../types';

export const PAL_BY_LEVEL: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const GOAL_CALORIE_OFFSET: Record<'cut' | 'maintain' | 'bulk', number> = {
  cut: -300,
  maintain: 0,
  bulk: 250,
};

/** Suy PAL từ số buổi tập / tuần khi user chưa chọn mức vận động. */
export function activityLevelFromSessions(sessionsPerWeek: number): ActivityLevel {
  if (sessionsPerWeek >= 6) return 'very_active';
  if (sessionsPerWeek >= 4) return 'active';
  if (sessionsPerWeek >= 2) return 'moderate';
  if (sessionsPerWeek >= 1) return 'light';
  return 'sedentary';
}

export function computeTdee(bmr: number, level: ActivityLevel): number {
  return bmr * PAL_BY_LEVEL[level];
}
