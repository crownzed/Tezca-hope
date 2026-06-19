/**
 * Rate limiter hỗ trợ 2 backend:
 * 1. In-memory (mặc định) — phù hợp local/Docker persistent.
 * 2. Redis/Upstash — set RATE_LIMIT_STORE_URL + RATE_LIMIT_STORE_TOKEN env.
 *
 * Trên Vercel serverless, in-memory sẽ reset mỗi cold start → luôn đặt
 * RATE_LIMIT_STORE_URL khi deploy production serverless.
 */

import { isRedisStoreAvailable, checkRateLimit } from './redisRateLimit.js';

const useRedis = isRedisStoreAvailable();

const buckets = new Map();
let lastSweep = Date.now();

function sweep(windowMs) {
  const now = Date.now();
  if (now - lastSweep < windowMs) return;
  lastSweep = now;
  for (const [key, entry] of buckets) {
    if (now - entry.start >= windowMs) buckets.delete(key);
  }
}

if (!useRedis && process.env.VERCEL) {
  console.warn(
    '[rateLimit] ⚠️ Đang chạy trên Vercel serverless mà không có RATE_LIMIT_STORE_URL. ' +
    'Rate limit in-memory sẽ reset mỗi cold start. Đặt RATE_LIMIT_STORE_URL (Upstash Redis) để rate limit hoạt động đúng.'
  );
}

/**
 * Giới hạn theo userId (JWT) hoặc IP — chống lạm dụng endpoint.
 * Hỗ trợ Redis (async) và in-memory (sync) tự động.
 * @param {{ windowMs?: number; max?: number; message?: string; name?: string }} opts
 */
export function createRateLimiter(opts = {}) {
  const windowMs = opts.windowMs ?? 15 * 60 * 1000;
  const max = opts.max ?? 40;
  const message = opts.message ?? 'Quá nhiều yêu cầu. Vui lòng thử lại sau.';
  const name = opts.name ?? 'default';

  return async (req, res, next) => {
    const identity = req.user?.sub ? `u:${req.user.sub}` : `ip:${req.ip || 'unknown'}`;

    if (useRedis) {
      // Redis-based rate limit
      const key = `rl:${name}:${identity}`;
      const result = await checkRateLimit(key, max, windowMs);

      res.setHeader('X-RateLimit-Limit', String(max));
      res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - result.count)));

      if (!result.allowed) {
        res.setHeader('Retry-After', String(result.resetInSec));
        res.status(429).json({ error: message });
        return;
      }
      next();
    } else {
      // In-memory fallback
      sweep(windowMs);
      const key = `${name}:${identity}`;
      const now = Date.now();
      let entry = buckets.get(key);
      if (!entry || now - entry.start >= windowMs) {
        entry = { start: now, count: 0 };
      }
      entry.count += 1;
      buckets.set(key, entry);

      res.setHeader('X-RateLimit-Limit', String(max));
      res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - entry.count)));

      if (entry.count > max) {
        const retrySec = Math.ceil((entry.start + windowMs - now) / 1000);
        res.setHeader('Retry-After', String(retrySec));
        res.status(429).json({ error: message });
        return;
      }
      next();
    }
  };
}

export const aiChatLimiter = createRateLimiter({
  name: 'aiChat',
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AI_RATE_LIMIT_CHAT) || 30,
  message: 'Quá nhiều tin nhắn AI trong 15 phút. Vui lòng đợi.',
});

export const aiPlanLimiter = createRateLimiter({
  name: 'aiPlan',
  windowMs: 60 * 60 * 1000,
  max: Number(process.env.AI_RATE_LIMIT_PLAN) || 8,
  message: 'Quá nhiều lần tạo kế hoạch AI trong 1 giờ. Vui lòng đợi.',
});

export const registerLimiter = createRateLimiter({
  name: 'register',
  windowMs: 60 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_REGISTER) || 12,
  message: 'Quá nhiều lần đăng ký từ địa chỉ này. Vui lòng thử lại sau.',
});

export const forgotPasswordLimiter = createRateLimiter({
  name: 'forgotPw',
  windowMs: 60 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_FORGOT) || 8,
  message: 'Quá nhiều yêu cầu đặt lại mật khẩu. Vui lòng thử lại sau.',
});

export const loginLimiter = createRateLimiter({
  name: 'login',
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_LOGIN) || 20,
  message: 'Quá nhiều lần đăng nhập. Vui lòng thử lại sau 15 phút.',
});

export const resetPasswordLimiter = createRateLimiter({
  name: 'resetPw',
  windowMs: 60 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_RESET) || 10,
  message: 'Quá nhiều lần đặt lại mật khẩu. Vui lòng thử lại sau.',
});

export const newsletterLimiter = createRateLimiter({
  name: 'newsletter',
  windowMs: 60 * 60 * 1000,
  max: Number(process.env.NEWSLETTER_RATE_LIMIT) || 6,
  message: 'Quá nhiều lần đăng ký nhận tin. Vui lòng thử lại sau.',
});

export const communityPostLimiter = createRateLimiter({
  name: 'cmPost',
  windowMs: 60 * 1000,
  max: Number(process.env.COMMUNITY_RATE_LIMIT_POST) || 5,
  message: 'Quá nhiều bài viết trong 1 phút. Vui lòng đợi.',
});

export const communityCommentLimiter = createRateLimiter({
  name: 'cmComment',
  windowMs: 60 * 1000,
  max: Number(process.env.COMMUNITY_RATE_LIMIT_COMMENT) || 10,
  message: 'Quá nhiều bình luận trong 1 phút. Vui lòng đợi.',
});

export const communityDmLimiter = createRateLimiter({
  name: 'cmDm',
  windowMs: 60 * 1000,
  max: Number(process.env.COMMUNITY_RATE_LIMIT_DM) || 15,
  message: 'Quá nhiều tin nhắn trong 1 phút. Vui lòng đợi.',
});

export const communityRoomLimiter = createRateLimiter({
  name: 'cmRoom',
  windowMs: 60 * 1000,
  max: Number(process.env.COMMUNITY_RATE_LIMIT_ROOM) || 12,
  message: 'Quá nhiều tin nhắn phòng chat trong 1 phút. Vui lòng đợi.',
});

export const communityLikeLimiter = createRateLimiter({
  name: 'cmLike',
  windowMs: 60 * 1000,
  max: Number(process.env.COMMUNITY_RATE_LIMIT_LIKE) || 30,
  message: 'Quá nhiều lượt thích trong 1 phút. Vui lòng đợi.',
});
