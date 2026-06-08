/**
 * Smoke test: phân loại + kế hoạch gọi LLM — node server/scripts/test-chat-intent.mjs
 */
import { classifyChatIntent, resetChatScenariosCache } from '../src/chatIntent.js';
import { planChatTurn } from '../src/chatTurn.js';

resetChatScenariosCache();

/** @type {Array<[string, string, 'instant'|'llm']>} */
const cases = [
  ['xin chào', 'greeting', 'instant'],
  ['cảm ơn bạn nhé', 'thanks', 'instant'],
  ['ok', 'ack', 'instant'],
  ['đau ngực khó thở', 'emergency', 'instant'],
  ['', 'general', 'instant'],
  ['cho tôi kế hoạch ăn 7 ngày chi tiết', 'detail_request', 'llm'],
  ['BMI của tôi 28 có sao không', 'topic_bmi', 'llm'],
  ['stress không ngủ được', 'fast_stress_quick', 'instant'],
];

let failed = 0;
for (const [text, expectedIntent, expectedMode] of cases) {
  const classified = classifyChatIntent(text);
  const plan = planChatTurn(text);
  const okIntent = classified.kind === expectedIntent;
  const okMode = plan.mode === expectedMode;
  const ok = okIntent && okMode;
  if (!ok) failed += 1;
  console.log(
    ok ? '✓' : '✗',
    JSON.stringify(text || '(empty)'),
    '→',
    plan.intent,
    plan.mode,
    ok ? '' : `(expected ${expectedIntent}/${expectedMode})`,
  );
}

if (failed > 0) {
  console.error(`\n${failed} case(s) failed`);
  process.exit(1);
}
console.log(`\n${cases.length} cases passed`);
