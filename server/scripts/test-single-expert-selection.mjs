import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tezca-single-expert-'));
process.env.DATA_DIR = dataDir;

const { getDb, closeDb } = await import('../src/db/connection.js');
const {
  assignExpertToCustomer,
  decideExpertAssignment,
  listExpertRequestsForCustomer,
  requestExpertAssignment,
} = await import('../src/db/customerDomain.js');

function insertUser(db, id, role, name) {
  db.prepare('INSERT INTO users (id, email, password_hash, role, name, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, `${id}@example.test`, 'x', role, name, Date.now());
}

try {
  const db = getDb();
  insertUser(db, 'single-customer', 'user', 'Single Customer');
  insertUser(db, 'expert-one', 'expert', 'Expert One');
  insertUser(db, 'expert-two', 'expert', 'Expert Two');
  insertUser(db, 'legacy-customer', 'user', 'Legacy Customer');

  assert.deepEqual(requestExpertAssignment('single-customer', 'expert-one'), { ok: true });
  assert.deepEqual(requestExpertAssignment('single-customer', 'expert-two'), {
    ok: false,
    error: 'active_request_exists',
  });
  assert.deepEqual(
    listExpertRequestsForCustomer('single-customer').map((r) => ({ expertId: r.expertId, status: r.status })),
    [{ expertId: 'expert-one', status: 'requested' }],
  );

  assert.deepEqual(decideExpertAssignment('expert-one', 'single-customer', 'approve'), { ok: true });
  assert.deepEqual(requestExpertAssignment('single-customer', 'expert-two'), {
    ok: false,
    error: 'customer_has_expert',
  });
  assert.deepEqual(assignExpertToCustomer('expert-two', 'single-customer'), {
    ok: false,
    error: 'customer_has_expert',
  });

  db.prepare(
    `INSERT INTO expert_customer_assignments
       (id, expert_id, customer_id, status, requested_by, created_at, updated_at)
     VALUES (?, ?, ?, 'requested', 'customer', ?, ?),
            (?, ?, ?, 'requested', 'customer', ?, ?)`,
  ).run(
    'legacy-request-one', 'expert-one', 'legacy-customer', Date.now(), Date.now(),
    'legacy-request-two', 'expert-two', 'legacy-customer', Date.now(), Date.now(),
  );
  assert.deepEqual(decideExpertAssignment('expert-one', 'legacy-customer', 'approve'), { ok: true });
  assert.deepEqual(
    listExpertRequestsForCustomer('legacy-customer')
      .map((r) => ({ expertId: r.expertId, status: r.status }))
      .sort((a, b) => a.expertId.localeCompare(b.expertId)),
    [
      { expertId: 'expert-one', status: 'accepted' },
      { expertId: 'expert-two', status: 'revoked' },
    ],
  );

  console.log('single expert selection regression passed');
} finally {
  closeDb();
  const resolved = path.resolve(dataDir);
  if (resolved.startsWith(os.tmpdir())) {
    fs.rmSync(resolved, { recursive: true, force: true });
  }
}
