/**
 * Nạp chat-scenarios.bundle.json + phân loại tình huống chat AI.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  createClassifier,
  normalizeVi,
  clearClassifierCache,
  getClassifierCacheSize,
} from './chatClassifier.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');

/** @type {ReturnType<typeof buildConfig> | null} */
let cached = null;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function buildConfig() {
  const manifestPath = path.join(dataDir, 'chat-scenarios.json');
  const manifest = readJson(manifestPath);
  const bundleFile = manifest.bundleFile || 'chat-scenarios.bundle.json';
  const bundlePath = path.join(dataDir, bundleFile);
  const bundle = readJson(bundlePath);
  const scenarios = bundle.scenarios ?? [];

  /** @type {Array<{ scenarioId: string; weight: number; match: object; mode?: string }>} */
  const rules = [];
  /** @type {Record<string, string>} */
  const cannedReplies = {};

  for (const s of scenarios) {
    if (s.mode === 'instant' && s.reply) cannedReplies[s.id] = s.reply;
    if (s.match) {
      rules.push({
        scenarioId: s.id,
        weight: s.weight ?? 0,
        match: s.match,
        mode: s.mode,
      });
    }
  }

  if (!rules.some((r) => r.scenarioId === 'general')) {
    rules.push({ scenarioId: 'general', weight: 0, match: { type: 'fallback' } });
  }

  const catalog = scenarios.map((s) => ({
    id: s.id,
    label: s.label,
    weight: s.weight ?? 0,
    mode: s.mode,
  }));

  const instantIds = new Set(scenarios.filter((s) => s.mode === 'instant').map((s) => s.id));
  const classifier = createClassifier(rules);
  const scenarioById = new Map(scenarios.map((s) => [s.id, s]));

  return {
    manifest,
    bundle,
    catalog,
    rules,
    cannedReplies,
    scenarioCount: bundle.scenarioCount ?? scenarios.length,
    instantCount: bundle.instantCount ?? instantIds.size,
    instantIds,
    defaults: bundle.defaults ?? manifest.defaults ?? {},
    emptyMessage: bundle.emptyMessage ?? manifest.emptyMessage ?? {
      intent: 'general',
      mode: 'instant',
      reply: 'Gửi giúp một câu hỏi ngắn.',
    },
    classifier,
    classifierStats: classifier.stats,
    scenarioById,
  };
}

export { normalizeVi, getClassifierCacheSize };

export function resetChatScenariosCache() {
  cached = null;
  clearClassifierCache();
}

export function loadChatScenariosConfig() {
  if (!cached) cached = buildConfig();
  return cached;
}

export function getChatScenarioRuntime() {
  return loadChatScenariosConfig();
}

function scenarioForId(cfg, id) {
  return cfg.scenarioById.get(id) ?? cfg.scenarioById.get('general');
}

export function classifyFromScenarios(text) {
  const cfg = loadChatScenariosConfig();
  const raw = String(text || '').trim();
  if (!raw) return { kind: cfg.emptyMessage.intent ?? 'general' };
  const id = cfg.classifier.classify(raw);
  return { kind: id };
}

export function resolveChatIntent(text) {
  const cfg = loadChatScenariosConfig();
  const raw = String(text || '').trim();
  if (!raw) {
    const em = cfg.emptyMessage;
    return { kind: em.intent ?? 'general', mode: em.mode ?? 'instant', reply: em.reply ?? '' };
  }

  const id = cfg.classifier.classify(raw);
  const scenario = scenarioForId(cfg, id);
  const defs = cfg.defaults ?? {};

  if (scenario.mode === 'instant') {
    return {
      kind: scenario.id,
      mode: 'instant',
      reply: scenario.reply ?? cfg.cannedReplies[scenario.id] ?? '',
    };
  }

  const llm = scenario.llm ?? {};
  return {
    kind: scenario.id,
    mode: 'llm',
    systemAddon: llm.systemAddon ?? '',
    opts: {
      max_tokens: llm.maxTokens ?? defs.maxTokens ?? 560,
      temperature: llm.temperature ?? defs.temperature ?? 0.58,
    },
  };
}
