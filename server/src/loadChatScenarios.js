/**
 * Đọc chat-scenarios.bundle.json + bộ phân loại tối ưu (token index, LRU, early exit).
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildChatClassifier, resetClassifierCache } from './chatClassifier.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '../data');
const MANIFEST_PATH = join(dataDir, 'chat-scenarios.json');
const LEGACY_PATH = join(dataDir, 'chat-scenarios.json');
const BUNDLE_PATH = join(dataDir, 'chat-scenarios.bundle.json');

/** @typedef {'instant'|'llm'} ScenarioMode */

export function normalizeVi(text) {
  return String(text)
    .replace(/[đĐ]/g, 'd')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function keywordsPattern(phrases) {
  const parts = phrases
    .map((p) => String(p).trim())
    .filter(Boolean)
    .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (parts.length === 0) return null;
  return new RegExp(`(${parts.join('|')})`);
}

function compileMatcher(match) {
  const type = match?.type ?? 'fallback';

  if (type === 'fallback') return () => false;

  if (type === 'regex') {
    const re = new RegExp(String(match.pattern));
    return (n) => re.test(n);
  }

  if (type === 'exact') {
    const set = new Set((match.phrases ?? []).map((p) => normalizeVi(p)));
    return (n) => set.has(n);
  }

  if (type === 'keywords') {
    const inc = keywordsPattern(match.any ?? []);
    const exc = keywordsPattern(match.none ?? []);
    return (n) => Boolean(inc?.test(n)) && !(exc?.test(n));
  }

  if (type === 'short') {
    const maxChars = Number(match.maxChars) || 18;
    const block = keywordsPattern(match.none ?? []);
    const blockIf = keywordsPattern(match.noneIfAny ?? []);
    return (n, raw) => {
      const t = raw.trim();
      if (block?.test(n) || blockIf?.test(n)) return false;
      return t.length > 0 && t.length <= maxChars;
    };
  }

  throw new Error(`match.type không hỗ trợ: ${type}`);
}

/** @param {string} n @param {string} kw */
export function keywordMatchesNormalized(n, kw) {
  if (kw.length <= 4) {
    const esc = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?:^|\\s)${esc}(?:\\s|$)`).test(n);
  }
  return n.includes(kw);
}

function validateScenario(s) {
  if (!s.id || typeof s.id !== 'string') throw new Error('scenario thiếu id');
  if (s.mode === 'instant' && !s.reply?.trim()) {
    throw new Error(`scenario "${s.id}" mode=instant cần reply`);
  }
  if (s.weight > 0 && s.match?.type === 'fallback') {
    throw new Error(`scenario "${s.id}" không được dùng fallback với weight > 0`);
  }
}

function resolveDataPaths() {
  const manifest = existsSync(MANIFEST_PATH)
    ? JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'))
    : null;

  if (manifest?.bundleFile) {
    const bundlePath = join(dataDir, manifest.bundleFile);
    if (!existsSync(bundlePath)) {
      throw new Error(
        `Thiếu ${manifest.bundleFile} — chạy: npm run chat:scenarios:build (trong thư mục server)`,
      );
    }
    return { manifest, bundlePath, raw: JSON.parse(readFileSync(bundlePath, 'utf8')) };
  }

  if (existsSync(BUNDLE_PATH)) {
    return {
      manifest: manifest ?? {},
      bundlePath: BUNDLE_PATH,
      raw: JSON.parse(readFileSync(BUNDLE_PATH, 'utf8')),
    };
  }

  return {
    manifest: manifest ?? {},
    bundlePath: LEGACY_PATH,
    raw: JSON.parse(readFileSync(LEGACY_PATH, 'utf8')),
  };
}

/** @type {ReturnType<typeof loadChatScenariosConfig> | null} */
let cached = null;

export function loadChatScenariosConfig() {
  if (cached) return cached;

  const { manifest, raw } = resolveDataPaths();
  const defaults = { ...manifest.defaults, ...raw.defaults };
  const baseMax = defaults.maxTokens ?? 560;
  const baseTemp = defaults.temperature ?? 0.58;

  const byId = new Map();
  const rules = [];
  const profiles = new Map();
  const instantIds = new Set();
  const cannedReplies = {};

  for (const s of raw.scenarios ?? []) {
    validateScenario(s);
    if (byId.has(s.id)) throw new Error(`trùng scenario id: ${s.id}`);
    byId.set(s.id, s);

    const llm = s.llm ?? {};
    profiles.set(s.id, {
      systemAddon: llm.systemAddon ?? '',
      opts: {
        max_tokens: llm.maxTokens ?? baseMax,
        temperature: llm.temperature ?? baseTemp,
      },
      mode: s.mode,
      reply: s.reply,
    });

    if (s.mode === 'instant') {
      instantIds.add(s.id);
      if (s.reply) cannedReplies[s.id] = s.reply;
    }

    if (s.match?.type !== 'fallback') {
      rules.push({
        id: s.id,
        weight: Number(s.weight) || 0,
        match: compileMatcher(s.match),
        matchDef: s.match,
      });
    }
  }

  const general = profiles.get('general');
  if (!general) throw new Error('Thiếu scenario "general"');

  rules.sort((a, b) => b.weight - a.weight);

  const specialRules = rules.filter((r) => r.matchDef?.type !== 'keywords');
  const ruleById = new Map(rules.map((r) => [r.id, r]));

  const cfgShell = {
    rawScenarios: raw.scenarios ?? [],
    specialRules,
    ruleById,
  };

  const classifier = buildChatClassifier(cfgShell, normalizeVi, keywordMatchesNormalized);

  cached = {
    version: raw.version ?? manifest.version,
    scenarioCount: raw.scenarioCount ?? raw.scenarios?.length ?? 0,
    instantCount: raw.instantCount ?? instantIds.size,
    emptyMessage: { ...manifest.emptyMessage, ...raw.emptyMessage },
    rules,
    ruleById,
    specialRules,
    profiles,
    instantIds,
    cannedReplies,
    fallbackProfile: general,
    classifier,
    classifierStats: {
      tokenBuckets: classifier.tokenIndexSize,
      multiWordPhrases: classifier.multiWordSize,
      shortSingleKeywords: classifier.shortSingleSize,
      lruMax: 2048,
    },
    catalog: (raw.scenarios ?? []).map((s) => ({
      id: s.id,
      label: s.label ?? s.id,
      weight: s.weight ?? 0,
      mode: s.mode,
    })),
  };

  return cached;
}

export function resetChatScenariosCache() {
  cached = null;
  resetClassifierCache();
}

/**
 * Phân loại + profile trong một lần (dùng cho planChatTurn).
 * @param {string} userText
 */
export function resolveChatIntent(userText) {
  const cfg = loadChatScenariosConfig();
  const raw = String(userText || '').trim();

  if (!raw) {
    const fb = cfg.fallbackProfile;
    const kind = cfg.emptyMessage.intent ?? 'general';
    return {
      kind,
      systemAddon: fb.systemAddon,
      opts: { ...fb.opts },
      mode: cfg.instantIds.has(kind) ? 'instant' : 'llm',
      reply: cfg.cannedReplies[kind],
    };
  }

  const n = normalizeVi(raw);
  const kind = cfg.classifier.classify(n, raw) ?? 'general';
  const profile = cfg.profiles.get(kind) ?? cfg.fallbackProfile;
  return {
    kind,
    systemAddon: profile.systemAddon,
    opts: { ...profile.opts },
    mode: profile.mode,
    reply: profile.reply,
  };
}

export function classifyFromScenarios(userText) {
  const r = resolveChatIntent(userText);
  return {
    kind: r.kind,
    systemAddon: r.systemAddon,
    opts: r.opts,
  };
}

export function getChatScenarioRuntime() {
  const cfg = loadChatScenariosConfig();
  return {
    emptyMessage: cfg.emptyMessage,
    instantIds: cfg.instantIds,
    cannedReplies: cfg.cannedReplies,
    catalog: cfg.catalog,
    scenarioCount: cfg.scenarioCount,
    instantCount: cfg.instantCount,
    classifierStats: cfg.classifierStats,
  };
}
