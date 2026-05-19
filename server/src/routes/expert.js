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
} from '../db.js';
import { authMiddleware } from '../auth.js';
import { buildWeeklyReport } from '../weeklyReport.js';
import { sendLiveChatMessage } from '../liveChatDelivery.js';

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
  res.json({
    user: {
      id: req.user.sub,
      email: req.user.email,
      name: req.user.name,
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
    res.status(400).json({ error: 'Không thể gán' });
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
