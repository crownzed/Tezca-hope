/**
 * Redis rate limit store — dùng Upstash Redis REST API.
 *
 * Env: RATE_LIMIT_STORE_URL=https://xxx.upstash.io
 *      RATE_LIMIT_STORE_TOKEN=AXxx...
 *
 * Cơ chế: sliding window counter dùng Redis INCR + EXPIRE.
 * Mỗi key = `rl:<limiterName>:<userId|ip>`, TTL = windowMs.
 */

const STORE_URL = process.env.RATE_LIMIT_STORE_URL?.trim();
const STORE_TOKEN = process.env.RATE_LIMIT_STORE_TOKEN?.trim();

/**
 * Kiểm tra Redis store có sẵn không.
 */
export function isRedisStoreAvailable() {
  return !!(STORE_URL && STORE_TOKEN);
}

/**
 * Gửi command tới Upstash Redis REST API.
 * @param {string[]} command — VD: ['INCR', 'key'] hoặc ['EXPIRE', 'key', '60']
 * @returns {Promise<{result: any}>}
 */
async function redisCommand(command) {
  const res = await fetch(`${STORE_URL}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${STORE_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Redis error ${res.status}: ${text}`);
  }
  return res.json();
}

/**
 * Pipeline: gửi nhiều commands trong 1 request.
 * @param {string[][]} commands
 * @returns {Promise<{result: any}[]>}
 */
async function redisPipeline(commands) {
  const res = await fetch(`${STORE_URL}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${STORE_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Redis pipeline error ${res.status}: ${text}`);
  }
  return res.json();
}

/**
 * Kiểm tra rate limit qua Redis.
 * @param {string} key — unique key cho request (VD: `rl:aiChat:u:123`)
 * @param {number} max — số request tối đa
 * @param {number} windowMs — cửa sổ thời gian (ms)
 * @returns {Promise<{ allowed: boolean; count: number; resetInSec: number }>}
 */
export async function checkRateLimit(key, max, windowMs) {
  const windowSec = Math.ceil(windowMs / 1000);

  try {
    // INCR + xem TTL còn lại, nếu key mới thì set EXPIRE
    const results = await redisPipeline([
      ['INCR', key],
      ['TTL', key],
    ]);

    const count = results[0]?.result ?? 1;
    const ttl = results[1]?.result ?? -1;

    // Key mới (count = 1 hoặc TTL = -1) → set expire
    if (count === 1 || ttl === -1 || ttl === -2) {
      await redisCommand(['EXPIRE', key, String(windowSec)]);
    }

    const resetInSec = ttl > 0 ? ttl : windowSec;

    return {
      allowed: count <= max,
      count,
      resetInSec,
    };
  } catch (err) {
    // Redis lỗi → fallback cho phép (fail open) để không block user
    console.error('[rateLimit:redis]', err instanceof Error ? err.message : err);
    return { allowed: true, count: 0, resetInSec: 0 };
  }
}
