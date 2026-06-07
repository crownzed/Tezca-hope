import type { NutritionTotals } from '../types';

/** Kiểm tra P×4 + C×4 + F×9 ≈ cal (sai số làm tròn ≤ 15 kcal). */
export function isEnergyBalanced(t: NutritionTotals, toleranceKcal = 15): boolean {
  const computed = t.pro * 4 + t.carb * 4 + t.fat * 9;
  return Math.abs(computed - t.cal) <= toleranceKcal;
}

export function caloriesFromMacros(pro: number, carb: number, fat: number): number {
  return Math.round(pro * 4 + carb * 4 + fat * 9);
}

/** Điều chỉnh carb để khóa năng lượng theo cal mục tiêu. */
export function balanceMacrosToCalories(
  cal: number,
  pro: number,
  fat: number,
): Pick<NutritionTotals, 'pro' | 'carb' | 'fat' | 'cal'> {
  const carbCal = Math.max(0, cal - pro * 4 - fat * 9);
  const carb = Math.round(carbCal / 4);
  const balanced = { pro: Math.round(pro), carb, fat: Math.round(fat), cal };
  if (!isEnergyBalanced(balanced, 20)) {
    balanced.cal = caloriesFromMacros(balanced.pro, balanced.carb, balanced.fat);
  }
  return balanced;
}
