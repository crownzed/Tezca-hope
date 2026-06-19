/**
 * Chạy đủ seed demo (yêu cầu 1 + 2):
 * - 100 khách hàng kh-demo-* (BMI + mood)
 * - 4 chuyên gia, gán 25 KH/CG
 * - 200 bản ghi công việc (100 kế hoạch + 100 chat)
 *
 * npm run seed:all-demo --prefix server
 */
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.chdir(path.join(__dirname, '..'));

const { initDb } = await import('../src/db.js');
const { seedAllDemo, DEMO_PASSWORD } = await import('../src/db/seedDemoData.js');

initDb();
const result = seedAllDemo();
console.log(JSON.stringify({ password: DEMO_PASSWORD, ...result }, null, 2));
