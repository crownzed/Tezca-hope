/**
 * Tạo / bổ sung tài khoản demo để test đăng nhập (cùng API /api/auth/login + /api/auth/register).
 * Chạy từ thư mục server: npm run seed:test-users
 *
 * --reset-password : đặt lại mật khẩu demo cho 2 email test (ghi đè nếu đã đổi trước đó).
 */
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.chdir(path.join(__dirname, '..'));

const { initDb, findUserByEmail, insertUser, assignExpertToPatient, getDb } = await import('../src/db.js');

const DEMO_PASSWORD = 'TezcaDemo#2026';
const EXPERT_EMAIL = 'expert@tezca.vn';
const PATIENT_EMAIL = 'patient@tezca.vn';

const resetPassword = process.argv.includes('--reset-password');

function upsertUser({ email, role, name }) {
  const hash = bcrypt.hashSync(DEMO_PASSWORD, 10);
  let u = findUserByEmail(email);
  if (!u) {
    insertUser({
      id: crypto.randomUUID(),
      email,
      passwordHash: hash,
      role,
      name,
    });
    return { email, created: true };
  }
  if (resetPassword) {
    getDb()
      .prepare(`UPDATE users SET password_hash = ? WHERE email = ? COLLATE NOCASE`)
      .run(hash, email);
    return { email, created: false, passwordReset: true };
  }
  return { email, created: false };
}

initDb();

const r1 = upsertUser({ email: EXPERT_EMAIL, role: 'expert', name: 'BS. Minh Anh' });
const r2 = upsertUser({ email: PATIENT_EMAIL, role: 'user', name: 'Nguyễn Minh Khang' });

const expert = findUserByEmail(EXPERT_EMAIL);
const patient = findUserByEmail(PATIENT_EMAIL);
if (expert && patient) {
  assignExpertToPatient(expert.id, patient.id);
}

console.log(JSON.stringify({ expert: r1, patient: r2, assignment: !!(expert && patient) }, null, 2));
console.log('\n--- Đăng nhập test (app bệnh nhân + dashboard chuyên gia) ---');
console.log(`  Chuyên gia:  ${EXPERT_EMAIL}`);
console.log(`  Bệnh nhân:   ${PATIENT_EMAIL}`);
console.log(`  Mật khẩu:    ${DEMO_PASSWORD}`);
if (!resetPassword) {
  console.log('  (Nếu sai mật khẩu, chạy lại với: npm run seed:test-users -- --reset-password)\n');
} else {
  console.log('');
}
