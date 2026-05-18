import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { createApp } from './createApp.js';
import { attachWebSocketServer } from './ws.js';
import { resolveApiPort } from './port.js';

const app = createApp();
const host =
  process.env.HOST ||
  (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');

const port = await resolveApiPort(3001, host === '0.0.0.0' ? '127.0.0.1' : host);

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
attachWebSocketServer(wss);

let shuttingDown = false;

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  if (signal) console.log(`[api] Đang tắt (${signal})…`);

  for (const client of wss.clients) {
    try {
      client.close();
    } catch {
      /* ignore */
    }
  }

  wss.close(() => {
    server.close((err) => {
      if (err) console.error('[api] shutdown:', err.message);
      process.exit(0);
    });
  });

  setTimeout(() => process.exit(1), 4000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `[api] Cổng ${port} đang được dùng (EADDRINUSE).\n` +
        `  • Chạy \`npm run dev:all\` — script tự chọn cổng trống và đồng bộ Vite proxy.\n` +
        `  • Hoặc đóng API cũ: Get-NetTCPConnection -LocalPort ${port} | Select OwningProcess\n` +
        `    rồi Stop-Process -Id <PID> -Force`,
    );
    process.exit(1);
  }
  console.error('[api] Server error:', err);
  process.exit(1);
});

server.listen(port, host, () => {
  const where = host === '0.0.0.0' ? 'mọi giao diện mạng' : host;
  console.log(
    `Tezca API + WS http://${host === '0.0.0.0' ? 'localhost' : host}:${port} (bind ${where})`,
  );
});
