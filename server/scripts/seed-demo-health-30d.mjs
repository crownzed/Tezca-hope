/**
 * BMI + Emotion heatmap 30 ngày cho 100 khách kh-demo-*.
 * npm run seed:demo-health-30d --prefix server
 */
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.chdir(path.join(__dirname, '..'));

const { initDb } = await import('../src/db.js');
const { seedDemoHealthHistory30Days } = await import('../src/db/seedDemoData.js');

initDb();
const result = seedDemoHealthHistory30Days({ days: 30 });
console.log(JSON.stringify(result, null, 2));
