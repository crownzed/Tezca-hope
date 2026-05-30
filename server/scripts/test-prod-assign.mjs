const base = process.argv[2] || 'https://tezca-hope.vercel.app';
const patientEmail = process.argv[3] || 'patient@tezca.vn';

const login = await fetch(`${base}/api/auth/gateway`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    op: 'expert-login',
    email: 'expert@tezca.vn',
    password: 'TezcaDemo#2026',
  }),
});
const { token } = await login.json();
if (!login.ok || !token) {
  console.error('login failed', login.status);
  process.exit(1);
}

const assign = await fetch(`${base}/api/expert/customers/assign`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ email: patientEmail }),
});
const body = await assign.json().catch(() => ({}));
console.log('POST assign', assign.status, body);
if (!assign.ok && assign.status !== 201) process.exit(1);

const list = await fetch(`${base}/api/expert/customers`, {
  headers: { Authorization: `Bearer ${token}` },
});
const patients = await list.json();
console.log('customers', list.status, patients.customers?.length ?? 0);
