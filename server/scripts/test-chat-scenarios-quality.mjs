/**
 * Kiểm tra chất lượng phân loại tình huống (golden set + false positive + hiệu năng).
 * node server/scripts/test-chat-scenarios-quality.mjs
 */
import { performance } from 'node:perf_hooks';
import {
  classifyChatIntent,
  resetChatScenariosCache,
  getClassifierCacheSize,
} from '../src/chatIntent.js';
import { planChatTurn } from '../src/chatTurn.js';
import { loadChatScenariosConfig } from '../src/loadChatScenarios.js';

resetChatScenariosCache();
const cfg = loadChatScenariosConfig();

/** @type {Array<{ text: string; intent: string; mode: 'instant'|'llm'; note?: string }>} */
const GOLDEN = [
  { text: 'xin chào tezca', intent: 'greeting', mode: 'instant' },
  { text: 'hello', intent: 'greeting', mode: 'instant' },
  { text: 'cảm ơn bạn nhiều', intent: 'thanks', mode: 'instant' },
  { text: 'thanks', intent: 'thanks', mode: 'instant' },
  { text: 'vâng', intent: 'ack', mode: 'instant' },
  { text: 'ok', intent: 'ack', mode: 'instant' },
  { text: 'đau ngực khó thở', intent: 'emergency', mode: 'instant' },
  { text: 'muon tu tu', intent: 'emergency', mode: 'instant' },
  { text: 'muốn tự tử', intent: 'emergency', mode: 'instant' },
  { text: '', intent: 'general', mode: 'instant', note: 'empty' },
  { text: 'lap ke hoach an 7 ngay chi tiet', intent: 'detail_request', mode: 'llm' },
  { text: 'cho tôi danh sách bài tập từng bước', intent: 'detail_request', mode: 'llm' },
  { text: 'BMI 27 có nguy hiểm không', intent: 'rw_bmi_worry', mode: 'instant' },
  { text: 'cân nặng tăng quá nhanh', intent: 'topic_bmi', mode: 'llm' },
  { text: 'stress và mất ngủ', intent: 'fast_stress_quick', mode: 'instant' },
  { text: 'buồn chán nhiều ngày', intent: 'topic_mood_sleep', mode: 'llm' },
  { text: 'an kieng giam can', intent: 'topic_nutrition', mode: 'llm' },
  { text: 'protein mot ngay bao nhieu', intent: 'fast_protein_day', mode: 'instant' },
  { text: 'tap gym moi bat dau', intent: 'topic_exercise', mode: 'llm' },
  { text: 'chay bo buoi sang', intent: 'topic_exercise', mode: 'llm' },
  { text: 'co nen uong thuoc gi khong', intent: 'topic_clinical', mode: 'llm' },
  { text: 'dat lich bac si', intent: 'topic_clinical', mode: 'llm' },
  { text: 'mat ngu keo dai', intent: 'fast_insomnia_tip', mode: 'instant' },
  { text: 'uong bao nhieu nuoc', intent: 'fast_water_day', mode: 'instant' },
  { text: 'tieu duong an gi', intent: 'topic_nutrition', mode: 'llm', note: 'an gi ưu tiên dinh duong' },
  { text: 'dau bung kinh', intent: 'sym_dau_bung', mode: 'llm', note: 'đau bụng > PCOS khi có dau bung' },
  { text: 'huong dan tinh bmi tren app', intent: 'fast_app_bmi_app', mode: 'instant' },
  { text: 'hôm nay sao', intent: 'follow_up_short', mode: 'llm' },
  {
    text: 'ga an duoc khong khi giam can',
    intent: 'fast_food_ga',
    mode: 'instant',
  },
  { text: 'BMI là gì', intent: 'fast_bmi_what', mode: 'instant' },
  { text: 'uống bao nhiêu nước một ngày', intent: 'fast_water_day', mode: 'instant' },
  { text: 'khi nao can di kham', intent: 'fast_see_doctor', mode: 'instant' },
  { text: 'chào buổi sáng', intent: 'fast_morning', mode: 'instant' },
  { text: 'ad ơi cho mình hỏi', intent: 'rw_greet_casual', mode: 'instant' },
  { text: 'giảm cân mà không xuống cân', intent: 'rw_lose_stuck', mode: 'instant' },
  { text: '2h sáng mà vẫn chưa ngủ được', intent: 'rw_sleep_real', mode: 'instant' },
  { text: 'ngày đầu tập gym bị đau cơ', intent: 'rw_gym_newbie', mode: 'instant' },
  { text: 'sao không thấy kế hoạch', intent: 'rw_app_trouble', mode: 'instant' },
];

function assertGolden(c) {
  const plan = planChatTurn(c.text);
  const kind = classifyChatIntent(c.text).kind;
  if (c.note === 'fast_food_* hoặc fast_snack_*') {
    return (
      plan.mode === 'instant' &&
      (plan.intent.startsWith('fast_food_') || plan.intent.startsWith('fast_snack_'))
    );
  }
  if (c.intent === 'fast_' && c.note) {
    return plan.mode === c.mode && plan.intent.startsWith('fast_');
  }
  return plan.intent === c.intent && plan.mode === c.mode && kind === c.intent;
}

/** Không được rơi vào intent (substring id hoặc exact) */
/** @type {Array<{ text: string; notIntent: string; reason: string }>} */
const FALSE_POSITIVE = [
  { text: 'cảm ơn bạn nhé', notIntent: 'food_', reason: '"an" trong "ban" không được match món ăn' },
  { text: 'banh mi buoi sang', notIntent: 'thanks', reason: 'bánh mì ≠ cảm ơn' },
  { text: 'BMI của tôi 28', notIntent: 'det_', reason: 'BMI đơn thuần không phải detail det_*' },
  { text: 'stress không ngủ', notIntent: 'det_', reason: 'stress không phải detail det_*' },
  { text: 'đau ngực', notIntent: 'sym_', reason: 'đau ngực → emergency, không triệu chứng chung' },
  { text: 'ok', notIntent: 'topic_', reason: 'ack ngắn' },
];

let failed = 0;

console.log(`=== Golden set (${GOLDEN.length} câu) ===\n`);
for (const c of GOLDEN) {
  const plan = planChatTurn(c.text);
  const ok = assertGolden(c);
  if (!ok) {
    failed += 1;
    console.log('✗', JSON.stringify(c.text || '(empty)'), '→', plan.intent, plan.mode);
    console.log('   expected:', c.intent, c.mode, c.note ? `(${c.note})` : '');
  } else {
    console.log('✓', JSON.stringify(c.text || '(empty)'), '→', plan.intent);
  }
}

console.log(`\n=== False positive guards (${FALSE_POSITIVE.length}) ===\n`);
for (const c of FALSE_POSITIVE) {
  const { kind } = classifyChatIntent(c.text);
  const bad =
    c.notIntent.endsWith('_')
      ? kind.startsWith(c.notIntent) || kind === c.notIntent
      : kind === c.notIntent;
  if (bad) {
    failed += 1;
    console.log('✗', JSON.stringify(c.text), '→', kind, `(cấm ${c.notIntent})`, c.reason);
  } else {
    console.log('✓', JSON.stringify(c.text), '→', kind);
  }
}

console.log('\n=== Instant có nội dung ===\n');
for (const id of cfg.instantIds) {
  const plan = planChatTurn(
    id === 'greeting' ? 'xin chao' : id === 'thanks' ? 'cam on' : id === 'ack' ? 'ok' : 'dau nguc',
  );
  if (plan.mode !== 'instant' || !plan.content?.trim()) {
    failed += 1;
    console.log('✗', id, 'thiếu content instant');
  } else {
    console.log('✓', id, `(${plan.content.length} chars)`);
  }
}

console.log('\n=== Hiệu năng phân loại (thuật toán mới) ===\n');
const samples = [
  'toi muon giam can an kieng va tap gym buoi chieu nhung bi dau goi',
  'xin chao',
  'bmi 27 co sao khong',
  'dau nguc kho tho',
  'ok',
  'cho minh ke hoach an 7 ngay',
];
const iterations = 3000;
const t0 = performance.now();
for (let i = 0; i < iterations; i++) {
  classifyChatIntent(samples[i % samples.length]);
}
const ms = performance.now() - t0;
const perOp = ms / iterations;
console.log(`${iterations} lần classify (6 mẫu): ${ms.toFixed(1)}ms (${perOp.toFixed(3)}ms/lần)`);
console.log(`LRU cache sau warm-up: ${getClassifierCacheSize()} mục`);
if (perOp > 0.5) {
  failed += 1;
  console.log('✗ Chậm hơn 0.5ms/lần');
} else {
  console.log('✓ Đạt ngưỡng <0.5ms/lần (warm cache)');
}

const tCold = performance.now();
for (let i = 0; i < 500; i++) {
  classifyChatIntent(`cau doc lap ${i} khong trung cache`);
}
const coldMs = (performance.now() - tCold) / 500;
console.log(`500 câu lạnh: ${coldMs.toFixed(3)}ms/lần (token index)`);
if (coldMs > 2) {
  failed += 1;
  console.log('✗ Câu lạnh chậm hơn 2ms/lần');
} else {
  console.log('✓ Câu lạnh <2ms/lần');
}

console.log('\n=== Tóm tắt ===');
console.log(`Scenarios: ${cfg.scenarioCount ?? cfg.catalog.length}`);
if (cfg.classifierStats) {
  console.log(`Classifier: ${JSON.stringify(cfg.classifierStats)}`);
}

if (failed > 0) {
  console.error(`\n${failed} kiểm tra chất lượng THẤT BẠI`);
  process.exit(1);
}
console.log('\nTất cả kiểm tra chất lượng đạt.');
