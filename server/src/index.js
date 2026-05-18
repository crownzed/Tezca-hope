import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { initDb } from './db.js';
import { publicApiRouter } from './routes/public.js';
import { authRouter } from './routes/auth.js';
import { userRouter } from './routes/user.js';
import { expertRouter } from './routes/expert.js';
import { attachWebSocketServer } from './ws.js';

initDb();

const app = express();
const port = Number(process.env.PORT) || 3001;
/** Chỉ mở LAN trong container/production; dev local mặc định 127.0.0.1 */
const host =
  process.env.HOST ||
  (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');

/** Dev: cho phép mọi origin (LAN, VITE_API_URL trỏ thẳng API). Prod Docker: thường cùng host qua Nginx. */
const corsDev = process.env.NODE_ENV !== 'production';
app.use(
  cors({
    origin: corsDev ? true : [/localhost:\d+$/, /127\.0\.0\.1:\d+$/],
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));

app.use('/api/auth', authRouter);
/** Phải đứng trước userRouter (JWT) để /api/health* không bị chặn */
app.use('/api', publicApiRouter);
app.use('/api', userRouter);
app.use('/api/expert', expertRouter);

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
attachWebSocketServer(wss);

server.listen(port, host, () => {
  const where = host === '0.0.0.0' ? 'mọi giao diện mạng' : host;
  console.log(`Tezca API + WS http://${host === '0.0.0.0' ? 'localhost' : host}:${port} (bind ${where})`);
});
