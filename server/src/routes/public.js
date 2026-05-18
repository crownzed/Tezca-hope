import { Router } from 'express';
import { getDb } from '../db.js';
import { isOpenAiConfigured } from '../openai.js';

/** Route không cần JWT — đăng ký TRƯỚC userRouter để không bị middleware auth chặn */
export const publicApiRouter = Router();

publicApiRouter.get('/health', (_req, res) => res.json({ ok: true }));

publicApiRouter.get('/health/ai', (_req, res) => {
  res.json({ configured: isOpenAiConfigured() });
});

publicApiRouter.get('/health/db', (_req, res) => {
  try {
    const db = getDb();
    db.prepare('SELECT 1 AS ok').get();
    const integrity = db.prepare('PRAGMA integrity_check').all();
    const integrityOk =
      integrity.length === 1 && integrity[0].integrity_check === 'ok';
    const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
    res.json({
      ok: true,
      engine: 'sqlite',
      integrity: integrityOk ? 'ok' : integrity,
      users: userCount,
      journalMode: db.pragma('journal_mode', { simple: true }),
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});
