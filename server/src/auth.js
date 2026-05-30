import jwt from 'jsonwebtoken';
import { getJwtSecret } from './secrets.js';
import { findUserByEmail, findUserById, userCanLoginAsRole } from './db.js';

/**
 * Khớp JWT với user trong DB.
 * `payload.role` là vai trò phiên (cổng đăng nhập), có thể khác `users.role` nếu có role phụ.
 */
export function resolveDbUser(payload) {
  if (!payload?.sub) return null;
  const sessionRole = payload.role;

  let u = findUserById(payload.sub);
  if (u) {
    if (!sessionRole || userCanLoginAsRole(u, sessionRole)) return u;
  }

  if (payload.email) {
    u = findUserByEmail(payload.email);
    if (u && (!sessionRole || userCanLoginAsRole(u, sessionRole))) return u;
  }

  return null;
}

/**
 * @param {{ id: string; email: string; name: string; role: string }} user
 * @param {string} [sessionRole] Vai trò phiên (admin / expert / user) — mặc định role gốc trong DB.
 */
export function signToken(user, sessionRole) {
  const role = sessionRole || user.role;
  return jwt.sign(
    { sub: user.id, role, email: user.email, name: user.name },
    getJwtSecret(),
    { expiresIn: '7d' },
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, getJwtSecret());
  } catch {
    return null;
  }
}

export function authMiddleware(requiredRole) {
  return (req, res, next) => {
    const h = req.headers.authorization;
    const token = h?.startsWith('Bearer ') ? h.slice(7) : null;
    if (!token) {
      res.status(401).json({ error: 'Thiếu token' });
      return;
    }
    const payload = verifyToken(token);
    if (!payload) {
      res.status(401).json({ error: 'Token không hợp lệ' });
      return;
    }
    if (requiredRole && payload.role !== requiredRole) {
      res.status(403).json({ error: 'Không đủ quyền' });
      return;
    }
    const dbUser = resolveDbUser(payload);
    if (!dbUser) {
      res.status(401).json({
        error: 'Phiên không còn hợp lệ trên máy chủ này. Vui lòng đăng nhập lại.',
      });
      return;
    }
    req.user = {
      ...payload,
      sub: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: payload.role,
    };
    req.dbUser = dbUser;
    next();
  };
}

/** Cho phép một trong các role (vd. cộng đồng: user, expert, admin). */
export function authMiddlewareRoles(allowedRoles) {
  const allowed = new Set(allowedRoles);
  return (req, res, next) => {
    const h = req.headers.authorization;
    const token = h?.startsWith('Bearer ') ? h.slice(7) : null;
    if (!token) {
      res.status(401).json({ error: 'Thiếu token' });
      return;
    }
    const payload = verifyToken(token);
    if (!payload) {
      res.status(401).json({ error: 'Token không hợp lệ' });
      return;
    }
    if (!allowed.has(payload.role)) {
      res.status(403).json({ error: 'Không đủ quyền' });
      return;
    }
    const dbUser = resolveDbUser(payload);
    if (!dbUser) {
      res.status(401).json({
        error: 'Phiên không còn hợp lệ trên máy chủ này. Vui lòng đăng nhập lại.',
      });
      return;
    }
    req.user = {
      ...payload,
      sub: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: payload.role,
    };
    req.dbUser = dbUser;
    next();
  };
}
