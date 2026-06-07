export const SERVING_HINTS: { pattern: RegExp; grams: number }[] = [
  { pattern: /\b(tô|to)\b/, grams: 500 },
  { pattern: /\b(bát|bat)\b/, grams: 350 },
  { pattern: /\b(ly|cốc|coc|chai)\b/, grams: 300 },
  { pattern: /\b(phần|phan|suất|suat|dĩa|dia)\b/, grams: 250 },
  { pattern: /\b(miếng|mien)\b/, grams: 100 },
  { pattern: /\b(cuốn|cuon)\b/, grams: 80 },
  { pattern: /\b(hộp|hop)\b/, grams: 200 },
];

export function parseGramsFromInput(text: string): number | null {
  const m = text.match(/(\d+(?:[.,]\d+)?)\s*(?:g|gram|gr|gam)\b/i);
  if (!m) return null;
  return Number(m[1]!.replace(',', '.'));
}

export function parseCountMultiplier(text: string): number {
  const egg = text.match(/(\d+)\s*(?:quả|qua)?\s*trứng/i) || text.match(/(\d+)\s*(?:quả|qua)?\s*trung/i);
  if (egg) return Number(egg[1]);
  const generic = text.match(/(\d+)\s*(?:miếng|mien|phần|phan|suất|suat|ly|cốc|coc|cuốn|cuon|tô|to)\b/i);
  if (generic) return Number(generic[1]);
  return 1;
}

export function resolveServingGrams(text: string, defaultServingG: number): number {
  const explicit = parseGramsFromInput(text);
  if (explicit != null && explicit > 0) return explicit;

  for (const hint of SERVING_HINTS) {
    if (hint.pattern.test(text)) return hint.grams;
  }

  const count = parseCountMultiplier(text);
  return defaultServingG * Math.max(1, count);
}
