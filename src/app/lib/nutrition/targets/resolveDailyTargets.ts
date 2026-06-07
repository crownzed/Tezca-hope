import type {
  BmiEntry,
  DailyNutritionTargetsResult,
  NutritionProfileInput,
  NutritionTotals,
  ResolveTargetsOptions,
  Sex,
} from '../types';
import { computeBmr } from './bmr';
import { activityLevelFromSessions, computeTdee, GOAL_CALORIE_OFFSET, PAL_BY_LEVEL } from './tdee';
import { minDailyCalories, splitMacros } from './macroSplit';

const DEFAULT_TARGETS: NutritionTotals = { pro: 160, carb: 250, fat: 65, cal: 2200 };

const DEFAULT_PROFILE = {
  age: 30,
  sex: 'male' as Sex,
  activityLevel: 'moderate' as const,
  goal: 'maintain' as const,
};

export function resolveDailyNutritionTargets(
  latestBmi: BmiEntry | null | undefined,
  profile: NutritionProfileInput = {},
  options: ResolveTargetsOptions = {},
): DailyNutritionTargetsResult {
  const warnings: string[] = [];

  if (!latestBmi?.weightKg || !latestBmi?.heightCm) {
    return {
      targets: { ...DEFAULT_TARGETS },
      warnings: ['Chưa có BMI — dùng mục tiêu mặc định. Thêm cân nặng/chiều cao để cá nhân hóa.'],
      meta: { bmr: 0, tdee: 0, usedDefaults: true, minCalorieFloor: 1500 },
    };
  }

  const w = latestBmi.weightKg;
  const h = latestBmi.heightCm;
  const age = Math.max(14, Math.min(90, profile.age ?? DEFAULT_PROFILE.age));
  const sex = profile.sex ?? DEFAULT_PROFILE.sex;
  const goal = profile.goal ?? DEFAULT_PROFILE.goal;

  let activityLevel = profile.activityLevel;
  if (!activityLevel && options.sessionsPerWeek != null) {
    activityLevel = activityLevelFromSessions(options.sessionsPerWeek);
  }
  activityLevel = activityLevel ?? DEFAULT_PROFILE.activityLevel;

  const usedDefaults = !profile.age && !profile.sex && !profile.activityLevel && !profile.goal;
  if (usedDefaults) {
    warnings.push('Dùng giả định: 30 tuổi, nam, vận động vừa, duy trì cân — chỉnh trong mục Mục tiêu dinh dưỡng.');
  }

  const bmr = Math.round(computeBmr(w, h, age, sex));
  const tdee = Math.round(computeTdee(bmr, activityLevel));
  let cal = Math.round(tdee + GOAL_CALORIE_OFFSET[goal]);
  const floor = minDailyCalories(sex);
  if (cal < floor) {
    warnings.push(`Calo mục tiêu được nâng lên ${floor} kcal (ngưỡng an toàn).`);
    cal = floor;
  }
  cal = Math.max(floor, Math.min(4000, cal));

  const targets = splitMacros(cal, w, {
    proteinGPerKg: profile.proteinGPerKg,
    fatPercentOfCal: profile.fatPercentOfCal,
  });

  if (latestBmi.bmi >= 30 && goal === 'cut') {
    warnings.push('BMI ≥ 30: nên đồng hành chuyên gia/bác sĩ khi hạ calo.');
  }
  if (latestBmi.bmi < 18.5 && goal === 'cut') {
    warnings.push('BMI thấp — không khuyến nghị giảm cân thêm.');
  }

  return {
    targets,
    warnings,
    meta: {
      bmr,
      tdee,
      usedDefaults,
      minCalorieFloor: floor,
    },
  };
}

export { DEFAULT_TARGETS, PAL_BY_LEVEL };
