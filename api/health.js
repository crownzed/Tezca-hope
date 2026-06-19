import { createApiHandler } from './_lib/shared.js';

/** GET /api/health, /api/health/db, /api/health/ai */
export default createApiHandler('/api/health');
