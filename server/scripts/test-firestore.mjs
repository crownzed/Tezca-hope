/**
 * Kiểm tra kết nối Firestore từ terminal.
 * Usage: node scripts/test-firestore.mjs
 */
import { loadEnv } from '../src/loadEnv.js';
import { isFirestoreConfigured, runFirestoreDiagnostics } from '../src/db/firestore.js';

loadEnv();

if (!isFirestoreConfigured()) {
  console.error('Firestore chưa cấu hình. Thêm biến trong .env (xem .env.example).');
  process.exit(1);
}

const report = await runFirestoreDiagnostics();
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
