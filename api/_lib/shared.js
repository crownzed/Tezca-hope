import { repairApiPath } from '../../server/src/vercelPath.js';

let app;
let initError;

async function getApp() {
  if (initError) throw initError;
  if (app) return app;
  try {
    const { createApp } = await import('../../server/src/createApp.js');
    app = createApp();
    return app;
  } catch (err) {
    initError = err;
    console.error('[api] createApp failed:', err instanceof Error ? err.stack : err);
    throw err;
  }
}

function sendInitError(res, err) {
  const message = err instanceof Error ? err.message : String(err);
  res.status(500).json({
    error: 'Không khởi tạo được API',
    message: message.slice(0, 300),
  });
}

/** Handler Vercel — gán path Express cố định (tránh 405 khi rewrite thất bại). */
export function createApiHandler(expressPath) {
  return async function handler(req, res) {
    const q = req.url?.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    req.url = expressPath + q;
    repairApiPath(req);
    try {
      const application = await getApp();
      return application(req, res);
    } catch (err) {
      sendInitError(res, err);
    }
  };
}

export function createCatchAllHandler() {
  return async function handler(req, res) {
    const raw = req.query?.path ?? req.query?.slug;
    const segments = Array.isArray(raw) ? raw : raw ? [String(raw)] : [];
    const sub = segments.join('/');
    const q = req.url?.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    req.url = sub ? `/api/${sub}${q}` : `/api${q}`;
    repairApiPath(req);
    try {
      const application = await getApp();
      return application(req, res);
    } catch (err) {
      sendInitError(res, err);
    }
  };
}

/** Handler cho api/expert/[...path].js hoặc api/me/[...path].js trên Vercel */
export function createSubpathHandler(apiPrefix) {
  return async function handler(req, res) {
    const raw = req.query?.path ?? req.query?.slug;
    const segments = Array.isArray(raw) ? raw : raw ? [String(raw)] : [];
    const sub = segments.join('/');
    const q = req.url?.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    req.url = sub ? `${apiPrefix}/${sub}${q}` : `${apiPrefix}${q}`;
    repairApiPath(req);
    try {
      const application = await getApp();
      return application(req, res);
    } catch (err) {
      sendInitError(res, err);
    }
  };
}
