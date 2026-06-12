import { Router } from 'express';
import {
  listBmiForUser,
  upsertBmiEntry,
  listMoodsForUser,
  upsertMoodEntry,
  listBotMessagesForUser,
  replaceBotMessagesForUser,
  listLiveMessagesForCustomer,
  listLiveMessagesForCustomerSince,
  getExpertsForCustomer,
  listAvailableExperts,
  listExpertRequestsForCustomer,
  requestExpertAssignment,
  getCustomerHealthProfile,
  upsertCustomerHealthProfile,
  getTrainingPlanForCustomer,
  integrateTrainingPlanFromAi,
  syncTrainingPlanProgress,
} from '../db.js';
import { parseExercisesFromPlanMarkdown } from '../planToExercises.js';
import { sendLiveChatMessage } from '../liveChatDelivery.js';
import { validateImageUrl } from '../validate.js';
import { authMiddleware } from '../auth.js';
import { aiChat, aiChatStream, isAiConfigured } from '../ai.js';
import { polishAiText } from '../polishAiText.js';
import { getLastUserMessage } from '../chatIntent.js';
import { planChatTurn, runChatTurn, runChatTurnStream } from '../chatTurn.js';
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
  const experts = getExpertsForCustomer(req.user.sub);
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
  const h = Number(heightCm);
  const w = Number(weightKg);
  const b = Number(bmi);
  // Validate range hợp lý
  if (!Number.isFinite(h) || h < 50 || h > 300) {
    res.status(400).json({ error: 'Chiều cao không hợp lệ (50-300 cm)' });
    return;
  }
  if (!Number.isFinite(w) || w < 10 || w > 500) {
    res.status(400).json({ error: 'Cân nặng không hợp lệ (10-500 kg)' });
    return;
  }
  if (!Number.isFinite(b) || b < 5 || b > 100) {
    res.status(400).json({ error: 'BMI không hợp lệ (5-100)' });
    return;
  }
  // Validate date format YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
    res.status(400).json({ error: 'Ngày không hợp lệ (YYYY-MM-DD)' });
    return;
  }
  const row = {
    id: crypto.randomUUID(),
    userId: req.user.sub,
    date: String(date),
    heightCm: h,
    weightKg: w,
    bmi: b,
  };
  upsertBmiEntry(row);
  res.status(201).json({ entry: row });
});

userRouter.get('/me/moods', requireUser, (req, res) => {
  const list = listMoodsForUser(req.user.sub);
  res.json({ entries: list });
});

userRouter.post('/me/moods', requireUser, (req, res) => {
  const { date, moodLabel, moodScore, moodEmoji, moodKey, freeText } = req.body || {};
  if (!date || moodLabel == null || moodScore == null) {
    res.status(400).json({ error: 'Thiếu trường bắt buộc' });
    return;
  }
  const score = Number(moodScore);
  if (!Number.isFinite(score) || score < 1 || score > 5) {
    res.status(400).json({ error: 'moodScore phải từ 1 đến 5' });
    return;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
    res.status(400).json({ error: 'Ngày không hợp lệ (YYYY-MM-DD)' });
    return;
  }
  const row = {
    id: crypto.randomUUID(),
    userId: req.user.sub,
    date: String(date),
    moodLabel: String(moodLabel).slice(0, 64),
    moodScore: score,
    moodEmoji: String(moodEmoji || '').slice(0, 16),
    moodKey: moodKey ? String(moodKey).slice(0, 32) : undefined,
    freeText: freeText != null ? String(freeText).trim().slice(0, 2000) : '',
  };
  upsertMoodEntry(row);
  res.status(201).json({ entry: row });
});

userRouter.get('/me/experts', requireUser, (_req, res) => {
  const experts = listAvailableExperts();
  res.json({ experts });
});

userRouter.post('/me/experts/:expertId/request', requireUser, (req, res) => {
  const expertId = String(req.params.expertId || '').trim();
  if (!expertId) {
    res.status(400).json({ error: 'Thiếu chuyên gia cần chọn' });
    return;
  }
  const result = requestExpertAssignment(req.user.sub, expertId);
  if (!result.ok) {
    if (result.error === 'invalid_expert') {
      res.status(400).json({ error: 'Chuyên gia không hợp lệ' });
      return;
    }
    if (result.error === 'invalid_customer') {
      res.status(400).json({ error: 'Tài khoản không hợp lệ' });
      return;
    }
    res.status(400).json({ error: 'Không thể gửi yêu cầu chọn chuyên gia' });
    return;
  }
  res.status(201).json({ ok: true });
});

userRouter.get('/me/experts/requests', requireUser, (req, res) => {
  const requests = listExpertRequestsForCustomer(req.user.sub);
  res.json({ requests });
});

function ensureAcceptedExpertForLiveChat(req, res) {
  const experts = getExpertsForCustomer(req.user.sub);
  if (experts.length > 0) return true;
  res.status(403).json({
    error: 'Bạn chưa có chuyên gia đồng hành được duyệt. Hãy chọn chuyên gia trước khi chat.',
  });
  return false;
}

userRouter.get('/me/health-profile', requireUser, (req, res) => {
  const profile = getCustomerHealthProfile(req.user.sub);
  res.json({ profile: profile || null });
});

userRouter.put('/me/health-profile', requireUser, (req, res) => {
  upsertCustomerHealthProfile(req.user.sub, req.body || {});
  res.json({ ok: true });
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
  if (!ensureAcceptedExpertForLiveChat(req, res)) return;
  const since = req.query.since;
  const list =
    since != null && since !== ''
      ? listLiveMessagesForCustomerSince(req.user.sub, since)
      : listLiveMessagesForCustomer(req.user.sub);
  res.json({ messages: list });
});

userRouter.post('/me/live-messages', requireUser, (req, res) => {
  if (!ensureAcceptedExpertForLiveChat(req, res)) return;
  const text = String((req.body || {}).text || '').trim();
  const imgResult = validateImageUrl((req.body || {}).imageUrl);
  if (!imgResult.valid) {
    res.status(400).json({ error: imgResult.error });
    return;
  }
  const imageUrl = imgResult.sanitized;
  if (!text && !imageUrl) {
    res.status(400).json({ error: 'Tin nhắn trống' });
    return;
  }
  const msg = sendLiveChatMessage({
    customerId: req.user.sub,
    senderUserId: req.user.sub,
    senderRole: 'customer',
    content: text,
    imageUrl,
  });
  if (!msg || msg.error) {
    const status = msg && msg.code === 'CONTENT_VIOLATION' ? 422 : 400;
    res.status(status).json({ error: (msg && msg.error) || 'Không gửi được' });
    return;
  }
  res.status(201).json({ message: msg });
});

const CHAT_SYSTEM = `Bạn là trợ lý sức khỏe Tezca - trò chuyện trực tiếp bằng tiếng Việt (Việt Nam).

Độ dài (ưu tiên cao):
- Mặc định **1-3 câu ngắn**; chỉ mở rộng khi người dùng xin chi tiết, danh sách, hoặc kế hoạch từng bước.
- Chào / cảm ơn / xác nhận đơn giản → **một câu** là đủ.
- Không lặp lại câu hỏi; không mở đầu dài ("Cảm ơn bạn đã hỏi...").

Cách viết:
- Giọng ấm, đồng cảm; nối ý tự nhiên như chat.
- Không bullet/đánh số trừ khi được yêu cầu.
- Tránh mở đầu lặp ("Chào bạn") nếu vừa chào trong hội thoại.
- Disclaimer "tham khảo, không thay khám" chỉ khi khuyên sức khỏe cụ thể - tối đa một cụm ngắn cuối, không lặp mỗi lượt.

Phạm vi: dinh dưỡng, vận động an toàn, BMI/lối sống, giấc ngủ, stress - giáo dục, không chẩn đoán/kê đơn.
Khẩn cấp / tự hại / đau ngực khó thở / co giật / yếu nửa người → gọi 115 hoặc cấp cứu ngay (ngắn, rõ).`;

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
  const trimmed = trimChatMessages(req.body?.messages);
  if (!trimmed) {
    res.status(400).json({ error: 'Không có tin nhắn hợp lệ' });
    return;
  }
  const plan = planChatTurn(getLastUserMessage(trimmed));
  if (plan.mode === 'llm' && !isAiConfigured()) {
    res.status(503).json({
      error: 'AI chưa được cấu hình (GOOGLE_GENERATIVE_AI_API_KEY).',
    });
    return;
  }
  try {
    const result = await runChatTurn({ systemBase: CHAT_SYSTEM, messages: trimmed, plan });
    res.json({
      content: result.content,
      intent: result.intent,
      source: result.source,
    });
  } catch (e) {
    const status = e?.status >= 400 && e?.status < 600 ? e.status : 502;
    res.status(status).json({ error: sanitizeClientError(e, 'Lỗi AI') });
  }
});

/** SSE: data: {"delta":"..."} rồi data: {"done":true,"content":"..."} */
userRouter.post('/me/ai-chat/stream', requireUser, aiChatLimiter, async (req, res) => {
  const trimmed = trimChatMessages(req.body?.messages);
  if (!trimmed) {
    res.status(400).json({ error: 'Không có tin nhắn hợp lệ' });
    return;
  }
  const plan = planChatTurn(getLastUserMessage(trimmed));
  if (plan.mode === 'llm' && !isAiConfigured()) {
    res.status(503).json({
      error: 'AI chưa được cấu hình (GOOGLE_GENERATIVE_AI_API_KEY).',
    });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Keepalive mỗi 15s để proxy (Cloudflare/Vercel) không timeout
  const keepalive = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 15_000);

  const send = (obj) => {
    res.write(`data: ${JSON.stringify(obj)}\n\n`);
  };

  try {
    await runChatTurnStream({
      systemBase: CHAT_SYSTEM,
      messages: trimmed,
      plan,
      send,
    });
    clearInterval(keepalive);
    res.end();
  } catch (e) {
    clearInterval(keepalive);
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
  const { age, goal, activity, dietNote, weightKg, heightCm, sessionsPerWeek, equipment, focusArea } = req.body || {};
  const a = Number(age);
  if (!a || a < 14 || a > 100) {
    res.status(400).json({ error: 'Tuổi không hợp lệ (14–100)' });
    return;
  }
  const g = ['lose', 'maintain', 'gain'].includes(goal) ? goal : 'maintain';
  const act = ['low', 'medium', 'high'].includes(activity) ? activity : 'medium';
  const note = typeof dietNote === 'string' ? dietNote.trim().slice(0, 2000) : '';
  const weight = Number(weightKg) || null;
  const height = Number(heightCm) || null;
  const sessions = Math.min(Math.max(Number(sessionsPerWeek) || 3, 1), 7);
  const equip = ['gym', 'home', 'both'].includes(equipment) ? equipment : 'both';
  const focus = typeof focusArea === 'string' ? focusArea.trim().slice(0, 200) : '';

  const goalVi =
    g === 'lose' ? 'giảm cân bền vững' : g === 'gain' ? 'tăng cân / tăng khối lượng nạc' : 'duy trì cân nặng';
  const actVi =
    act === 'low'
      ? 'ít vận động (văn phòng)'
      : act === 'medium'
        ? 'trung bình'
        : 'cao (tập thường xuyên)';
  const equipVi = equip === 'gym' ? 'phòng gym' : equip === 'home' ? 'tập tại nhà (không tạ máy)' : 'gym + tại nhà';

  // Tính BMI nếu có đủ data
  let bmiInfo = '';
  if (weight && height && height > 0) {
    const bmi = (weight / ((height / 100) ** 2)).toFixed(1);
    bmiInfo = `\n- Cân nặng: ${weight} kg | Chiều cao: ${height} cm | BMI: ${bmi}`;
  } else if (weight) {
    bmiInfo = `\n- Cân nặng: ${weight} kg`;
  }

  // Compress plan prompt
  const params = [
    `${a}y`,
    goalVi,
    actVi,
    `${sessions}d/w`,
    equipVi,
    focus,
    note
  ].filter(Boolean).join(' | ');

  const userPrompt = `Plan 7d workout (Vietnamese, Markdown).

Input: ${params}${bmiInfo ? ` | BMI: ${bmiInfo.trim()}` : ''}

Output requirements:
1) Summary (2-3 sentences, realistic goals)
2) Schedule: ${sessions} sessions/week. QUAN TRỌNG: mỗi buổi BẮT BUỘC mở đầu bằng heading dạng "#### Ngày N: <nhóm cơ>" (N = 1..${sessions}, ví dụ "#### Ngày 1: Push (Ngực-Vai-Tay sau)"). Mỗi buổi gồm:
   - Exercise names (specific)
   - Sets × reps × rest time
   - Warm-up (5-10 min) + cool-down (5-10 min)
   - Muscle group split (push/pull/legs or upper/lower)
   - Equipment: ${equipVi}
${focus ? `   - Focus area: ${focus}
` : ''}3) Progressive overload guidelines (weekly progression)
4) Progress tracking tips (photos, measurements)
5) Brief disclaimer

KHÔNG gộp tất cả bài vào 1 mục chung; PHẢI tách theo từng "#### Ngày N". No medications, no specific supplements.`;

  const PLAN_SYSTEM = `Bạn là huấn luyện viên cá nhân (PT) chuyên nghiệp — viết tiếng Việt tự nhiên, cụ thể, có thể áp dụng ngay.
Nguyên tắc: an toàn > hiệu quả nhanh; tránh cam kết số kg/tuần; nhấn thói quen bền vững và progressive overload.
Lịch tập CHI TIẾT: từng buổi ghi rõ bài tập, hiệp, lần lặp, thời gian nghỉ giữa hiệp, tempo nếu cần.
Chọn bài tập phù hợp thiết bị có sẵn. Phân chia nhóm cơ khoa học (push/pull/legs, upper/lower, hoặc full body).
Khởi động bắt buộc: dynamic stretching + mobility. Cool down: static stretching + foam rolling.
Progressive overload rõ ràng: tuần 1-2 làm quen, tuần 3-4 tăng volume/intensity.
Không chẩn đoán hay kê đơn; chỉ giáo dục thể lực. Tôn trọng ghi chú y tế/giới hạn.
Markdown gọn: tiêu đề ##/###, bảng hoặc bullet cho lịch tập, câu nối mạch lạc.`;

  try {
    const plan = await aiChat(
      [
        { role: 'system', content: PLAN_SYSTEM },
        { role: 'user', content: userPrompt },
      ],
      { temperature: 0.6, max_tokens: 2000 },
    );
    res.json({ plan: polishAiText(plan) });
  } catch (e) {
    const status = e?.status >= 400 && e?.status < 600 ? e.status : 502;
    res.status(status).json({ error: sanitizeClientError(e, 'Lỗi AI') });
  }
});

/** Plan AI streaming — trả dần text thay vì đợi hết */
userRouter.post('/me/plan-ai/stream', requireUser, aiPlanLimiter, async (req, res) => {
  if (!isAiConfigured()) {
    res.status(503).json({ error: 'AI chưa được cấu hình.' });
    return;
  }
  const { age, goal, activity, dietNote, weightKg, heightCm, sessionsPerWeek, equipment, focusArea } = req.body || {};
  const a = Number(age);
  if (!a || a < 14 || a > 100) {
    res.status(400).json({ error: 'Tuổi không hợp lệ (14–100)' });
    return;
  }
  const g = ['lose', 'maintain', 'gain'].includes(goal) ? goal : 'maintain';
  const act = ['low', 'medium', 'high'].includes(activity) ? activity : 'medium';
  const note = typeof dietNote === 'string' ? dietNote.trim().slice(0, 2000) : '';
  const weight = Number(weightKg) || null;
  const height = Number(heightCm) || null;
  const sessions = Math.min(Math.max(Number(sessionsPerWeek) || 3, 1), 7);
  const equip = ['gym', 'home', 'both'].includes(equipment) ? equipment : 'both';
  const focus = typeof focusArea === 'string' ? focusArea.trim().slice(0, 200) : '';

  const goalVi = g === 'lose' ? 'giảm cân bền vững' : g === 'gain' ? 'tăng cân / tăng khối lượng nạc' : 'duy trì cân nặng';
  const actVi = act === 'low' ? 'ít vận động (văn phòng)' : act === 'medium' ? 'trung bình' : 'cao (tập thường xuyên)';
  const equipVi = equip === 'gym' ? 'phòng gym' : equip === 'home' ? 'tập tại nhà (không tạ máy)' : 'gym + tại nhà';

  let bmiInfo = '';
  if (weight && height && height > 0) {
    const bmi = (weight / ((height / 100) ** 2)).toFixed(1);
    bmiInfo = `\n- Cân nặng: ${weight} kg | Chiều cao: ${height} cm | BMI: ${bmi}`;
  } else if (weight) {
    bmiInfo = `\n- Cân nặng: ${weight} kg`;
  }

  // Compress plan prompt (streaming endpoint)
  const params = [
    `${a}y`,
    goalVi,
    actVi,
    `${sessions}d/w`,
    equipVi,
    focus,
    note
  ].filter(Boolean).join(' | ');

  const userPrompt = `Plan 7d workout (Vietnamese, Markdown).

Input: ${params}${bmiInfo ? ` | BMI: ${bmiInfo.trim()}` : ''}

Output: lịch chi tiết ${sessions} buổi/tuần. Mỗi buổi BẮT BUỘC mở đầu bằng heading "#### Ngày N: <nhóm cơ>" (N=1..${sessions}). Mỗi buổi: bài tập (sets×reps×rest), warm-up/cool-down, progressive overload. KHÔNG gộp chung; tách theo từng "#### Ngày N". Markdown.`;

  const PLAN_SYSTEM = `Bạn là huấn luyện viên cá nhân (PT) chuyên nghiệp — viết tiếng Việt tự nhiên, cụ thể, có thể áp dụng ngay.
Nguyên tắc: an toàn > hiệu quả nhanh; tránh cam kết số kg/tuần; nhấn thói quen bền vững và progressive overload.
Lịch tập CHI TIẾT: từng buổi ghi rõ bài tập, hiệp, lần lặp, thời gian nghỉ giữa hiệp, tempo nếu cần.
Chọn bài tập phù hợp thiết bị có sẵn. Phân chia nhóm cơ khoa học (push/pull/legs, upper/lower, hoặc full body).
Khởi động bắt buộc: dynamic stretching + mobility. Cool down: static stretching + foam rolling.
Progressive overload rõ ràng: tuần 1-2 làm quen, tuần 3-4 tăng volume/intensity.
Không chẩn đoán hay kê đơn; chỉ giáo dục thể lực. Tôn trọng ghi chú y tế/giới hạn.
Mỗi buổi tập PHẢI có heading riêng "#### Ngày N: <nhóm cơ>" để tách ngày rõ ràng.
Markdown gọn: tiêu đề ##/###/####, bảng hoặc bullet cho lịch tập.`;;

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  try {
    const stream = aiChatStream(
      [
        { role: 'system', content: PLAN_SYSTEM },
        { role: 'user', content: userPrompt },
      ],
      { temperature: 0.6, max_tokens: 4000 },
    );
    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (e) {
    res.write(`data: ${JSON.stringify({ error: sanitizeClientError(e, 'Lỗi AI') })}\n\n`);
    res.end();
  }
});

/** Kế hoạch tập luyện tích hợp từ AI (Chiến dịch tập luyện) */
userRouter.get('/me/training-plan', requireUser, (req, res) => {
  const plan = getTrainingPlanForCustomer(req.user.sub);
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
    const progress = items.slice(0, 70).map((ex) => ({
      id: Number(ex.id),
      completed: ex.completed,
      actualWeight: ex.actualWeight,
    }));
    const bootstrap =
      Array.isArray(workout) && workout.length > 0
        ? workout.slice(0, 70).map((ex, i) => ({
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
      res.status(400).json({ error: 'Không lưu được tiến độ - cần ít nhất một bài tập' });
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
