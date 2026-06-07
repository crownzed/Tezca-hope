import { caloriesFromMacros } from './validators/energyBalance';
import type { FoodLogItem, NutritionTotals } from './types';

export function todayIsoLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Bổ sung fat từ cal nếu thiếu (macro 3 thành phần cũ). */
export function ensureMacroFat(partial: Omit<NutritionTotals, 'fat'> & { fat?: number }): NutritionTotals {
  if (partial.fat != null && partial.fat > 0) {
    return {
      pro: partial.pro,
      carb: partial.carb,
      fat: partial.fat,
      cal: partial.cal,
    };
  }
  const fat = Math.max(0, Math.round((partial.cal - partial.pro * 4 - partial.carb * 4) / 9));
  return { pro: partial.pro, carb: partial.carb, fat, cal: partial.cal };
}

export function roundNutrition(t: NutritionTotals): NutritionTotals {
  return {
    pro: Math.round(t.pro),
    carb: Math.round(t.carb),
    fat: Math.round(t.fat),
    cal: Math.round(t.cal),
  };
}

export function macrosFromPer100g(per100g: NutritionTotals, grams: number): NutritionTotals {
  const factor = grams / 100;
  const raw = ensureMacroFat({
    pro: per100g.pro * factor,
    carb: per100g.carb * factor,
    fat: per100g.fat * factor,
    cal: per100g.cal * factor,
  });
  return roundNutrition(raw);
}

export function addNutrition(a: NutritionTotals, b: NutritionTotals): NutritionTotals {
  return roundNutrition({
    pro: a.pro + b.pro,
    carb: a.carb + b.carb,
    fat: a.fat + b.fat,
    cal: a.cal + b.cal,
  });
}

export function normalizeFoodLogItem(item: FoodLogItem): FoodLogItem {
  const fat = item.fat ?? Math.max(0, Math.round((item.cal - item.pro * 4 - item.carb * 4) / 9));
  return {
    ...item,
    dateIso: item.dateIso || todayIsoLocal(),
    fat,
    pro: Math.round(item.pro),
    carb: Math.round(item.carb),
    cal: Math.round(item.cal),
  };
}

export function normalizeFoodLog(items: FoodLogItem[]): FoodLogItem[] {
  return items.map(normalizeFoodLogItem);
}

export function foodLogForDay(log: FoodLogItem[], dateIso: string): FoodLogItem[] {
  return log.filter((f) => (f.dateIso || todayIsoLocal()) === dateIso);
}

export function sumNutrition(log: FoodLogItem[]): NutritionTotals {
  return log.reduce(
    (acc, f) => addNutrition(acc, { pro: f.pro, carb: f.carb, fat: f.fat ?? 0, cal: f.cal }),
    { pro: 0, carb: 0, fat: 0, cal: 0 },
  );
}

export function nutritionProgressPct(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}

export function defaultFoodLogSeed(): FoodLogItem[] {
  const today = todayIsoLocal();
  return [
    normalizeFoodLogItem({
      id: 1,
      name: 'Phở bò (sáng)',
      pro: 32,
      carb: 58,
      fat: 12,
      cal: 480,
      dateIso: today,
      estimateConfidence: 0.9,
    }),
  ];
}

export function rebalanceMacrosDisplay(m: NutritionTotals): NutritionTotals {
  const cal = caloriesFromMacros(m.pro, m.carb, m.fat);
  return roundNutrition({ ...m, cal });
}
