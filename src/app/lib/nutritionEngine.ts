import type { BmiEntry } from './healthStorage';

export type NutritionTotals = {
  pro: number;
  carb: number;
  cal: number;
};

export type FoodLogItem = {
  id: number;
  name: string;
  pro: number;
  carb: number;
  cal: number;
  dateIso: string;
};

export type MeatCatalogEntry = {
  id: string;
  label: string;
  hint: string;
  per100g: NutritionTotals;
  defaultServingG: number;
  keys: string[];
};

/** Macro chuẩn trên 100g — nguồn tham khảo USDA / TCVN (làm tròn cho UI). */
export const MEAT_CATALOG: MeatCatalogEntry[] = [
  {
    id: 'chicken-breast',
    label: 'Ức gà (không da)',
    hint: '31g đạm · 165 kcal / 100g',
    per100g: { pro: 31, carb: 0, cal: 165 },
    defaultServingG: 120,
    keys: ['ức gà', 'uc ga', 'gà ức', 'ga uc', 'chicken breast'],
  },
  {
    id: 'chicken-thigh',
    label: 'Đùi gà (có da)',
    hint: '18g đạm · 209 kcal / 100g',
    per100g: { pro: 18, carb: 0, cal: 209 },
    defaultServingG: 100,
    keys: ['đùi gà', 'dui ga', 'gà đùi', 'ga dui', 'chicken thigh'],
  },
  {
    id: 'chicken-wing',
    label: 'Cánh gà',
    hint: '23g đạm · 203 kcal / 100g',
    per100g: { pro: 23, carb: 0, cal: 203 },
    defaultServingG: 80,
    keys: ['cánh gà', 'canh ga', 'gà cánh', 'chicken wing'],
  },
  {
    id: 'chicken-ground',
    label: 'Thịt gà xay',
    hint: '17g đạm · 189 kcal / 100g',
    per100g: { pro: 17, carb: 0, cal: 189 },
    defaultServingG: 120,
    keys: ['gà xay', 'ga xay', 'thịt gà xay', 'thit ga xay'],
  },
  {
    id: 'chicken-generic',
    label: 'Thịt gà (trung bình)',
    hint: '27g đạm · 190 kcal / 100g',
    per100g: { pro: 27, carb: 0, cal: 190 },
    defaultServingG: 120,
    keys: ['thịt gà', 'thit ga', 'gà luộc', 'ga luoc', 'gà nướng', 'ga nuong', 'chicken'],
  },
  {
    id: 'pork-lean',
    label: 'Heo nạc (thịt nạc)',
    hint: '27g đạm · 198 kcal / 100g',
    per100g: { pro: 27, carb: 0, cal: 198 },
    defaultServingG: 120,
    keys: ['heo nạc', 'heo nac', 'thịt heo nạc', 'thit heo nac', 'lợn nạc', 'lon nac'],
  },
  {
    id: 'pork-shoulder',
    label: 'Vai / cổ heo',
    hint: '17g đạm · 248 kcal / 100g',
    per100g: { pro: 17, carb: 0, cal: 248 },
    defaultServingG: 120,
    keys: ['vai heo', 'cổ heo', 'co heo', 'thịt vai heo'],
  },
  {
    id: 'pork-belly',
    label: 'Ba chỉ heo',
    hint: '9g đạm · 518 kcal / 100g',
    per100g: { pro: 9, carb: 0, cal: 518 },
    defaultServingG: 80,
    keys: ['ba chỉ', 'ba chi', 'thịt ba chỉ', 'thit ba chi'],
  },
  {
    id: 'pork-ribs',
    label: 'Sườn heo',
    hint: '20g đạm · 290 kcal / 100g',
    per100g: { pro: 20, carb: 0, cal: 290 },
    defaultServingG: 150,
    keys: ['sườn heo', 'suon heo', 'sườn non', 'suon non'],
  },
  {
    id: 'pork-generic',
    label: 'Thịt heo (trung bình)',
    hint: '27g đạm · 242 kcal / 100g',
    per100g: { pro: 27, carb: 0, cal: 242 },
    defaultServingG: 120,
    keys: ['thịt heo', 'thit heo', 'heo', ' lợn', 'lon ', 'lợn', 'pork'],
  },
  {
    id: 'beef-lean',
    label: 'Bò nạc (thăn)',
    hint: '26g đạm · 250 kcal / 100g',
    per100g: { pro: 26, carb: 0, cal: 250 },
    defaultServingG: 150,
    keys: ['bò nạc', 'bo nac', 'thăn bò', 'than bo', 'thịt bò nạc', 'beef lean', 'steak'],
  },
  {
    id: 'beef-brisket',
    label: 'Bò bắp / nạm',
    hint: '21g đạm · 280 kcal / 100g',
    per100g: { pro: 21, carb: 0, cal: 280 },
    defaultServingG: 150,
    keys: ['bò bắp', 'bo bap', 'nạm bò', 'nam bo', 'bắp bò'],
  },
  {
    id: 'beef-ground',
    label: 'Bò xay',
    hint: '26g đạm · 254 kcal / 100g',
    per100g: { pro: 26, carb: 0, cal: 254 },
    defaultServingG: 120,
    keys: ['bò xay', 'bo xay', 'thịt bò xay', 'thit bo xay'],
  },
  {
    id: 'beef-generic',
    label: 'Thịt bò (trung bình)',
    hint: '26g đạm · 250 kcal / 100g',
    per100g: { pro: 26, carb: 0, cal: 250 },
    defaultServingG: 150,
    keys: ['thịt bò', 'thit bo', 'bò', ' bo ', 'beef', 'bít tết', 'bit tet'],
  },
  {
    id: 'duck',
    label: 'Vịt',
    hint: '19g đạm · 337 kcal / 100g',
    per100g: { pro: 19, carb: 0, cal: 337 },
    defaultServingG: 130,
    keys: ['vịt', 'vit ', 'thịt vịt', 'duck'],
  },
  {
    id: 'lamb',
    label: 'Cừu',
    hint: '25g đạm · 294 kcal / 100g',
    per100g: { pro: 25, carb: 0, cal: 294 },
    defaultServingG: 130,
    keys: ['cừu', 'cuu ', 'thịt cừu', 'lamb'],
  },
  {
    id: 'fish-basa',
    label: 'Cá basa / cá tra',
    hint: '15g đạm · 90 kcal / 100g',
    per100g: { pro: 15, carb: 0, cal: 90 },
    defaultServingG: 150,
    keys: ['cá basa', 'ca basa', 'cá tra', 'ca tra', 'basa'],
  },
  {
    id: 'fish-salmon',
    label: 'Cá hồi',
    hint: '20g đạm · 208 kcal / 100g',
    per100g: { pro: 20, carb: 0, cal: 208 },
    defaultServingG: 150,
    keys: ['cá hồi', 'ca hoi', 'hồi', 'salmon'],
  },
  {
    id: 'fish-generic',
    label: 'Cá fillet (trung bình)',
    hint: '20g đạm · 130 kcal / 100g',
    per100g: { pro: 20, carb: 0, cal: 130 },
    defaultServingG: 150,
    keys: ['cá', ' ca ', 'cá thu', 'ca thu', 'cá ngừ', 'fish'],
  },
  {
    id: 'seafood-shrimp',
    label: 'Tôm',
    hint: '24g đạm · 99 kcal / 100g',
    per100g: { pro: 24, carb: 0, cal: 99 },
    defaultServingG: 100,
    keys: ['tôm', 'tom ', 'shrimp'],
  },
  {
    id: 'seafood-squid',
    label: 'Mực',
    hint: '18g đạm · 92 kcal / 100g',
    per100g: { pro: 18, carb: 0, cal: 92 },
    defaultServingG: 120,
    keys: ['mực', 'muc ', 'squid'],
  },
];

export type MeatPickOption = {
  id: string;
  label: string;
  hint: string;
  per100g: NutritionTotals;
  preview: NutritionTotals;
  grams: number;
};

export type FoodEstimateResult =
  | { kind: 'ready'; macros: NutritionTotals; displayName: string; grams: number }
  | { kind: 'pick_meat'; input: string; grams: number; options: MeatPickOption[] };

const DEFAULT_TARGETS: NutritionTotals = { pro: 160, carb: 250, cal: 2200 };

type FoodProfile = {
  keys: string[];
  per100g: NutritionTotals;
  defaultServingG: number;
};

const NON_MEAT_PROFILES: FoodProfile[] = [
  { keys: ['trứng', 'trung', 'egg'], per100g: { pro: 13, carb: 1, cal: 155 }, defaultServingG: 50 },
  { keys: ['whey', 'protein powder'], per100g: { pro: 80, carb: 8, cal: 400 }, defaultServingG: 30 },
  { keys: ['phở', 'pho', 'bún bò', 'bun bo', 'hủ tiếu', 'hu tieu'], per100g: { pro: 6, carb: 12, cal: 95 }, defaultServingG: 500 },
  { keys: ['cơm', 'com ', 'cơm trắng', 'rice', 'gạo'], per100g: { pro: 2.7, carb: 28, cal: 130 }, defaultServingG: 200 },
  { keys: ['bánh mì', 'banh mi', 'bread'], per100g: { pro: 9, carb: 50, cal: 280 }, defaultServingG: 80 },
  { keys: ['mì', 'mi ', 'pasta', 'noodle', 'bún', 'bun '], per100g: { pro: 5, carb: 25, cal: 140 }, defaultServingG: 250 },
  { keys: ['bánh', 'banh ', 'cookie', 'snack', 'kẹo', 'keo'], per100g: { pro: 6, carb: 45, cal: 350 }, defaultServingG: 60 },
  { keys: ['sữa', 'sua ', 'milk', 'yogurt', 'sữa chua'], per100g: { pro: 3.4, carb: 5, cal: 60 }, defaultServingG: 250 },
  { keys: ['trà sữa', 'tra sua', 'bubble tea'], per100g: { pro: 1, carb: 10, cal: 55 }, defaultServingG: 500 },
  { keys: ['cà phê', 'ca phe', 'coffee'], per100g: { pro: 0.5, carb: 3, cal: 20 }, defaultServingG: 300 },
  { keys: ['rau', 'salad', 'rau củ', 'rau cu', 'vegetable'], per100g: { pro: 2, carb: 4, cal: 25 }, defaultServingG: 150 },
  { keys: ['trái cây', 'trai cay', 'chuối', 'chuoi', 'táo', 'tao ', 'fruit'], per100g: { pro: 1, carb: 14, cal: 60 }, defaultServingG: 120 },
  { keys: ['đậu', 'dau ', 'đậu hũ', 'dau hu', 'tofu'], per100g: { pro: 8, carb: 2, cal: 76 }, defaultServingG: 150 },
];

const SERVING_HINTS: { pattern: RegExp; grams: number }[] = [
  { pattern: /\b(tô|to)\b/, grams: 500 },
  { pattern: /\b(bát|bat)\b/, grams: 350 },
  { pattern: /\b(ly|cốc|coc|chai)\b/, grams: 300 },
  { pattern: /\b(phần|phan|suất|suat|dĩa|dia)\b/, grams: 250 },
  { pattern: /\b(miếng|mien)\b/, grams: 100 },
];

const GENERIC_MEAT_PATTERN = /\b(thịt|thit|meat|protein động vật)\b/i;

export function todayIsoLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function normalizeFoodLogItem(item: FoodLogItem): FoodLogItem {
  return {
    ...item,
    dateIso: item.dateIso || todayIsoLocal(),
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
    (acc, f) => ({
      pro: acc.pro + f.pro,
      carb: acc.carb + f.carb,
      cal: acc.cal + f.cal,
    }),
    { pro: 0, carb: 0, cal: 0 },
  );
}

export function roundNutrition(t: NutritionTotals): NutritionTotals {
  return { pro: Math.round(t.pro), carb: Math.round(t.carb), cal: Math.round(t.cal) };
}

export function addNutrition(a: NutritionTotals, b: NutritionTotals): NutritionTotals {
  return roundNutrition({
    pro: a.pro + b.pro,
    carb: a.carb + b.carb,
    cal: a.cal + b.cal,
  });
}

export function macrosFromPer100g(per100g: NutritionTotals, grams: number): NutritionTotals {
  const factor = grams / 100;
  return roundNutrition({
    pro: per100g.pro * factor,
    carb: per100g.carb * factor,
    cal: per100g.cal * factor,
  });
}

function splitFoodSegments(input: string): string[] {
  return input
    .split(/[,;+]|(?:\s+và\s+)|(?:\s+with\s+)/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function parseGramsFromInput(text: string): number | null {
  const m = text.match(/(\d+(?:[.,]\d+)?)\s*(?:g|gram|gr|gam)\b/i);
  if (!m) return null;
  return Number(m[1]!.replace(',', '.'));
}

function parseCountMultiplier(text: string): number {
  const egg = text.match(/(\d+)\s*(?:quả|qua)?\s*trứng/i) || text.match(/(\d+)\s*(?:quả|qua)?\s*trung/i);
  if (egg) return Number(egg[1]);
  const generic = text.match(/(\d+)\s*(?:miếng|mien|phần|phan|suất|suat|ly|cốc|coc)\b/i);
  if (generic) return Number(generic[1]);
  return 1;
}

function resolveServingGrams(text: string, defaultServingG: number): number {
  const explicit = parseGramsFromInput(text);
  if (explicit != null && explicit > 0) return explicit;

  for (const hint of SERVING_HINTS) {
    if (hint.pattern.test(text)) return hint.grams;
  }

  const count = parseCountMultiplier(text);
  return defaultServingG * Math.max(1, count);
}

function normalizeForMatch(text: string): string {
  return text.toLowerCase().trim();
}

function keySpecificityScore(entry: MeatCatalogEntry, key: string): number {
  let score = key.length;
  if (entry.id.endsWith('-generic')) score -= 50;
  return score;
}

function matchMeatEntries(text: string): MeatCatalogEntry[] {
  const normalized = normalizeForMatch(text);
  const hits: MeatCatalogEntry[] = [];
  for (const entry of MEAT_CATALOG) {
    const matched = entry.keys.some((k) => normalized.includes(k));
    if (matched) hits.push(entry);
  }
  return hits.sort((a, b) => {
    const aScore = Math.max(...a.keys.map((k) => keySpecificityScore(a, k)));
    const bScore = Math.max(...b.keys.map((k) => keySpecificityScore(b, k)));
    return bScore - aScore;
  });
}

type MeatFamily = 'chicken' | 'pork' | 'beef' | 'fish' | 'seafood' | 'duck' | 'lamb';

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

function matchNonMeatProfile(text: string): FoodProfile | null {
  const normalized = normalizeForMatch(text);
  for (const profile of NON_MEAT_PROFILES) {
    if (profile.keys.some((k) => normalized.includes(k))) return profile;
  }
  return null;
}

function hasExplicitMeatCut(text: string): boolean {
  const n = normalizeForMatch(text);
  const cutMarkers = [
    'ức',
    'uc ',
    'đùi',
    'dui',
    'cánh',
    'canh',
    'nạc',
    'nac',
    'ba chỉ',
    'ba chi',
    'sườn',
    'suon',
    'thăn',
    'than',
    'bắp',
    'bap',
    'nạm',
    'nam',
    'xay',
    'basa',
    'hồi',
    'hoi',
    'tôm',
    'tom',
    'mực',
    'muc',
  ];
  return cutMarkers.some((m) => n.includes(m));
}

function needsMeatPicker(text: string): boolean {
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

function buildMeatPickOptions(text: string, grams: number): MeatPickOption[] {
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

export type MeatCatalogGroup = { title: string; entries: MeatCatalogEntry[] };

export const MEAT_CATALOG_GROUPS: MeatCatalogGroup[] = [
  { title: 'Gà', entries: MEAT_CATALOG.filter((e) => e.id.startsWith('chicken')) },
  { title: 'Heo / lợn', entries: MEAT_CATALOG.filter((e) => e.id.startsWith('pork')) },
  { title: 'Bò', entries: MEAT_CATALOG.filter((e) => e.id.startsWith('beef')) },
  {
    title: 'Cá & hải sản',
    entries: MEAT_CATALOG.filter((e) => e.id.startsWith('fish') || e.id.startsWith('seafood')),
  },
  { title: 'Khác', entries: MEAT_CATALOG.filter((e) => e.id.startsWith('duck') || e.id.startsWith('lamb')) },
];

export function getMeatCatalogEntry(meatId: string): MeatCatalogEntry | undefined {
  return MEAT_CATALOG.find((e) => e.id === meatId);
}

export function estimateFromMeatId(input: string, meatId: string): FoodEstimateResult {
  const entry = getMeatCatalogEntry(meatId);
  if (!entry) {
    return { kind: 'ready', macros: { pro: 0, carb: 0, cal: 0 }, displayName: input.trim(), grams: 0 };
  }
  const grams = resolveServingGrams(input, entry.defaultServingG);
  const macros = macrosFromPer100g(entry.per100g, grams);
  const displayName = formatFoodDisplayName(input, entry.label, grams);
  return { kind: 'ready', macros, displayName, grams };
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

function estimateSingleSegment(input: string): FoodEstimateResult {
  const text = input.trim();
  if (!text) return { kind: 'ready', macros: { pro: 0, carb: 0, cal: 0 }, displayName: '', grams: 0 };

  if (needsMeatPicker(text)) {
    const grams = resolveServingGrams(text, 120);
    return { kind: 'pick_meat', input: text, grams, options: buildMeatPickOptions(text, grams) };
  }

  const meatHits = matchMeatEntries(text);
  if (meatHits.length >= 1) {
    const entry = meatHits.find((h) => !h.id.endsWith('-generic')) ?? meatHits[0]!;
    const grams = resolveServingGrams(text, entry.defaultServingG);
    return {
      kind: 'ready',
      macros: macrosFromPer100g(entry.per100g, grams),
      displayName: formatFoodDisplayName(text, entry.label, grams),
      grams,
    };
  }

  const nonMeat = matchNonMeatProfile(text);
  if (nonMeat) {
    const grams = resolveServingGrams(text, nonMeat.defaultServingG);
    const macros = macrosFromPer100g(nonMeat.per100g, grams);
    return { kind: 'ready', macros, displayName: text, grams };
  }

  const grams = parseGramsFromInput(text);
  if (grams != null && grams > 0) {
    return {
      kind: 'ready',
      macros: roundNutrition({ pro: grams * 0.08, carb: grams * 0.12, cal: grams * 1.2 }),
      displayName: text,
      grams,
    };
  }

  return { kind: 'ready', macros: { pro: 8, carb: 22, cal: 180 }, displayName: text, grams: 120 };
}

/** Phân tích một dòng nhập — có thể yêu cầu chọn loại thịt. */
export function analyzeFoodInput(input: string): FoodEstimateResult {
  const segments = splitFoodSegments(input);
  if (segments.length <= 1) return estimateSingleSegment(input);

  for (const seg of segments) {
    const result = estimateSingleSegment(seg);
    if (result.kind === 'pick_meat') return result;
  }

  let total: NutritionTotals = { pro: 0, carb: 0, cal: 0 };
  const names: string[] = [];
  for (const seg of segments) {
    const result = estimateSingleSegment(seg);
    if (result.kind === 'ready') {
      total = addNutrition(total, result.macros);
      names.push(result.displayName);
    }
  }
  return { kind: 'ready', macros: total, displayName: names.join(', '), grams: 0 };
}

export function estimateMacrosFromSingle(input: string): NutritionTotals {
  const result = analyzeFoodInput(input);
  if (result.kind === 'pick_meat') {
    return result.options[0]?.preview ?? { pro: 0, carb: 0, cal: 0 };
  }
  return result.macros;
}

export function estimateMacrosFromInput(input: string): NutritionTotals {
  const result = analyzeFoodInput(input);
  if (result.kind === 'pick_meat') {
    return { pro: 0, carb: 0, cal: 0 };
  }
  return result.macros;
}

export function resolveDailyNutritionTargets(latestBmi: BmiEntry | null | undefined): NutritionTotals {
  if (!latestBmi?.weightKg || !latestBmi?.heightCm) return { ...DEFAULT_TARGETS };

  const w = latestBmi.weightKg;
  const h = latestBmi.heightCm;
  const bmr = 10 * w + 6.25 * h - 5 * 30 + 5;
  const cal = Math.round(Math.max(1400, Math.min(3500, bmr * 1.375)));
  const pro = Math.round(Math.max(60, Math.min(220, w * 1.6)));
  const carbCal = Math.max(0, cal - pro * 4);
  const carb = Math.round(Math.max(80, Math.min(400, (carbCal * 0.5) / 4)));

  return { pro, carb, cal };
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
      cal: 480,
      dateIso: today,
    }),
  ];
}
