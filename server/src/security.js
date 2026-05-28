import { sanitizeClientError } from './secrets.js';

export function securityHeaders(_req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
}

/** CORS production: TEZCA_CORS_ORIGINS=https://a.com,https://b.com */
export function corsOriginCallback(origin, callback) {
  if (!origin) {
    callback(null, true);
    return;
  }
  const raw = process.env.TEZCA_CORS_ORIGINS?.trim();
  if (raw) {
    const allowed = raw.split(',').map((s) => s.trim()).filter(Boolean);
    callback(null, allowed.includes(origin));
    return;
  }
  const ok =
    /^https:\/\/([a-z0-9-]+\.)*vercel\.app$/i.test(origin) ||
    /^http:\/\/localhost:\d+$/i.test(origin) ||
    /^http:\/\/127\.0\.0\.1:\d+$/i.test(origin);
  callback(null, ok);
}

export function errorHandler(err, _req, res, _next) {
  console.error('[api]', err instanceof Error ? err.message : err);
  const status =
    err?.status && err.status >= 400 && err.status < 600
      ? err.status
      : err?.name === 'DbError' && err.status
        ? err.status
        : 500;
  res.status(status).json({ error: sanitizeClientError(err) });
}
