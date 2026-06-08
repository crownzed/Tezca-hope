/**
 * Seed dữ liệu demo: 100 KH + 4 CG + gán đều + 200 bản ghi công việc.
 * Dùng từ CLI (seed-all-demo) và runtime Vercel (connection.js).
 */
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import {
  getDb,
  findUserByEmail,
  insertUser,
  assignExpertToCustomer,
  upsertBmiEntry,
  upsertMoodEntry,
  getTrainingPlanForCustomer,
  integrateTrainingPlanFromAi,
  updateTrainingPlanByExpert,
  insertLiveMessage,
} from '../db.js';

export const DEMO_PASSWORD = 'TezcaDemo#2026';
export const DEMO_CUSTOMER_PREFIX = 'kh-demo';

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

export const DEMO_EXPERTS = [
  { email: 'expert@tezca.vn', name: 'BS. Minh Anh' },
  { email: 'cg-demo-02@tezca.vn', name: 'BS. Thu Hà' },
  { email: 'cg-demo-03@tezca.vn', name: 'BS. Quang Huy' },
  { email: 'cg-demo-04@tezca.vn', name: 'BS. Lan Phương' },
];

const WORK_TAG = '[demo-work]';
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

function addDays(isoDate, delta) {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

function customerIndexFromEmail(email, fallback) {
  const m = String(email).match(/-(\d{3})@/);
  return m ? Number(m[1]) : fallback;
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

export function countDemoCustomers(prefix = DEMO_CUSTOMER_PREFIX) {
  return getDb()
    .prepare(`SELECT COUNT(*) AS c FROM users WHERE role = 'user' AND email LIKE ?`)
    .get(`${prefix}-%`).c;
}

/**
 * @param {{ count?: number; prefix?: string; withHealth?: boolean; assignExpert?: boolean }} [options]
 */
export function seedDemoCustomers(options = {}) {
  const count = Math.max(1, Math.min(500, options.count ?? 100));
  const prefix = String(options.prefix ?? DEMO_CUSTOMER_PREFIX).replace(/[^a-z0-9-]/gi, '') || DEMO_CUSTOMER_PREFIX;
  const withHealth = options.withHealth !== false;
  const assignExpert = options.assignExpert === true;
  const expertEmail = 'expert@tezca.vn';

  let expert = findUserByEmail(expertEmail);
  const passwordHash = bcrypt.hashSync(DEMO_PASSWORD, 10);
  if (assignExpert && !expert) {
    insertUser({
      id: crypto.randomUUID(),
      email: expertEmail,
      passwordHash,
      role: 'expert',
      name: 'BS. Minh Anh',
    });
    expert = findUserByEmail(expertEmail);
  }

  const today = todayIso();
  let created = 0;
  let skipped = 0;
  let assigned = 0;

  for (let i = 1; i <= count; i += 1) {
    const email = demoEmail(prefix, i);
    const existing = findUserByEmail(email);
    if (existing) {
      skipped += 1;
      if (assignExpert && expert && assignExpertToCustomer(expert.id, existing.id).ok) assigned += 1;
      continue;
    }

    const id = crypto.randomUUID();
    insertUser({ id, email, passwordHash, role: 'user', name: demoName(i) });
    created += 1;

    if (assignExpert && expert && assignExpertToCustomer(expert.id, id).ok) assigned += 1;

    if (withHealth) {
      const heightCm = 155 + (i % 25);
      const weightKg = 48 + (i % 35);
      upsertBmiEntry({
        id: crypto.randomUUID(),
        userId: id,
        date: today,
        heightCm,
        weightKg,
        bmi: round1(weightKg / (heightCm / 100) ** 2),
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

  return { count, prefix, created, skipped, assigned, withHealth };
}

/**
 * BMI + mood 30 ngày (heatmap chuyên gia) cho mọi khách kh-demo-*.
 * @param {{ prefix?: string; days?: number }} [options]
 */
export function seedDemoHealthHistory30Days(options = {}) {
  const prefix = String(options.prefix ?? DEMO_CUSTOMER_PREFIX).replace(/[^a-z0-9-]/gi, '') || DEMO_CUSTOMER_PREFIX;
  const days = Math.max(1, Math.min(120, options.days ?? 30));
  const db = getDb();
  const today = todayIso();
  const startDate = addDays(today, -(days - 1));

  const customers = db
    .prepare(
      `SELECT id, email FROM users WHERE role = 'user' AND email LIKE ? ORDER BY email COLLATE NOCASE`,
    )
    .all(`${prefix}-%`);

  if (customers.length === 0) {
    return { ok: false, error: 'no_demo_customers', customers: 0, days };
  }

  const delBmi = db.prepare(`DELETE FROM bmi_entries WHERE user_id = ? AND date >= ? AND date <= ?`);
  const delMood = db.prepare(`DELETE FROM mood_entries WHERE user_id = ? AND date >= ? AND date <= ?`);
  const insBmi = db.prepare(
    `INSERT INTO bmi_entries (id, user_id, date, height_cm, weight_kg, bmi) VALUES (?, ?, ?, ?, ?, ?)`,
  );
  const insMood = db.prepare(
    `INSERT INTO mood_entries (id, user_id, date, mood_label, mood_score, note) VALUES (?, ?, ?, ?, ?, ?)`,
  );

  let bmiRows = 0;
  let moodRows = 0;

  db.transaction(() => {
    for (let ci = 0; ci < customers.length; ci += 1) {
      const { id: userId, email } = customers[ci];
      const idx = customerIndexFromEmail(email, ci + 1);
      const heightCm = 155 + (idx % 25);
      const baseWeight = 50 + (idx % 28);

      delBmi.run(userId, startDate, today);
      delMood.run(userId, startDate, today);

      for (let d = 0; d < days; d += 1) {
        const date = addDays(today, -d);
        const weightKg = round1(baseWeight - d * 0.04 + ((idx + d) % 5) * 0.1);
        insBmi.run(
          crypto.randomUUID(),
          userId,
          date,
          heightCm,
          weightKg,
          round1(weightKg / (heightCm / 100) ** 2),
        );
        bmiRows += 1;

        const moodScore = 1 + ((idx + d * 2) % 5);
        insMood.run(
          crypto.randomUUID(),
          userId,
          date,
          MOOD_LABELS[(idx + d) % MOOD_LABELS.length],
          moodScore,
          d % 12 === 0 ? 'Dữ liệu heatmap 30 ngày (demo).' : '',
        );
        moodRows += 1;
      }
    }
  })();

  return {
    ok: true,
    customers: customers.length,
    days,
    bmiRows,
    moodRows,
    dateRange: `${startDate} … ${today}`,
  };
}

/**
 * @param {{ customerPrefix?: string; workPlans?: number; workMessages?: number }} [options]
 */
export function seedDemoExpertsAndWork(options = {}) {
  const customerPrefix = options.customerPrefix ?? DEMO_CUSTOMER_PREFIX;
  const targetPlans = options.workPlans ?? 100;
  const targetMessages = options.workMessages ?? 100;
  const db = getDb();
  const passwordHash = bcrypt.hashSync(DEMO_PASSWORD, 10);

  const expertAccounts = [];
  let expertsCreated = 0;

  for (const spec of DEMO_EXPERTS) {
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
    .all(`${customerPrefix}-%`);

  if (customers.length === 0) {
    return { ok: false, error: 'no_demo_customers', expertsCreated, customers: 0 };
  }

  db.transaction(() => {
    const del = db.prepare(`DELETE FROM assignments WHERE patient_id = ?`);
    for (const c of customers) del.run(c.id);
  })();

  const assignmentCounts = Object.fromEntries(DEMO_EXPERTS.map((e) => [e.email, 0]));
  for (let i = 0; i < customers.length; i += 1) {
    const expert = expertAccounts[i % expertAccounts.length];
    assignExpertToCustomer(expert.id, customers[i].id);
    assignmentCounts[expert.email] += 1;
  }

  db.prepare(
    `DELETE FROM live_messages
     WHERE patient_id IN (SELECT id FROM users WHERE email LIKE ?)
       AND content LIKE ?`,
  ).run(`${customerPrefix}-%`, `${WORK_TAG}%`);

  let plansCreated = 0;
  let plansSkipped = 0;
  let plansApproved = 0;
  let messagesCreated = 0;

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
      insertLiveMessage({
        customerId: customer.id,
        senderUserId: customer.id,
        senderRole: 'customer',
        content: `${WORK_TAG} ${CHAT_SNIPPETS[i % CHAT_SNIPPETS.length]}`,
      });
      messagesCreated += 1;
    }
  }

  return {
    ok: true,
    expertsCreated,
    customers: customers.length,
    assignmentCounts,
    workData: {
      trainingPlansCreated: plansCreated,
      trainingPlansSkipped: plansSkipped,
      trainingPlansApproved: plansApproved,
      liveMessagesCreated: messagesCreated,
      totalRecords: plansCreated + messagesCreated,
    },
  };
}

/** Yêu cầu 1 + 2: 100 khách, 30 ngày BMI/mood, 4 CG, gán đều, 200 bản ghi công việc. */
export function seedAllDemo(options = {}) {
  const prefix = options.prefix ?? DEMO_CUSTOMER_PREFIX;
  const customers = seedDemoCustomers({
    count: options.count ?? 100,
    prefix,
    withHealth: options.withHealth !== false,
    assignExpert: false,
  });
  const health30d = seedDemoHealthHistory30Days({
    prefix,
    days: options.healthDays ?? 30,
  });
  const expertsWork = seedDemoExpertsAndWork({
    customerPrefix: prefix,
    workPlans: options.workPlans ?? 100,
    workMessages: options.workMessages ?? 100,
  });
  return { customers, health30d, expertsWork };
}

export function shouldRunBulkDemoSeed() {
  if (process.env.TEZCA_SEED_DEMO === '0') return false;
  if (process.env.TEZCA_SEED_DEMO === '1') return true;
  return Boolean(process.env.VERCEL);
}
