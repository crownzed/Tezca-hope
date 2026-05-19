/**
 * Kiểm tra auth không trả 405 — API phải chạy: npm run dev:api
 */
const BASE = process.env.API_BASE || 'http://127.0.0.1:3001';

async function req(method, url, body) {
  const r = await fetch(`${BASE}${url}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, j };
}

const checks = [];

const opt = await req('OPTIONS', '/api/auth/register');
checks.push(['OPTIONS register', opt.status === 204, opt.status]);

const gw = await req('POST', '/api/auth/gateway', {
  op: 'patient-login',
  email: 'patient@tezca.vn',
  password: 'TezcaDemo#2026',
});
checks.push(['POST gateway login', gw.status === 200 && gw.j.token, gw.status]);

const email = `r405${Date.now()}@test.tezca`;
const reg = await req('POST', '/api/auth/gateway', { op: 'register', email, password: 'TestAcc#99' });
checks.push(['POST gateway register', reg.status === 201 && reg.j.token, reg.status]);

const rest = await req('POST', '/api/auth/patient/login', {
  email: 'patient@tezca.vn',
  password: 'TezcaDemo#2026',
});
checks.push(['POST patient/login', rest.status === 200 && rest.j.token, rest.status]);

let failed = 0;
for (const [name, pass, status] of checks) {
  console.log(pass ? '✓' : '✗', name, status);
  if (!pass) failed++;
}
process.exit(failed ? 1 : 0);
