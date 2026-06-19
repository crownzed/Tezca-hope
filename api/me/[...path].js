import { createSubpathHandler } from '../_lib/shared.js';

/** GET/POST /api/me/* (care-team, live-messages, bmi, ai-chat, …) */
export default createSubpathHandler('/api/me');
