/**
 * Vercel serverless (`api/index.js`) đôi khi gửi path không có prefix `/api`
 * (vd. `/auth/patient/login` thay vì `/api/auth/patient/login`).
 * Chuẩn hóa trước khi mount Express.
 */
export function vercelApiPathPrefix() {
  return (req, _res, next) => {
    if (!process.env.VERCEL) {
      next();
      return;
    }
    const raw = req.url || '/';
    const q = raw.includes('?') ? raw.slice(raw.indexOf('?')) : '';
    const pathOnly = q ? raw.slice(0, raw.indexOf('?')) : raw;
    if (pathOnly.startsWith('/api')) {
      next();
      return;
    }
    if (pathOnly === '/' || pathOnly === '') {
      next();
      return;
    }
    req.url = `/api${pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`}${q}`;
    next();
  };
}
