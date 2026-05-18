/**
 * Chuẩn hóa path cho Express (local + Vercel serverless).
 * Vercel rewrite `/api/*` → `/api?path=...` hoặc `/api`; header gốc vẫn có thể dùng.
 */

function pathFromQueryString(url) {
  const qIdx = url.indexOf('?');
  if (qIdx < 0) return null;
  try {
    const params = new URLSearchParams(url.slice(qIdx + 1));
    const segment = params.get('path') ?? params.get('__path');
    if (!segment || !String(segment).trim()) return null;
    const clean = String(segment).replace(/^\//, '');
    return `/api/${clean}`;
  } catch {
    return null;
  }
}

function pickHeaderPath(req) {
  const candidates = [
    req.headers['x-vercel-original-path'],
    req.headers['x-invoke-path'],
    req.headers['x-forwarded-uri'],
    req.headers['x-vercel-sc-path'],
    req.headers['x-url'],
    req.headers['x-middleware-request-url'],
    req.headers['x-forwarded-path'],
  ];
  for (const raw of candidates) {
    if (typeof raw !== 'string' || !raw.trim()) continue;
    try {
      const u = raw.startsWith('http') ? new URL(raw) : null;
      if (u) return u.pathname + u.search;
    } catch {
      /* ignore */
    }
    return raw.startsWith('/') ? raw : `/${raw}`;
  }
  return null;
}

export function repairApiPath(req) {
  const rawUrl = req.url || '/';

  const fromQuery = pathFromQueryString(rawUrl);
  const headerRaw = pickHeaderPath(req);

  let pathOnly;
  let query = '';

  if (fromQuery) {
    pathOnly = fromQuery.split('?')[0] || '/api';
    const qIdx = fromQuery.indexOf('?');
    query = qIdx >= 0 ? fromQuery.slice(qIdx) : '';
  } else if (headerRaw) {
    const h = headerRaw.startsWith('/') ? headerRaw : `/${headerRaw}`;
    const qIdx = h.indexOf('?');
    pathOnly = qIdx >= 0 ? h.slice(0, qIdx) : h;
    query = qIdx >= 0 ? h.slice(qIdx) : '';
  } else {
    const qIdx = rawUrl.indexOf('?');
    pathOnly = qIdx >= 0 ? rawUrl.slice(0, qIdx) : rawUrl;
    query = qIdx >= 0 ? rawUrl.slice(qIdx) : '';
  }

  if (req.originalUrl && typeof req.originalUrl === 'string') {
    const o = req.originalUrl.split('?')[0];
    if (o.startsWith('/api/') && o.length > (pathOnly?.length ?? 0)) {
      pathOnly = o;
    }
    const oq = pathFromQueryString(req.originalUrl);
    if (oq && oq.length > (pathOnly?.length ?? 0)) {
      pathOnly = oq.split('?')[0] || pathOnly;
    }
  }

  if (req.query && typeof req.query === 'object') {
    const pathParam = req.query.path ?? req.query.__path;
    if (pathParam && typeof pathParam === 'string') {
      pathOnly = `/api/${pathParam.replace(/^\//, '')}`;
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
