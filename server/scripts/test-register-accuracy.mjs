/**
 * Kiểm tra độ chính xác API đăng ký — chạy: node scripts/test-register-accuracy.mjs
 * Cần API local: npm run dev:api (mặc định :3001)
 */
const BASE = process.env.API_BASE || 'http://127.0.0.1:3001';

async function post(path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await r.json().catch(() => ({}));
  return { status: r.status, json };
}

const results = [];

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(ok ? '✓' : '✗', name, detail || '');
}

const unique = `acc${Date.now()}`;
const email = `${unique}@test.tezca`;
const password = 'TestAcc#99';

try {
  await fetch(`${BASE}/api/health`);
} catch {
  console.error(`Không kết nối ${BASE} — chạy: npm run dev:api`);
  process.exit(1);
}

// 1. Đăng ký hợp lệ
const ok1 = await post('/api/auth/register', { email, password, name: 'Người Test' });
record(
  'Đăng ký hợp lệ → 201 + token + role user',
  ok1.status === 201 &&
    ok1.json.token &&
    ok1.json.user?.role === 'user' &&
    ok1.json.user?.email === email.toLowerCase(),
  `${ok1.status} ${ok1.json.user?.email || ok1.json.error}`,
);

const token = ok1.json.token;

// 2. Đăng nhập sau đăng ký (cùng mật khẩu)
const login1 = await post('/api/auth/customer/login', { email, password });
record(
  'Đăng nhập patient sau đăng ký',
  login1.status === 200 && login1.json.user?.email === email.toLowerCase(),
  `${login1.status}`,
);

// 3. Email trùng (409)
const dup = await post('/api/auth/register', { email, password: 'OtherPass1!' });
record('Email trùng → 409', dup.status === 409, `${dup.status} ${dup.json.error}`);

// 4. Email trùng khác hoa thường
const dupCase = await post('/api/auth/register', {
  email: email.toUpperCase(),
  password: 'OtherPass1!',
});
record('Email trùng (khác HOA/thường) → 409', dupCase.status === 409, `${dupCase.status}`);

// 5. Mật khẩu ngắn
const shortPw = await post('/api/auth/register', {
  email: `short${Date.now()}@t.vn`,
  password: 'abc',
});
record('Mật khẩu < 8 → 400', shortPw.status === 400, `${shortPw.status} ${shortPw.json.error}`);

// 6. Email không hợp lệ
const badEmail = await post('/api/auth/register', {
  email: 'not-an-email',
  password: 'ValidPass1!',
});
record('Email sai định dạng → 400', badEmail.status === 400, `${badEmail.status} ${badEmail.json.error}`);

// 7. Thiếu email
const noEmail = await post('/api/auth/register', { password: 'ValidPass1!' });
record('Thiếu email → 400', noEmail.status === 400, `${noEmail.status}`);

// 8. GET không được phép
const getReg = await fetch(`${BASE}/api/auth/register`);
record('GET /register → không phải 201', getReg.status !== 201, `status ${getReg.status}`);

// 9. JWT /api/me
if (token) {
  const me = await fetch(`${BASE}/api/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const meJson = await me.json();
  record(
    'Token đăng ký dùng được GET /api/me',
    me.status === 200 && meJson.user?.role === 'user',
    `${me.status} ${meJson.user?.email}`,
  );
}

// 10. Đăng ký trùng email demo patient
const demoDup = await post('/api/auth/register', {
  email: 'patient@tezca.vn',
  password: 'TezcaDemo#2026',
});
record('Email demo đã tồn tại → 409', demoDup.status === 409, `${demoDup.status}`);

const failed = results.filter((r) => !r.ok);
console.log('\n---');
console.log(`Kết quả: ${results.length - failed.length}/${results.length} đạt`);
if (failed.length) {
  console.log('Thất bại:', failed.map((f) => f.name).join(', '));
  process.exit(1);
}
