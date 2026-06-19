/**
 * Copy deploy/xampp/httpd-tezca.conf → thư mục Apache của XAMPP
 * (mặc định C:\xampp\apache\conf\extra\httpd-tezca.conf).
 * Chạy PowerShell/CMD **với quyền Administrator** nếu bị từ chối ghi.
 *
 * Ghi đè: XAMPP_APACHE_EXTRA=C:\path\to\apache\conf\extra
 */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'deploy', 'xampp', 'httpd-tezca.conf');

if (!existsSync(src)) {
  console.error('Không tìm thấy:', src);
  process.exit(1);
}

const isWin = process.platform === 'win32';
const extraDir =
  process.env.XAMPP_APACHE_EXTRA ||
  (isWin ? join('C:', 'xampp', 'apache', 'conf', 'extra') : join('/', 'opt', 'lampp', 'etc', 'extra'));

const dest = join(extraDir, 'httpd-tezca.conf');

mkdirSync(extraDir, { recursive: true });
copyFileSync(src, dest);

console.log('Đã copy cấu hình Apache →', dest);
console.log('');
console.log('Bước tiếp theo: mở apache\\conf\\httpd.conf và thêm một dòng (nếu chưa có):');
console.log('  Include conf/extra/httpd-tezca.conf');
console.log('(hoặc dán nội dung file trên vào httpd-vhosts.conf)');
console.log('Sau đó bật mod proxy / proxy_http / proxy_wstunnel và khởi động lại Apache.');
