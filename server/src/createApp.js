import { loadEnv } from './loadEnv.js';
import express from 'express';
import cors from 'cors';
import { initDb, ensureAdminFromEnv, maybeSync } from './db.js';
import { assertProductionSecrets } from './secrets.js';
import { securityHeaders, corsOriginCallback, errorHandler } from './security.js';
import { vercelApiPathPrefix, inferAuthOpFromPath } from './vercelPath.js';

loadEnv();
assertProductionSecrets();

import { publicApiRouter } from './routes/public.js';
import {
  authRouter,
  registerHandler,
  customerLoginHandler,
  expertLoginHandler,
  adminLoginHandler,
  legacyLoginHandler,
  authGatewayWithLimits,
  forgotPasswordHandler,
  resetPasswordHandler,
} from './routes/auth.js';
import { registerLimiter, forgotPasswordLimiter, loginLimiter, resetPasswordLimiter } from './rateLimit.js';
import { userRouter } from './routes/user.js';
import { expertRouter } from './routes/expert.js';
import { adminRouter } from './routes/admin.js';
import { communityRouter } from './routes/community.js';
import { pushRouter } from './routes/push.js';
import { uploadRouter } from './routes/upload.js';
import { maybeSeedDemoBulk } from './db/seedDemoRuntime.js';

/** Express app dùng chung: Node local, Docker, Vercel serverless (`api/index.js`). */
export async function createApp() {
  await initDb();
  ensureAdminFromEnv();
  // Seed demo nặng — chạy nền để không chặn cold start / health check trên Vercel.
  setImmediate(() => {
    try {
      maybeSeedDemoBulk();
    } catch (err) {
      console.error('[tezca] demo bulk seed failed', err);
    }
  });

  const app = express();
  const corsDev = process.env.NODE_ENV !== 'production';

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(securityHeaders);
  app.use(
    cors({
      origin: corsDev ? true : corsOriginCallback,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );
  app.use(express.json({ limit: '512kb' }));

  app.use(vercelApiPathPrefix());
  app.use((req, _res, next) => {
    inferAuthOpFromPath(req);
    next();
  });

  // Trên serverless, replica cục bộ chỉ sync lúc cold start. Pull thay đổi mới
  // từ remote (có throttle) trước khi xử lý request để đọc dữ liệu vừa được
  // instance KHÁC ghi — vd: bài cộng đồng vừa đăng, hoặc tài khoản vừa tạo khi
  // đăng nhập. Bỏ qua preflight và health check để không làm chậm cold start.
  // No-op khi chạy SQLite local (đã là nguồn sự thật duy nhất).
  const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
  app.use((req, res, next) => {
    const url = req.originalUrl || req.url || '';
    const isHealth = url.includes('/health');
    if (req.method !== 'OPTIONS' && !isHealth) maybeSync();

    // Sau khi một request GHI trả về thành công (2xx), force-sync để đẩy
    // write lên Turso primary NGAY. Trên serverless, instance có thể bị đóng
    // băng/kết thúc ngay sau response; nếu không đẩy chủ động, write chỉ nằm ở
    // replica cục bộ và biến mất (vd: bài cộng đồng vừa đăng "mất khi refresh").
    // No-op khi chạy SQLite local. Lỗi sync không được làm hỏng response.
    if (MUTATING_METHODS.has(req.method) && !isHealth) {
      res.on('finish', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            maybeSync({ force: true });
          } catch (err) {
            console.warn('[db] post-write sync failed:', err instanceof Error ? err.message : err);
          }
        }
      });
    }
    next();
  });

  /** OPTIONS — tránh 405 trên preflight CORS (đăng ký / đăng nhập) */
  const authOpt = (_req, res) => res.sendStatus(204);
  app.options('/api/auth/register', authOpt);
  app.options('/api/auth/forgot-password', authOpt);
  app.options('/api/auth/reset-password', authOpt);
  app.options('/api/auth/customer/login', authOpt);
  app.options('/api/auth/patient/login', authOpt);
  app.options('/api/auth/expert/login', authOpt);
  app.options('/api/auth/admin/login', authOpt);
  app.options('/api/auth/login', authOpt);
  app.options('/api/register', authOpt);
  app.options('/api/auth/gateway', authOpt);
  app.options('/api', authOpt);
  app.options(/^\/api(\/.*)?$/, authOpt);
  app.options(/^\/api\/auth\/.+/, authOpt);
  app.options('/api/newsletter', authOpt);

  /** POST trực tiếp — tránh 404/405 khi Vercel rút path về /api */
  app.post('/api/auth/gateway', authGatewayWithLimits);
  app.post('/api/auth/customer/login', loginLimiter, customerLoginHandler);
  app.post('/api/auth/patient/login', loginLimiter, customerLoginHandler);
  app.post('/api/auth/expert/login', loginLimiter, expertLoginHandler);
  app.post('/api/auth/admin/login', loginLimiter, adminLoginHandler);
  app.post('/api/auth/login', loginLimiter, legacyLoginHandler);
  app.post('/api/auth/register', registerLimiter, registerHandler);
  app.post('/api/auth/forgot-password', forgotPasswordLimiter, forgotPasswordHandler);
  app.post('/api/auth/reset-password', resetPasswordLimiter, resetPasswordHandler);

  app.use('/api/auth', authRouter);
  app.use('/auth', authRouter);

  /** Alias — path bị rút hoặc client gọi URL ngắn */
  app.post('/api/register', registerLimiter, registerHandler);
  app.post('/register', registerLimiter, registerHandler);
  app.post('/auth/customer/login', loginLimiter, customerLoginHandler);
  app.post('/auth/patient/login', loginLimiter, customerLoginHandler);
  app.post('/auth/expert/login', loginLimiter, expertLoginHandler);
  app.post('/auth/admin/login', loginLimiter, adminLoginHandler);
  app.post('/auth/login', loginLimiter, legacyLoginHandler);

  app.use('/api', publicApiRouter);
  app.use('/api', userRouter);
  app.use('/api/expert', expertRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/community', communityRouter);
  app.use('/api/push', pushRouter);
  app.use('/api/upload', uploadRouter);

  /** POST /api + body.op — khi rewrite chỉ còn /api (không còn segment) */
  app.post('/api', authGatewayWithLimits);

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
