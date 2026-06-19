import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tezca-expert-chat-'));
process.env.DATA_DIR = tempDir;
process.env.JWT_SECRET ||= 'test-secret-that-is-long-enough-for-jwt';
process.env.TEZCA_SEED_DEMO = '0';

const [{ createApp }, db, connection, auth] = await Promise.all([
  import('../src/createApp.js'),
  import('../src/db.js'),
  import('../src/db/connection.js'),
  import('../src/auth.js'),
]);

let server;

function assert(condition, message, detail) {
  if (condition) return;
  const err = new Error(message);
  err.detail = detail;
  throw err;
}

function addUser({ email, role, name }) {
  const user = {
    id: crypto.randomUUID(),
    email,
    passwordHash: bcrypt.hashSync('Pass#123456', 10),
    role,
    name,
  };
  db.insertUser(user);
  return db.findUserByEmail(email);
}

async function request(base, pathName, { token, method = 'GET', body } = {}) {
  const headers = new Headers();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (body != null) headers.set('Content-Type', 'application/json');
  const res = await fetch(`${base}${pathName}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

try {
  const app = await createApp();
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;

  const suffix = Date.now();
  const customer = addUser({
    email: `customer-chat-${suffix}@test.local`,
    role: 'user',
    name: 'Customer Chat Test',
  });
  const expert = addUser({
    email: `expert-chat-${suffix}@test.local`,
    role: 'expert',
    name: 'Expert Chat Test',
  });
  const customerToken = auth.signToken(customer, 'user');
  const expertToken = auth.signToken(expert, 'expert');

  const choose = await request(base, `/api/me/experts/${encodeURIComponent(expert.id)}/request`, {
    method: 'POST',
    token: customerToken,
  });
  assert(choose.status === 201, 'customer can request an expert', choose);

  const requests = await request(base, '/api/me/experts/requests', { token: customerToken });
  assert(
    requests.status === 200 && requests.json.requests?.some((r) => r.expertId === expert.id && r.status === 'requested'),
    'customer sees pending expert request',
    requests,
  );

  const blocked = await request(base, '/api/me/live-messages', {
    method: 'POST',
    token: customerToken,
    body: { text: 'blocked before approval' },
  });
  assert(blocked.status === 403, 'pending request must not unlock expert chat', blocked);

  const pendingForExpert = await request(base, '/api/expert/customers/requests', { token: expertToken });
  assert(
    pendingForExpert.status === 200 &&
      pendingForExpert.json.requests?.some((r) => r.customerId === customer.id && r.status === 'requested'),
    'expert sees pending customer request',
    pendingForExpert,
  );

  const approve = await request(base, `/api/expert/customers/${encodeURIComponent(customer.id)}/requests/approve`, {
    method: 'POST',
    token: expertToken,
  });
  assert(approve.status === 200 && approve.json.status === 'accepted', 'expert can approve request', approve);

  const careTeam = await request(base, '/api/me/care-team', { token: customerToken });
  assert(
    careTeam.status === 200 && careTeam.json.primary?.id === expert.id,
    'approved expert becomes customer primary care-team member',
    careTeam,
  );

  const sent = await request(base, '/api/me/live-messages', {
    method: 'POST',
    token: customerToken,
    body: { text: 'allowed after approval' },
  });
  assert(sent.status === 201 && sent.json.message?.content === 'allowed after approval', 'approved customer can chat', sent);

  const expertHistory = await request(
    base,
    `/api/expert/customers/${encodeURIComponent(customer.id)}/live-messages`,
    { token: expertToken },
  );
  assert(
    expertHistory.status === 200 && expertHistory.json.messages?.some((m) => m.content === 'allowed after approval'),
    'expert can read approved customer chat history',
    expertHistory,
  );

  console.log('expert chat access: ok');
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  if (err?.detail) console.error(JSON.stringify(err.detail, null, 2));
  process.exitCode = 1;
} finally {
  await new Promise((resolve) => (server ? server.close(resolve) : resolve()));
  connection.closeDb();
  fs.rmSync(tempDir, { recursive: true, force: true });
}
