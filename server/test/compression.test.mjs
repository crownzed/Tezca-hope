import { estimateTokens, compressJSON, trimChatMessages } from '../src/chatTurn.js';

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log(`✓ ${name}`); }
  else { fail++; console.log(`✗ ${name}`); }
}

// 1. estimateTokens
check('estimateTokens string', estimateTokens('abcd'.repeat(10)) === 10);
// joined with space: 'aaaa bbbb' = 9 chars → ceil(9/4) = 3
check('estimateTokens messages', estimateTokens([{content:'aaaa'},{content:'bbbb'}]) === 3);

// 2. compressJSON removes null/empty
const cleaned = compressJSON({ a: 1, b: null, c: [], d: {}, e: { x: 2 } });
check('compressJSON removes null', !('b' in cleaned));
check('compressJSON removes empty array', !('c' in cleaned));
check('compressJSON removes empty obj', !('d' in cleaned));
check('compressJSON keeps value', cleaned.a === 1 && cleaned.e.x === 2);

// 3. trimChatMessages — short stays untouched
const short = [{role:'system',content:'sys'},{role:'user',content:'hi'}];
check('trim short = identity', trimChatMessages(short).length === 2);

// 4. trimChatMessages — long gets compressed
const long = [{role:'system',content:'system prompt'}];
for (let i=0;i<60;i++) long.push({role:'user',content:'tập luyện kế hoạch dinh dưỡng '.repeat(20)});
const trimmed = trimChatMessages(long);
check('trim long reduces count', trimmed.length < long.length);
check('trim long keeps system', trimmed[0].role === 'system');
check('trim long has summary', trimmed.some(m => m.content.includes('Lịch sử trước')));
check('trim long keeps recent 20', trimmed.filter(m=>m.role==='user').length === 20);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
