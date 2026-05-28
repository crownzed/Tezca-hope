/**
 * 1) Tạo thêm 3 tài khoản chuyên gia demo (tổng 4 CG kể cả expert@tezca.vn)
 * 2) Gán 100 khách kh-demo-* chia đều cho 4 chuyên gia (25 / CG)
 * 3) Tạo 200 bản ghi dữ liệu công việc: 100 kế hoạch tập + 100 tin chat trực tiếp
 *
 * Chạy: npm run seed:demo-experts-work
 */
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.chdir(path.join(__dirname, '..'));

const {
  initDb,
  getDb,
  findUserByEmail,
  insertUser,
  assignExpertToCustomer,
  getTrainingPlanForCustomer,
  integrateTrainingPlanFromAi,
  updateTrainingPlanByExpert,
  insertLiveMessage,
} = await import('../src/db.js');

const DEMO_PASSWORD = 'TezcaDemo#2026';
const CUSTOMER_PREFIX = 'kh-demo';
const WORK_TAG = '[demo-work]';

const EXPERTS = [
  { email: 'expert@tezca.vn', name: 'BS. Minh Anh' },
  { email: 'cg-demo-02@tezca.vn', name: 'BS. Thu Hà' },
  { email: 'cg-demo-03@tezca.vn', name: 'BS. Quang Huy' },
  { email: 'cg-demo-04@tezca.vn', name: 'BS. Lan Phương' },
];

const EXERCISE_POOL = [
  { title: 'Plank', sets: 3, reps: '45 giây' },
  { title: 'Squat tại chỗ', sets: 3, reps: 12 },
  { title: 'Đi bộ nhẹ', sets: 1, reps: '15 phút' },
  { title: 'Thở 4-7-8', sets: 2, reps: '4 phút' },
  { title: 'Giãn cơ vai', sets: 2, reps: '30 giây' },
  { title: 'Nâng gối', sets: 3, reps: 10 },
];

const CHAT_SNIPPETS = [
  'Em hỏi về lịch tập tuần này ạ.',
  'Hôm nay em hơi mệt, có nên nghỉ không ạ?',
  'Em đã hoàn thành bài plank, nhờ chuyên gia xem giúp.',
  'Em muốn điều chỉnh khối lượng squat.',
  'Cảm ơn chuyên gia, em sẽ thử theo kế hoạch mới.',
];

function parseArg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (!hit) return fallback;
  return hit.slice(name.length + 3);
}

function planMarkdown(customerName, expertName) {
  return `${WORK_TAG}\n## Kế hoạch demo — ${customerName}\nChuyên gia phụ trách: ${expertName}\n- Khởi động 5 phút\n- 2–3 bài chính\n- Giãn cơ 5 phút`;
}

function pickExercises(seed) {
  const out = [];
  for (let j = 0; j < 3; j += 1) {
    const ex = EXERCISE_POOL[(seed + j) % EXERCISE_POOL.length];
    out.push({
      id: 900000 + seed * 10 + j,
      title: ex.title,
      sets: ex.sets,
      reps: ex.reps,
      isPTLocked: true,
    });
  }
  return out;
}

initDb();
const db = getDb();
const passwordHash = bcrypt.hashSync(DEMO_PASSWORD, 10);

const expertAccounts = [];
let expertsCreated = 0;

for (const spec of EXPERTS) {
  let u = findUserByEmail(spec.email);
  if (!u) {
    insertUser({
      id: crypto.randomUUID(),
      email: spec.email,
      passwordHash,
      role: 'expert',
      name: spec.name,
    });
    u = findUserByEmail(spec.email);
    expertsCreated += 1;
  }
  if (u) expertAccounts.push({ ...spec, id: u.id });
}

const customers = db
  .prepare(
    `SELECT id, email, name FROM users
     WHERE role = 'user' AND email LIKE ?
     ORDER BY email COLLATE NOCASE`,
  )
  .all(`${CUSTOMER_PREFIX}-%`);

if (customers.length === 0) {
  console.error(
    `Không tìm thấy khách hàng ${CUSTOMER_PREFIX}-*. Chạy trước: npm run seed:demo-customers`,
  );
  process.exit(1);
}

const customerIds = customers.map((c) => c.id);

db.transaction(() => {
  const del = db.prepare(`DELETE FROM assignments WHERE patient_id = ?`);
  for (const id of customerIds) del.run(id);
})();

const assignmentCounts = Object.fromEntries(expertAccounts.map((e) => [e.email, 0]));

for (let i = 0; i < customers.length; i += 1) {
  const expert = expertAccounts[i % expertAccounts.length];
  assignExpertToCustomer(expert.id, customers[i].id);
  assignmentCounts[expert.email] += 1;
}

db.prepare(
  `DELETE FROM live_messages
   WHERE patient_id IN (SELECT id FROM users WHERE email LIKE ?)
     AND content LIKE ?`,
).run(`${CUSTOMER_PREFIX}-%`, `${WORK_TAG}%`);

let plansCreated = 0;
let plansSkipped = 0;
let plansApproved = 0;
let messagesCreated = 0;

const targetMessages = Number(parseArg('work-messages', '100')) || 100;
const targetPlans = Number(parseArg('work-plans', '100')) || 100;

for (let i = 0; i < customers.length; i += 1) {
  const customer = customers[i];
  const expert = expertAccounts[i % expertAccounts.length];
  const seed = i + 1;

  const existing = getTrainingPlanForCustomer(customer.id);
  if (existing?.sourcePlanMd?.includes(WORK_TAG)) {
    plansSkipped += 1;
  } else if (!existing && plansCreated < targetPlans) {
    integrateTrainingPlanFromAi(
      customer.id,
      planMarkdown(customer.name, expert.name),
      pickExercises(seed),
    );
    plansCreated += 1;
  } else if (existing) {
    plansSkipped += 1;
  }

  const plan = getTrainingPlanForCustomer(customer.id);
  if (plan?.sourcePlanMd?.includes(WORK_TAG) && plan.status !== 'approved') {
    updateTrainingPlanByExpert(customer.id, expert.id, {
      status: 'approved',
      expertNote: `${WORK_TAG} Đã duyệt tự động cho demo.`,
    });
    plansApproved += 1;
  }

  if (messagesCreated < targetMessages) {
    const content = `${WORK_TAG} ${CHAT_SNIPPETS[i % CHAT_SNIPPETS.length]}`;
    insertLiveMessage({
      customerId: customer.id,
      senderUserId: customer.id,
      senderRole: 'customer',
      content,
    });
    messagesCreated += 1;
  }
}

const workTotal = plansCreated + messagesCreated;

console.log(
  JSON.stringify(
    {
      experts: expertAccounts.map((e) => ({ email: e.email, name: e.name })),
      expertsCreated,
      customers: customers.length,
      assignmentCounts,
      workData: {
        trainingPlansCreated: plansCreated,
        trainingPlansSkipped: plansSkipped,
        trainingPlansApproved: plansApproved,
        liveMessagesCreated: messagesCreated,
        totalRecords: workTotal,
      },
      password: DEMO_PASSWORD,
    },
    null,
    2,
  ),
);

console.log('\n--- Chuyên gia & công việc demo ---');
console.log(`  Chuyên gia mới:     ${expertsCreated}`);
console.log(`  Khách hàng gán:    ${customers.length} (chia ${expertAccounts.length} CG)`);
for (const e of expertAccounts) {
  console.log(`    ${e.email}: ${assignmentCounts[e.email]} KH`);
}
console.log(`  Kế hoạch tập:      +${plansCreated} (bỏ qua ${plansSkipped})`);
console.log(`  Tin chat CG–KH:    +${messagesCreated}`);
console.log(`  Tổng bản ghi CV:   ${workTotal}`);
console.log(`  Mật khẩu:          ${DEMO_PASSWORD}\n`);
