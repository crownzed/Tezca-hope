import { normalizeVi } from '../../textNormalize';

/** Khoảng cách Levenshtein — dùng cho typo tiếng Việt không dấu. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = i - 1;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const next = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = row[j];
      row[j] = next;
    }
  }
  return row[b.length]!;
}

export function fuzzyIncludes(haystack: string, needle: string): boolean {
  const h = normalizeVi(haystack);
  const n = normalizeVi(needle);
  if (!n) return false;
  if (h.includes(n)) return true;
  if (n.length < 4) return false;
  const words = h.split(/\s+/);
  for (const w of words) {
    if (w.length >= 3 && levenshtein(w, n) <= Math.max(1, Math.floor(n.length * 0.25))) {
      return true;
    }
  }
  return false;
}

export function fuzzyKeyScore(text: string, key: string): number {
  const n = normalizeVi(text);
  const k = normalizeVi(key);
  if (!k) return 0;
  if (n.includes(k)) return k.length + (k.length > 5 ? 10 : 0);
  if (k.length < 4) return 0;
  const dist = levenshtein(n, k);
  if (dist <= 2) return Math.max(0, 8 - dist);
  return 0;
}
