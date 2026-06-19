const base = process.argv[2] || 'https://tezca-hope.vercel.app';
const cases = [
  ['/api/auth/patient/login', { email: 'patient@tezca.vn', password: 'TezcaDemo#2026' }],
  ['/api/auth/expert/login', { email: 'expert@tezca.vn', password: 'TezcaDemo#2026' }],
];
for (const [path, body] of cases) {
  const r = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  console.log(path, r.status, j.token ? 'token-ok' : j.error || JSON.stringify(j));
}

