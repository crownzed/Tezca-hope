/** GET /api/expert/me sau gateway login — kiểm tra routing Vercel (không NOT_FOUND). */
const base = process.argv[2] || 'https://tezca-hope.vercel.app';

const login = await fetch(`${base}/api/auth/gateway`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    op: 'expert-login',
    email: 'expert@tezca.vn',
    password: 'TezcaDemo#2026',
  }),
});
const loginBody = await login.json().catch(() => ({}));
if (!login.ok || !loginBody.token) {
  console.error('gateway login', login.status, loginBody);
  process.exit(1);
}

const me = await fetch(`${base}/api/expert/me`, {
  headers: { Authorization: `Bearer ${loginBody.token}` },
});
const meBody = await me.json().catch(() => ({}));
const ok =
  me.ok &&
  meBody.user?.role === 'expert' &&
  meBody.user?.email === 'expert@tezca.vn';
console.log(
  'GET /api/expert/me',
  me.status,
  ok ? 'ok' : meBody.error || JSON.stringify(meBody).slice(0, 120),
);
if (!ok) process.exit(1);
