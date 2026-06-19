/**
 * Push notification backend — lưu subscription + gửi push.
 * Dùng web-push (VAPID).
 *
 * Env cần:
 * - VAPID_PUBLIC_KEY
 * - VAPID_PRIVATE_KEY
 * - VAPID_EMAIL (mailto:xxx@yyy.com)
 *
 * Generate VAPID keys: npx web-push generate-vapid-keys
 */

import { Router } from 'express';
import { authMiddlewareRoles } from '../auth.js';
import { getDb } from '../db.js';

export const pushRouter = Router();

const requireAuth = authMiddlewareRoles(['user', 'expert', 'admin']);

/** Tạo bảng push_subscriptions nếu chưa có */
function ensurePushTable() {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      endpoint TEXT NOT NULL UNIQUE,
      keys_p256dh TEXT NOT NULL,
      keys_auth TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
}

let tableReady = false;
function ready() {
  if (!tableReady) {
    ensurePushTable();
    tableReady = true;
  }
}

/** POST /api/push/subscribe — lưu push subscription */
pushRouter.post('/subscribe', requireAuth, (req, res) => {
  ready();
  const userId = req.user.sub;
  const { endpoint, keys } = req.body || {};

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    res.status(400).json({ error: 'Subscription không hợp lệ' });
    return;
  }

  const db = getDb();
  // Upsert: nếu endpoint đã tồn tại thì update
  db.prepare(`
    INSERT INTO push_subscriptions (user_id, endpoint, keys_p256dh, keys_auth)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(endpoint) DO UPDATE SET
      user_id = excluded.user_id,
      keys_p256dh = excluded.keys_p256dh,
      keys_auth = excluded.keys_auth
  `).run(userId, endpoint, keys.p256dh, keys.auth);

  res.json({ ok: true });
});

/** DELETE /api/push/unsubscribe — xóa subscription */
pushRouter.delete('/unsubscribe', requireAuth, (req, res) => {
  ready();
  const { endpoint } = req.body || {};
  if (!endpoint) {
    res.status(400).json({ error: 'Thiếu endpoint' });
    return;
  }

  getDb().prepare('DELETE FROM push_subscriptions WHERE endpoint = ? AND user_id = ?')
    .run(endpoint, req.user.sub);

  res.json({ ok: true });
});

/** GET /api/push/vapid-key — trả public key cho frontend */
pushRouter.get('/vapid-key', (_req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY?.trim();
  if (!key) {
    res.status(503).json({ error: 'VAPID chưa được cấu hình' });
    return;
  }
  res.json({ publicKey: key });
});

/**
 * Utility: gửi push tới user cụ thể.
 * Import từ module khác khi cần gửi notification.
 */
export async function sendPushToUser(userId, payload) {
  ready();
  // Lazy import web-push để không crash nếu chưa install
  let webpush;
  try {
    webpush = await import('web-push');
  } catch {
    console.warn('[push] web-push package chưa được cài. Chạy: npm i web-push');
    return { sent: 0, failed: 0 };
  }

  const vapidPublic = process.env.VAPID_PUBLIC_KEY?.trim();
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY?.trim();
  const vapidEmail = process.env.VAPID_EMAIL?.trim() || 'mailto:admin@tezca.vn';

  if (!vapidPublic || !vapidPrivate) {
    console.warn('[push] VAPID keys chưa cấu hình');
    return { sent: 0, failed: 0 };
  }

  webpush.setVapidDetails(vapidEmail, vapidPublic, vapidPrivate);

  const subs = getDb()
    .prepare('SELECT endpoint, keys_p256dh, keys_auth FROM push_subscriptions WHERE user_id = ?')
    .all(userId);

  let sent = 0;
  let failed = 0;
  const body = JSON.stringify(payload);

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth },
        },
        body,
      );
      sent++;
    } catch (err) {
      failed++;
      // 410 Gone = subscription expired → xóa
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        getDb().prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(sub.endpoint);
      }
    }
  }

  return { sent, failed };
}
