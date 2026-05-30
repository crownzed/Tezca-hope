import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { findUserByEmail, insertUser, userCanLoginAsRole, isExpertAccountActive } from '../db.js';
import { signToken } from '../auth.js';
import { normalizeEmail, isValidEmail, validatePassword } from '../validate.js';
import { DbError } from '../dbErrors.js';
import { registerLimiter, forgotPasswordLimiter, resetPasswordLimiter } from '../rateLimit.js';
import {
  createPasswordResetToken,
  consumePasswordResetToken,
  updateUserPasswordHash,
} from '../db/passwordReset.js';
import {
  sendPasswordResetEmail,
  buildPasswordResetUrl,
  shouldExposeResetLink,
} from '../mail.js';

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

function roleMismatchMessage(requiredRole) {
  switch (requiredRole) {
    case 'expert':
      return 'Tài khoản không phải chuyên gia. Dùng trang đăng nhập khách hàng.';
    case 'admin':
      return 'Tài khoản không có quyền quản trị.';
    case 'user':
      return 'Tài khoản không phải khách hàng. Dùng trang đăng nhập chuyên gia.';
    default:
      return 'Tài khoản không đúng loại đăng nhập.';
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
    if (requiredRole && !userCanLoginAsRole(user, requiredRole)) {
      res.status(403).json({ error: roleMismatchMessage(requiredRole) });
      return;
    }
    if (requiredRole === 'expert' && !isExpertAccountActive(user.id)) {
      res.status(403).json({ error: 'Tài khoản chuyên gia đã bị khóa. Liên hệ quản trị viên.' });
      return;
    }
    const sessionRole = requiredRole || user.role;
    const token = signToken(user, sessionRole);
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: sessionRole,
        name: user.name,
      },
    });
  };
}

export const legacyLoginHandler = loginHandler();
export const customerLoginHandler = loginHandler('user');
export const expertLoginHandler = loginHandler('expert');
export const adminLoginHandler = loginHandler('admin');
/** @deprecated Dùng customerLoginHandler — giữ alias để không vỡ import cũ. */
export const patientLoginHandler = customerLoginHandler;

/** POST /api/auth/forgot-password — luôn trả về thông điệp chung (chống dò email). */
export async function forgotPasswordHandler(req, res, next) {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!email || !isValidEmail(email)) {
      res.status(400).json({ error: 'Email không hợp lệ' });
      return;
    }
    const generic = {
      message: 'Nếu email tồn tại trong hệ thống, chúng tôi đã gửi liên kết đặt lại mật khẩu.',
    };

    const user = findUserByEmail(email);
    if (!user) {
      res.json(generic);
      return;
    }

    const token = createPasswordResetToken(user.id);
    const resetUrl = buildPasswordResetUrl(req, token);
    try {
      await sendPasswordResetEmail({ to: user.email, resetUrl, name: user.name });
    } catch (mailErr) {
      // Không để lỗi gửi email biến thành 500 — token đã tạo, người dùng có thể thử lại.
      console.error(
        '[auth] gửi email đặt lại mật khẩu lỗi:',
        mailErr instanceof Error ? mailErr.message : mailErr,
      );
    }

    res.json(shouldExposeResetLink() ? { ...generic, resetUrl } : generic);
  } catch (err) {
    next(err);
  }
}

/** POST /api/auth/reset-password — body: { token, password } */
export function resetPasswordHandler(req, res, next) {
  try {
    const { token, password } = req.body || {};
    if (!token) {
      res.status(400).json({ error: 'Thiếu mã đặt lại mật khẩu' });
      return;
    }
    const pwErr = validatePassword(password);
    if (pwErr) {
      res.status(400).json({ error: pwErr });
      return;
    }
    const userId = consumePasswordResetToken(token);
    if (!userId) {
      res.status(400).json({
        error: 'Mã đặt lại không hợp lệ hoặc đã hết hạn. Hãy yêu cầu liên kết mới.',
      });
      return;
    }
    updateUserPasswordHash(userId, bcrypt.hashSync(String(password), 10));
    res.json({ message: 'Đặt lại mật khẩu thành công. Hãy đăng nhập bằng mật khẩu mới.' });
  } catch (err) {
    next(err);
  }
}

/** POST /api/auth/gateway — một endpoint khi path REST bị rút (Vercel/static). Body: { op, ... } */
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
      return forgotPasswordHandler(req, res, next);
    case 'reset-password':
      return resetPasswordHandler(req, res, next);
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
  return authGatewayHandler(req, res, next);
}

authRouter.post('/gateway', authGatewayWithLimits);
authRouter.post('/register', registerLimiter, registerHandler);
authRouter.post('/login', legacyLoginHandler);
authRouter.post('/customer/login', customerLoginHandler);
authRouter.post('/patient/login', customerLoginHandler);
authRouter.post('/expert/login', expertLoginHandler);
authRouter.post('/admin/login', adminLoginHandler);
authRouter.post('/forgot-password', forgotPasswordLimiter, forgotPasswordHandler);
authRouter.post('/reset-password', resetPasswordLimiter, resetPasswordHandler);
