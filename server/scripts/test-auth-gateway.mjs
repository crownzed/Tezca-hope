/**
 * Kiểm tra gateway auth (chống 405 khi path bị rút) — cần API: npm run dev:api
 */
const BASE = process.env.API_BASE || 'http://127.0.0.1:3001';

async function post(url, body) {
  const r = await fetch(`${BASE}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, j };
}

const email = `gw${Date.now()}@test.tezca`;
const password = 'TestAcc#99';

const login = await post('/api/auth/gateway', {
  op: 'patient-login',
  email: 'patient@tezca.vn',
  password: 'TezcaDemo#2026',
});
console.log('gateway patient-login', login.status, login.j.token ? 'ok' : login.j.error);

const reg = await post('/api/auth/gateway', { op: 'register', email, password, name: 'GW Test' });
console.log('gateway register', reg.status, reg.j.token ? 'ok' : reg.j.error);

const stripped = await post('/api', {
  op: 'patient-login',
  email: 'patient@tezca.vn',
  password: 'TezcaDemo#2026',
});
console.log('POST /api + op', stripped.status, stripped.j.token ? 'ok' : stripped.j.error);

const queryPath = await post('/api?path=auth/patient/login', {
  email: 'patient@tezca.vn',
  password: 'TezcaDemo#2026',
});
console.log('POST /api?path=...', queryPath.status, queryPath.j.token ? 'ok' : queryPath.j.error);

process.exit(
  login.status === 200 && reg.status === 201 && stripped.status === 200 && queryPath.status === 200
    ? 0
    : 1,
);
