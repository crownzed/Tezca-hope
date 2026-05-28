import { Router } from 'express';
import {
  authMiddleware,
} from '../auth.js';
import {
  listCustomersWithProfiles,
  listExpertsWithProfiles,
  listAssignmentRelations,
  upsertCustomerProfile,
  upsertExpertProfile,
  updateUserRole,
  grantUserRole,
  revokeUserRole,
  listUserGrantedRoles,
  assignExpertToCustomer,
  removeExpertCustomerAssignment,
  setCommunityPostStatus,
} from '../db.js';
import * as adminManagementService from '../services/adminManagementService.js';
import { DbError } from '../dbErrors.js';

export const adminRouter = Router();
const requireAdmin = authMiddleware('admin');

adminRouter.get('/me', requireAdmin, (req, res) => {
  const u = req.dbUser;
  res.json({ user: { id: u.id, email: u.email, name: u.name, role: req.user.role } });
});

adminRouter.get('/customers', requireAdmin, (_req, res) => {
  res.json({ customers: listCustomersWithProfiles() });
});

adminRouter.put('/customers/:customerId/profile', requireAdmin, (req, res) => {
  const customerId = String(req.params.customerId || '').trim();
  if (!customerId) {
    res.status(400).json({ error: 'Thiếu customerId' });
    return;
  }
  upsertCustomerProfile(customerId, req.body || {});
  res.json({ ok: true });
});

adminRouter.get('/experts', requireAdmin, (_req, res) => {
  res.json({ experts: listExpertsWithProfiles() });
});

adminRouter.put('/experts/:expertId/profile', requireAdmin, (req, res) => {
  const expertId = String(req.params.expertId || '').trim();
  if (!expertId) {
    res.status(400).json({ error: 'Thiếu expertId' });
    return;
  }
  upsertExpertProfile(expertId, req.body || {});
  res.json({ ok: true });
});

adminRouter.patch('/users/:userId/role', requireAdmin, (req, res) => {
  const userId = String(req.params.userId || '').trim();
  const role = String(req.body?.role || '').trim();
  let result;
  try {
    result = updateUserRole(userId, role);
  } catch (err) {
    if (err instanceof DbError) {
      res.status(err.status).json({ error: err.message, code: err.code });
      return;
    }
    throw err;
  }
  if (!result.ok) {
    res.status(404).json({ error: 'Không tìm thấy tài khoản' });
    return;
  }
  res.json({ ok: true });
});

adminRouter.get('/users/:userId/roles', requireAdmin, (req, res) => {
  const userId = String(req.params.userId || '').trim();
  if (!userId) {
    res.status(400).json({ error: 'Thiếu userId' });
    return;
  }
  res.json({ roles: listUserGrantedRoles(userId) });
});

adminRouter.post('/users/:userId/roles', requireAdmin, (req, res) => {
  const userId = String(req.params.userId || '').trim();
  const role = String(req.body?.role || '').trim();
  if (!userId || !role) {
    res.status(400).json({ error: 'Cần userId và role' });
    return;
  }
  let result;
  try {
    result = grantUserRole(userId, role);
  } catch (err) {
    if (err instanceof DbError) {
      res.status(err.status).json({ error: err.message, code: err.code });
      return;
    }
    throw err;
  }
  if (!result.ok) {
    res.status(404).json({ error: 'Không tìm thấy tài khoản' });
    return;
  }
  res.status(result.granted ? 201 : 200).json({ ok: true, granted: Boolean(result.granted) });
});

adminRouter.delete('/users/:userId/roles/:role', requireAdmin, (req, res) => {
  const userId = String(req.params.userId || '').trim();
  const role = String(req.params.role || '').trim();
  if (!userId || !role) {
    res.status(400).json({ error: 'Thiếu userId hoặc role' });
    return;
  }
  const result = revokeUserRole(userId, role);
  if (!result.ok) {
    if (result.reason === 'primary_role') {
      res.status(400).json({ error: 'Không thể gỡ role chính của tài khoản' });
      return;
    }
    res.status(404).json({ error: 'Không tìm thấy tài khoản' });
    return;
  }
  res.json({ ok: true, revoked: Boolean(result.revoked) });
});

adminRouter.get('/assignments', requireAdmin, (req, res) => {
  const status = String(req.query.status || '').trim();
  const assignments = listAssignmentRelations({ status });
  res.json({ assignments });
});

adminRouter.post('/assignments', requireAdmin, (req, res) => {
  const expertId = String(req.body?.expertId || '').trim();
  const customerId = String(req.body?.customerId || '').trim();
  if (!expertId || !customerId) {
    res.status(400).json({ error: 'Cần expertId và customerId' });
    return;
  }
  const result = assignExpertToCustomer(expertId, customerId, 'admin');
  if (!result.ok) {
    res.status(400).json({ error: 'Gán chuyên gia thất bại' });
    return;
  }
  res.status(201).json({ ok: true });
});

adminRouter.delete('/assignments', requireAdmin, (req, res) => {
  const expertId = String(req.body?.expertId || '').trim();
  const customerId = String(req.body?.customerId || '').trim();
  if (!expertId || !customerId) {
    res.status(400).json({ error: 'Cần expertId và customerId' });
    return;
  }
  removeExpertCustomerAssignment(expertId, customerId);
  res.json({ ok: true });
});

const moderationActor = (req) => ({
  id: req.user.sub,
  role: req.user.role,
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
  const status = String(req.body?.status || '').trim();
  if (status === 'hidden') {
    const ok = adminManagementService.moderatePost(
      moderationActor(req),
      String(req.params.postId),
      'hide',
    );
    if (!ok) {
      res.status(404).json({ error: 'Không tìm thấy bài viết' });
      return;
    }
    res.json({ ok: true });
    return;
  }
  if (status === 'published') {
    const ok = setCommunityPostStatus(String(req.params.postId), 'published');
    if (!ok) {
      res.status(404).json({ error: 'Không tìm thấy bài viết' });
      return;
    }
    res.json({ ok: true });
    return;
  }
  res.status(400).json({ error: 'status phải là published hoặc hidden' });
});

adminRouter.delete('/community/posts/:postId', requireAdmin, (req, res) => {
  const ok = adminManagementService.moderatePost(
    moderationActor(req),
    String(req.params.postId),
    'delete',
  );
  if (!ok) {
    res.status(404).json({ error: 'Không tìm thấy bài viết' });
    return;
  }
  res.json({ ok: true });
});

adminRouter.delete('/community/comments/:commentId', requireAdmin, (req, res) => {
  const commentId = String(req.params.commentId);
  const postId = String(req.body?.postId || req.query.postId || '');
  const ok = adminManagementService.moderateComment(
    moderationActor(req),
    commentId,
    postId,
    'delete',
  );
  if (!ok) {
    res.status(404).json({ error: 'Không tìm thấy bình luận' });
    return;
  }
  res.json({ ok: true });
});

adminRouter.get('/community/reports', requireAdmin, (_req, res) => {
  res.json({ reports: adminManagementService.listReports() });
});

adminRouter.patch('/community/reports/:reportId', requireAdmin, (req, res) => {
  const status = String(req.body?.status || '').trim();
  if (!['resolved', 'dismissed', 'pending'].includes(status)) {
    res.status(400).json({ error: 'status không hợp lệ' });
    return;
  }
  const ok = adminManagementService.resolveReport(String(req.params.reportId), status);
  if (!ok) {
    res.status(404).json({ error: 'Không tìm thấy báo cáo' });
    return;
  }
  if (status === 'resolved' && req.body?.hideCommentId) {
    adminManagementService.moderateComment(
      moderationActor(req),
      String(req.body.hideCommentId),
      String(req.body.postId || ''),
      'hide',
    );
  }
  res.json({ ok: true });
});
