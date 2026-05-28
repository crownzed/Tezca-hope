import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { findUserByEmail, hasUserRole, insertUser } from '../db.js';
import { signToken } from '../auth.js';
import { normalizeEmail, isValidEmail, validatePassword } from '../validate.js';
import { DbError } from '../dbErrors.js';
import { registerLimiter, forgotPasswordLimiter, loginLimiter, resetPasswordLimiter } from '../rateLimit.js';
import {
  createPasswordResetToken,
  consumePasswordResetToken,
  updateUserPasswordHash,
} from '../db/passwordReset.js';
import {
  buildPasswordResetUrl,
  sendPasswordResetEmail,
  shouldExposeResetLink,
} from '../mail.js';

const FORGOT_PASSWORD_OK =
  'Nếu email tồn tại trong hệ thống, bạn sẽ nhận hướng dẫn đặt lại mật khẩu trong vài phút.';

export const authRouter = Router();

/** POST /api/auth/register — tạo tài khoản khách hàng (role: user) */
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
    if (requiredRole && !hasUserRole(user.id, requiredRole)) {
      const msgByRole = {
        expert: 'Tài khoản không phải chuyên gia. Dùng trang đăng nhập khách hàng.',
        user: 'Tài khoản không phải khách hàng. Dùng trang đăng nhập chuyên gia.',
        admin: 'Tài khoản không phải quản trị viên. Dùng trang đăng nhập quản trị.',
      };
      const msg = msgByRole[requiredRole] || 'Tài khoản không đúng quyền truy cập.';
      res.status(403).json({ error: msg });
      return;
    }
    const token = signToken(user, requiredRole || user.role);
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: requiredRole || user.role,
        name: user.name,
      },
    });
  };
}

export const legacyLoginHandler = loginHandler();
export const customerLoginHandler = loginHandler('user');
export const expertLoginHandler = loginHandler('expert');
export const adminLoginHandler = loginHandler('admin');
/** @deprecated */ export const patientLoginHandler = customerLoginHandler;

/** POST /api/auth/forgot-password — { email } */
export async function forgotPasswordHandler(req, res) {
  const { email } = req.body || {};
  const normalized = normalizeEmail(email);
  if (!normalized || !isValidEmail(normalized)) {
    res.status(400).json({ error: 'Email không hợp lệ' });
    return;
  }

  const user = findUserByEmail(normalized);
  const payload = { message: FORGOT_PASSWORD_OK };

  if (user) {
    try {
      const rawToken = createPasswordResetToken(user.id);
      const resetUrl = buildPasswordResetUrl(req, rawToken);
      await sendPasswordResetEmail({ to: user.email, resetUrl, name: user.name });
      if (shouldExposeResetLink()) payload.resetUrl = resetUrl;
    } catch (err) {
      console.error('[tezca] forgot-password:', err);
      res.status(503).json({
        error: err instanceof Error ? err.message : 'Không gửi được email. Thử lại sau.',
      });
      return;
    }
  }

  res.json(payload);
}

/** POST /api/auth/reset-password — { token, password } */
export function resetPasswordHandler(req, res) {
  const { token, password } = req.body || {};
  if (!token || !password) {
    res.status(400).json({ error: 'Cần mã đặt lại và mật khẩu mới' });
    return;
  }
  const pwErr = validatePassword(password);
  if (pwErr) {
    res.status(400).json({ error: pwErr });
    return;
  }
  const userId = consumePasswordResetToken(token);
  if (!userId) {
    res.status(400).json({ error: 'Liên kết không hợp lệ hoặc đã hết hạn' });
    return;
  }
  updateUserPasswordHash(userId, bcrypt.hashSync(String(password), 10));
  res.json({ message: 'Đã đặt lại mật khẩu. Bạn có thể đăng nhập.' });
}

/** POST /api/auth/gateway — một endpoint khi path REST bị rút (Vercel/static). Body: { op, email, password, name? } */
export function authGatewayHandler(req, res, next) {
  const op = String(req.body?.op || '').trim();
  switch (op) {
    case 'customer-login':
    case 'patient-login':
      return customerLoginHandler(req, res);
    case 'expert-login':
      return expertLoginHandler(req, res);
    case 'admin-login':
      return adminLoginHandler(req, res);
    case 'register':
      return registerHandler(req, res, next);
    case 'login':
      return legacyLoginHandler(req, res);
    case 'forgot-password':
      return forgotPasswordHandler(req, res);
    case 'reset-password':
      return resetPasswordHandler(req, res);
    default:
      res.status(400).json({
        error: 'Thiếu hoặc sai op',
        hint: 'op: customer-login | expert-login | admin-login | register | login | forgot-password | reset-password',
      });
  }
}

export function authGatewayWithLimits(req, res, next) {
  const op = req.body?.op;
  if (op === 'register') {
    return registerLimiter(req, res, () => authGatewayHandler(req, res, next));
  }
  if (op === 'forgot-password') {
    return forgotPasswordLimiter(req, res, () => authGatewayHandler(req, res, next));
  }
  if (op === 'reset-password') {
    return resetPasswordLimiter(req, res, () => authGatewayHandler(req, res, next));
  }
  if (
    op === 'customer-login' ||
    op === 'patient-login' ||
    op === 'expert-login' ||
    op === 'admin-login' ||
    op === 'login'
  ) {
    return loginLimiter(req, res, () => authGatewayHandler(req, res, next));
  }
  return authGatewayHandler(req, res, next);
}

authRouter.post('/gateway', authGatewayWithLimits);
authRouter.post('/register', registerLimiter, registerHandler);
authRouter.post('/forgot-password', forgotPasswordLimiter, forgotPasswordHandler);
authRouter.post('/reset-password', resetPasswordLimiter, resetPasswordHandler);
authRouter.post('/login', loginLimiter, legacyLoginHandler);
authRouter.post('/customer/login', loginLimiter, customerLoginHandler);
authRouter.post('/patient/login', loginLimiter, customerLoginHandler);
authRouter.post('/expert/login', loginLimiter, expertLoginHandler);
authRouter.post('/admin/login', loginLimiter, adminLoginHandler);
