/**
 * Chuẩn hóa path cho Express (local + Vercel serverless).
 * Vercel rewrite `/api/*` → `/api` đôi khi làm mất segment; header gốc vẫn còn.
 */
function pickHeaderPath(req) {
  const candidates = [
    req.headers['x-vercel-original-path'],
    req.headers['x-invoke-path'],
    req.headers['x-forwarded-uri'],
    req.headers['x-vercel-sc-path'],
    req.headers['x-url'],
    req.headers['x-middleware-request-url'],
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
  const headerRaw = pickHeaderPath(req);

  let pathOnly;
  let query = '';

  if (headerRaw) {
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

  /** Vercel rewrite ?path=auth/patient/login */
  const q = req.query || {};
  const pathParam = q.path ?? q.__path;
  if (pathParam && typeof pathParam === 'string') {
    const segment = pathParam.replace(/^\//, '');
    pathOnly = `/api/${segment}`;
    const rest = { ...q };
    delete rest.path;
    delete rest.__path;
    const qs = new URLSearchParams(
      Object.entries(rest).flatMap(([k, v]) =>
        Array.isArray(v) ? v.map((x) => [k, String(x)]) : [[k, String(v)]],
      ),
    ).toString();
    query = qs ? `?${qs}` : '';
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
