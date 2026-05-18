import { Router } from 'express';
import { getDb, getDatabaseInfo } from '../db.js';
import { isAiConfigured, aiProvider } from '../ai.js';
import { isProduction } from '../secrets.js';

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
    const db = getDb();
    db.prepare('SELECT 1 AS ok').get();
    const integrity = db.prepare('PRAGMA integrity_check').all();
    const integrityOk =
      integrity.length === 1 && integrity[0].integrity_check === 'ok';
    const info = getDatabaseInfo();
    res.json({
      ok: integrityOk,
      engine: 'sqlite',
      integrity: integrityOk ? 'ok' : integrity,
      users: info.rowCounts?.users ?? 0,
      journalMode: info.journalMode,
      foreignKeysOn: info.foreignKeysOn,
      file: info.file,
      sizeBytes: info.sizeBytes,
      tables: info.tables,
      rowCounts: info.rowCounts,
      migrations: info.migrations,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});
