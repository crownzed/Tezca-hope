import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'tezca-dev-secret-change-in-production';

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' },
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
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
    req.user = payload;
    next();
  };
}
