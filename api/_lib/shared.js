import { createApp } from '../../server/src/createApp.js';
import { repairApiPath } from '../../server/src/vercelPath.js';

let app;

function getApp() {
  if (!app) app = createApp();
  return app;
}

/** Handler Vercel — gán path Express cố định (tránh 405 khi rewrite thất bại). */
export function createApiHandler(expressPath) {
  return function handler(req, res) {
    const q = req.url?.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    req.url = expressPath + q;
    repairApiPath(req);
    return getApp()(req, res);
  };
}

export function createCatchAllHandler() {
  return function handler(req, res) {
    const raw = req.query?.path ?? req.query?.slug;
    const segments = Array.isArray(raw) ? raw : raw ? [String(raw)] : [];
    const sub = segments.join('/');
    const q = req.url?.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    req.url = sub ? `/api/${sub}${q}` : `/api${q}`;
    repairApiPath(req);
    return getApp()(req, res);
  };
}

/** Handler cho api/expert/[...path].js hoặc api/me/[...path].js trên Vercel */
export function createSubpathHandler(apiPrefix) {
  return function handler(req, res) {
    const raw = req.query?.path ?? req.query?.slug;
    const segments = Array.isArray(raw) ? raw : raw ? [String(raw)] : [];
    const sub = segments.join('/');
    const q = req.url?.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    req.url = sub ? `${apiPrefix}/${sub}${q}` : `${apiPrefix}${q}`;
    repairApiPath(req);
    return getApp()(req, res);
  };
}
