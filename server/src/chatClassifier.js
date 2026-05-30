/**
 * Phân loại rule-based — LRU + quét theo weight (tối ưu early-exit khẩn cấp).
 */

const LRU_MAX = 2048;
/** @type {Map<string, string>} */
const lru = new Map();

export function normalizeVi(text) {
  return String(text)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchRule(normalized, rule) {
  const m = rule.match;
  if (!m) return false;
  if (m.type === 'fallback') return rule.scenarioId === 'general';
  if (m.type === 'exact') {
    const values = m.values ?? (m.pattern ? [m.pattern] : []);
    return values.some((t) => normalized === normalizeVi(t));
  }
  if (m.type === 'short') {
    return normalized.length > 0 && normalized.length <= (m.maxChars ?? 12);
  }
  if (m.type === 'regex') {
    try {
      return new RegExp(m.pattern, 'i').test(normalized);
    } catch {
      return false;
    }
  }
  if (m.type === 'keywords') {
    const any = (m.any ?? []).map((k) => normalizeVi(k));
    const none = (m.none ?? []).map((k) => normalizeVi(k));
    if (none.some((k) => k && normalized.includes(k))) return false;
    if (!any.length) return false;
    return any.some((k) => k && normalized.includes(k));
  }
  return false;
}

/**
 * @param {Array<{ scenarioId: string; weight: number; match: object }>} rules
 */
export function createClassifier(rules) {
  const ordered = [...rules].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0));

  function classify(text) {
    const normalized = normalizeVi(text);
    if (!normalized) return 'general';
    if (lru.has(normalized)) return lru.get(normalized);

    let best = 'general';
    let bestW = -1;
    for (const rule of ordered) {
      if (!matchRule(normalized, rule)) continue;
      const w = rule.weight ?? 0;
      if (w > bestW) {
        bestW = w;
        best = rule.scenarioId;
      }
      if (w >= 100) break;
    }

    lru.set(normalized, best);
    if (lru.size > LRU_MAX) {
      const first = lru.keys().next().value;
      lru.delete(first);
    }
    return best;
  }

  return {
    classify,
    stats: {
      lruMax: LRU_MAX,
      tokenBuckets: 0,
      multiWordPhrases: ordered.length,
    },
  };
}

export function getClassifierCacheSize() {
  return lru.size;
}

export function clearClassifierCache() {
  lru.clear();
}
