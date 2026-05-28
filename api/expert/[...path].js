import { createSubpathHandler } from '../_lib/shared.js';

/** GET/POST /api/expert/* (me, patients, reports, live-messages, …) */
export default createSubpathHandler('/api/expert');
