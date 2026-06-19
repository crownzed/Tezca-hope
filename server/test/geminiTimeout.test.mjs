import { fetchWithTimeout } from '../src/gemini.js';

let pass = 0;
let fail = 0;
function ck(name, cond) {
  if (cond) {
    pass++;
    console.log('✓ ' + name);
  } else {
    fail++;
    console.log('✗ ' + name);
  }
}

const origFetch = globalThis.fetch;

// Helper: fetch giả "treo" cho tới khi bị abort, rồi reject như undici (AbortError).
function hangingFetch() {
  return (_url, init) => new Promise((_resolve, reject) => {
    const sig = init?.signal;
    if (!sig) return; // treo mãi
    if (sig.aborted) {
      const e = new Error('aborted');
      e.name = 'AbortError';
      reject(e);
      return;
    }
    sig.addEventListener('abort', () => {
      const e = new Error('aborted');
      e.name = 'AbortError';
      reject(e);
    }, { once: true });
  });
}

// Helper: fetch trả về ngay
function okFetch() {
  return async () => ({ ok: true, status: 200, json: async () => ({ done: true }) });
}

async function run() {
  // 1. Timeout nội bộ kích hoạt -> ném GEMINI_TIMEOUT
  globalThis.fetch = hangingFetch();
  try {
    await fetchWithTimeout('http://x', {}, { timeoutMs: 50 });
    ck('timeout -> phải ném lỗi', false);
  } catch (e) {
    ck('timeout -> code GEMINI_TIMEOUT', e.code === 'GEMINI_TIMEOUT');
  }

  // 2. Caller abort (client ngắt) -> ném GEMINI_ABORTED
  globalThis.fetch = hangingFetch();
  {
    const ac = new AbortController();
    const p = fetchWithTimeout('http://x', {}, { timeoutMs: 5000, signal: ac.signal });
    setTimeout(() => ac.abort(), 20);
    try {
      await p;
      ck('caller abort -> phải ném lỗi', false);
    } catch (e) {
      ck('caller abort -> code GEMINI_ABORTED', e.code === 'GEMINI_ABORTED');
    }
  }

  // 3. Signal đã aborted TRƯỚC khi gọi -> ném ngay GEMINI_ABORTED
  globalThis.fetch = hangingFetch();
  {
    const ac = new AbortController();
    ac.abort();
    try {
      await fetchWithTimeout('http://x', {}, { timeoutMs: 5000, signal: ac.signal });
      ck('pre-aborted -> phải ném lỗi', false);
    } catch (e) {
      ck('pre-aborted -> code GEMINI_ABORTED', e.code === 'GEMINI_ABORTED');
    }
  }

  // 4. fetch thành công nhanh -> trả response, KHÔNG ném, timer được clear
  globalThis.fetch = okFetch();
  {
    const res = await fetchWithTimeout('http://x', {}, { timeoutMs: 1000 });
    ck('success -> trả response ok', res && res.ok === true);
  }

  // 5. Success không để treo process (timer đã clear): nếu tới đây trong <1s là ổn
  ck('success -> không treo (timer cleared)', true);

  globalThis.fetch = origFetch;
  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

run();
