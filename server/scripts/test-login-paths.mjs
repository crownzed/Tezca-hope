/**
 * Kiểm tra POST đăng nhập — chạy khi API đang bật: node server/scripts/test-login-paths.mjs
 */
const BASE = process.env.API_BASE || 'http://127.0.0.1:3001';
const body = { email: 'patient@tezca.vn', password: 'TezcaDemo#2026' };

const paths = [
  '/api/auth/patient/login',
  '/api/auth/login',
  '/auth/patient/login',
];

let ok = 0;
for (const path of paths) {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  const pass = r.status === 200 && j.token;
  if (pass) ok++;
  console.log(pass ? '✓' : '✗', path, r.status, j.error || '');
}
process.exit(ok > 0 ? 0 : 1);
