import net from 'net';

/** Kiểm tra cổng TCP còn trống trên host. */
export function isPortFree(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, host);
  });
}

/**
 * Chọn cổng API: ưu tiên PORT env, rồi preferred..preferred+9.
 * @param {number} [preferred=3001]
 */
export async function resolveApiPort(preferred = 3001, host = '127.0.0.1') {
  const fromEnv = Number(process.env.PORT);
  if (fromEnv > 0) return fromEnv;

  for (let p = preferred; p < preferred + 10; p++) {
    if (await isPortFree(p, host)) return p;
  }
  throw new Error(
    `Không tìm được cổng trống từ ${preferred} đến ${preferred + 9}. Đóng process đang chiếm cổng hoặc đặt PORT thủ công.`,
  );
}
