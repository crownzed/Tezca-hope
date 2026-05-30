import { Router } from 'express';
import {
  findUserById,
  findUserByEmail,
  canExpertAccessCustomer,
  pushAudit,
  getCustomerIdsForExpert,
  listBmiForUser,
  listMoodsForUser,
  listBotMessagesForUser,
  listLiveMessagesForCustomer,
  listLiveMessagesForCustomerSince,
  getLastLiveMessageMap,
  assignExpertToCustomer,
  removeExpertCustomerAssignment,
  getTrainingPlanForCustomer,
  updateTrainingPlanByExpert,
  listPendingCustomersForExpert,
  decideExpertAssignment,
  getCustomerHealthProfile,
} from '../db.js';
import { authMiddleware } from '../auth.js';
import { buildWeeklyReport } from '../weeklyReport.js';
import { sendLiveChatMessage } from '../liveChatDelivery.js';
import { DbError, mapDbDomainError } from '../dbErrors.js';
import * as adminManagementService from '../services/adminManagementService.js';

export const expertRouter = Router();
const requireExpert = authMiddleware('expert');

function customerIdFromReq(req) {
  return req.params.customerId ?? req.params.patientId;
}

function isCustomerSenderRole(role) {
  return role === 'customer' || role === 'patient';
}

/** Báo cáo tuần — ?weekStart=YYYY-MM-DD (thứ Hai), mặc định tuần hiện tại */
expertRouter.get('/reports/weekly', requireExpert, (req, res) => {
  const expertId = req.user.sub;
  const weekStart = String(req.query.weekStart || '').trim() || undefined;
  const report = buildWeeklyReport(expertId, weekStart);
  pushAudit({ actorId: expertId, role: 'expert', action: 'weekly_report', meta: { from: report.period.from } });
  res.json(report);
});

expertRouter.get('/me', requireExpert, (req, res) => {
  const u = req.dbUser;
  res.json({
    user: {
      id: u.id,
      email: u.email,
      name: u.name,
      role: 'expert',
    },
  });
});

function listCustomersHandler(req, res) {
  const expertId = req.user.sub;
  const customerIds = getCustomerIdsForExpert(expertId);
  const lastLiveByCustomer = getLastLiveMessageMap(customerIds);
  const list = customerIds.map((cid) => {
    const u = findUserById(cid);
    const bmis = listBmiForUser(cid);
    const moods = listMoodsForUser(cid);
    const lastLiveMessage = lastLiveByCustomer.get(cid) || null;
    return {
      id: cid,
      email: u?.email,
      name: u?.name,
      lastBmi: bmis[0] || null,
      lastMood: moods[0] || null,
      lastLiveMessage,
      needsReply: lastLiveMessage ? isCustomerSenderRole(lastLiveMessage.senderRole) : false,
    };
  });
  list.sort((a, b) => {
    const ta = a.lastLiveMessage?.ts ?? 0;
    const tb = b.lastLiveMessage?.ts ?? 0;
    if (tb !== ta) return tb - ta;
    return (a.name || '').localeCompare(b.name || '', 'vi');
  });
  pushAudit({ actorId: expertId, role: 'expert', action: 'list_customers' });
  res.json({ customers: list });
}

expertRouter.get('/customers', requireExpert, listCustomersHandler);
expertRouter.get('/patients', requireExpert, listCustomersHandler);

expertRouter.get('/customers/requests', requireExpert, (req, res) => {
  const items = listPendingCustomersForExpert(req.user.sub);
  res.json({ requests: items });
});

/** Đặt TRƯỚC GET /customers/:customerId để không khớp nhầm customerId = "assign" */
function assignCustomerHandler(req, res) {
  const expertId = req.user.sub;
  const email = String((req.body || {}).email || '').trim();
  if (!email) {
    res.status(400).json({ error: 'Cần email khách hàng' });
    return;
  }
  const u = findUserByEmail(email);
  if (!u || u.role !== 'user') {
    res.status(404).json({ error: 'Không tìm thấy tài khoản khách hàng với email này' });
    return;
  }
  const r = assignExpertToCustomer(expertId, u.id);
  if (!r.ok) {
    const msg =
      r.error === 'invalid_expert'
        ? 'Phiên chuyên gia không hợp lệ. Hãy đăng xuất và đăng nhập lại.'
        : r.error === 'invalid_customer'
          ? 'Tài khoản khách hàng không hợp lệ.'
          : 'Không thể gán';
    res.status(400).json({ error: msg });
    return;
  }
  pushAudit({ actorId: expertId, role: 'expert', action: 'assign_customer', customerId: u.id, meta: { email } });
  res.status(201).json({ customer: { id: u.id, email: u.email, name: u.name } });
}

expertRouter.post('/customers/assign', requireExpert, assignCustomerHandler);
expertRouter.post('/patients/assign', requireExpert, assignCustomerHandler);
function decideCustomerRequestHandler(action) {
  return (req, res) => {
    const customerId = customerIdFromReq(req);
    const result = decideExpertAssignment(req.user.sub, customerId, action);
    if (!result.ok) {
      res.status(404).json({ error: 'Không tìm thấy yêu cầu gán cần xử lý' });
      return;
    }
    res.json({ ok: true, status: action === 'approve' ? 'accepted' : 'rejected' });
  };
}

/** Express 5 — không dùng :action(approve|reject) (path-to-regexp v8) */
expertRouter.post('/customers/:customerId/requests/approve', requireExpert, decideCustomerRequestHandler('approve'));
expertRouter.post('/customers/:customerId/requests/reject', requireExpert, decideCustomerRequestHandler('reject'));

function liveMessagesGetHandler(req, res) {
  const expertId = req.user.sub;
  const customerId = customerIdFromReq(req);
  if (!canExpertAccessCustomer(expertId, customerId)) {
    res.status(403).json({ error: 'Không được truy cập' });
    return;
  }
  const since = req.query.since;
  const messages =
    since != null && since !== ''
      ? listLiveMessagesForCustomerSince(customerId, since)
      : listLiveMessagesForCustomer(customerId);
  res.json({ messages });
}

function liveMessagesPostHandler(req, res) {
  const expertId = req.user.sub;
  const customerId = customerIdFromReq(req);
  if (!canExpertAccessCustomer(expertId, customerId)) {
    res.status(403).json({ error: 'Không được truy cập' });
    return;
  }
  const text = String((req.body || {}).text || '').trim();
  if (!text) {
    res.status(400).json({ error: 'Tin nhắn trống' });
    return;
  }
  const msg = sendLiveChatMessage({
    customerId,
    senderUserId: expertId,
    senderRole: 'expert',
    content: text,
  });
  if (!msg) {
    res.status(400).json({ error: 'Không gửi được' });
    return;
  }
  pushAudit({ actorId: expertId, role: 'expert', action: 'live_message', customerId });
  res.status(201).json({ message: msg });
}

function unassignHandler(req, res) {
  const expertId = req.user.sub;
  const customerId = customerIdFromReq(req);
  if (!canExpertAccessCustomer(expertId, customerId)) {
    res.status(403).json({ error: 'Không có quyền gỡ gán' });
    return;
  }
  removeExpertCustomerAssignment(expertId, customerId);
  pushAudit({ actorId: expertId, role: 'expert', action: 'unassign_customer', customerId });
  res.json({ ok: true });
}

function trainingPlanGetHandler(req, res) {
  const expertId = req.user.sub;
  const customerId = customerIdFromReq(req);
  if (!canExpertAccessCustomer(expertId, customerId)) {
    res.status(403).json({ error: 'Không được truy cập' });
    return;
  }
  const plan = getTrainingPlanForCustomer(customerId);
  res.json({ plan });
}

function trainingPlanPutHandler(req, res) {
  const expertId = req.user.sub;
  const customerId = customerIdFromReq(req);
  if (!canExpertAccessCustomer(expertId, customerId)) {
    res.status(403).json({ error: 'Không được truy cập' });
    return;
  }
  try {
    const existing = getTrainingPlanForCustomer(customerId);
    if (!existing) {
      res.status(404).json({ error: 'Khách hàng chưa có kế hoạch tập trên hệ thống' });
      return;
    }
    const { exercises, status, expertNote, expectedUpdatedAt } = req.body || {};
    if (exercises != null && !Array.isArray(exercises)) {
      res.status(400).json({ error: 'exercises phải là mảng' });
      return;
    }
    const sanitized =
      exercises == null
        ? null
        : exercises.slice(0, 20).map((ex, i) => ({
            id: Number(ex.id) || Date.now() + i,
            title: String(ex.title || 'Bài tập').trim().slice(0, 140),
            sets: Math.max(1, Math.min(20, Number(ex.sets) || 1)),
            reps:
              typeof ex.reps === 'string' || typeof ex.reps === 'number'
                ? String(ex.reps).slice(0, 40)
                : 'Theo kế hoạch',
            isPTLocked: ex.isPTLocked !== false,
          }));
    const saved = updateTrainingPlanByExpert(customerId, expertId, {
      exercises: sanitized,
      status,
      expertNote,
      expectedUpdatedAt,
    });
    pushAudit({
      actorId: expertId,
      role: 'expert',
      action: 'update_training_plan',
      customerId,
      meta: { status: saved?.status },
    });
    res.json({ plan: saved });
  } catch (e) {
    const err = mapDbDomainError(e);
    if (err instanceof DbError) {
      res.status(err.status).json({ error: err.message, code: err.code });
      return;
    }
    throw e;
  }
}

function customerDetailHandler(req, res) {
  const expertId = req.user.sub;
  const customerId = customerIdFromReq(req);
  if (!canExpertAccessCustomer(expertId, customerId)) {
    res.status(403).json({ error: 'Không được truy cập hồ sơ này' });
    return;
  }
  const u = findUserById(customerId);
  if (!u) {
    res.status(404).json({ error: 'Không tìm thấy' });
    return;
  }
  const bmi = listBmiForUser(customerId).sort((a, b) => b.date.localeCompare(a.date));
  const moods = listMoodsForUser(customerId).sort((a, b) => b.date.localeCompare(a.date));
  const botMessages = listBotMessagesForUser(customerId);
  const liveMessages = listLiveMessagesForCustomer(customerId);
  const healthProfile = getCustomerHealthProfile(customerId);
  pushAudit({ actorId: expertId, role: 'expert', action: 'view_customer', customerId });
  res.json({
    customer: { id: u.id, email: u.email, name: u.name },
    bmi,
    moods,
    botMessages,
    liveMessages,
    healthProfile,
  });
}

const moderationActor = (req) => ({ id: req.user.sub, role: req.dbUser.role });

expertRouter.get('/community/posts', requireExpert, (req, res) => {
  const topic = req.query.topic ? String(req.query.topic) : undefined;
  const posts = adminManagementService.listPostsForModeration({
    topic,
    viewerId: req.user.sub,
    limit: 50,
  });
  res.json({ posts });
});

expertRouter.patch('/community/posts/:postId', requireExpert, (req, res) => {
  const status = String(req.body?.status || 'hidden').trim();
  if (status !== 'hidden') {
    res.status(400).json({ error: 'Chuyên gia chỉ có thể ẩn bài viết (status=hidden)' });
    return;
  }
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
});

expertRouter.delete('/community/posts/:postId', requireExpert, (req, res) => {
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

expertRouter.delete('/community/comments/:commentId', requireExpert, (req, res) => {
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

for (const base of ['/customers', '/patients']) {
  expertRouter.get(`${base}/:customerId/live-messages`, requireExpert, liveMessagesGetHandler);
  expertRouter.get(`${base}/:patientId/live-messages`, requireExpert, liveMessagesGetHandler);
  expertRouter.post(`${base}/:customerId/live-messages`, requireExpert, liveMessagesPostHandler);
  expertRouter.post(`${base}/:patientId/live-messages`, requireExpert, liveMessagesPostHandler);
  expertRouter.delete(`${base}/:customerId/assignment`, requireExpert, unassignHandler);
  expertRouter.delete(`${base}/:patientId/assignment`, requireExpert, unassignHandler);
  expertRouter.get(`${base}/:customerId/training-plan`, requireExpert, trainingPlanGetHandler);
  expertRouter.get(`${base}/:patientId/training-plan`, requireExpert, trainingPlanGetHandler);
  expertRouter.put(`${base}/:customerId/training-plan`, requireExpert, trainingPlanPutHandler);
  expertRouter.put(`${base}/:patientId/training-plan`, requireExpert, trainingPlanPutHandler);
  expertRouter.get(`${base}/:customerId`, requireExpert, customerDetailHandler);
  expertRouter.get(`${base}/:patientId`, requireExpert, customerDetailHandler);
}
