import bcrypt from 'bcryptjs';
import { DEMO_EXPERT_ID, DEMO_PATIENT_ID, DEMO_ADMIN_ID, DEMO_PASSWORD } from './connection.js';

function addDays(isoDate, delta) {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

/**
 * @param {import('better-sqlite3').Database} db
 */
export function seedDatabase(db) {
  const hash = bcrypt.hashSync(DEMO_PASSWORD, 10);
  const expertId = DEMO_EXPERT_ID;
  const patientId = DEMO_PATIENT_ID;
  const adminId = DEMO_ADMIN_ID;
  const today = new Date().toISOString().slice(0, 10);
  const now = Date.now();

  const insUser = db.prepare(
    `INSERT INTO users (id, email, password_hash, role, name, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
  );
  const insAssign = db.prepare(`INSERT INTO assignments (expert_id, patient_id) VALUES (?, ?)`);
  const insBmi = db.prepare(
    `INSERT INTO bmi_entries (id, user_id, date, height_cm, weight_kg, bmi) VALUES (?, ?, ?, ?, ?, ?)`,
  );
  const insMood = db.prepare(
    `INSERT INTO mood_entries (id, user_id, date, mood_label, mood_score, note) VALUES (?, ?, ?, ?, ?, ?)`,
  );
  const insBot = db.prepare(
    `INSERT INTO bot_messages (id, user_id, role, content, ts) VALUES (?, ?, ?, ?, ?)`,
  );

  db.transaction(() => {
    insUser.run(expertId, 'expert@tezca.vn', hash, 'expert', 'BS. Minh Anh', now);
    insUser.run(patientId, 'patient@tezca.vn', hash, 'user', 'Nguyễn Minh Khang', now);
    insUser.run(adminId, 'admin@tezca.vn', hash, 'admin', 'Quản trị Tezca', now);
    insAssign.run(expertId, patientId);

    const bmis = [
      [addDays(today, -14), 168, 62, round1(62 / (1.68 * 1.68))],
      [addDays(today, -7), 168, 61, round1(61 / (1.68 * 1.68))],
      [today, 168, 60.5, round1(60.5 / (1.68 * 1.68))],
    ];
    for (const [d, h, w, b] of bmis) {
      insBmi.run(crypto.randomUUID(), patientId, d, h, w, b);
    }

    insMood.run(crypto.randomUUID(), patientId, addDays(today, -2), 'Ổn', 4, 'Ngủ đủ 7 tiếng.');
    insMood.run(crypto.randomUUID(), patientId, addDays(today, -1), 'Bình thường', 3, 'Hơi căng vì deadline.');
    insMood.run(crypto.randomUUID(), patientId, today, 'Ổn', 4, '');

    insBot.run(
      crypto.randomUUID(),
      patientId,
      'user',
      'Dạo này em hay mệt buổi chiều.',
      Date.now() - 86400000 * 2,
    );
    insBot.run(
      crypto.randomUUID(),
      patientId,
      'assistant',
      'Bạn có thể thử nghỉ ngắn 10 phút, uống nước và đi bộ nhẹ. Nếu kéo dài, hãy trao đổi với chuyên gia trên Tezca.',
      Date.now() - 86400000 * 2 + 1000,
    );
  })();
}
