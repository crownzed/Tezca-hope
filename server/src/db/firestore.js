import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

const projectRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

/** Đường dẫn trong .env thường là ./firebase-service-account.json (so với thư mục gốc repo). */
function resolveCredentialsPath(rawPath) {
  if (!rawPath?.trim()) return null;
  const trimmed = rawPath.trim();
  if (path.isAbsolute(trimmed) && fs.existsSync(trimmed)) return trimmed;
  const fromRepoRoot = path.resolve(projectRoot, trimmed);
  if (fs.existsSync(fromRepoRoot)) return fromRepoRoot;
  const fromCwd = path.resolve(process.cwd(), trimmed);
  if (fs.existsSync(fromCwd)) return fromCwd;
  return null;
}

/** @type {admin.app.App | null} */
let appInstance = null;

/**
 * Firestore được bật khi có ít nhất một trong các cách cấu hình sau.
 * @returns {boolean}
 */
export function isFirestoreConfigured() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim()) return true;
  if (resolveCredentialsPath(process.env.GOOGLE_APPLICATION_CREDENTIALS)) return true;
  if (
    process.env.FIREBASE_PROJECT_ID?.trim() &&
    process.env.FIREBASE_CLIENT_EMAIL?.trim() &&
    process.env.FIREBASE_PRIVATE_KEY?.trim()
  ) {
    return true;
  }
  return false;
}

function parseServiceAccountJson(raw) {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const decoded = Buffer.from(trimmed, 'base64').toString('utf8');
    return JSON.parse(decoded);
  }
}

function buildCredential() {
  const jsonRaw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (jsonRaw) {
    const serviceAccount = parseServiceAccountJson(jsonRaw);
    return admin.credential.cert(serviceAccount);
  }

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();
  if (projectId && clientEmail && privateKey) {
    return admin.credential.cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    });
  }

  const credPath = resolveCredentialsPath(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  if (credPath) {
    const serviceAccount = JSON.parse(fs.readFileSync(credPath, 'utf8'));
    return admin.credential.cert(serviceAccount);
  }

  return null;
}

/**
 * Khởi tạo Firebase Admin (lazy, một lần).
 * @returns {admin.app.App | null}
 */
export function initFirestoreApp() {
  if (!isFirestoreConfigured()) return null;
  if (appInstance) return appInstance;

  const credential = buildCredential();
  if (!credential) return null;

  const jsonRaw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  let projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  if (!projectId && jsonRaw) {
    try {
      projectId = parseServiceAccountJson(jsonRaw).project_id;
    } catch {
      /* ignore */
    }
  }

  appInstance = admin.initializeApp({
    credential,
    ...(projectId ? { projectId } : {}),
  });

  return appInstance;
}

/**
 * @returns {import('firebase-admin/firestore').Firestore}
 */
export function getFirestore() {
  const app = initFirestoreApp();
  if (!app) {
    throw new Error(
      'Firestore chưa được cấu hình. Đặt FIREBASE_SERVICE_ACCOUNT_JSON hoặc FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY trong .env',
    );
  }
  return admin.firestore(app);
}

/** Kiểm tra kết nối — đọc metadata collection (không cần document). */
export async function runFirestoreDiagnostics() {
  const report = { ok: false, configured: isFirestoreConfigured(), errors: [], checks: {} };

  if (!isFirestoreConfigured()) {
    report.errors.push('Thiếu biến môi trường Firebase (xem .env.example)');
    return report;
  }

  try {
    const db = getFirestore();
    const projectId = db.app?.options?.projectId ?? process.env.FIREBASE_PROJECT_ID ?? null;
    report.checks.projectId = projectId;

    // listCollections() xác nhận quyền đọc Firestore
    const collections = await db.listCollections();
    report.checks.collectionCount = collections.length;
    report.checks.sampleCollections = collections.slice(0, 8).map((c) => c.id);
    report.ok = true;
  } catch (e) {
    report.errors.push(e instanceof Error ? e.message : String(e));
  }

  return report;
}
