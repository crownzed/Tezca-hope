/**
 * Kiểm tra logic dinh dưỡng (giai đoạn 1–2).
 * Usage: node scripts/test-nutrition.mjs
 */
import assert from 'node:assert/strict';
import { computeBmr } from '../src/app/lib/nutrition/targets/bmr.ts';
import { splitMacros } from '../src/app/lib/nutrition/targets/macroSplit.ts';
import { resolveDailyNutritionTargets } from '../src/app/lib/nutrition/targets/resolveDailyTargets.ts';
import { isEnergyBalanced } from '../src/app/lib/nutrition/validators/energyBalance.ts';
import { analyzeFoodInput } from '../src/app/lib/nutrition/resolver/analyzeFood.ts';

const bmi = { id: '1', date: '2026-01-01', heightCm: 175, weightKg: 75, bmi: 24.5 };

assert.ok(computeBmr(70, 175, 30, 'male') > computeBmr(70, 175, 30, 'female'));

const t = splitMacros(2200, 70);
assert.ok(isEnergyBalanced(t));

const cut = resolveDailyNutritionTargets(bmi, { age: 30, sex: 'male', goal: 'cut', activityLevel: 'moderate' });
const maintain = resolveDailyNutritionTargets(bmi, { age: 30, sex: 'male', goal: 'maintain', activityLevel: 'moderate' });
assert.ok(cut.targets.cal < maintain.targets.cal);

const comTam = analyzeFoodInput('cơm tấm', null);
assert.equal(comTam.kind, 'ready');
assert.ok(comTam.macros.cal > 400);

const unknown = analyzeFoodInput('món lạ không có trong db', null);
assert.equal(unknown.kind, 'confirm');

console.log('nutrition tests OK');
