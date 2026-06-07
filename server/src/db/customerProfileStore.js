/**
 * Hồ sơ khách hàng: Firestore khi đã cấu hình Firebase (Vercel), ngược lại SQLite.
 * Tài khoản (`users`) vẫn trên SQLite.
 */
import { isFirestoreConfigured } from './firestore.js';
import * as sqlite from './repositories/customerProfileSqliteRepository.js';
import * as firestore from './repositories/customerProfileFirestoreRepository.js';

export function useCustomerProfileFirestore() {
  if (!isFirestoreConfigured()) return false;
  return String(process.env.TEZCA_PROFILE_FIRESTORE ?? '1').trim() !== '0';
}

const pick = (fsFn, sqlFn) =>
  async (...args) => (useCustomerProfileFirestore() ? fsFn(...args) : sqlFn(...args));

export const getCustomerProfile = pick(firestore.getCustomerProfile, sqlite.getCustomerProfile);
export const upsertCustomerProfile = pick(firestore.upsertCustomerProfile, sqlite.upsertCustomerProfile);
export const getCustomerHealthProfile = pick(firestore.getCustomerHealthProfile, sqlite.getCustomerHealthProfile);
export const upsertCustomerHealthProfile = pick(
  firestore.upsertCustomerHealthProfile,
  sqlite.upsertCustomerHealthProfile,
);

/** Gói hồ sơ khách gửi chuyên gia (thông tin cá nhân + sức khỏe). */
export async function buildCustomerProfilePacket(userId) {
  const [profile, healthProfile] = await Promise.all([
    getCustomerProfile(userId),
    getCustomerHealthProfile(userId),
  ]);
  return { profile, healthProfile };
}
