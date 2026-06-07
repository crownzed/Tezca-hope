import { balanceMacrosToCalories } from '../validators/energyBalance';
import type { NutritionTotals, Sex } from '../types';

export function minDailyCalories(sex: Sex): number {
  return sex === 'female' ? 1200 : 1500;
}

export function splitMacros(
  targetCal: number,
  weightKg: number,
  opts: { proteinGPerKg?: number; fatPercentOfCal?: number } = {},
): NutritionTotals {
  const proteinGPerKg = opts.proteinGPerKg ?? 1.6;
  const fatPercent = opts.fatPercentOfCal ?? 25;

  const pro = Math.round(Math.max(50, Math.min(240, weightKg * proteinGPerKg)));
  const fat = Math.round(Math.max(35, Math.min(120, (targetCal * (fatPercent / 100)) / 9)));
  const balanced = balanceMacrosToCalories(targetCal, pro, fat);
  return {
    pro: balanced.pro,
    carb: Math.max(40, Math.min(450, balanced.carb)),
    fat: balanced.fat,
    cal: targetCal,
  };
}
