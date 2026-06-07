import type { BmiEntry } from '../healthStorage';

export type NutritionTotals = {
  pro: number;
  carb: number;
  fat: number;
  cal: number;
};

export type FoodLogItem = {
  id: number;
  name: string;
  pro: number;
  carb: number;
  fat: number;
  cal: number;
  dateIso: string;
  /** Độ tin cậy ước lượng 0–1 khi thêm món */
  estimateConfidence?: number;
};

export type Sex = 'male' | 'female';
export type NutritionGoal = 'cut' | 'maintain' | 'bulk';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

export type NutritionProfileInput = {
  age?: number;
  sex?: Sex;
  activityLevel?: ActivityLevel;
  goal?: NutritionGoal;
  /** g đạm / kg cân nặng (mặc định 1.6) */
  proteinGPerKg?: number;
  /** % năng lượng từ chất béo (mặc định 25) */
  fatPercentOfCal?: number;
};

export type ResolveTargetsOptions = {
  /** Số buổi tập / tuần — tinh chỉnh PAL nếu chưa chọn activityLevel */
  sessionsPerWeek?: number;
};

export type DailyNutritionTargetsResult = {
  targets: NutritionTotals;
  warnings: string[];
  meta: {
    bmr: number;
    tdee: number;
    usedDefaults: boolean;
    minCalorieFloor: number;
  };
};

export type MeatCatalogEntry = {
  id: string;
  label: string;
  hint: string;
  per100g: NutritionTotals;
  defaultServingG: number;
  keys: string[];
};

export type MeatPickOption = {
  id: string;
  label: string;
  hint: string;
  per100g: NutritionTotals;
  preview: NutritionTotals;
  grams: number;
};

export type FoodEstimateSource =
  | 'meat_catalog'
  | 'ingredient'
  | 'dish_composite'
  | 'user_correction'
  | 'fuzzy'
  | 'grams_heuristic'
  | 'fallback';

export type FoodEstimateResult =
  | {
      kind: 'ready';
      macros: NutritionTotals;
      displayName: string;
      grams: number;
      confidence: number;
      source: FoodEstimateSource;
    }
  | {
      kind: 'confirm';
      input: string;
      macros: NutritionTotals;
      displayName: string;
      grams: number;
      confidence: number;
      source: FoodEstimateSource;
      reason: string;
    }
  | { kind: 'pick_meat'; input: string; grams: number; options: MeatPickOption[] };

export type MeatCatalogGroup = { title: string; entries: MeatCatalogEntry[] };

export type { BmiEntry };
