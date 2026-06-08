import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { authMiddleware } from '../auth.js';
import {
  listCustomersWithProfiles,
  listExpertsWithProfiles,
  listAssignmentRelations,
  updateUserRole,
  assignExpertToCustomer,
  removeExpertCustomerAssignment,
  listUserGrantedRoles,
  grantUserRole,
  revokeUserRole,
  createExpertAccount,
  updateExpertAccount,
  setExpertActive,
  deleteExpertAccount,
  deleteCustomerAccount,
} from '../db.js';
import { DbError } from '../dbErrors.js';
import { isValidEmail, validatePassword } from '../validate.js';
import * as adminManagementService from '../services/adminManagementService.js';
export const adminRouter = Router();
const requireAdmin = authMiddleware('admin');

adminRouter.get('/me', requireAdmin, (req, res) => {
  const u = req.dbUser;
  res.json({
    user: { id: u.id, email: u.email, name: u.name, role: req.user.role },
  });
});

adminRouter.get('/customers', requireAdmin, (_req, res) => {
  res.json({ customers: listCustomersWithProfiles() });
});

adminRouter.delete('/customers/:customerId', requireAdmin, (req, res) => {
  const customerId = String(req.params.customerId || '').trim();
  const result = deleteCustomerAccount(customerId);
  if (!result.ok) {
    res.status(404).json({ error: 'Không tìm thấy khách hàng' });
    return;
  }
  res.json({ ok: true });
});

adminRouter.get('/experts', requireAdmin, (_req, res) => {
  res.json({ experts: listExpertsWithProfiles() });
});

adminRouter.post('/experts', requireAdmin, (req, res) => {
  const email = String(req.body?.email || '').trim();
  const password = String(req.body?.password || '');
  const fullName = String(req.body?.fullName || req.body?.name || '').trim();
  const specialty = String(req.body?.specialty || '').trim();
  if (!email || !password) {
    res.status(400).json({ error: 'Cần email và mật khẩu' });
    return;
  }
  if (!isValidEmail(email)) {
    res.status(400).json({ error: 'Email không hợp lệ' });
    return;
  }
  const pwErr = validatePassword(password);
  if (pwErr) {
    res.status(400).json({ error: pwErr });
    return;
  }
  try {
    const result = createExpertAccount({
      email,
      passwordHash: bcrypt.hashSync(password, 10),
      fullName,
      specialty,
    });
    res.status(201).json(result);
  } catch (err) {
    if (err instanceof DbError) {
      res.status(err.status).json({ error: err.message, code: err.code });
      return;
    }
    throw err;
  }
});

adminRouter.patch('/experts/:expertId', requireAdmin, (req, res) => {
  const expertId = String(req.params.expertId || '').trim();
  const { fullName, email, specialty, isActive } = req.body || {};
  try {
    if (isActive !== undefined) {
      const lockResult = setExpertActive(expertId, Boolean(isActive));
      if (!lockResult.ok) {
        res.status(404).json({ error: 'Không tìm thấy chuyên gia' });
        return;
      }
    }
    if (fullName !== undefined || email !== undefined || specialty !== undefined) {
      const updateResult = updateExpertAccount(expertId, { fullName, email, specialty });
      if (!updateResult.ok) {
        res.status(404).json({ error: 'Không tìm thấy chuyên gia' });
        return;
      }
    }
    res.json({ ok: true });
  } catch (err) {
    if (err instanceof DbError) {
      res.status(err.status).json({ error: err.message, code: err.code });
      return;
    }
    throw err;
  }
});

adminRouter.delete('/experts/:expertId', requireAdmin, (req, res) => {
  const expertId = String(req.params.expertId || '').trim();
  const result = deleteExpertAccount(expertId);
  if (!result.ok) {
    res.status(404).json({ error: 'Không tìm thấy chuyên gia' });
    return;
  }
  res.json({ ok: true });
});

adminRouter.get('/assignments', requireAdmin, (_req, res) => {  res.json({ assignments: listAssignmentRelations() });
});

adminRouter.post('/assignments', requireAdmin, (req, res) => {
  const expertId = String(req.body?.expertId || '').trim();
  const customerId = String(req.body?.customerId || '').trim();
  if (!expertId || !customerId) {
    res.status(400).json({ error: 'Cần expertId và customerId' });
    return;
  }
  const result = assignExpertToCustomer(expertId, customerId);
  if (!result.ok) {
    res.status(400).json({ error: 'Không gán được', code: result.error });
    return;
  }
  res.status(201).json({ ok: true });
});

adminRouter.delete('/assignments', requireAdmin, (req, res) => {
  const expertId = String(req.body?.expertId || req.query?.expertId || '').trim();
  const customerId = String(req.body?.customerId || req.query?.customerId || '').trim();
  if (!expertId || !customerId) {
    res.status(400).json({ error: 'Cần expertId và customerId' });
    return;
  }
  removeExpertCustomerAssignment(expertId, customerId);
  res.json({ ok: true });
});

adminRouter.patch('/users/:userId/role', requireAdmin, (req, res) => {
  const userId = String(req.params.userId || '').trim();
  const role = String(req.body?.role || '').trim();
  try {
    const result = updateUserRole(userId, role);
    if (!result.ok) {
      res.status(404).json({ error: 'Không tìm thấy người dùng' });
      return;
    }
    res.json({ ok: true, roles: listUserGrantedRoles(userId) });
  } catch (err) {
    if (err instanceof DbError) {
      res.status(err.status).json({ error: err.message, code: err.code });
      return;
    }
    throw err;
  }
});

adminRouter.get('/users/:userId/roles', requireAdmin, (req, res) => {
  const userId = String(req.params.userId || '').trim();
  const roles = listUserGrantedRoles(userId);
  if (!roles.length) {
    res.status(404).json({ error: 'Không tìm thấy người dùng' });
    return;
  }
  res.json({ roles });
});

adminRouter.post('/users/:userId/roles', requireAdmin, (req, res) => {
  const userId = String(req.params.userId || '').trim();
  const role = String(req.body?.role || '').trim();
  try {
    const result = grantUserRole(userId, role);
    if (!result.ok) {
      res.status(404).json({ error: 'Không tìm thấy người dùng' });
      return;
    }
    res.status(201).json({ ok: true, roles: listUserGrantedRoles(userId) });
  } catch (err) {
    if (err instanceof DbError) {
      res.status(err.status).json({ error: err.message, code: err.code });
      return;
    }
    throw err;
  }
});

adminRouter.delete('/users/:userId/roles/:role', requireAdmin, (req, res) => {
  const userId = String(req.params.userId || '').trim();
  const role = String(req.params.role || '').trim();
  const result = revokeUserRole(userId, role);
  if (!result.ok) {
    res.status(404).json({ error: 'Không tìm thấy người dùng' });
    return;
  }
  res.json({ ok: true, roles: listUserGrantedRoles(userId) });
});

adminRouter.get('/community/posts', requireAdmin, (req, res) => {
  const topic = req.query.topic ? String(req.query.topic) : undefined;
  const posts = adminManagementService.listPostsForModeration({
    topic,
    viewerId: req.user.sub,
    limit: 50,
  });
  res.json({ posts });
});

adminRouter.patch('/community/posts/:postId', requireAdmin, (req, res) => {
  const postId = String(req.params.postId);
  const status = String(req.body?.status || '').trim();
  const actor = { id: req.user.sub, role: req.user.role };
  if (status === 'hidden') {
    const ok = adminManagementService.moderatePost(actor, postId, 'hide');
    if (!ok) {
      res.status(404).json({ error: 'Không tìm thấy bài viết' });
      return;
    }
    res.json({ ok: true });
    return;
  }
  res.status(400).json({ error: 'status không hợp lệ' });
});

adminRouter.get('/community/reports', requireAdmin, (req, res) => {
  const status = req.query.status ? String(req.query.status) : undefined;
  const reports = adminManagementService.listReports({ status });
  res.json({ reports });
});

adminRouter.patch('/community/reports/:reportId', requireAdmin, (req, res) => {
  const reportId = String(req.params.reportId);
  const status = String(req.body?.status || '').trim();
  if (!['resolved', 'dismissed', 'pending'].includes(status)) {
    res.status(400).json({ error: 'Trạng thái báo cáo không hợp lệ' });
    return;
  }
  const ok = adminManagementService.resolveReport(reportId, status);
  if (!ok) {
    res.status(404).json({ error: 'Không tìm thấy báo cáo' });
    return;
  }
  res.json({ ok: true });
});
