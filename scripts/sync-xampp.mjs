/**
 * Copy thư mục dist/ → thư mục XAMPP (mặc định C:\xampp\htdocs\tezca).
 * Ghi đè: XAMPP_TEZCA_DIR=C:\path\to\folder
 */
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

if (!existsSync(dist)) {
  console.error('Chưa có thư mục dist/. Chạy trước: npm run build');
  process.exit(1);
}

const isWin = process.platform === 'win32';
const defaultTarget = isWin
  ? join('C:', 'xampp', 'htdocs', 'tezca')
  : join('/', 'opt', 'lampp', 'htdocs', 'tezca');

const target = process.env.XAMPP_TEZCA_DIR || defaultTarget;

mkdirSync(target, { recursive: true });
cpSync(dist, target, { recursive: true, force: true });
console.log('Đã copy dist →', target);
