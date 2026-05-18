/**
 * Build Tezca cho thư mục con trên website có sẵn và copy dist.
 *
 * PowerShell:
 *   $env:WEBSITE_SUBPATH="/tezca/"
 *   $env:WEBSITE_DEPLOY_DIR="C:\xampp\htdocs\tezca"
 *   node scripts/deploy-website.mjs
 *
 * Hoặc một dòng (subpath mặc định /tezca/):
 *   npm run deploy:website
 */
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const subpath = process.env.WEBSITE_SUBPATH || '/tezca/';
const normalized = subpath.startsWith('/') ? subpath : `/${subpath}`;
const withSlash = normalized.endsWith('/') ? normalized : `${normalized}/`;

const isWin = process.platform === 'win32';
const defaultTarget = isWin
  ? join('C:', 'xampp', 'htdocs', 'tezca')
  : join('/var', 'www', 'html', 'tezca');
const target = process.env.WEBSITE_DEPLOY_DIR || defaultTarget;

console.log('Build với VITE_BASE_PATH =', withSlash);
execSync('npm run build', {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, VITE_BASE_PATH: withSlash },
});

const dist = join(root, 'dist');
if (!existsSync(dist)) {
  console.error('Không thấy dist/ sau build.');
  process.exit(1);
}

mkdirSync(target, { recursive: true });
cpSync(dist, target, { recursive: true, force: true });

const htaccessSrc = join(root, 'deploy', 'website', '.htaccess');
if (existsSync(htaccessSrc)) {
  let ht = readFileSync(htaccessSrc, 'utf8');
  const base = withSlash.replace(/\/$/, '') || '';
  const rewriteBase = base || '/';
  ht = ht.replace(/RewriteBase \/tezca\//g, `RewriteBase ${rewriteBase}/`);
  ht = ht.replace(/\/tezca\/index\.html/g, `${rewriteBase}/index.html`);
  writeFileSync(join(target, '.htaccess'), ht);
  console.log('Đã ghi .htaccess (RewriteBase', `${rewriteBase}/)`);
}

console.log('');
console.log('Đã deploy frontend →', target);
console.log('URL mẫu: https://ten-mien-cua-ban' + withSlash.replace(/\/$/, '') + '/');
console.log('');
console.log('Bước tiếp theo trên host:');
console.log('  1) Proxy /api và /ws → Node (cổng 3001): xem deploy/website/apache-snippet.conf hoặc nginx-snippet.conf');
console.log('  2) cd server && npm ci && JWT_SECRET=... NODE_ENV=production npm start');
console.log('  3) Khởi động lại Apache/Nginx');
