/**
 * Tạo khách hàng thử nghiệm (role: user) trong SQLite.
 * Chạy từ thư mục server: npm run seed:demo-customers
 *
 * Tuỳ chọn:
 *   --count=100          Số bản ghi (mặc định 100)
 *   --prefix=kh-demo     Tiền tố email: {prefix}-001@tezca.vn
 *   --with-health        Thêm 1 BMI + 1 mood mẫu / khách hàng
 *   --no-assign          Không gán cho chuyên gia demo
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
  upsertBmiEntry,
  upsertMoodEntry,
} = await import('../src/db.js');

const DEMO_PASSWORD = 'TezcaDemo#2026';
const EXPERT_EMAIL = 'expert@tezca.vn';

const FAMILY = [
  'Nguyễn',
  'Trần',
  'Lê',
  'Phạm',
  'Hoàng',
  'Huỳnh',
  'Phan',
  'Vũ',
  'Võ',
  'Đặng',
  'Bùi',
  'Đỗ',
  'Hồ',
  'Ngô',
  'Dương',
];
const MIDDLE = ['Văn', 'Thị', 'Hữu', 'Minh', 'Quốc', 'Thanh', 'Ngọc', 'Đức', 'Anh', 'Kim'];
const GIVEN = [
  'An',
  'Bình',
  'Châu',
  'Dũng',
  'Giang',
  'Hà',
  'Hùng',
  'Khang',
  'Lan',
  'Linh',
  'Long',
  'Mai',
  'Nam',
  'Nga',
  'Phúc',
  'Quân',
  'Sơn',
  'Tâm',
  'Thảo',
  'Tuấn',
  'Uyên',
  'Việt',
  'Xuân',
  'Yến',
];

const MOOD_LABELS = ['Ổn', 'Bình thường', 'Vui', 'Mệt nhẹ', 'Căng thẳng'];

function parseArg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (!hit) return fallback;
  return hit.slice(name.length + 3);
}

function parseFlag(name) {
  return process.argv.includes(`--${name}`);
}

function demoName(index) {
  const i = index - 1;
  return `${FAMILY[i % FAMILY.length]} ${MIDDLE[Math.floor(i / FAMILY.length) % MIDDLE.length]} ${GIVEN[i % GIVEN.length]}`;
}

function demoEmail(prefix, index) {
  return `${prefix}-${String(index).padStart(3, '0')}@tezca.vn`;
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

const count = Math.max(1, Math.min(500, Number(parseArg('count', '100')) || 100));
const prefix = String(parseArg('prefix', 'kh-demo')).replace(/[^a-z0-9-]/gi, '') || 'kh-demo';
const withHealth = parseFlag('with-health');
const assignExpert = !parseFlag('no-assign');

initDb();

let expert = findUserByEmail(EXPERT_EMAIL);
if (assignExpert && !expert) {
  const hash = bcrypt.hashSync(DEMO_PASSWORD, 10);
  insertUser({
    id: crypto.randomUUID(),
    email: EXPERT_EMAIL,
    passwordHash: hash,
    role: 'expert',
    name: 'BS. Minh Anh',
  });
  expert = findUserByEmail(EXPERT_EMAIL);
}

const passwordHash = bcrypt.hashSync(DEMO_PASSWORD, 10);
const today = todayIso();
let created = 0;
let skipped = 0;
let assigned = 0;

for (let i = 1; i <= count; i += 1) {
  const email = demoEmail(prefix, i);
  if (findUserByEmail(email)) {
    skipped += 1;
    if (assignExpert && expert) {
      const existing = findUserByEmail(email);
      if (existing && assignExpertToCustomer(expert.id, existing.id).ok) assigned += 1;
    }
    continue;
  }

  const id = crypto.randomUUID();
  insertUser({
    id,
    email,
    passwordHash,
    role: 'user',
    name: demoName(i),
  });
  created += 1;

  if (assignExpert && expert && assignExpertToCustomer(expert.id, id).ok) {
    assigned += 1;
  }

  if (withHealth) {
    const heightCm = 155 + (i % 25);
    const weightKg = 48 + (i % 35);
    const bmi = round1(weightKg / (heightCm / 100) ** 2);
    upsertBmiEntry({
      id: crypto.randomUUID(),
      userId: id,
      date: today,
      heightCm,
      weightKg,
      bmi,
    });
    upsertMoodEntry({
      id: crypto.randomUUID(),
      userId: id,
      date: today,
      moodLabel: MOOD_LABELS[i % MOOD_LABELS.length],
      moodScore: 2 + (i % 4),
      note: i % 5 === 0 ? 'Dữ liệu thử nghiệm Tezca.' : '',
    });
  }
}

const sampleEmail = demoEmail(prefix, 1);
const sampleLast = demoEmail(prefix, Math.min(count, 100));

console.log(
  JSON.stringify(
    {
      count,
      prefix,
      created,
      skipped,
      assignedToExpert: assignExpert ? assigned : 0,
      withHealth,
      expertEmail: assignExpert ? EXPERT_EMAIL : null,
      password: DEMO_PASSWORD,
      emailRange: `${sampleEmail} … ${sampleLast}`,
    },
    null,
    2,
  ),
);

console.log('\n--- Khách hàng thử nghiệm ---');
console.log(`  Số tạo mới:     ${created}`);
console.log(`  Đã tồn tại:     ${skipped}`);
if (assignExpert) console.log(`  Gán chuyên gia: ${assigned} → ${EXPERT_EMAIL}`);
console.log(`  Email mẫu:      ${sampleEmail}`);
console.log(`  Mật khẩu:       ${DEMO_PASSWORD}`);
if (!withHealth) {
  console.log('  (Thêm BMI/mood: npm run seed:demo-customers -- --with-health)\n');
} else {
  console.log('');
}
