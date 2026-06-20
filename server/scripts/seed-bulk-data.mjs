/**
 * Seed 150 người dùng + 30 chuyên gia + kết nối ngẫu nhiên.
 * Chạy: node scripts/seed-bulk-data.mjs
 *
 * --dry-run      Chỉ in kế hoạch, không ghi
 * --prefix-user  Tiền tố email người dùng (mặc định: nd)
 * --prefix-exp   Tiền tố email chuyên gia (mặc định: cg)
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
  upsertExpertProfile,
  getDb,
} = await import('../src/db.js');

// ── Config ──────────────────────────────────────────────────────────────────
const DRY_RUN = process.argv.includes('--dry-run');

function parseArg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

const USER_COUNT = 150;
const EXPERT_COUNT = 30;
const PASSWORD = 'Tezca@2026';
const USER_PREFIX = parseArg('prefix-user', 'nd');
const EXPERT_PREFIX = parseArg('prefix-exp', 'cg');

// ── Name pools ──────────────────────────────────────────────────────────────
const FAMILY = [
  'Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ',
  'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý', 'Mai', 'Đinh', 'Tạ',
  'Thái', 'Cao', 'Tôn', 'Lưu', 'Trịnh', 'Hà', 'Lâm', 'Nghiêm', 'Chu',
];

const MIDDLE_M = ['Văn', 'Hữu', 'Minh', 'Quốc', 'Đức', 'Anh', 'Thanh', 'Tuấn', 'Thành', 'Công'];
const MIDDLE_F = ['Thị', 'Ngọc', 'Thu', 'Thanh', 'Kim', 'Mỹ', 'Phương', 'Ánh', 'Hồng', 'Bích'];

const GIVEN_M = [
  'An', 'Bình', 'Châu', 'Dũng', 'Giang', 'Hà', 'Hùng', 'Khang', 'Long',
  'Nam', 'Phúc', 'Quân', 'Sơn', 'Tâm', 'Tuấn', 'Việt', 'Duy', 'Bảo',
  'Đạt', 'Hiếu', 'Khoa', 'Luân', 'Nghĩa', 'Phong', 'Thái', 'Trung', 'Vinh',
];

const GIVEN_F = [
  'Anh', 'Châu', 'Giang', 'Hà', 'Lan', 'Linh', 'Mai', 'Nga', 'Thảo',
  'Uyên', 'Xuân', 'Yến', 'Diễm', 'Hương', 'My', 'Ngân', 'Phượng', 'Quỳnh',
  'Thy', 'Trúc', 'Vân', 'Băng', 'Cát', 'Đan', 'Hiền', 'Khuê', 'Nhung',
];

const EXPERT_NAMES = [
  'BS. Minh Anh', 'BS. Thu Hà', 'BS. Quang Huy', 'BS. Lan Phương',
  'BS. Hoàng Nam', 'BS. Thanh Trúc', 'BS. Đức Anh', 'BS. Ngọc Mai',
  'BS. Tuấn Kiệt', 'BS. Phương Linh', 'BS. Hải Yến', 'BS. Văn Khánh',
  'BS. Kim Ngân', 'BS. Trọng Nghĩa', 'BS. Mỹ Duyên', 'BS. Thế Vinh',
  'BS. Hồng Nhung', 'BS. Anh Tuấn', 'BS. Bích Phượng', 'BS. Công Thành',
  'BS. Diễm Quỳnh', 'BS. Gia Bảo', 'BS. Hiền Mai', 'BS. Khắc Dũng',
  'BS. Như Ý', 'BS. Phúc Lâm', 'BS. Quốc Hùng', 'BS. Thiên Ân',
  'BS. Xuân Bắc', 'BS. Bảo Long',
];

const SPECIALTIES = [
  'Dinh dưỡng', 'Tâm lý học', 'Vật lý trị liệu', 'Cơ xương khớp',
  'Y học thể thao', 'Tim mạch', 'Hô hấp', 'Nội tiết', 'Thần kinh',
  'Tiêu hóa', 'Da liễu', 'Nhi khoa', 'Lão khoa', 'Phục hồi chức năng',
  'Y học cổ truyền',
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function userEmail(index) {
  return `${USER_PREFIX}-${String(index).padStart(3, '0')}@tezca.vn`;
}

function expertEmail(index) {
  return `${EXPERT_PREFIX}-${String(index).padStart(2, '0')}@tezca.vn`;
}

function userFullName(index) {
  const i = index - 1;
  const isFemale = i % 3 === 0;
  const family = FAMILY[i % FAMILY.length];
  const middle = isFemale
    ? MIDDLE_F[i % MIDDLE_F.length]
    : MIDDLE_M[Math.floor(i / FAMILY.length) % MIDDLE_M.length];
  const given = isFemale
    ? GIVEN_F[i % GIVEN_F.length]
    : GIVEN_M[i % GIVEN_M.length];
  return `${family} ${middle} ${given}`;
}

/** Fisher-Yates shuffle in-place */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ── Main ────────────────────────────────────────────────────────────────────

initDb();
const db = getDb();
const passwordHash = bcrypt.hashSync(PASSWORD, 10);
const now = Date.now();

// ── 1. Tạo 150 người dùng ──────────────────────────────────────────────────
let usersCreated = 0;
let usersSkipped = 0;
const userIds = [];

for (let i = 1; i <= USER_COUNT; i++) {
  const email = userEmail(i);
  const existing = findUserByEmail(email);
  if (existing) {
    userIds.push(existing.id);
    usersSkipped++;
    continue;
  }
  const id = crypto.randomUUID();
  if (!DRY_RUN) {
    insertUser({
      id,
      email,
      passwordHash,
      role: 'user',
      name: userFullName(i),
      createdAt: now,
    });
  }
  userIds.push(id);
  usersCreated++;
}
console.log(`[1/3] Người dùng: ${usersCreated} tạo mới, ${usersSkipped} đã tồn tại`);

// ── 2. Tạo 30 chuyên gia ────────────────────────────────────────────────────
let expertsCreated = 0;
let expertsSkipped = 0;
const expertIds = [];

for (let i = 1; i <= EXPERT_COUNT; i++) {
  const email = expertEmail(i);
  const existing = findUserByEmail(email);
  if (existing) {
    expertIds.push(existing.id);
    expertsSkipped++;
    continue;
  }
  const id = crypto.randomUUID();
  const name = EXPERT_NAMES[(i - 1) % EXPERT_NAMES.length];
  const specialty = SPECIALTIES[(i - 1) % SPECIALTIES.length];
  if (!DRY_RUN) {
    insertUser({ id, email, passwordHash, role: 'expert', name, createdAt: now });
    upsertExpertProfile(id, {
      fullName: name,
      specialty,
      licenseNo: `CG-${String(i).padStart(4, '0')}`,
      bio: `Chuyên gia ${specialty} với hơn ${5 + (i % 15)} năm kinh nghiệm.`,
      isActive: true,
    });
  }
  expertIds.push(id);
  expertsCreated++;
}
console.log(`[2/3] Chuyên gia: ${expertsCreated} tạo mới, ${expertsSkipped} đã tồn tại`);

// ── 3. Kết nối ngẫu nhiên ──────────────────────────────────────────────────
let assignmentsCreated = 0;
let assignmentsSkipped = 0;

if (DRY_RUN) {
  // Planned assignment counts
  const perUser = [];
  for (let i = 0; i < USER_COUNT; i++) {
    perUser.push(Math.floor(Math.random() * 4) + 1); // 1-4 experts per user
  }
  const expertLoads = new Array(EXPERT_COUNT).fill(0);
  for (let u = 0; u < USER_COUNT; u++) {
    const experts = shuffle(Array.from({ length: EXPERT_COUNT }, (_, i) => i)).slice(0, perUser[u]);
    for (const e of experts) expertLoads[e]++;
  }
  console.log(`[3/3] DRY RUN: ${perUser.reduce((a,b)=>a+b,0)} kết nối sẽ được tạo`);
  console.log(`  Phân phối chuyên gia (min–max): ${Math.min(...expertLoads)}–${Math.max(...expertLoads)} khách/CG`);
  console.log(`  Mật khẩu: ${PASSWORD}`);
  console.log(`  Email người dùng: ${userEmail(1)} … ${userEmail(USER_COUNT)}`);
  console.log(`  Email chuyên gia: ${expertEmail(1)} … ${expertEmail(EXPERT_COUNT)}`);
  process.exit(0);
}

// Real run — assign each user to 1–4 random experts, đảm bảo mỗi expert có ≥1 user
const expertUserCounts = new Array(EXPERT_COUNT).fill(0);
const assignmentPairs = [];

for (let u = 0; u < USER_COUNT; u++) {
  const uid = userIds[u];
  const count = Math.floor(Math.random() * 4) + 1;
  const candidates = shuffle(
    Array.from({ length: EXPERT_COUNT }, (_, i) => i)
  ).slice(0, count);
  for (const ei of candidates) {
    assignmentPairs.push({ uid, expertIdx: ei });
    expertUserCounts[ei]++;
  }
}

// Đảm bảo mỗi chuyên gia có ít nhất 1 khách
for (let e = 0; e < EXPERT_COUNT; e++) {
  if (expertUserCounts[e] > 0) continue;
  const uid = userIds[Math.floor(Math.random() * USER_COUNT)];
  assignmentPairs.push({ uid, expertIdx: e });
  expertUserCounts[e]++;
}

// Dedup per pair
const seen = new Set();
const unique = [];
for (const p of assignmentPairs) {
  const key = `${p.uid}|${expertIds[p.expertIdx]}`;
  if (seen.has(key)) continue;
  seen.add(key);
  unique.push(p);
}

// Thực hiện gán
db.transaction(() => {
  for (const p of unique) {
    const eid = expertIds[p.expertIdx];
    const result = assignExpertToCustomer(eid, p.uid);
    if (result.ok) assignmentsCreated++;
    else assignmentsSkipped++;
  }
})();

console.log(`[3/3] Kết nối: ${assignmentsCreated} tạo mới, ${assignmentsSkipped} bỏ qua`);
console.log(`  Phân phối: ${Math.min(...expertUserCounts)}–${Math.max(...expertUserCounts)} khách/CG`);

// ── Summary ─────────────────────────────────────────────────────────────────
console.log('\n========== HOÀN TẤT ==========');
console.log(`  Người dùng: ${usersCreated} mới + ${usersSkipped} tồn tại = ${userIds.length}`);
console.log(`  Chuyên gia: ${expertsCreated} mới + ${expertsSkipped} tồn tại = ${expertIds.length}`);
console.log(`  Kết nối:    ${assignmentsCreated} tạo mới`);
console.log(`  Mật khẩu:   ${PASSWORD}`);
console.log(`  Email ND:   ${userEmail(1)} … ${userEmail(USER_COUNT)}`);
console.log(`  Email CG:   ${expertEmail(1)} … ${expertEmail(EXPERT_COUNT)}`);
console.log('================================\n');
