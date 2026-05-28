/**
 * Chạy API + Vite: tự chọn cổng API trống (tránh EADDRINUSE :3001) và đồng bộ proxy Vite.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveApiPort } from '../server/src/port.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const host = process.env.HOST || '127.0.0.1';
const port = await resolveApiPort(3001, host);

console.log(`[dev:all] API → http://${host}:${port} (Vite proxy /api, /ws)`);

const env = {
  ...process.env,
  PORT: String(port),
  HOST: host,
  VITE_API_PROXY_PORT: String(port),
};

const child = spawn(
  'npx',
  ['--yes', 'concurrently', '-k', '-n', 'api,web', '-c', 'blue,green', 'npm run dev:api', 'npm run dev'],
  { cwd: root, env, stdio: 'inherit', shell: true },
);

child.on('exit', (code) => process.exit(code ?? 0));
