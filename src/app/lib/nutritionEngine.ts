/**
 * Facade dinh dưỡng — logic trong ./nutrition/*
 */
export type {
  ActivityLevel,
  DailyNutritionTargetsResult,
  FoodEstimateResult,
  FoodEstimateSource,
  FoodLogItem,
  MeatCatalogEntry,
  MeatCatalogGroup,
  MeatPickOption,
  NutritionGoal,
  NutritionProfileInput,
  NutritionTotals,
  ResolveTargetsOptions,
  Sex,
} from './nutrition/types';

export {
  todayIsoLocal,
  normalizeFoodLogItem,
  normalizeFoodLog,
  foodLogForDay,
  sumNutrition,
  roundNutrition,
  addNutrition,
  macrosFromPer100g,
  nutritionProgressPct,
  defaultFoodLogSeed,
} from './nutrition/foodLogUtils';

export { MEAT_CATALOG, MEAT_CATALOG_GROUPS, getMeatCatalogEntry } from './nutrition/catalog/meatCatalog';
export { INGREDIENT_CATALOG } from './nutrition/catalog/ingredients';
export { DISH_CATALOG } from './nutrition/catalog/dishes';

export {
  analyzeFoodInput,
  estimateFromMeatId,
  estimateMacrosFromInput,
  estimateMacrosFromSingle,
  rememberFoodEstimate,
} from './nutrition/resolver/analyzeFood';

import type { BmiEntry } from './healthStorage';
import type { NutritionProfileInput, NutritionTotals, ResolveTargetsOptions, DailyNutritionTargetsResult } from './nutrition/types';
import { resolveDailyNutritionTargets as resolveTargetsCore } from './nutrition/targets/resolveDailyTargets';

export {
  loadNutritionProfile,
  saveNutritionProfile,
  ACTIVITY_LEVEL_OPTIONS,
  GOAL_OPTIONS,
  SEX_OPTIONS,
} from './nutrition/preferences';

export { lookupFoodCorrection, saveFoodCorrection } from './nutrition/corrections';

/** Kết quả đầy đủ (macro + cảnh báo + BMR/TDEE). */
export function resolveDailyNutritionTargetsDetailed(
  latestBmi: BmiEntry | null | undefined,
  profile: NutritionProfileInput = {},
  options: ResolveTargetsOptions = {},
): DailyNutritionTargetsResult {
  return resolveTargetsCore(latestBmi, profile, options);
}

/** Chỉ macro mục tiêu — tương thích call site cũ. */
export function resolveDailyNutritionTargets(
  latestBmi: BmiEntry | null | undefined,
  profile: NutritionProfileInput = {},
  options: ResolveTargetsOptions = {},
): NutritionTotals {
  return resolveTargetsCore(latestBmi, profile, options).targets;
}
