#!/usr/bin/env node
/**
 * seedRealData.js
 * Tạo tài khoản thật: 1 admin + 5 chuyên gia + 20 khách hàng.
 * Mỗi tài khoản có mật khẩu riêng, in ra bảng credentials cuối cùng.
 * Tự chứa: dùng @libsql/client + bcryptjs, không phụ thuộc app code.
 *
 * Chạy:
 *   TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... node seedRealData.js
 */
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { createClient } from '@libsql/client';

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!TURSO_URL || !TURSO_TOKEN) {
  console.error('❌ Thiếu TURSO_DATABASE_URL hoặc TURSO_AUTH_TOKEN');
  process.exit(1);
}

const client = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

const now = Date.now();
const todayIso = new Date().toISOString().slice(0, 10);

function addDaysIso(delta) {
  const d = new Date();
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}
function round1(n) { return Math.round(n * 10) / 10; }

/** Mật khẩu ngẫu nhiên dễ đọc (chữ + số). */
function genPassword(prefix) {
  const n = crypto.randomInt(1000, 9999);
  return `${prefix}@${n}`;
}

// ---- Dữ liệu tên thật ----
const ADMIN = { email: 'admin@tezca.vn', name: 'Trần Quản Trị', pw: genPassword('Admin') };

const EXPERTS = [
  { email: 'bs.minhanh@tezca.vn', name: 'BS. Nguyễn Minh Anh', gender: 'Nữ', specialty: 'Dinh dưỡng lâm sàng', license: 'CCHN-DD-1024', bio: 'Chuyên gia dinh dưỡng, 10 năm kinh nghiệm tư vấn chế độ ăn và kiểm soát cân nặng.' },
  { email: 'bs.quanghuy@tezca.vn', name: 'BS. Lê Quang Huy', gender: 'Nam', specialty: 'Vật lý trị liệu', license: 'CCHN-VLTL-2087', bio: 'Phục hồi chức năng cơ xương khớp, chấn thương thể thao.' },
  { email: 'bs.thuha@tezca.vn', name: 'BS. Phạm Thu Hà', gender: 'Nữ', specialty: 'Tâm lý trị liệu', license: 'CCHN-TL-3391', bio: 'Tư vấn tâm lý, quản lý căng thẳng và rối loạn lo âu.' },
  { email: 'bs.hoangnam@tezca.vn', name: 'BS. Vũ Hoàng Nam', gender: 'Nam', specialty: 'Y học thể thao', license: 'CCHN-YHTT-4150', bio: 'Thiết kế chương trình tập luyện cá nhân hoá theo thể trạng.' },
  { email: 'bs.lanphuong@tezca.vn', name: 'BS. Đặng Lan Phương', gender: 'Nữ', specialty: 'Nội tổng quát', license: 'CCHN-NTQ-5276', bio: 'Theo dõi sức khoẻ tổng quát, bệnh lý chuyển hoá, đái tháo đường.' },
];

const FAMILY = ['Nguyễn','Trần','Lê','Phạm','Hoàng','Huỳnh','Phan','Vũ','Võ','Đặng','Bùi','Đỗ','Hồ','Ngô','Dương'];
const MIDDLE_M = ['Văn','Hữu','Minh','Quốc','Đức','Thành','Công','Bá'];
const MIDDLE_F = ['Thị','Ngọc','Thanh','Kim','Thu','Mỹ','Hồng','Diễm'];
const GIVEN_M = ['An','Bình','Dũng','Hùng','Khang','Long','Nam','Phúc','Quân','Sơn','Tuấn','Việt','Kiên','Đạt'];
const GIVEN_F = ['Châu','Giang','Hà','Lan','Linh','Mai','Nga','Thảo','Uyên','Yến','Trang','Hương','Ngân','Vy'];
const CITIES = ['Hà Nội','TP. Hồ Chí Minh','Đà Nẵng','Hải Phòng','Cần Thơ','Nha Trang','Huế','Vũng Tàu','Biên Hòa','Quy Nhơn'];
const MOOD = [['Vui',5,'😄'],['Ổn',4,'🙂'],['Bình thường',3,'😐'],['Mệt nhẹ',2,'😪'],['Căng thẳng',1,'😣']];

function noAccent(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g,'d').replace(/Đ/g,'D');
}

function makeCustomer(i) {
  const isMale = i % 2 === 0;
  const fam = FAMILY[i % FAMILY.length];
  const mid = isMale ? MIDDLE_M[i % MIDDLE_M.length] : MIDDLE_F[i % MIDDLE_F.length];
  const giv = isMale ? GIVEN_M[i % GIVEN_M.length] : GIVEN_F[i % GIVEN_F.length];
  const name = `${fam} ${mid} ${giv}`;
  const slug = noAccent(`${giv}.${fam}`).toLowerCase().replace(/\s+/g,'');
  const email = `${slug}${100 + i}@gmail.com`;
  const heightCm = 150 + ((i * 7) % 35);          // 150-184
  const weightKg = 48 + ((i * 5) % 42);            // 48-89
  const age = 18 + ((i * 3) % 48);                 // 18-65
  const dobYear = 2026 - age;
  return {
    name, email, gender: isMale ? 'Nam' : 'Nữ',
    dob: `${dobYear}-0${1 + (i % 9)}-1${i % 9}`,
    phone: `09${String(10000000 + i * 137).slice(0, 8)}`,
    address: `${10 + i} Đường ${i + 1}, ${CITIES[i % CITIES.length]}`,
    heightCm, weightKg, bmi: round1(weightKg / ((heightCm / 100) ** 2)),
    pw: genPassword('Kh'),
  };
}

async function insertUser({ id, email, passwordHash, role, name }) {
  await client.execute({
    sql: `INSERT INTO users (id, email, password_hash, role, name, created_at, avatar_url, bio)
          VALUES (?, ?, ?, ?, ?, ?, '', '')`,
    args: [id, email, passwordHash, role, name, now],
  });
}

async function main() {
  console.log('🔗 Kết nối Turso:', TURSO_URL);
  const created = { admin: [], experts: [], customers: [] };

  // Idempotent: xoá trước các email đích + tài khoản demo runtime để insert sạch.
  // FK ON DELETE CASCADE sẽ dọn profile/bmi/mood/... liên quan.
  const targetEmails = [
    ADMIN.email,
    'patient@tezca.vn',
    ...EXPERTS.map((e) => e.email),
    ...Array.from({ length: 20 }, (_, i) => makeCustomer(i).email),
  ];
  for (const email of targetEmails) {
    await client.execute({ sql: `DELETE FROM users WHERE email = ?`, args: [email] });
  }
  console.log(`🧹 Đã dọn ${targetEmails.length} email đích (nếu tồn tại).`);

  // 1) ADMIN
  {
    const id = crypto.randomUUID();
    const hash = bcrypt.hashSync(ADMIN.pw, 10);
    await insertUser({ id, email: ADMIN.email, passwordHash: hash, role: 'admin', name: ADMIN.name });
    await client.execute({
      sql: `INSERT OR IGNORE INTO user_role_grants (user_id, role, created_at) VALUES (?, 'admin', ?)`,
      args: [id, now],
    });
    created.admin.push({ email: ADMIN.email, pw: ADMIN.pw, name: ADMIN.name });
    console.log('✅ Admin:', ADMIN.email);
  }

  // 2) EXPERTS
  for (const ex of EXPERTS) {
    ex.pw = ex.pw || genPassword('Cg');
    const id = crypto.randomUUID();
    const hash = bcrypt.hashSync(ex.pw, 10);
    await insertUser({ id, email: ex.email, passwordHash: hash, role: 'expert', name: ex.name });
    await client.execute({
      sql: `INSERT OR IGNORE INTO expert_profiles
            (user_id, full_name, gender, specialty, license_no, bio, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      args: [id, ex.name, ex.gender, ex.specialty, ex.license, ex.bio, now, now],
    });
    created.experts.push({ email: ex.email, pw: ex.pw, name: ex.name, specialty: ex.specialty });
    console.log('✅ Expert:', ex.email);
  }

  // 3) CUSTOMERS (+ profile, health, BMI/mood 7 ngày)
  for (let i = 0; i < 20; i += 1) {
    const c = makeCustomer(i);
    const id = crypto.randomUUID();
    const hash = bcrypt.hashSync(c.pw, 10);
    await insertUser({ id, email: c.email, passwordHash: hash, role: 'user', name: c.name });
    await client.execute({
      sql: `INSERT OR IGNORE INTO customer_profiles
            (user_id, full_name, gender, dob, phone, address, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, '', ?, ?)`,
      args: [id, c.name, c.gender, c.dob, c.phone, c.address, now, now],
    });
    // BMI + mood 7 ngày gần nhất
    for (let d = 0; d < 7; d += 1) {
      const date = addDaysIso(-d);
      const w = round1(c.weightKg - d * 0.05);
      await client.execute({
        sql: `INSERT OR IGNORE INTO bmi_entries (id, user_id, date, height_cm, weight_kg, bmi)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [crypto.randomUUID(), id, date, c.heightCm, w, round1(w / ((c.heightCm / 100) ** 2))],
      });
      const m = MOOD[(i + d) % MOOD.length];
      await client.execute({
        sql: `INSERT OR IGNORE INTO mood_entries (id, user_id, date, mood_label, mood_score, note, free_text, mood_emoji)
              VALUES (?, ?, ?, ?, ?, '', '', ?)`,
        args: [crypto.randomUUID(), id, date, m[0], m[1], m[2]],
      });
    }
    created.customers.push({ email: c.email, pw: c.pw, name: c.name });
    console.log(`✅ Customer ${i + 1}/20:`, c.email);
  }

  // ---- Output bảng credentials ----
  console.log('\n\n=========== TÀI KHOẢN ĐÃ TẠO ===========\n');
  console.log('--- ADMIN (1) ---');
  for (const a of created.admin) console.log(`${a.email}\t${a.pw}\t${a.name}`);
  console.log('\n--- CHUYÊN GIA (5) ---');
  for (const e of created.experts) console.log(`${e.email}\t${e.pw}\t${e.name} (${e.specialty})`);
  console.log('\n--- KHÁCH HÀNG (20) ---');
  for (const c of created.customers) console.log(`${c.email}\t${c.pw}\t${c.name}`);
  console.log('\n=========================================');

  // JSON để dễ copy
  console.log('\nJSON_OUTPUT_START');
  console.log(JSON.stringify(created, null, 2));
  console.log('JSON_OUTPUT_END');
}

main().then(() => process.exit(0)).catch((e) => {
  console.error('❌ Lỗi:', e.message);
  process.exit(1);
});
