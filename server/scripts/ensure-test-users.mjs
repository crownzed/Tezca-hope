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

const {
  initDb,
  findUserByEmail,
  insertUser,
  assignExpertToCustomer,
  getDb,
  ensureAdminFromEnv,
} = await import('../src/db.js');

const DEMO_PASSWORD = 'TezcaDemo#2026';
const EXPERT_EMAIL = 'expert@tezca.vn';
const PATIENT_EMAIL = 'patient@tezca.vn';
const ADMIN_EMAIL = 'admin@tezca.vn';
const ADMIN_PASSWORD = 'Khanhkhongngu29204@';

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

function upsertAdmin() {
  const hash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
  let u = findUserByEmail(ADMIN_EMAIL);
  if (!u) {
    insertUser({
      id: crypto.randomUUID(),
      email: ADMIN_EMAIL,
      passwordHash: hash,
      role: 'admin',
      name: 'Admin Tezca',
    });
    return { email: ADMIN_EMAIL, created: true };
  }
  getDb()
    .prepare(`UPDATE users SET role = 'admin', password_hash = ?, name = ? WHERE id = ?`)
    .run(hash, 'Admin Tezca', u.id);
  return { email: ADMIN_EMAIL, created: false, updated: true };
}

initDb();
const adminSeed = ensureAdminFromEnv();
const adminAccount = upsertAdmin();

const r1 = upsertUser({ email: EXPERT_EMAIL, role: 'expert', name: 'BS. Minh Anh' });
const r2 = upsertUser({ email: PATIENT_EMAIL, role: 'user', name: 'Nguyễn Minh Khang' });

const expert = findUserByEmail(EXPERT_EMAIL);
const patient = findUserByEmail(PATIENT_EMAIL);
if (expert && patient) {
  assignExpertToCustomer(expert.id, patient.id);
}
getDb().prepare(`DELETE FROM user_role_grants WHERE role = 'admin'`).run();

console.log(
  JSON.stringify(
    { admin: adminAccount, expert: r1, patient: r2, assignment: !!(expert && patient), adminSeed },
    null,
    2,
  ),
);
console.log('\n--- Đăng nhập test (app khách hàng + dashboard chuyên gia) ---');
console.log(`  Chuyên gia:  ${EXPERT_EMAIL}`);
console.log(`  Khách hàng:  ${PATIENT_EMAIL}`);
console.log(`  Mật khẩu:    ${DEMO_PASSWORD}`);
console.log(`  Admin:       ${ADMIN_EMAIL}`);
console.log(`  Mật khẩu AD: ${ADMIN_PASSWORD}`);
if (!resetPassword) {
  console.log('  (Nếu sai mật khẩu, chạy lại với: npm run seed:test-users -- --reset-password)\n');
} else {
  console.log('');
}
