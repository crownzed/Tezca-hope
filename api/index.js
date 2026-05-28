import { createApiHandler } from './_lib/shared.js';

/** POST /api (gateway body.op) và fallback khi rewrite về /api */
export default createApiHandler('/api');
