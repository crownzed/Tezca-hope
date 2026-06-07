import type { Sex } from '../types';

/** Mifflin–St Jeor (kcal/ngày). */
export function computeBmr(weightKg: number, heightCm: number, age: number, sex: Sex): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === 'female' ? base - 161 : base + 5;
}
