/**
 * Hồ sơ khách hàng / chuyên gia, gán CG–KH, health profile — facade cho routes.
 */
import { getDb } from './connection.js';
import { DbError, mapSqliteError } from '../dbErrors.js';
import { normalizeEmail } from '../validate.js';

function findUserById(id) {
  const row = getDb()
    .prepare(`SELECT id, email, password_hash AS passwordHash, role, name FROM users WHERE id = ?`)
    .get(id);
  return row || null;
}

function findUserByEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  const row = getDb()
    .prepare(
      `SELECT id, email, password_hash AS passwordHash, role, name, created_at AS createdAt
       FROM users WHERE email = ? COLLATE NOCASE`,
    )
    .get(normalized);
  return row || null;
}

function insertUserRecord(user) {
  const email = normalizeEmail(user.email);
  if (!email) throw new DbError('INVALID_EMAIL', 'Email không hợp lệ', 400);
  const now = Date.now();
  try {
    getDb()
      .prepare(
        `INSERT INTO users (id, email, password_hash, role, name, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(user.id, email, user.passwordHash, user.role, user.name, user.createdAt ?? now);
  } catch (err) {
    throw mapSqliteError(err);
  }
}

function assignmentId() {
  return crypto.randomUUID();
}

export function listLiveMessagesForCustomer(customerId) {
  return getDb()
    .prepare(
      `SELECT id, patient_id AS patientId, patient_id AS customerId,
              sender_user_id AS senderUserId, sender_role AS senderRole, content, ts
       FROM live_messages WHERE patient_id = ? ORDER BY ts ASC`,
    )
    .all(customerId);
}

export function listLiveMessagesForCustomerSince(customerId, sinceTs) {
  const since = Number(sinceTs) || 0;
  return getDb()
    .prepare(
      `SELECT id, patient_id AS patientId, patient_id AS customerId,
              sender_user_id AS senderUserId, sender_role AS senderRole, content, ts
       FROM live_messages WHERE patient_id = ? AND ts > ? ORDER BY ts ASC`,
    )
    .all(customerId, since);
}

export function getExpertsForCustomer(customerId) {
  return getDb()
    .prepare(
      `SELECT u.id AS id, u.email AS email, u.name AS name
       FROM expert_customer_assignments a
       JOIN users u ON u.id = a.expert_id
       WHERE a.customer_id = ? AND a.status = 'accepted'
       UNION
       SELECT u.id, u.email, u.name
       FROM assignments a
       JOIN users u ON u.id = a.expert_id
       WHERE a.patient_id = ?
       ORDER BY name`,
    )
    .all(customerId, customerId);
}

export function canExpertAccessCustomer(expertId, customerId) {
  const row = getDb()
    .prepare(
      `SELECT 1 AS ok FROM expert_customer_assignments
       WHERE expert_id = ? AND customer_id = ? AND status = 'accepted'`,
    )
    .get(expertId, customerId);
  if (row) return true;
  const legacy = getDb()
    .prepare(`SELECT 1 AS ok FROM assignments WHERE expert_id = ? AND patient_id = ?`)
    .get(expertId, customerId);
  return Boolean(legacy);
}

export function getCustomerIdsForExpert(expertId) {
  const ids = new Set();
  for (const r of getDb()
    .prepare(
      `SELECT customer_id AS id FROM expert_customer_assignments
       WHERE expert_id = ? AND status = 'accepted'`,
    )
    .all(expertId)) {
    ids.add(r.id);
  }
  for (const r of getDb()
    .prepare(`SELECT patient_id AS id FROM assignments WHERE expert_id = ?`)
    .all(expertId)) {
    ids.add(r.id);
  }
  return [...ids];
}

export function assignExpertToCustomer(expertId, customerId) {
  const p = findUserById(customerId);
  if (!p || p.role !== 'user') return { ok: false, error: 'invalid_customer' };
  const e = findUserById(expertId);
  if (!e || e.role !== 'expert') return { ok: false, error: 'invalid_expert' };
  const now = Date.now();
  getDb()
    .prepare(
      `INSERT INTO expert_customer_assignments
         (id, expert_id, customer_id, status, requested_by, created_at, updated_at)
       VALUES (?, ?, ?, 'accepted', 'expert', ?, ?)
       ON CONFLICT(expert_id, customer_id) DO UPDATE SET
         status = 'accepted', updated_at = excluded.updated_at`,
    )
    .run(assignmentId(), expertId, customerId, now, now);
  getDb()
    .prepare(`INSERT OR IGNORE INTO assignments (expert_id, patient_id) VALUES (?, ?)`)
    .run(expertId, customerId);
  return { ok: true };
}

export function removeExpertCustomerAssignment(expertId, customerId) {
  getDb()
    .prepare(`DELETE FROM expert_customer_assignments WHERE expert_id = ? AND customer_id = ?`)
    .run(expertId, customerId);
  getDb()
    .prepare(`DELETE FROM assignments WHERE expert_id = ? AND patient_id = ?`)
    .run(expertId, customerId);
}

export function listAvailableExperts() {
  return getDb()
    .prepare(
      `SELECT u.id, u.email, u.name,
              COALESCE(ep.full_name, u.name) AS fullName,
              COALESCE(ep.specialty, '') AS specialty
       FROM users u
       LEFT JOIN expert_profiles ep ON ep.user_id = u.id
       WHERE u.role = 'expert' AND COALESCE(ep.is_active, 1) = 1
       ORDER BY u.name`,
    )
    .all();
}

export function listExpertRequestsForCustomer(customerId) {
  return getDb()
    .prepare(
      `SELECT a.id, a.expert_id AS expertId, a.status, a.requested_by AS requestedBy,
              a.created_at AS createdAt, u.name AS expertName, u.email AS expertEmail
       FROM expert_customer_assignments a
       JOIN users u ON u.id = a.expert_id
       WHERE a.customer_id = ?
       ORDER BY a.updated_at DESC`,
    )
    .all(customerId);
}

export function requestExpertAssignment(customerId, expertId) {
  const p = findUserById(customerId);
  if (!p || p.role !== 'user') return { ok: false };
  const e = findUserById(expertId);
  if (!e || e.role !== 'expert') return { ok: false };
  const now = Date.now();
  getDb()
    .prepare(
      `INSERT INTO expert_customer_assignments
         (id, expert_id, customer_id, status, requested_by, created_at, updated_at)
       VALUES (?, ?, ?, 'requested', 'customer', ?, ?)
       ON CONFLICT(expert_id, customer_id) DO UPDATE SET
         status = CASE
           WHEN expert_customer_assignments.status = 'accepted' THEN 'accepted'
           ELSE 'requested'
         END,
         requested_by = 'customer',
         updated_at = excluded.updated_at`,
    )
    .run(assignmentId(), expertId, customerId, now, now);
  return { ok: true };
}

export function listPendingCustomersForExpert(expertId) {
  return getDb()
    .prepare(
      `SELECT a.id, a.customer_id AS customerId, a.status, a.requested_by AS requestedBy,
              a.created_at AS createdAt, u.email, u.name
       FROM expert_customer_assignments a
       JOIN users u ON u.id = a.customer_id
       WHERE a.expert_id = ? AND a.status = 'requested'
       ORDER BY a.created_at DESC`,
    )
    .all(expertId);
}

export function decideExpertAssignment(expertId, customerId, action) {
  const next = action === 'approve' ? 'accepted' : 'rejected';
  const result = getDb()
    .prepare(
      `UPDATE expert_customer_assignments
       SET status = ?, updated_at = ?
       WHERE expert_id = ? AND customer_id = ? AND status = 'requested'`,
    )
    .run(next, Date.now(), expertId, customerId);
  if (result.changes === 0) return { ok: false };
  if (next === 'accepted') {
    getDb()
      .prepare(`INSERT OR IGNORE INTO assignments (expert_id, patient_id) VALUES (?, ?)`)
      .run(expertId, customerId);
  }
  return { ok: true };
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

export function listCustomersWithProfiles() {
  return getDb()
    .prepare(
      `SELECT u.id, u.email, u.name, u.role,
              COALESCE(cp.full_name, u.name) AS fullName
       FROM users u
       LEFT JOIN customer_profiles cp ON cp.user_id = u.id
       WHERE u.role = 'user'
       ORDER BY u.name`,
    )
    .all();
}

export function listExpertsWithProfiles() {
  return getDb()
    .prepare(
      `SELECT u.id, u.email, u.name, u.role,
              COALESCE(ep.full_name, u.name) AS fullName,
              COALESCE(ep.specialty, '') AS specialty,
              COALESCE(ep.is_active, 1) AS isActive
       FROM users u
       LEFT JOIN expert_profiles ep ON ep.user_id = u.id
       WHERE u.role = 'expert'
       ORDER BY u.name`,
    )
    .all()
    .map((row) => ({ ...row, isActive: Boolean(row.isActive) }));
}

export function createExpertAccount({ email, passwordHash, fullName, specialty }) {
  const normalized = String(email || '').trim();
  if (findUserByEmail(normalized)) {
    throw new DbError('EMAIL_TAKEN', 'Email đã được sử dụng', 409);
  }
  const name = String(fullName || '').trim().slice(0, 120) || normalized.split('@')[0];
  const id = crypto.randomUUID();
  insertUserRecord({ id, email: normalized, passwordHash, role: 'expert', name });
  upsertExpertProfile(id, {
    fullName: name,
    specialty: specialty || 'General',
    isActive: true,
  });
  return { ok: true, id };
}

export function updateExpertAccount(userId, fields = {}) {
  const user = findUserById(userId);
  if (!user || user.role !== 'expert') return { ok: false, error: 'not_found' };
  const fullName = fields.fullName != null ? String(fields.fullName).trim().slice(0, 120) : null;
  const email = fields.email != null ? String(fields.email).trim() : null;
  const specialty = fields.specialty != null ? String(fields.specialty).trim().slice(0, 120) : null;
  if (email && email !== user.email) {
    const existing = findUserByEmail(email);
    if (existing && existing.id !== userId) {
      throw new DbError('EMAIL_TAKEN', 'Email đã được sử dụng', 409);
    }
    getDb().prepare(`UPDATE users SET email = ? WHERE id = ?`).run(email, userId);
  }
  if (fullName) {
    getDb().prepare(`UPDATE users SET name = ? WHERE id = ?`).run(fullName, userId);
  }
  upsertExpertProfile(userId, {
    ...(fullName ? { fullName } : {}),
    ...(specialty != null ? { specialty } : {}),
  });
  return { ok: true };
}

export function setExpertActive(userId, isActive) {
  const user = findUserById(userId);
  if (!user || user.role !== 'expert') return { ok: false, error: 'not_found' };
  upsertExpertProfile(userId, { isActive: Boolean(isActive) });
  return { ok: true };
}

export function isExpertAccountActive(userId) {
  const row = getDb()
    .prepare(`SELECT COALESCE(is_active, 1) AS isActive FROM expert_profiles WHERE user_id = ?`)
    .get(userId);
  if (!row) return true;
  return Boolean(row.isActive);
}

export function deleteExpertAccount(userId) {
  const user = findUserById(userId);
  if (!user || user.role !== 'expert') return { ok: false, error: 'not_found' };
  getDb().prepare(`DELETE FROM users WHERE id = ?`).run(userId);
  return { ok: true };
}

export function deleteCustomerAccount(userId) {
  const user = findUserById(userId);
  if (!user || user.role !== 'user') return { ok: false, error: 'not_found' };
  getDb().prepare(`DELETE FROM users WHERE id = ?`).run(userId);
  return { ok: true };
}

export function listAssignmentRelations() {
  return getDb()
    .prepare(
      `SELECT a.id, a.expert_id AS expertId, a.customer_id AS customerId, a.status,
              a.requested_by AS requestedBy, a.created_at AS createdAt, a.updated_at AS updatedAt,
              ue.name AS expertName, uc.name AS customerName
       FROM expert_customer_assignments a
       LEFT JOIN users ue ON ue.id = a.expert_id
       LEFT JOIN users uc ON uc.id = a.customer_id
       ORDER BY a.updated_at DESC
       LIMIT 500`,
    )
    .all();
}

export function upsertCustomerProfile(userId, fields = {}) {
  const now = Date.now();
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
      String(fields.fullName ?? fields.full_name ?? '').slice(0, 120),
      String(fields.gender ?? '').slice(0, 32),
      String(fields.dob ?? '').slice(0, 32),
      String(fields.phone ?? '').slice(0, 32),
      String(fields.address ?? '').slice(0, 256),
      String(fields.notes ?? '').slice(0, 2000),
      now,
      now,
    );
}

export function upsertExpertProfile(userId, fields = {}) {
  const now = Date.now();
  getDb()
    .prepare(
      `INSERT INTO expert_profiles (user_id, full_name, gender, specialty, license_no, bio, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         full_name = excluded.full_name,
         gender = excluded.gender,
         specialty = excluded.specialty,
         license_no = excluded.license_no,
         bio = excluded.bio,
         is_active = excluded.is_active,
         updated_at = excluded.updated_at`,
    )
    .run(
      userId,
      String(fields.fullName ?? fields.full_name ?? '').slice(0, 120),
      String(fields.gender ?? '').slice(0, 32),
      String(fields.specialty ?? 'General').slice(0, 120),
      String(fields.licenseNo ?? fields.license_no ?? '').slice(0, 64),
      String(fields.bio ?? '').slice(0, 4000),
      fields.isActive === false ? 0 : 1,
      now,
      now,
    );
}

export function listUserGrantedRoles(userId) {
  const primary = findUserById(userId);
  if (!primary) return [];
  const rows = getDb()
    .prepare(`SELECT role FROM user_role_grants WHERE user_id = ? ORDER BY role`)
    .all(userId);
  const roles = new Set([primary.role, ...rows.map((r) => r.role)]);
  return [...roles];
}

export function userHasRoleGrant(userId, role) {
  const row = getDb()
    .prepare(`SELECT 1 AS ok FROM user_role_grants WHERE user_id = ? AND role = ?`)
    .get(userId, role);
  return Boolean(row);
}

/** Đăng nhập cổng theo vai trò phiên — role gốc hoặc role phụ (user_role_grants). */
export function userCanLoginAsRole(user, sessionRole) {
  if (!user || !sessionRole) return false;
  if (user.role === sessionRole) return true;
  return userHasRoleGrant(user.id, sessionRole);
}

export function grantUserRole(userId, role) {
  const r = String(role || '').trim();
  if (!['user', 'expert', 'admin'].includes(r)) {
    throw new DbError('INVALID_ROLE', 'Vai trò không hợp lệ', 400);
  }
  if (!findUserById(userId)) return { ok: false, error: 'not_found' };
  getDb()
    .prepare(
      `INSERT OR IGNORE INTO user_role_grants (user_id, role, created_at) VALUES (?, ?, ?)`,
    )
    .run(userId, r, Date.now());
  return { ok: true };
}

export function revokeUserRole(userId, role) {
  const r = String(role || '').trim();
  if (!findUserById(userId)) return { ok: false, error: 'not_found' };
  getDb()
    .prepare(`DELETE FROM user_role_grants WHERE user_id = ? AND role = ?`)
    .run(userId, r);
  return { ok: true };
}

export function updateUserRole(userId, role) {
  const r = String(role || '').trim();
  if (!['user', 'expert', 'admin'].includes(r)) {
    throw new DbError('INVALID_ROLE', 'Vai trò không hợp lệ', 400);
  }
  const u = findUserById(userId);
  if (!u) return { ok: false, error: 'not_found' };
  getDb().prepare(`UPDATE users SET role = ? WHERE id = ?`).run(r, userId);
  grantUserRole(userId, r);
  return { ok: true };
}
