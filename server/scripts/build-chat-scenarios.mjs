/**
 * Build chat-scenarios.bundle.json từ core + catalog (500+ tình huống).
 * node server/scripts/build-chat-scenarios.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCatalogScenarios } from '../data/chat-scenario-seeds/catalog.mjs';
import { buildInstantScenarios } from '../data/chat-scenario-seeds/instant-catalog.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '../data');
const corePath = join(dataDir, 'chat-scenarios.core.json');
const bundlePath = join(dataDir, 'chat-scenarios.bundle.json');
const manifestPath = join(dataDir, 'chat-scenarios.json');

const core = JSON.parse(readFileSync(corePath, 'utf8'));
const catalog = buildCatalogScenarios();
const instant = buildInstantScenarios();

const coreIds = new Set((core.scenarios ?? []).map((s) => s.id));
for (const s of [...catalog, ...instant]) {
  if (coreIds.has(s.id)) {
    console.error(`Catalog trùng id với core: ${s.id}`);
    process.exit(1);
  }
}

const instantCount = instant.filter((s) => s.mode === 'instant').length;

const bundle = {
  version: 2,
  generatedAt: new Date().toISOString(),
  description: 'Auto-generated — core + catalog (LLM) + instant-catalog (phản hồi nhanh)',
  defaults: core.defaults,
  emptyMessage: core.emptyMessage,
  scenarioCount: (core.scenarios?.length ?? 0) + catalog.length + instant.length,
  instantCount,
  scenarios: [...(core.scenarios ?? []), ...instant, ...catalog],
};

writeFileSync(bundlePath, JSON.stringify(bundle, null, 0), 'utf8');

const manifest = {
  $schema: './chat-scenarios.schema.json',
  version: 2,
  bundleFile: 'chat-scenarios.bundle.json',
  description: 'Manifest — dữ liệu 500+ tình huống trong bundle. Build: npm run chat:scenarios:build',
  defaults: core.defaults,
  emptyMessage: core.emptyMessage,
};

writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

console.log(
  `Built ${bundle.scenarioCount} scenarios → ${bundlePath.replace(/\\/g, '/')}`,
);
console.log(
  `  core: ${core.scenarios?.length ?? 0}, instant: ${instant.length}, catalog (llm): ${catalog.length}`,
);
console.log(`  → ${instantCount} tình huống trả lời ngay (không gọi Gemini)`);

if (bundle.scenarioCount < 500) {
  console.error(`Cảnh báo: chưa đủ 500 tình huống (${bundle.scenarioCount})`);
  process.exit(1);
}
