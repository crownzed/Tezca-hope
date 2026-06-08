import { Router } from 'express';
import { getDatabaseInfo, runDatabaseDiagnostics, subscribeNewsletter } from '../db.js';
import { isAiConfigured, aiProvider } from '../ai.js';
import { isProduction } from '../secrets.js';
import { newsletterLimiter } from '../rateLimit.js';
import { isValidEmail, normalizeEmail } from '../validate.js';
import { DbError } from '../dbErrors.js';

/** Route không cần JWT — đăng ký TRƯỚC userRouter để không bị middleware auth chặn */
export const publicApiRouter = Router();

publicApiRouter.get('/health', (_req, res) => res.json({ ok: true }));

publicApiRouter.get('/health/ai', (_req, res) => {
  if (isProduction()) {
    res.json({ ok: isAiConfigured() });
    return;
  }
  res.json({ configured: isAiConfigured(), provider: aiProvider() });
});

publicApiRouter.get('/health/db', (_req, res) => {
  try {
    const diagnostics = runDatabaseDiagnostics();
    const info = getDatabaseInfo();
    res.status(diagnostics.ok ? 200 : 503).json({
      ok: diagnostics.ok,
      engine: 'sqlite',
      errors: diagnostics.errors,
      users: info.rowCounts?.users ?? 0,
      trainingPlans: info.rowCounts?.patient_training_plans ?? 0,
      journalMode: info.journalMode,
      synchronous: info.synchronous,
      foreignKeysOn: info.foreignKeysOn,
      busyTimeoutMs: info.busyTimeoutMs,
      file: info.file,
      sizeBytes: info.sizeBytes,
      tables: info.tables,
      rowCounts: info.rowCounts,
      migrations: info.migrations,
      checks: diagnostics.checks,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

/** POST /api/newsletter — đăng ký nhận tin từ landing */
publicApiRouter.post('/newsletter', newsletterLimiter, (req, res) => {
  try {
    const raw = (req.body || {}).email;
    const normalized = normalizeEmail(raw);
    if (!normalized || !isValidEmail(normalized)) {
      res.status(400).json({ error: 'Email không hợp lệ' });
      return;
    }
    const source = String((req.body || {}).source || 'landing').slice(0, 64);
    const { created } = subscribeNewsletter(normalized, source);
    res.status(created ? 201 : 200).json({
      message: 'Cảm ơn bạn! Tezca sẽ gửi hướng dẫn và tin tức sớm nhất.',
      alreadySubscribed: !created,
    });
  } catch (err) {
    if (err instanceof DbError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: 'Không đăng ký được. Vui lòng thử lại.' });
  }
});
