/**
 * Tạo composite indexes từ firestore.indexes.json qua Firestore Admin REST API.
 * Usage: node scripts/deploy-firestore-indexes.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleAuth } from 'google-auth-library';
import { loadEnv } from '../src/loadEnv.js';
import { isFirestoreConfigured } from '../src/db/firestore.js';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const projectId = process.env.FIREBASE_PROJECT_ID?.trim() || 'tezca-f4608';

loadEnv();

if (!isFirestoreConfigured()) {
  console.error('Firestore chưa cấu hình (xem .env).');
  process.exit(1);
}

const indexesPath = path.join(repoRoot, 'firestore.indexes.json');
const { indexes } = JSON.parse(fs.readFileSync(indexesPath, 'utf8'));

const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});
const client = await auth.getClient();

async function listExisting(collectionGroup) {
  const parent = `projects/${projectId}/databases/(default)/collectionGroups/${collectionGroup}`;
  const url = `https://firestore.googleapis.com/v1/${parent}/indexes`;
  const res = await client.request({ url });
  return res.data.indexes ?? [];
}

function fieldKey(fields) {
  return fields
    .map((f) => {
      if (f.arrayConfig) return `${f.fieldPath}:array-${f.arrayConfig}`;
      return `${f.fieldPath}:${f.order ?? 'ASCENDING'}`;
    })
    .join('|');
}

function toApiFields(fields) {
  return fields.map((f) => {
    if (f.arrayConfig) {
      return { fieldPath: f.fieldPath, arrayConfig: f.arrayConfig };
    }
    return { fieldPath: f.fieldPath, order: f.order ?? 'ASCENDING' };
  });
}

async function createIndex(def) {
  const collectionGroup = def.collectionGroup;
  const parent = `projects/${projectId}/databases/(default)/collectionGroups/${collectionGroup}`;
  const url = `https://firestore.googleapis.com/v1/${parent}/indexes`;
  const body = {
    queryScope: def.queryScope || 'COLLECTION',
    fields: toApiFields(def.fields),
  };
  const res = await client.request({ url, method: 'POST', data: body });
  return res.data;
}

const existingByGroup = new Map();
let created = 0;
let skipped = 0;
let failed = 0;

for (const def of indexes) {
  const cg = def.collectionGroup;
  if (!existingByGroup.has(cg)) {
    try {
      existingByGroup.set(cg, await listExisting(cg));
    } catch (e) {
      console.error(`Không liệt kê được index cho ${cg}:`, e?.response?.data?.error?.message ?? e.message);
      failed += 1;
      continue;
    }
  }
  const wantKey = fieldKey(def.fields);
  const exists = existingByGroup.get(cg).some((idx) => fieldKey(idx.fields ?? []) === wantKey);
  if (exists) {
    console.log(`SKIP  ${cg}  [${wantKey}]`);
    skipped += 1;
    continue;
  }
  try {
    const op = await createIndex(def);
    console.log(`CREATE ${cg}  [${wantKey}]  → ${op.name ?? 'ok'}`);
    created += 1;
  } catch (e) {
    const msg = e?.response?.data?.error?.message ?? e.message;
    console.error(`FAIL  ${cg}  [${wantKey}]  → ${msg}`);
    failed += 1;
  }
}

console.log(`\nDone: ${created} created, ${skipped} skipped, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
