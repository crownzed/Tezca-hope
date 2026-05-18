/**
 * Chuẩn hóa path cho Express (local + Vercel serverless).
 * Vercel rewrite `/api/*` → `/api` đôi khi làm mất segment; header gốc vẫn còn.
 */
export function repairApiPath(req) {
  const headerRaw =
    req.headers['x-vercel-original-path'] ||
    req.headers['x-invoke-path'] ||
    req.headers['x-forwarded-uri'] ||
    req.headers['x-vercel-sc-path'];

  let pathOnly;
  let query = '';

  if (headerRaw && typeof headerRaw === 'string') {
    const h = headerRaw.startsWith('/') ? headerRaw : `/${headerRaw}`;
    const qIdx = h.indexOf('?');
    pathOnly = qIdx >= 0 ? h.slice(0, qIdx) : h;
    query = qIdx >= 0 ? h.slice(qIdx) : '';
  } else {
    const raw = req.url || '/';
    const qIdx = raw.indexOf('?');
    pathOnly = qIdx >= 0 ? raw.slice(0, qIdx) : raw;
    query = qIdx >= 0 ? raw.slice(qIdx) : '';
  }

  if (req.originalUrl && typeof req.originalUrl === 'string') {
    const o = req.originalUrl.split('?')[0];
    if (o.startsWith('/api/') && o.length > pathOnly.length) {
      pathOnly = o;
    }
  }

  if (!pathOnly.startsWith('/api')) {
    if (pathOnly === '/' || pathOnly === '') {
      req.url = '/' + query;
      return;
    }
    pathOnly = `/api${pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`}`;
  }

  req.url = pathOnly + query;
}

export function vercelApiPathPrefix() {
  return (req, _res, next) => {
    repairApiPath(req);
    next();
  };
}
