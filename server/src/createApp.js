import { loadEnv } from './loadEnv.js';
import express from 'express';
import cors from 'cors';
import { initDb } from './db.js';
import { assertProductionSecrets } from './secrets.js';
import { securityHeaders, corsOriginCallback, errorHandler } from './security.js';
import { vercelApiPathPrefix } from './vercelPath.js';

loadEnv();
assertProductionSecrets();

import { publicApiRouter } from './routes/public.js';
import { authRouter, registerHandler } from './routes/auth.js';
import { userRouter } from './routes/user.js';
import { expertRouter } from './routes/expert.js';

/** Express app dùng chung: Node local, Docker, Vercel serverless (`api/index.js`). */
export function createApp() {
  initDb();

  const app = express();
  const corsDev = process.env.NODE_ENV !== 'production';
  const onVercel = Boolean(process.env.VERCEL);

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(securityHeaders);
  app.use(
    cors({
      origin:
        corsDev || onVercel
          ? true
          : corsOriginCallback,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );
  app.use(express.json({ limit: '512kb' }));

  app.use(vercelApiPathPrefix());

  app.use('/api/auth', authRouter);
  if (onVercel) {
    app.use('/auth', authRouter);
  }

  /** Alias đăng ký — tránh 404/405 khi client gọi nhầm /api/register hoặc path bị rút trên serverless */
  app.post('/api/register', registerHandler);
  if (onVercel) {
    app.post('/register', registerHandler);
  }

  app.use('/api', publicApiRouter);
  app.use('/api', userRouter);
  app.use('/api/expert', expertRouter);

  app.use('/api', (req, res) => {
    res.status(404).json({
      error: 'Không tìm thấy API',
      path: req.originalUrl || req.url,
      hint: 'Đăng ký: POST /api/auth/register',
    });
  });

  app.use(errorHandler);

  return app;
}
