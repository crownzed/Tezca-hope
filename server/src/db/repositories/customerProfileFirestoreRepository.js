import { getDb } from '../connection.js';
import { getFirestore } from '../firestore.js';
import { FS } from '../firestoreCollections.js';

function db() {
  return getFirestore();
}

function findUserById(id) {
  const row = getDb()
    .prepare(`SELECT id, email, role, name FROM users WHERE id = ?`)
    .get(id);
  return row || null;
}

export async function getCustomerProfile(userId) {
  const u = findUserById(userId);
  if (!u || u.role !== 'user') return null;
  const snap = await db().collection(FS.CUSTOMER_PROFILES).doc(userId).get();
  const row = snap.exists ? snap.data() : null;
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

export async function getCustomerHealthProfile(userId) {
  const snap = await db().collection(FS.CUSTOMER_HEALTH_PROFILES).doc(userId).get();
  if (!snap.exists) return null;
  const d = snap.data();
  return {
    userId,
    currentConditions: d.currentConditions || '',
    medicalHistory: d.medicalHistory || '',
    allergies: d.allergies || '',
    medications: d.medications || '',
    contraindications: d.contraindications || '',
    updatedAt: d.updatedAt ?? null,
  };
}

export async function upsertCustomerProfile(userId, fields = {}) {
  const now = Date.now();
  const fullName = String(fields.fullName ?? fields.full_name ?? '').trim().slice(0, 120);
  const ref = db().collection(FS.CUSTOMER_PROFILES).doc(userId);
  const existing = await ref.get();
  await ref.set(
    {
      fullName,
      gender: String(fields.gender ?? '').slice(0, 32),
      dob: String(fields.dob ?? '').slice(0, 32),
      phone: String(fields.phone ?? '').slice(0, 32),
      address: String(fields.address ?? '').slice(0, 256),
      notes: String(fields.notes ?? '').slice(0, 2000),
      createdAt: existing.exists ? existing.data()?.createdAt ?? now : now,
      updatedAt: now,
    },
    { merge: true },
  );
  if (fullName) {
    getDb().prepare(`UPDATE users SET name = ? WHERE id = ?`).run(fullName, userId);
  }
  return getCustomerProfile(userId);
}

export async function upsertCustomerHealthProfile(userId, fields = {}) {
  const now = Date.now();
  const existing = await getCustomerHealthProfile(userId);
  const payload = {
    currentConditions: String(fields.currentConditions ?? existing?.currentConditions ?? '').slice(0, 4000),
    medicalHistory: String(fields.medicalHistory ?? existing?.medicalHistory ?? '').slice(0, 4000),
    allergies: String(fields.allergies ?? existing?.allergies ?? '').slice(0, 2000),
    medications: String(fields.medications ?? existing?.medications ?? '').slice(0, 2000),
    contraindications: String(fields.contraindications ?? existing?.contraindications ?? '').slice(0, 2000),
  };
  const ref = db().collection(FS.CUSTOMER_HEALTH_PROFILES).doc(userId);
  const snap = await ref.get();
  await ref.set(
    {
      ...payload,
      createdAt: snap.exists ? snap.data()?.createdAt ?? now : now,
      updatedAt: now,
    },
    { merge: true },
  );
}
