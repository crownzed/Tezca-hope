import type { ActivityLevel, NutritionGoal, NutritionProfileInput, Sex } from './types';

const KEY_PREFIX = 'tezca_nutrition_profile_v1';

function storageKey(userId: string | null): string {
  return userId ? `${KEY_PREFIX}_${userId}` : `${KEY_PREFIX}_guest`;
}

export function loadNutritionProfile(userId: string | null): NutritionProfileInput {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return {};
    return JSON.parse(raw) as NutritionProfileInput;
  } catch {
    return {};
  }
}

export function saveNutritionProfile(userId: string | null, profile: NutritionProfileInput): void {
  localStorage.setItem(storageKey(userId), JSON.stringify(profile));
}

export const ACTIVITY_LEVEL_OPTIONS: { value: ActivityLevel; label: string }[] = [
  { value: 'sedentary', label: 'Ít vận động' },
  { value: 'light', label: 'Nhẹ (1–2 buổi/tuần)' },
  { value: 'moderate', label: 'Vừa (3–4 buổi)' },
  { value: 'active', label: 'Cao (5–6 buổi)' },
  { value: 'very_active', label: 'Rất cao' },
];

export const GOAL_OPTIONS: { value: NutritionGoal; label: string }[] = [
  { value: 'cut', label: 'Giảm mỡ (~−300 kcal)' },
  { value: 'maintain', label: 'Duy trì' },
  { value: 'bulk', label: 'Tăng cơ (~+250 kcal)' },
];

export const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: 'male', label: 'Nam' },
  { value: 'female', label: 'Nữ' },
];
