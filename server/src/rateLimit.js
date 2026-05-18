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

/**
 * Giới hạn theo userId (JWT) hoặc IP — chống lạm dụng endpoint AI.
 * @param {{ windowMs?: number; max?: number; message?: string }} opts
 */
export function createRateLimiter(opts = {}) {
  const windowMs = opts.windowMs ?? 15 * 60 * 1000;
  const max = opts.max ?? 40;
  const message = opts.message ?? 'Quá nhiều yêu cầu AI. Vui lòng thử lại sau.';

  return (req, res, next) => {
    sweep(windowMs);
    const key = req.user?.sub ? `u:${req.user.sub}` : `ip:${req.ip || 'unknown'}`;
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
  };
}

export const aiChatLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AI_RATE_LIMIT_CHAT) || 30,
  message: 'Quá nhiều tin nhắn AI trong 15 phút. Vui lòng đợi.',
});

export const aiPlanLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: Number(process.env.AI_RATE_LIMIT_PLAN) || 8,
  message: 'Quá nhiều lần tạo kế hoạch AI trong 1 giờ. Vui lòng đợi.',
});

export const registerLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_REGISTER) || 12,
  message: 'Quá nhiều lần đăng ký từ địa chỉ này. Vui lòng thử lại sau.',
});
