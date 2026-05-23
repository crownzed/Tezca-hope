import { Router } from 'express';
import {
  findUserById,
  findUserByEmail,
  canExpertAccessPatient,
  pushAudit,
  getPatientIdsForExpert,
  listBmiForUser,
  listMoodsForUser,
  listBotMessagesForUser,
  listLiveMessagesForPatient,
  listLiveMessagesForPatientSince,
  getLastLiveMessageMap,
  assignExpertToPatient,
  removeExpertPatientAssignment,
  getTrainingPlanForPatient,
  updateTrainingPlanByExpert,
} from '../db.js';
import { authMiddleware } from '../auth.js';
import { buildWeeklyReport } from '../weeklyReport.js';
import { sendLiveChatMessage } from '../liveChatDelivery.js';
import { DbError, mapDbDomainError } from '../dbErrors.js';

export const expertRouter = Router();
const requireExpert = authMiddleware('expert');

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

expertRouter.get('/patients', requireExpert, (req, res) => {
  const expertId = req.user.sub;
  const patientIds = getPatientIdsForExpert(expertId);
  const lastLiveByPatient = getLastLiveMessageMap(patientIds);
  const list = patientIds.map((pid) => {
    const u = findUserById(pid);
    const bmis = listBmiForUser(pid);
    const moods = listMoodsForUser(pid);
    const lastLiveMessage = lastLiveByPatient.get(pid) || null;
    return {
      id: pid,
      email: u?.email,
      name: u?.name,
      lastBmi: bmis[0] || null,
      lastMood: moods[0] || null,
      lastLiveMessage,
      needsReply: lastLiveMessage?.senderRole === 'patient',
    };
  });
  list.sort((a, b) => {
    const ta = a.lastLiveMessage?.ts ?? 0;
    const tb = b.lastLiveMessage?.ts ?? 0;
    if (tb !== ta) return tb - ta;
    return (a.name || '').localeCompare(b.name || '', 'vi');
  });
  pushAudit({ actorId: expertId, role: 'expert', action: 'list_patients' });
  res.json({ patients: list });
});

/** Đặt TRƯỚC GET /patients/:patientId để không khớp nhầm patientId = "assign" */
expertRouter.post('/patients/assign', requireExpert, (req, res) => {
  const expertId = req.user.sub;
  const email = String((req.body || {}).email || '').trim();
  if (!email) {
    res.status(400).json({ error: 'Cần email bệnh nhân' });
    return;
  }
  const u = findUserByEmail(email);
  if (!u || u.role !== 'user') {
    res.status(404).json({ error: 'Không tìm thấy tài khoản bệnh nhân với email này' });
    return;
  }
  const r = assignExpertToPatient(expertId, u.id);
  if (!r.ok) {
    const msg =
      r.error === 'invalid_expert'
        ? 'Phiên chuyên gia không hợp lệ. Hãy đăng xuất và đăng nhập lại.'
        : r.error === 'invalid_patient'
          ? 'Tài khoản bệnh nhân không hợp lệ.'
          : 'Không thể gán';
    res.status(400).json({ error: msg });
    return;
  }
  pushAudit({ actorId: expertId, role: 'expert', action: 'assign_patient', patientId: u.id, meta: { email } });
  res.status(201).json({ patient: { id: u.id, email: u.email, name: u.name } });
});

expertRouter.get('/patients/:patientId/live-messages', requireExpert, (req, res) => {
  const expertId = req.user.sub;
  const { patientId } = req.params;
  if (!canExpertAccessPatient(expertId, patientId)) {
    res.status(403).json({ error: 'Không được truy cập' });
    return;
  }
  const since = req.query.since;
  const messages =
    since != null && since !== ''
      ? listLiveMessagesForPatientSince(patientId, since)
      : listLiveMessagesForPatient(patientId);
  res.json({ messages });
});

expertRouter.post('/patients/:patientId/live-messages', requireExpert, (req, res) => {
  const expertId = req.user.sub;
  const { patientId } = req.params;
  if (!canExpertAccessPatient(expertId, patientId)) {
    res.status(403).json({ error: 'Không được truy cập' });
    return;
  }
  const text = String((req.body || {}).text || '').trim();
  if (!text) {
    res.status(400).json({ error: 'Tin nhắn trống' });
    return;
  }
  const msg = sendLiveChatMessage({
    patientId,
    senderUserId: expertId,
    senderRole: 'expert',
    content: text,
  });
  if (!msg) {
    res.status(400).json({ error: 'Không gửi được' });
    return;
  }
  pushAudit({ actorId: expertId, role: 'expert', action: 'live_message', patientId });
  res.status(201).json({ message: msg });
});

expertRouter.delete('/patients/:patientId/assignment', requireExpert, (req, res) => {
  const expertId = req.user.sub;
  const { patientId } = req.params;
  if (!canExpertAccessPatient(expertId, patientId)) {
    res.status(403).json({ error: 'Không có quyền gỡ gán' });
    return;
  }
  removeExpertPatientAssignment(expertId, patientId);
  pushAudit({ actorId: expertId, role: 'expert', action: 'unassign_patient', patientId });
  res.json({ ok: true });
});

expertRouter.get('/patients/:patientId/training-plan', requireExpert, (req, res) => {
  const expertId = req.user.sub;
  const { patientId } = req.params;
  if (!canExpertAccessPatient(expertId, patientId)) {
    res.status(403).json({ error: 'Không được truy cập' });
    return;
  }
  const plan = getTrainingPlanForPatient(patientId);
  res.json({ plan });
});

expertRouter.put('/patients/:patientId/training-plan', requireExpert, (req, res) => {
  const expertId = req.user.sub;
  const { patientId } = req.params;
  if (!canExpertAccessPatient(expertId, patientId)) {
    res.status(403).json({ error: 'Không được truy cập' });
    return;
  }
  try {
    const existing = getTrainingPlanForPatient(patientId);
    if (!existing) {
      res.status(404).json({ error: 'Bệnh nhân chưa có kế hoạch tập trên hệ thống' });
      return;
    }
    const { exercises, status, expertNote } = req.body || {};
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
    const saved = updateTrainingPlanByExpert(patientId, expertId, {
      exercises: sanitized,
      status,
      expertNote,
    });
    pushAudit({
      actorId: expertId,
      role: 'expert',
      action: 'update_training_plan',
      patientId,
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
});

expertRouter.get('/patients/:patientId', requireExpert, (req, res) => {
  const expertId = req.user.sub;
  const { patientId } = req.params;
  if (!canExpertAccessPatient(expertId, patientId)) {
    res.status(403).json({ error: 'Không được truy cập hồ sơ này' });
    return;
  }
  const u = findUserById(patientId);
  if (!u) {
    res.status(404).json({ error: 'Không tìm thấy' });
    return;
  }
  const bmi = listBmiForUser(patientId).sort((a, b) => b.date.localeCompare(a.date));
  const moods = listMoodsForUser(patientId).sort((a, b) => b.date.localeCompare(a.date));
  const botMessages = listBotMessagesForUser(patientId);
  const liveMessages = listLiveMessagesForPatient(patientId);
  pushAudit({ actorId: expertId, role: 'expert', action: 'view_patient', patientId });
  res.json({
    patient: { id: u.id, email: u.email, name: u.name },
    bmi,
    moods,
    botMessages,
    liveMessages,
  });
});
