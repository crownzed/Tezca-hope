/**
 * Kiểm tra quên / đặt lại mật khẩu — cần API: npm run dev:api
 */
const BASE = process.env.API_BASE || 'http://127.0.0.1:3001';
const DEMO_EMAIL = 'patient@tezca.vn';
const DEMO_PASSWORD = 'TezcaDemo#2026';
const NEW_PASSWORD = 'ResetTest#99';

async function post(path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, j };
}

const forgot = await post('/api/auth/forgot-password', { email: DEMO_EMAIL });
console.log('forgot-password', forgot.status, forgot.j.message ? 'ok' : forgot.j.error);
const resetUrl = forgot.j.resetUrl;
if (!resetUrl) {
  console.error('missing resetUrl in dev — set NODE_ENV=development');
  process.exit(1);
}
const token = new URL(resetUrl).searchParams.get('token');
const reset = await post('/api/auth/reset-password', { token, password: NEW_PASSWORD });
console.log('reset-password', reset.status, reset.j.message || reset.j.error);

const loginNew = await post('/api/auth/customer/login', { email: DEMO_EMAIL, password: NEW_PASSWORD });
console.log('login new password', loginNew.status, loginNew.j.token ? 'ok' : loginNew.j.error);

const restore = await post('/api/auth/reset-password', {
  token: new URL((await post('/api/auth/forgot-password', { email: DEMO_EMAIL })).j.resetUrl).searchParams.get('token'),
  password: DEMO_PASSWORD,
});
console.log('restore demo password', restore.status, restore.j.message || restore.j.error);

const loginDemo = await post('/api/auth/customer/login', { email: DEMO_EMAIL, password: DEMO_PASSWORD });
console.log('login demo password', loginDemo.status, loginDemo.j.token ? 'ok' : loginDemo.j.error);

const ok =
  forgot.status === 200 &&
  reset.status === 200 &&
  loginNew.status === 200 &&
  restore.status === 200 &&
  loginDemo.status === 200;
process.exit(ok ? 0 : 1);
