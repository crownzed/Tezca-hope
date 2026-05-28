import jwt from 'jsonwebtoken';
import { getJwtSecret } from './secrets.js';
import { findUserByEmail, findUserById, hasUserRole } from './db.js';

/** Khớp JWT với user trong DB hiện tại (Vercel serverless: /tmp DB mới mỗi cold start). */
export function resolveDbUser(payload) {
  if (!payload?.sub) return null;
  let u = findUserById(payload.sub);
  if (u && hasUserRole(u.id, payload.role)) return u;
  if (payload.email) {
    u = findUserByEmail(payload.email);
    if (u && hasUserRole(u.id, payload.role)) return u;
  }
  return null;
}

export function signToken(user, roleOverride) {
  const role = roleOverride || user.role;
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
  return authMiddlewareRoles(requiredRole ? [requiredRole] : null);
}

/** Cho phép một trong các role (null = mọi role đã đăng nhập). */
export function authMiddlewareRoles(allowedRoles) {
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
    if (allowedRoles?.length && !allowedRoles.includes(payload.role)) {
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
    req.user = { ...payload, sub: dbUser.id, email: dbUser.email, name: dbUser.name };
    req.dbUser = dbUser;
    next();
  };
}
