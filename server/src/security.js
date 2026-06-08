import { sanitizeClientError } from './secrets.js';

export function securityHeaders(_req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  // CSP: chặn inline script/style không rõ nguồn, chỉ cho phép từ cùng origin + Google Fonts + Gemini API
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' https://generativelanguage.googleapis.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
  res.setHeader('Content-Security-Policy', csp);
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
  // Production mà chưa set TEZCA_CORS_ORIGINS → chặn tất cả origin lạ
  if (process.env.NODE_ENV === 'production') {
    console.warn('[cors] Production: TEZCA_CORS_ORIGINS chưa được cấu hình — chặn origin:', origin);
    callback(null, false);
    return;
  }
  // Dev/preview: cho phép localhost và *.vercel.app
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
