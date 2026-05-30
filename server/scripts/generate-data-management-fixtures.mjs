/**
 * Tạo 50 file JSON thử nghiệm cho chức năng quản lý dữ liệu.
 * Output: server/data/fixtures/data-management/*.json
 *
 * Chạy: npm run generate:data-management-files
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.chdir(path.join(__dirname, '..'));

const OUT_DIR = path.join(process.cwd(), 'data', 'fixtures', 'data-management');
const FILE_COUNT = 50;
const TAG = 'data-management-demo';

const {
  initDb,
  findUserByEmail,
  listBmiForUser,
  listMoodsForUser,
  listBotMessagesForUser,
  getTrainingPlanForCustomer,
  getExpertsForCustomer,
} = await import('../src/db.js');

function pad3(n) {
  return String(n).padStart(3, '0');
}

function addDays(iso, delta) {
  const d = new Date(iso);
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

function envelope(recordType, label, payload, meta = {}) {
  return {
    fileVersion: 1,
    recordType,
    label,
    generatedAt: new Date().toISOString(),
    tags: [TAG, recordType],
    ...meta,
    payload,
  };
}

function demoCustomerEmail(index) {
  return `kh-demo-${pad3(index)}@tezca.vn`;
}

function loadCustomerBundle(index) {
  const email = demoCustomerEmail(index);
  const user = findUserByEmail(email);
  if (!user) {
    return {
      customer: {
        email,
        name: `Khách demo ${pad3(index)}`,
        role: 'user',
        externalId: `dm-customer-${pad3(index)}`,
      },
      assignments: [{ expertEmail: 'expert@tezca.vn', expertName: 'BS. Minh Anh' }],
      bmi: [],
      moods: [],
      botMessages: [],
      trainingPlan: null,
      note: 'Tài khoản chưa có trên DB — dùng để test import tạo mới.',
    };
  }

  const experts = getExpertsForCustomer(user.id);
  return {
    customer: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    },
    assignments: experts.map((e) => ({ expertId: e.id, expertEmail: e.email, expertName: e.name })),
    bmi: listBmiForUser(user.id),
    moods: listMoodsForUser(user.id),
    botMessages: listBotMessagesForUser(user.id).slice(-6),
    trainingPlan: getTrainingPlanForCustomer(user.id),
  };
}

function syntheticBmiBatch(batchIndex) {
  const today = new Date().toISOString().slice(0, 10);
  const rows = [];
  for (let d = 0; d < 5; d += 1) {
    const h = 158 + ((batchIndex + d) % 20);
    const w = 50 + ((batchIndex * 2 + d) % 28);
    rows.push({
      date: addDays(today, -d - batchIndex),
      heightCm: h,
      weightKg: w,
      bmi: round1(w / (h / 100) ** 2),
      customerEmail: demoCustomerEmail(((batchIndex + d) % 50) + 1),
    });
  }
  return rows;
}

function syntheticMoodBatch(batchIndex) {
  const labels = ['Ổn', 'Vui', 'Bình thường', 'Mệt nhẹ', 'Căng thẳng'];
  const today = new Date().toISOString().slice(0, 10);
  const rows = [];
  for (let d = 0; d < 4; d += 1) {
    rows.push({
      date: addDays(today, -d - batchIndex),
      moodLabel: labels[(batchIndex + d) % labels.length],
      moodScore: 2 + ((batchIndex + d) % 4),
      note: d === 0 ? 'Ghi chú import batch demo.' : '',
      customerEmail: demoCustomerEmail(((batchIndex + d) % 50) + 1),
    });
  }
  return rows;
}

function syntheticAssignmentBatch(batchIndex) {
  const experts = [
    'expert@tezca.vn',
    'cg-demo-02@tezca.vn',
    'cg-demo-03@tezca.vn',
    'cg-demo-04@tezca.vn',
  ];
  const rows = [];
  for (let j = 0; j < 6; j += 1) {
    const ci = ((batchIndex * 6 + j) % 50) + 1;
    rows.push({
      customerEmail: demoCustomerEmail(ci),
      expertEmail: experts[(batchIndex + j) % experts.length],
      action: 'assign',
    });
  }
  return rows;
}

function syntheticTrainingPlan(index) {
  const email = demoCustomerEmail(index);
  return {
    customerEmail: email,
    status: index % 3 === 0 ? 'pending_review' : 'approved',
    sourcePlanMd: `## Kế hoạch import demo ${pad3(index)}\n- Khởi động\n- Tập chính\n- Giãn cơ`,
    expertNote: 'File fixture quản lý dữ liệu.',
    exercises: [
      { id: 700000 + index, title: 'Plank', sets: 3, reps: '40 giây', isPTLocked: true },
      { id: 700100 + index, title: 'Squat', sets: 3, reps: 10, isPTLocked: true },
    ],
    dailyProgress: {},
  };
}

function syntheticAuditBatch(batchIndex) {
  const actions = ['list_customers', 'live_message', 'assign_customer', 'update_training_plan'];
  const rows = [];
  for (let j = 0; j < 8; j += 1) {
    rows.push({
      ts: Date.now() - (batchIndex * 8 + j) * 3600000,
      actorRole: 'expert',
      actorEmail: 'expert@tezca.vn',
      action: actions[(batchIndex + j) % actions.length],
      customerEmail: demoCustomerEmail(((batchIndex + j) % 50) + 1),
      meta: { source: TAG },
    });
  }
  return rows;
}

/** @type {{ name: string; build: (i: number) => object }[]} */
const builders = [];

for (let i = 1; i <= 20; i += 1) {
  builders.push({
    name: `dm-${pad3(i)}-customer-export.json`,
    build: () =>
      envelope(
        'customer_health_export',
        `Hồ sơ khách hàng ${demoCustomerEmail(i)}`,
        loadCustomerBundle(i),
        { customerEmail: demoCustomerEmail(i) },
      ),
  });
}

for (let b = 1; b <= 10; b += 1) {
  const idx = 20 + b;
  builders.push({
    name: `dm-${pad3(idx)}-bmi-batch.json`,
    build: () =>
      envelope('bmi_import_batch', `Lô BMI #${b}`, {
        rows: syntheticBmiBatch(b),
        importMode: 'upsert_by_customer_date',
      }),
  });
}

for (let b = 1; b <= 10; b += 1) {
  const idx = 30 + b;
  builders.push({
    name: `dm-${pad3(idx)}-mood-batch.json`,
    build: () =>
      envelope('mood_import_batch', `Lô mood #${b}`, {
        rows: syntheticMoodBatch(b),
        importMode: 'upsert_by_customer_date',
      }),
  });
}

for (let b = 1; b <= 5; b += 1) {
  const idx = 40 + b;
  builders.push({
    name: `dm-${pad3(idx)}-assignments.json`,
    build: () =>
      envelope('assignment_import_batch', `Lô gán CG–KH #${b}`, {
        rows: syntheticAssignmentBatch(b),
        importMode: 'insert_or_ignore',
      }),
  });
}

for (let b = 1; b <= 5; b += 1) {
  const idx = 45 + b;
  builders.push({
    name: `dm-${pad3(idx)}-training-plan.json`,
    build: () =>
      envelope('training_plan_export', `Kế hoạch tập ${demoCustomerEmail(b)}`, syntheticTrainingPlan(b)),
  });
}

initDb();
fs.mkdirSync(OUT_DIR, { recursive: true });

if (builders.length !== FILE_COUNT) {
  console.error(`Expected ${FILE_COUNT} builders, got ${builders.length}`);
  process.exit(1);
}

const written = [];
for (const { name, build } of builders) {
  const filePath = path.join(OUT_DIR, name);
  fs.writeFileSync(filePath, `${JSON.stringify(build(), null, 2)}\n`, 'utf8');
  written.push(name);
}

console.log(
  JSON.stringify(
    {
      outputDir: OUT_DIR,
      filesCreated: written.length,
      byType: written.reduce((acc, name) => {
        const t = JSON.parse(fs.readFileSync(path.join(OUT_DIR, name), 'utf8')).recordType;
        acc[t] = (acc[t] || 0) + 1;
        return acc;
      }, {}),
      sampleFiles: written.slice(0, 3),
    },
    null,
    2,
  ),
);
