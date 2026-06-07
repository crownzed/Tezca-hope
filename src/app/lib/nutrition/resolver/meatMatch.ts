import { MEAT_CATALOG, getMeatCatalogEntry } from '../catalog/meatCatalog';
import { macrosFromPer100g } from '../foodLogUtils';
import type { MeatCatalogEntry, MeatPickOption } from '../types';
import { parseGramsFromInput, resolveServingGrams } from '../catalog/servings';
import { fuzzyKeyScore } from './fuzzy';

const GENERIC_MEAT_PATTERN = /\b(thịt|thit|meat|protein động vật)\b/i;

const PICKER_REPRESENTATIVE_IDS = [
  'chicken-breast',
  'chicken-thigh',
  'chicken-wing',
  'pork-lean',
  'pork-belly',
  'pork-shoulder',
  'beef-lean',
  'beef-brisket',
  'fish-basa',
  'fish-salmon',
  'seafood-shrimp',
] as const;

type MeatFamily = 'chicken' | 'pork' | 'beef' | 'fish' | 'seafood' | 'duck' | 'lamb';

function normalizeForMatch(text: string): string {
  return text.toLowerCase().trim();
}

function keySpecificityScore(entry: MeatCatalogEntry, key: string): number {
  let score = key.length + fuzzyKeyScore(key, key);
  if (entry.id.endsWith('-generic')) score -= 50;
  return score;
}

export function matchMeatEntries(text: string): MeatCatalogEntry[] {
  const normalized = normalizeForMatch(text);
  const hits: MeatCatalogEntry[] = [];
  for (const entry of MEAT_CATALOG) {
    const matched = entry.keys.some((k) => normalized.includes(k) || fuzzyKeyScore(normalized, k) >= 8);
    if (matched) hits.push(entry);
  }
  return hits.sort((a, b) => {
    const aScore = Math.max(...a.keys.map((k) => keySpecificityScore(a, k)));
    const bScore = Math.max(...b.keys.map((k) => keySpecificityScore(b, k)));
    return bScore - aScore;
  });
}

function detectMeatFamily(text: string): MeatFamily | null {
  const n = normalizeForMatch(text);
  if (/\b(gà|ga\b|chicken)\b/.test(n)) return 'chicken';
  if (/\b(heo|lợn|lon\b|pork|ba chỉ|ba chi)\b/.test(n)) return 'pork';
  if (/\b(bò|bo\b|beef|bít tết|bit tet)\b/.test(n)) return 'beef';
  if (/\b(tôm|tom\b|mực|muc\b|shrimp|squid)\b/.test(n)) return 'seafood';
  if (/\b(cá|ca\b|fish|salmon|basa|hồi|hoi)\b/.test(n)) return 'fish';
  if (/\b(vịt|vit\b|duck)\b/.test(n)) return 'duck';
  if (/\b(cừu|cuu\b|lamb)\b/.test(n)) return 'lamb';
  return null;
}

function entriesForFamily(family: MeatFamily): MeatCatalogEntry[] {
  if (family === 'seafood') {
    return MEAT_CATALOG.filter((e) => e.id.startsWith('seafood'));
  }
  if (family === 'fish') {
    return MEAT_CATALOG.filter((e) => e.id.startsWith('fish') || e.id.startsWith('seafood'));
  }
  return MEAT_CATALOG.filter((e) => e.id.startsWith(family));
}

function hasExplicitMeatCut(text: string): boolean {
  const n = normalizeForMatch(text);
  const cutMarkers = [
    'ức', 'uc ', 'đùi', 'dui', 'cánh', 'canh', 'nạc', 'nac', 'ba chỉ', 'ba chi',
    'sườn', 'suon', 'thăn', 'than', 'bắp', 'bap', 'nạm', 'nam', 'xay', 'basa', 'hồi', 'hoi', 'tôm', 'tom', 'mực', 'muc',
  ];
  return cutMarkers.some((m) => n.includes(m));
}

export function needsMeatPicker(text: string): boolean {
  const normalized = normalizeForMatch(text);
  const hits = matchMeatEntries(text);
  const specific = hits.filter((h) => !h.id.endsWith('-generic'));

  if (GENERIC_MEAT_PATTERN.test(normalized) && hits.length === 0) return true;

  const family = detectMeatFamily(text);
  if (family && specific.length === 0) return true;

  if (specific.length > 1) {
    const families = new Set(specific.map((h) => h.id.split('-')[0]));
    if (families.size > 1) return true;
    if (!hasExplicitMeatCut(text)) return true;
  }

  if (hits.length === 1 && hits[0]!.id.endsWith('-generic') && !hasExplicitMeatCut(text)) {
    return true;
  }

  const bareMeatWord = normalized.replace(/\d+(?:[.,]\d+)?\s*(?:g|gram|gr|gam)\b/gi, '').trim();
  if (/^(gà|ga|heo|lợn|lon|bò|bo|thịt|thit|cá|ca)$/.test(bareMeatWord)) return true;

  return false;
}

export function buildMeatPickOptions(text: string, grams: number): MeatPickOption[] {
  const family = detectMeatFamily(text);
  const matched = matchMeatEntries(text);
  const specific = matched.filter((h) => !h.id.endsWith('-generic'));

  let pool: MeatCatalogEntry[];
  if (specific.length > 0 && hasExplicitMeatCut(text)) {
    pool = specific;
  } else if (family) {
    pool = entriesForFamily(family).filter((e) => !e.id.endsWith('-generic'));
    if (pool.length === 0) pool = entriesForFamily(family);
  } else if (specific.length > 0) {
    const fam = specific[0]!.id.split('-')[0] as MeatFamily;
    pool = entriesForFamily(fam).filter((e) => !e.id.endsWith('-generic'));
  } else {
    pool = PICKER_REPRESENTATIVE_IDS.map((id) => getMeatCatalogEntry(id)).filter(
      (e): e is MeatCatalogEntry => Boolean(e),
    );
  }

  const seen = new Set<string>();
  const options: MeatPickOption[] = [];
  for (const entry of pool) {
    if (seen.has(entry.id)) continue;
    seen.add(entry.id);
    options.push({
      id: entry.id,
      label: entry.label,
      hint: entry.hint,
      per100g: entry.per100g,
      preview: macrosFromPer100g(entry.per100g, grams),
      grams,
    });
  }
  return options;
}

export function formatFoodDisplayName(input: string, foodLabel: string, grams: number): string {
  const trimmed = input.trim();
  if (parseGramsFromInput(trimmed) != null) {
    return `${Math.round(grams)}g · ${foodLabel}`;
  }
  if (trimmed.length > 0 && !trimmed.toLowerCase().includes(foodLabel.toLowerCase())) {
    return `${trimmed} (${foodLabel})`;
  }
  return `${foodLabel} (~${Math.round(grams)}g)`;
}

export { resolveServingGrams };
