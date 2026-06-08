/**
 * Kiểm tra chat-scenarios.json — node server/scripts/validate-chat-scenarios.mjs
 */
import { loadChatScenariosConfig, resetChatScenariosCache } from '../src/loadChatScenarios.js';

resetChatScenariosCache();
const cfg = loadChatScenariosConfig();

const ids = new Set();
for (const s of cfg.catalog) {
  if (ids.has(s.id)) {
    console.error('Trùng id:', s.id);
    process.exit(1);
  }
  ids.add(s.id);
}

if (!ids.has('general')) {
  console.error('Thiếu scenario general');
  process.exit(1);
}

const instantWithoutReply = cfg.catalog.filter(
  (s) => s.mode === 'instant' && !cfg.cannedReplies[s.id],
);
if (instantWithoutReply.length) {
  console.error('instant thiếu reply:', instantWithoutReply.map((s) => s.id).join(', '));
  process.exit(1);
}

const count = cfg.scenarioCount ?? cfg.catalog.length;
const instantN = cfg.instantCount ?? cfg.instantIds.size;
const instantPct = count ? ((instantN / count) * 100).toFixed(1) : 0;
const st = cfg.classifierStats ?? {};
console.log(
  `OK — ${count} tình huống (${instantN} instant = ${instantPct}%, ${cfg.rules.length} rule)`,
);
console.log(
  `  Classifier: ${st.tokenBuckets ?? '?'} token buckets, ${st.multiWordPhrases ?? '?'} cụm từ, LRU≤${st.lruMax ?? 2048}`,
);
if (count < 500) {
  console.error(`Cảnh báo: chưa đủ 500 (hiện ${count}) — chạy npm run chat:scenarios:build`);
  process.exit(1);
}
for (const s of cfg.catalog) {
  console.log(`  • ${s.id} (${s.weight}) [${s.mode}] — ${s.label}`);
}
