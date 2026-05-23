import jwt from 'jsonwebtoken';
import { getJwtSecret } from './secrets.js';
import { findUserByEmail, findUserById } from './db.js';

/** Khớp JWT với user trong DB hiện tại (Vercel serverless: /tmp DB mới mỗi cold start). */
export function resolveDbUser(payload) {
  if (!payload?.sub) return null;
  let u = findUserById(payload.sub);
  if (u && u.role === payload.role) return u;
  if (payload.email) {
    u = findUserByEmail(payload.email);
    if (u && u.role === payload.role) return u;
  }
  return null;
}

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email, name: user.name },
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
    req.user = { ...payload, sub: dbUser.id, email: dbUser.email, name: dbUser.name };
    req.dbUser = dbUser;
    next();
  };
}
