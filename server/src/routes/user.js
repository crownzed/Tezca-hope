import { Router } from 'express';
import {
  listBmiForUser,
  upsertBmiEntry,
  listMoodsForUser,
  upsertMoodEntry,
  listBotMessagesForUser,
  replaceBotMessagesForUser,
  listLiveMessagesForPatient,
  listLiveMessagesForPatientSince,
  getExpertsForPatient,
  getTrainingPlanForPatient,
  integrateTrainingPlanFromAi,
  syncTrainingPlanProgress,
} from '../db.js';
import { parseExercisesFromPlanMarkdown } from '../planToExercises.js';
import { sendLiveChatMessage } from '../liveChatDelivery.js';
import { authMiddleware } from '../auth.js';
import { aiChat, aiChatStream, isAiConfigured } from '../ai.js';
import { polishAiText } from '../polishAiText.js';
import { aiChatLimiter, aiPlanLimiter } from '../rateLimit.js';
import { sanitizeClientError } from '../secrets.js';
import { DbError, mapDbDomainError } from '../dbErrors.js';

export const userRouter = Router();
const requireUser = authMiddleware('user');

userRouter.get('/me', requireUser, (req, res) => {
  const u = req.dbUser;
  res.json({
    user: { id: u.id, email: u.email, name: u.name, role: u.role },
  });
});

/** Chuyên gia được gán (để BN biết ai đồng hành + bật chat) */
userRouter.get('/me/care-team', requireUser, (req, res) => {
  const experts = getExpertsForPatient(req.user.sub);
  res.json({ experts, primary: experts[0] || null });
});

userRouter.get('/me/bmi', requireUser, (req, res) => {
  const list = listBmiForUser(req.user.sub);
  res.json({ entries: list });
});

userRouter.post('/me/bmi', requireUser, (req, res) => {
  const { date, heightCm, weightKg, bmi } = req.body || {};
  if (!date || heightCm == null || weightKg == null || bmi == null) {
    res.status(400).json({ error: 'Thiếu trường bắt buộc' });
    return;
  }
  const row = {
    id: crypto.randomUUID(),
    userId: req.user.sub,
    date: String(date),
    heightCm: Number(heightCm),
    weightKg: Number(weightKg),
    bmi: Number(bmi),
  };
  upsertBmiEntry(row);
  res.status(201).json({ entry: row });
});

userRouter.get('/me/moods', requireUser, (req, res) => {
  const list = listMoodsForUser(req.user.sub);
  res.json({ entries: list });
});

userRouter.post('/me/moods', requireUser, (req, res) => {
  const { date, moodLabel, moodScore, note } = req.body || {};
  if (!date || moodLabel == null || moodScore == null) {
    res.status(400).json({ error: 'Thiếu trường bắt buộc' });
    return;
  }
  const row = {
    id: crypto.randomUUID(),
    userId: req.user.sub,
    date: String(date),
    moodLabel: String(moodLabel),
    moodScore: Number(moodScore),
    note: note != null ? String(note) : '',
  };
  upsertMoodEntry(row);
  res.status(201).json({ entry: row });
});

userRouter.get('/me/bot-messages', requireUser, (req, res) => {
  const list = listBotMessagesForUser(req.user.sub);
  res.json({ messages: list });
});

userRouter.put('/me/bot-messages', requireUser, (req, res) => {
  const { messages } = req.body || {};
  if (!Array.isArray(messages)) {
    res.status(400).json({ error: 'messages phải là mảng' });
    return;
  }
  replaceBotMessagesForUser(req.user.sub, messages);
  res.json({ ok: true });
});

userRouter.get('/me/live-messages', requireUser, (req, res) => {
  const since = req.query.since;
  const list =
    since != null && since !== ''
      ? listLiveMessagesForPatientSince(req.user.sub, since)
      : listLiveMessagesForPatient(req.user.sub);
  res.json({ messages: list });
});

userRouter.post('/me/live-messages', requireUser, (req, res) => {
  const text = String((req.body || {}).text || '').trim();
  if (!text) {
    res.status(400).json({ error: 'Tin nhắn trống' });
    return;
  }
  const msg = sendLiveChatMessage({
    patientId: req.user.sub,
    senderUserId: req.user.sub,
    senderRole: 'patient',
    content: text,
  });
  if (!msg) {
    res.status(400).json({ error: 'Không gửi được' });
    return;
  }
  res.status(201).json({ message: msg });
});

const CHAT_SYSTEM = `Bạn là trợ lý sức khỏe Tezca — trò chuyện trực tiếp bằng tiếng Việt (Việt Nam).

Cách viết:
- Giọng ấm, đồng cảm, không phán xét; câu ngắn vừa phải, nối ý tự nhiên như đang chat.
- Không bullet/đánh số trừ khi người dùng xin danh sách hoặc kế hoạch từng bước.
- Tránh mở đầu lặp ("Chào bạn", "Cảm ơn câu hỏi") nếu đã chào gần đây trong hội thoại.
- Một nhắc ngắn "tham khảo, không thay khám" ở cuối khi cần — không lặp sau mỗi câu.
- Độ dài: 3–8 câu; chi tiết hơn chỉ khi được yêu cầu.

Phạm vi: dinh dưỡng, vận động an toàn, BMI/lối sống, giấc ngủ, stress/cảm xúc — giáo dục sức khỏe, không chẩn đoán, không kê đơn, không đổi thuốc.
Khẩn cấp / ý định tự hại / đau ngực khó thở / co giật / yếu nửa người đột ngột → yêu cầu gọi 115 hoặc cấp cứu ngay.`;

function trimChatMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return null;
  const trimmed = messages
    .slice(-24)
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({
      role: m.role,
      content: String(m.content).slice(0, 4000),
    }));
  return trimmed.length > 0 ? trimmed : null;
}

userRouter.post('/me/ai-chat', requireUser, aiChatLimiter, async (req, res) => {
  if (!isAiConfigured()) {
    res.status(503).json({
      error: 'AI chưa được cấu hình (GOOGLE_GENERATIVE_AI_API_KEY).',
    });
    return;
  }
  const trimmed = trimChatMessages(req.body?.messages);
  if (!trimmed) {
    res.status(400).json({ error: 'Không có tin nhắn hợp lệ' });
    return;
  }
  try {
    const payload = [{ role: 'system', content: CHAT_SYSTEM }, ...trimmed];
    const reply = await aiChat(payload, { max_tokens: 900, temperature: 0.62 });
    res.json({ content: polishAiText(reply) });
  } catch (e) {
    const status = e?.status >= 400 && e?.status < 600 ? e.status : 502;
    res.status(status).json({ error: sanitizeClientError(e, 'Lỗi AI') });
  }
});

/** SSE: data: {"delta":"..."} rồi data: {"done":true,"content":"..."} */
userRouter.post('/me/ai-chat/stream', requireUser, aiChatLimiter, async (req, res) => {
  if (!isAiConfigured()) {
    res.status(503).json({
      error: 'AI chưa được cấu hình (GOOGLE_GENERATIVE_AI_API_KEY).',
    });
    return;
  }
  const trimmed = trimChatMessages(req.body?.messages);
  if (!trimmed) {
    res.status(400).json({ error: 'Không có tin nhắn hợp lệ' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const send = (obj) => {
    res.write(`data: ${JSON.stringify(obj)}\n\n`);
  };

  try {
    const payload = [{ role: 'system', content: CHAT_SYSTEM }, ...trimmed];
    let raw = '';
    for await (const delta of aiChatStream(payload, { max_tokens: 900, temperature: 0.62 })) {
      raw += delta;
      send({ delta });
    }
    const content = polishAiText(raw);
    send({ done: true, content });
    res.end();
  } catch (e) {
    send({ error: sanitizeClientError(e, 'Lỗi AI') });
    res.end();
  }
});

userRouter.post('/me/plan-ai', requireUser, aiPlanLimiter, async (req, res) => {
  if (!isAiConfigured()) {
    res.status(503).json({
      error: 'AI chưa được cấu hình (GOOGLE_GENERATIVE_AI_API_KEY).',
    });
    return;
  }
  const { age, goal, activity, dietNote } = req.body || {};
  const a = Number(age);
  if (!a || a < 14 || a > 100) {
    res.status(400).json({ error: 'Tuổi không hợp lệ (14–100)' });
    return;
  }
  const g = ['lose', 'maintain', 'gain'].includes(goal) ? goal : 'maintain';
  const act = ['low', 'medium', 'high'].includes(activity) ? activity : 'medium';
  const note = typeof dietNote === 'string' ? dietNote.trim().slice(0, 2000) : '';

  const goalVi =
    g === 'lose' ? 'giảm cân bền vững' : g === 'gain' ? 'tăng cân / tăng khối lượng nạc' : 'duy trì cân nặng';
  const actVi =
    act === 'low'
      ? 'ít vận động (văn phòng)'
      : act === 'medium'
        ? 'trung bình'
        : 'cao (tập thường xuyên)';

  const userPrompt = `Soạn **một kế hoạch** dinh dưỡng + vận động cho **7 ngày đầu** (tiếng Việt, Markdown có tiêu đề ## / ###).
Đầu vào cố định:
- Tuổi: ${a}
- Mục tiêu: ${goalVi}
- Mức vận động hiện tại: ${actVi}
${note ? `- Ghi chú người dùng (ưu tiên nếu không mâu thuẫn an toàn): ${note}` : ''}

Yêu cầu nội dung:
1) **Tóm tắt** 2–3 câu (định hướng tuần đầu, không hứa kết quả cụ thể).
2) **Dinh dưỡng:** nguyên tắc calo/macro phù hợp mục tiêu; ví dụ khẩu phần **bữa sáng/trưa/tối** linh hoạt; nhắc nước/chất xơ/protein theo mục tiêu.
3) **Vận động:** khởi động, buổi chính, phục hồi; tiến triển theo tuần; tránh gắng sức khi đau cấp.
4) **Theo dõi:** cân, vòng eo (nếu giảm cân), giấc ngủ/cảm xúc — gợi ý tần suất đo.
5) Luôn có đoạn **tuyên bố miễn trừ**: nội dung chỉ mang tính gợi ý lối sống, không thay thế khám và tư vấn trực tiếp; người có bệnh nền, phụ nữ có thai/cho con bú, vận động viên hoặc đang điều trị phải làm theo hướng dẫn của người hành nghề.

Không kê thuốc, không liều bổ sung cụ thể trừ khi chỉ là “thảo luận với bác sĩ”.`;

  const PLAN_SYSTEM = `Bạn là chuyên gia dinh dưỡng & hoạt động thể chất — viết tiếng Việt tự nhiên, thực tế.
Nguyên tắc: an toàn > hiệu quả nhanh; tránh cam kết số kg/tuần; nhấn thói quen bền vững.
Không chẩn đoán hay kê đơn; chỉ giáo dục sức khỏe. Tôn trọng ghi chú y tế của người dùng.
Markdown gọn: tiêu đề ##, đoạn ngắn, bullet khi cần danh sách; câu nối mạch lạc, không lặp ý; một disclaimer ngắn ở cuối.`;

  try {
    const plan = await aiChat(
      [
        { role: 'system', content: PLAN_SYSTEM },
        { role: 'user', content: userPrompt },
      ],
      { temperature: 0.65, max_tokens: 2500 },
    );
    res.json({ plan: polishAiText(plan) });
  } catch (e) {
    const status = e?.status >= 400 && e?.status < 600 ? e.status : 502;
    res.status(status).json({ error: sanitizeClientError(e, 'Lỗi AI') });
  }
});

/** Kế hoạch tập luyện tích hợp từ AI (Chiến dịch tập luyện) */
userRouter.get('/me/training-plan', requireUser, (req, res) => {
  const plan = getTrainingPlanForPatient(req.user.sub);
  res.json({ plan });
});

userRouter.post('/me/training-plan/integrate', requireUser, (req, res) => {
  try {
    const planMd = String((req.body || {}).plan || '').trim();
    if (!planMd || planMd.length < 40) {
      res.status(400).json({ error: 'Thiếu nội dung kế hoạch để tích hợp' });
      return;
    }
    let exercises = parseExercisesFromPlanMarkdown(planMd);
    if (exercises.length === 0) {
      exercises = [
        {
          id: Date.now(),
          title: 'Buổi vận động theo kế hoạch AI',
          sets: 1,
          reps: 'Xem chi tiết trong kế hoạch',
          isPTLocked: true,
          completed: false,
          actualWeight: '',
        },
      ];
    }
    const saved = integrateTrainingPlanFromAi(req.user.sub, planMd, exercises);
    res.status(201).json({ plan: saved });
  } catch (e) {
    const err = mapDbDomainError(e);
    if (err instanceof DbError) {
      res.status(err.status).json({ error: err.message, code: err.code });
      return;
    }
    throw e;
  }
});

/** Đồng bộ tiến độ hoàn thành bài tập theo ngày (Chiến dịch tập luyện). */
userRouter.patch('/me/training-plan/progress', requireUser, (req, res) => {
  try {
    const date = String((req.body || {}).date || '').trim().slice(0, 10);
    const items = (req.body || {}).exercises;
    const workout = (req.body || {}).workout;
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Cần mảng exercises với id và trạng thái' });
      return;
    }
    const progress = items.slice(0, 20).map((ex) => ({
      id: Number(ex.id),
      completed: ex.completed,
      actualWeight: ex.actualWeight,
    }));
    const bootstrap =
      Array.isArray(workout) && workout.length > 0
        ? workout.slice(0, 20).map((ex, i) => ({
            id: Number(ex.id) || Date.now() + i,
            title: String(ex.title || 'Bài tập'),
            sets: ex.sets,
            reps: ex.reps,
            isPTLocked: ex.isPTLocked,
            actualWeight: ex.actualWeight,
          }))
        : null;
    const saved = syncTrainingPlanProgress(req.user.sub, date, progress, bootstrap);
    if (!saved) {
      res.status(400).json({ error: 'Không lưu được tiến độ — cần ít nhất một bài tập' });
      return;
    }
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
