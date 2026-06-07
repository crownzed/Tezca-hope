import { normalizeVi } from '../textNormalize';
import type { NutritionTotals } from './types';

export type FoodCorrection = {
  macros: NutritionTotals;
  displayName?: string;
  updatedAt: number;
};

const KEY_PREFIX = 'tezca_nutrition_corrections_v1';

function storageKey(userId: string | null): string {
  return userId ? `${KEY_PREFIX}_${userId}` : `${KEY_PREFIX}_guest`;
}

function readMap(userId: string | null): Record<string, FoodCorrection> {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, FoodCorrection>;
  } catch {
    return {};
  }
}

function writeMap(userId: string | null, map: Record<string, FoodCorrection>) {
  localStorage.setItem(storageKey(userId), JSON.stringify(map));
}

export function correctionKeyForInput(input: string): string {
  return normalizeVi(input.trim());
}

export function lookupFoodCorrection(
  userId: string | null,
  input: string,
): FoodCorrection | null {
  const key = correctionKeyForInput(input);
  if (!key) return null;
  return readMap(userId)[key] ?? null;
}

export function saveFoodCorrection(
  userId: string | null,
  input: string,
  macros: NutritionTotals,
  displayName?: string,
): void {
  const key = correctionKeyForInput(input);
  if (!key) return;
  const map = readMap(userId);
  map[key] = { macros, displayName, updatedAt: Date.now() };
  writeMap(userId, map);
}
