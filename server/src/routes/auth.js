import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { findUserByEmail, insertUser } from '../db.js';
import { signToken } from '../auth.js';
import { normalizeEmail, isValidEmail, validatePassword } from '../validate.js';
import { DbError } from '../dbErrors.js';
import { registerLimiter } from '../rateLimit.js';

export const authRouter = Router();

/** POST /api/auth/register — tạo tài khoản bệnh nhân (role: user) */
export function registerHandler(req, res, next) {
  try {
    const { email, password, name } = req.body || {};
    const normalized = normalizeEmail(email);

    if (!normalized || !password) {
      res.status(400).json({ error: 'Cần email và mật khẩu' });
      return;
    }
    if (!isValidEmail(normalized)) {
      res.status(400).json({ error: 'Email không hợp lệ' });
      return;
    }
    const pwErr = validatePassword(password);
    if (pwErr) {
      res.status(400).json({ error: pwErr });
      return;
    }
    if (findUserByEmail(normalized)) {
      res.status(409).json({ error: 'Email đã được sử dụng' });
      return;
    }

    const user = {
      id: crypto.randomUUID(),
      email: normalized,
      passwordHash: bcrypt.hashSync(String(password), 10),
      role: 'user',
      name: name ? String(name).trim().slice(0, 120) : normalized.split('@')[0],
    };
    insertUser(user);
    const token = signToken(user);
    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, role: user.role, name: user.name },
    });
  } catch (err) {
    if (err instanceof DbError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    next(err);
  }
}

function loginHandler(requiredRole) {
  return (req, res) => {
    const { email, password } = req.body || {};
    const normalized = normalizeEmail(email);
    if (!normalized || !password) {
      res.status(400).json({ error: 'Cần email và mật khẩu' });
      return;
    }
    const user = findUserByEmail(normalized);
    if (!user || !bcrypt.compareSync(String(password), user.passwordHash)) {
      res.status(401).json({ error: 'Sai email hoặc mật khẩu' });
      return;
    }
    if (requiredRole && user.role !== requiredRole) {
      const msg =
        requiredRole === 'expert'
          ? 'Tài khoản không phải chuyên gia. Dùng trang đăng nhập bệnh nhân.'
          : 'Tài khoản không phải bệnh nhân. Dùng trang đăng nhập chuyên gia.';
      res.status(403).json({ error: msg });
      return;
    }
    const token = signToken(user);
    res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role, name: user.name },
    });
  };
}

export const legacyLoginHandler = loginHandler();
export const patientLoginHandler = loginHandler('user');
export const expertLoginHandler = loginHandler('expert');

/** POST /api/auth/gateway — một endpoint khi path REST bị rút (Vercel/static). Body: { op, email, password, name? } */
export function authGatewayHandler(req, res, next) {
  const op = String(req.body?.op || '').trim();
  switch (op) {
    case 'patient-login':
      return patientLoginHandler(req, res);
    case 'expert-login':
      return expertLoginHandler(req, res);
    case 'register':
      return registerHandler(req, res, next);
    case 'login':
      return legacyLoginHandler(req, res);
    default:
      res.status(400).json({
        error: 'Thiếu hoặc sai op',
        hint: 'op: patient-login | expert-login | register | login',
      });
  }
}

export function authGatewayWithLimits(req, res, next) {
  if (req.body?.op === 'register') {
    return registerLimiter(req, res, () => authGatewayHandler(req, res, next));
  }
  return authGatewayHandler(req, res, next);
}

authRouter.post('/gateway', authGatewayWithLimits);
authRouter.post('/register', registerLimiter, registerHandler);
authRouter.post('/login', legacyLoginHandler);
authRouter.post('/patient/login', patientLoginHandler);
authRouter.post('/expert/login', expertLoginHandler);
