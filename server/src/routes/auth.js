import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { findUserByEmail, insertUser } from '../db.js';
import { signToken } from '../auth.js';

export const authRouter = Router();

authRouter.post('/register', (req, res) => {
  const { email, password, name } = req.body || {};
  if (!email || !password) {
    res.status(400).json({ error: 'Cần email và mật khẩu' });
    return;
  }
  if (findUserByEmail(email)) {
    res.status(409).json({ error: 'Email đã được sử dụng' });
    return;
  }
  const user = {
    id: crypto.randomUUID(),
    email: String(email).trim(),
    passwordHash: bcrypt.hashSync(String(password), 10),
    role: 'user',
    name: name ? String(name).trim() : email.split('@')[0],
  };
  insertUser(user);
  const token = signToken(user);
  res.status(201).json({
    token,
    user: { id: user.id, email: user.email, role: user.role, name: user.name },
  });
});

authRouter.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    res.status(400).json({ error: 'Cần email và mật khẩu' });
    return;
  }
  const user = findUserByEmail(email);
  if (!user || !bcrypt.compareSync(String(password), user.passwordHash)) {
    res.status(401).json({ error: 'Sai email hoặc mật khẩu' });
    return;
  }
  const token = signToken(user);
  res.json({
    token,
    user: { id: user.id, email: user.email, role: user.role, name: user.name },
  });
});
