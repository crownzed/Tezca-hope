/**
 * Phân loại tình huống chat — thuật toán tối ưu:
 * 1) LRU cache theo chuỗi đã chuẩn hóa
 * 2) Rule đặc biệt (regex/exact/short) theo weight — thoát sớm nếu weight ≥ ngưỡng
 * 3) Inverted index theo token + cụm từ (chỉ verify ứng viên, không quét ~1000+ keyword)
 */

const LRU_MAX = 2048;
const EARLY_EXIT_WEIGHT = 100;

/** Chủ đề lõi (topic_*) thắng catalog fit_/food_/fast_* khi cùng weight. */
function tieRank(id) {
  if (id.startsWith('topic_')) return 3;
  if (id === 'general' || id.startsWith('greeting') || id.startsWith('thanks')) return 2;
  return 1;
}

/** @param {string} n @param {string} kw */
function keywordStartIndex(n, kw) {
  if (kw.length <= 4) {
    const esc = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const m = n.match(new RegExp(`(?:^|\\s)${esc}(?:\\s|$)`));
    return m?.index ?? -1;
  }
  const i = n.indexOf(kw);
  return i < 0 ? -1 : i;
}

/** @type {Map<string, string>} */
const classifyLru = new Map();

/**
 * @param {string} key
 * @param {string} value
 */
function lruSet(key, value) {
  if (classifyLru.has(key)) classifyLru.delete(key);
  classifyLru.set(key, value);
  if (classifyLru.size > LRU_MAX) {
    const oldest = classifyLru.keys().next().value;
    classifyLru.delete(oldest);
  }
}

/**
 * @param {import('./loadChatScenarios.js').normalizeVi} normalizeVi
 * @param {(n: string, kw: string) => boolean} keywordMatchesNormalized
 * @param {ReturnType<typeof import('./loadChatScenarios.js').loadChatScenariosConfig>} cfg
 */
export function buildChatClassifier(cfg, normalizeVi, keywordMatchesNormalized) {
  const MIN_TOKEN_LEN = 4;

  /** @type {Map<string, Array<{ id: string; weight: number; kw: string }>>} */
  const tokenIndex = new Map();

  /** @type {Array<{ id: string; weight: number; kw: string }>} */
  const multiWord = [];

  /** @type {Array<{ id: string; weight: number; kw: string }>} */
  const shortSingle = [];

  for (const s of cfg.rawScenarios ?? []) {
    if (s.match?.type !== 'keywords') continue;
    const weight = Number(s.weight) || 0;
    for (const phrase of s.match.any ?? []) {
      const kw = normalizeVi(phrase);
      if (!kw) continue;
      const parts = kw.split(' ').filter(Boolean);
      const entry = { id: s.id, weight, kw };
      if (parts.length <= 1) {
        if (parts[0].length < MIN_TOKEN_LEN) {
          shortSingle.push(entry);
          continue;
        }
        const token = parts[0];
        if (!tokenIndex.has(token)) tokenIndex.set(token, []);
        const list = tokenIndex.get(token);
        if (!list.some((e) => e.id === s.id && e.kw === kw)) list.push(entry);
      } else {
        multiWord.push(entry);
      }
    }
  }

  for (const list of tokenIndex.values()) {
    list.sort((a, b) => b.weight - a.weight);
  }
  multiWord.sort((a, b) => b.kw.length - a.kw.length);
  shortSingle.sort((a, b) => b.weight - a.weight);

  /** @type {Map<string, string>} */
  const exactMap = new Map();
  for (const rule of cfg.specialRules) {
    if (rule.matchDef?.type === 'exact') {
      for (const p of rule.matchDef.phrases ?? []) {
        exactMap.set(normalizeVi(p), rule.id);
      }
    }
  }

  /**
   * @param {string} n
   * @param {string} raw
   */
  function collectKeywordScores(n, raw) {
    /** @type {Map<string, { weight: number; kwLen: number; pos: number }>} */
    const scores = new Map();
    const words = n.split(' ').filter(Boolean);
    if (words.length === 0) return scores;

    const seenPair = new Set();

    const consider = (id, weight, kw) => {
      const rule = cfg.ruleById.get(id);
      if (!rule || !rule.match(n, raw)) return;
      const kwLen = kw.length;
      const pos = keywordStartIndex(n, kw);
      const prev = scores.get(id);
      if (
        prev == null ||
        weight > prev.weight ||
        (weight === prev.weight && pos >= 0 && (prev.pos < 0 || pos < prev.pos)) ||
        (weight === prev.weight && pos === prev.pos && kwLen > prev.kwLen)
      ) {
        scores.set(id, { weight, kwLen, pos });
      }
    };

    for (const w of words) {
      if (w.length < MIN_TOKEN_LEN) continue;
      const entries = tokenIndex.get(w);
      if (!entries) continue;
      for (const e of entries) {
        const key = `${e.id}\0${e.kw}`;
        if (seenPair.has(key)) continue;
        seenPair.add(key);
        consider(e.id, e.weight, e.kw);
      }
    }

    for (const m of multiWord) {
      if (!keywordMatchesNormalized(n, m.kw)) continue;
      consider(m.id, m.weight, m.kw);
    }

    for (const s of shortSingle) {
      if (!keywordMatchesNormalized(n, s.kw)) continue;
      consider(s.id, s.weight, s.kw);
    }

    return scores;
  }

  /**
   * @param {string} raw
   * @param {string} n
   * @returns {string | null}
   */
  function classify(n, raw) {
    const cached = classifyLru.get(n);
    if (cached !== undefined) return cached === '' ? null : cached;

    if (exactMap.has(n)) {
      const id = exactMap.get(n);
      lruSet(n, id);
      return id;
    }

    for (const rule of cfg.specialRules) {
      if (!rule.match(n, raw)) continue;
      if (rule.weight >= EARLY_EXIT_WEIGHT) {
        lruSet(n, rule.id);
        return rule.id;
      }
    }

    const scores = collectKeywordScores(n, raw);
    let bestId = null;
    let bestWeight = -1;
    let bestRank = -1;
    let bestPos = Number.POSITIVE_INFINITY;
    let bestKwLen = -1;
    for (const [id, { weight, kwLen, pos }] of scores) {
      const rank = tieRank(id);
      const posScore = pos < 0 ? Number.POSITIVE_INFINITY : pos;
      if (
        weight > bestWeight ||
        (weight === bestWeight && rank > bestRank) ||
        (weight === bestWeight && rank === bestRank && posScore < bestPos) ||
        (weight === bestWeight && rank === bestRank && posScore === bestPos && kwLen > bestKwLen)
      ) {
        bestWeight = weight;
        bestRank = rank;
        bestPos = posScore;
        bestKwLen = kwLen;
        bestId = id;
      }
    }

    for (const rule of cfg.specialRules) {
      if (!rule.match(n, raw)) continue;
      const rank = tieRank(rule.id);
      if (
        !bestId ||
        rule.weight > bestWeight ||
        (rule.weight === bestWeight && rank > bestRank)
      ) {
        bestId = rule.id;
        bestWeight = rule.weight;
        bestRank = rank;
        bestKwLen = 0;
      }
    }

    lruSet(n, bestId ?? '');
    return bestId;
  }

  return {
    classify,
    tokenIndexSize: tokenIndex.size,
    multiWordSize: multiWord.size,
    shortSingleSize: shortSingle.length,
  };
}

export function resetClassifierCache() {
  classifyLru.clear();
}

export function getClassifierCacheSize() {
  return classifyLru.size;
}
