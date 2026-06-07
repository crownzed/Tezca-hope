import { INGREDIENT_CATALOG } from '../catalog/ingredients';
import { matchDish, macrosForDish, type DishEntry } from '../catalog/dishes';
import { parseGramsFromInput, resolveServingGrams } from '../catalog/servings';
import { getMeatCatalogEntry } from '../catalog/meatCatalog';
import { lookupFoodCorrection, saveFoodCorrection } from '../corrections';
import { addNutrition, macrosFromPer100g, roundNutrition } from '../foodLogUtils';
import type { FoodEstimateResult, FoodEstimateSource, NutritionTotals } from '../types';
import { fuzzyKeyScore } from './fuzzy';
import {
  buildMeatPickOptions,
  formatFoodDisplayName,
  matchMeatEntries,
  needsMeatPicker,
} from './meatMatch';

const CONFIDENCE_AUTO_ADD = 0.82;

function splitFoodSegments(input: string): string[] {
  return input
    .split(/[,;+]|(?:\s+và\s+)|(?:\s+with\s+)/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function matchIngredient(text: string) {
  const normalized = text.toLowerCase().trim();
  let best: (typeof INGREDIENT_CATALOG)[number] | null = null;
  let bestScore = 0;
  for (const entry of INGREDIENT_CATALOG) {
    for (const key of entry.keys) {
      let score = 0;
      if (normalized.includes(key)) score = key.length + 10;
      else score = fuzzyKeyScore(normalized, key);
      if (score > bestScore) {
        bestScore = score;
        best = entry;
      }
    }
  }
  if (!best || bestScore < 8) return null;
  return { entry: best, fuzzy: bestScore < 12 };
}

function wrapReady(
  macros: NutritionTotals,
  displayName: string,
  grams: number,
  confidence: number,
  source: FoodEstimateSource,
): FoodEstimateResult {
  if (confidence >= CONFIDENCE_AUTO_ADD) {
    return { kind: 'ready', macros, displayName, grams, confidence, source };
  }
  return {
    kind: 'confirm',
    input: displayName,
    macros,
    displayName,
    grams,
    confidence,
    source,
    reason:
      confidence < 0.5
        ? 'Không khớp catalog — macro ước tính, vui lòng xác nhận.'
        : 'Độ tin cậy trung bình — kiểm tra khẩu phần trước khi lưu.',
  };
}

function estimateSingleSegment(text: string, userId: string | null): FoodEstimateResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { kind: 'ready', macros: { pro: 0, carb: 0, fat: 0, cal: 0 }, displayName: '', grams: 0, confidence: 1, source: 'ingredient' };
  }

  const saved = lookupFoodCorrection(userId, trimmed);
  if (saved) {
    return wrapReady(
      saved.macros,
      saved.displayName ?? trimmed,
      0,
      0.95,
      'user_correction',
    );
  }

  if (needsMeatPicker(trimmed)) {
    const grams = resolveServingGrams(trimmed, 120);
    return { kind: 'pick_meat', input: trimmed, grams, options: buildMeatPickOptions(trimmed, grams) };
  }

  const dish = matchDish(trimmed);
  if (dish) {
    const grams = resolveServingGrams(trimmed, dish.defaultServingG);
    const scale = grams / dish.defaultServingG;
    const macros = macrosForDish(dish, scale);
    return wrapReady(macros, dish.label, grams, 0.9, 'dish_composite');
  }

  const meatHits = matchMeatEntries(trimmed);
  if (meatHits.length >= 1) {
    const entry = meatHits.find((h) => !h.id.endsWith('-generic')) ?? meatHits[0]!;
    const grams = resolveServingGrams(trimmed, entry.defaultServingG);
    const macros = macrosFromPer100g(entry.per100g, grams);
    const conf = entry.id.endsWith('-generic') ? 0.72 : 0.92;
    return wrapReady(
      macros,
      formatFoodDisplayName(trimmed, entry.label, grams),
      grams,
      conf,
      'meat_catalog',
    );
  }

  const ing = matchIngredient(trimmed);
  if (ing) {
    const grams = resolveServingGrams(trimmed, ing.entry.defaultServingG);
    const macros = macrosFromPer100g(ing.entry.per100g, grams);
    return wrapReady(
      macros,
      trimmed,
      grams,
      ing.fuzzy ? 0.78 : 0.88,
      ing.fuzzy ? 'fuzzy' : 'ingredient',
    );
  }

  const grams = parseGramsFromInput(trimmed);
  if (grams != null && grams > 0) {
    const macros = roundNutrition({ pro: grams * 0.08, carb: grams * 0.12, fat: grams * 0.04, cal: grams * 1.2 });
    return wrapReady(macros, trimmed, grams, 0.55, 'grams_heuristic');
  }

  const fallback = roundNutrition({ pro: 8, carb: 22, fat: 6, cal: 180 });
  return {
    kind: 'confirm',
    input: trimmed,
    macros: fallback,
    displayName: trimmed,
    grams: 120,
    confidence: 0.25,
    source: 'fallback',
    reason: 'Không nhận diện món — macro mặc định (~120g). Chỉnh hoặc chọn từ bảng thịt.',
  };
}

/** Phân tích một dòng nhập — có thể yêu cầu chọn loại thịt hoặc xác nhận. */
export function analyzeFoodInput(input: string, userId: string | null = null): FoodEstimateResult {
  const segments = splitFoodSegments(input);
  if (segments.length <= 1) return estimateSingleSegment(input, userId);

  for (const seg of segments) {
    const result = estimateSingleSegment(seg, userId);
    if (result.kind === 'pick_meat' || result.kind === 'confirm') return result;
  }

  let total: NutritionTotals = { pro: 0, carb: 0, fat: 0, cal: 0 };
  const names: string[] = [];
  let minConfidence = 1;
  let source: FoodEstimateSource = 'dish_composite';

  for (const seg of segments) {
    const result = estimateSingleSegment(seg, userId);
    if (result.kind === 'ready') {
      total = addNutrition(total, result.macros);
      names.push(result.displayName);
      minConfidence = Math.min(minConfidence, result.confidence);
      source = result.source;
    }
  }

  return wrapReady(total, names.join(', '), 0, minConfidence, source);
}

export function estimateFromMeatId(input: string, meatId: string): FoodEstimateResult {
  const entry = getMeatCatalogEntry(meatId);
  if (!entry) {
    return { kind: 'ready', macros: { pro: 0, carb: 0, fat: 0, cal: 0 }, displayName: input.trim(), grams: 0, confidence: 0, source: 'meat_catalog' };
  }
  const grams = resolveServingGrams(input, entry.defaultServingG);
  const macros = macrosFromPer100g(entry.per100g, grams);
  const displayName = formatFoodDisplayName(input, entry.label, grams);
  return { kind: 'ready', macros, displayName, grams, confidence: 0.95, source: 'meat_catalog' };
}

export function estimateMacrosFromSingle(input: string, userId?: string | null): NutritionTotals {
  const result = analyzeFoodInput(input, userId ?? null);
  if (result.kind === 'pick_meat') {
    return result.options[0]?.preview ?? { pro: 0, carb: 0, fat: 0, cal: 0 };
  }
  return result.macros;
}

export function estimateMacrosFromInput(input: string, userId?: string | null): NutritionTotals {
  const result = analyzeFoodInput(input, userId ?? null);
  if (result.kind === 'pick_meat' || result.kind === 'confirm') {
    return { pro: 0, carb: 0, fat: 0, cal: 0 };
  }
  return result.macros;
}

/** Ghi nhớ chỉnh sửa của user để lần sau khớp nhanh hơn. */
export function rememberFoodEstimate(
  userId: string | null,
  input: string,
  macros: NutritionTotals,
  displayName?: string,
): void {
  saveFoodCorrection(userId, input, macros, displayName);
}

export type { DishEntry };
