import { getDb } from '../connection.js';

function findUserById(id) {
  const row = getDb()
    .prepare(`SELECT id, email, password_hash AS passwordHash, role, name FROM users WHERE id = ?`)
    .get(id);
  return row || null;
}

export function getCustomerProfile(userId) {
  const u = findUserById(userId);
  if (!u || u.role !== 'user') return null;
  const row = getDb()
    .prepare(
      `SELECT full_name AS fullName, gender, dob, phone, address, notes, updated_at AS updatedAt
       FROM customer_profiles WHERE user_id = ?`,
    )
    .get(userId);
  return {
    userId,
    email: u.email,
    fullName: row?.fullName || u.name || '',
    gender: row?.gender || '',
    dob: row?.dob || '',
    phone: row?.phone || '',
    address: row?.address || '',
    notes: row?.notes || '',
    updatedAt: row?.updatedAt ?? null,
  };
}

export function getCustomerHealthProfile(userId) {
  const row = getDb()
    .prepare(
      `SELECT user_id AS userId, current_conditions AS currentConditions,
              medical_history AS medicalHistory, allergies, medications,
              contraindications, updated_at AS updatedAt
       FROM customer_health_profiles WHERE user_id = ?`,
    )
    .get(userId);
  return row || null;
}

export function upsertCustomerProfile(userId, fields = {}) {
  const now = Date.now();
  const fullName = String(fields.fullName ?? fields.full_name ?? '').trim().slice(0, 120);
  getDb()
    .prepare(
      `INSERT INTO customer_profiles (user_id, full_name, gender, dob, phone, address, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         full_name = excluded.full_name,
         gender = excluded.gender,
         dob = excluded.dob,
         phone = excluded.phone,
         address = excluded.address,
         notes = excluded.notes,
         updated_at = excluded.updated_at`,
    )
    .run(
      userId,
      fullName,
      String(fields.gender ?? '').slice(0, 32),
      String(fields.dob ?? '').slice(0, 32),
      String(fields.phone ?? '').slice(0, 32),
      String(fields.address ?? '').slice(0, 256),
      String(fields.notes ?? '').slice(0, 2000),
      now,
      now,
    );
  if (fullName) {
    getDb().prepare(`UPDATE users SET name = ? WHERE id = ?`).run(fullName, userId);
  }
  return getCustomerProfile(userId);
}

export function upsertCustomerHealthProfile(userId, fields = {}) {
  const now = Date.now();
  const existing = getCustomerHealthProfile(userId);
  const payload = {
    currentConditions: String(fields.currentConditions ?? existing?.currentConditions ?? '').slice(0, 4000),
    medicalHistory: String(fields.medicalHistory ?? existing?.medicalHistory ?? '').slice(0, 4000),
    allergies: String(fields.allergies ?? existing?.allergies ?? '').slice(0, 2000),
    medications: String(fields.medications ?? existing?.medications ?? '').slice(0, 2000),
    contraindications: String(fields.contraindications ?? existing?.contraindications ?? '').slice(0, 2000),
  };
  getDb()
    .prepare(
      `INSERT INTO customer_health_profiles
         (user_id, current_conditions, medical_history, allergies, medications, contraindications, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         current_conditions = excluded.current_conditions,
         medical_history = excluded.medical_history,
         allergies = excluded.allergies,
         medications = excluded.medications,
         contraindications = excluded.contraindications,
         updated_at = excluded.updated_at`,
    )
    .run(
      userId,
      payload.currentConditions,
      payload.medicalHistory,
      payload.allergies,
      payload.medications,
      payload.contraindications,
      now,
    );
}
