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
  getCustomerProfile,
  upsertCustomerProfile,
  buildCustomerProfilePacket,
  getTrainingPlanForCustomer,
  integrateTrainingPlanFromAi,
  syncTrainingPlanProgress,
} from '../db.js';
import { parseExercisesByDayFromPlanMarkdown } from '../trainingPlanSchedule.js';
import { sendLiveChatMessage } from '../liveChatDelivery.js';
import { authMiddleware } from '../auth.js';
import { aiChat, isAiConfigured } from '../ai.js';
import { polishAiText } from '../polishAiText.js';
import { getLastUserMessage } from '../chatIntent.js';
import { planChatTurn, runChatTurn, runChatTurnStream } from '../chatTurn.js';
import { aiChatLimiter, aiPlanLimiter } from '../rateLimit.js';
import { sanitizeClientError } from '../secrets.js';
import { DbError, mapDbDomainError } from '../dbErrors.js';
import { buildPlanUserContext } from '../planUserContext.js';

export const userRouter = Router();
const requireUser = authMiddleware('user');

function asyncRoute(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

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
  const { date, moodLabel, moodScore, moodEmoji, moodKey, freeText } = req.body || {};
  if (!date || moodLabel == null || moodScore == null) {
    res.status(400).json({ error: 'Thiếu trường bắt buộc' });
    return;
  }
  const row = {
    id: crypto.randomUUID(),
    userId: req.user.sub,
    date: String(date),
    moodLabel: String(moodLabel).slice(0, 64),
    moodScore: Number(moodScore),
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
    res.status(400).json({ error: 'Không thể gửi yêu cầu chọn chuyên gia' });
    return;
  }
  res.status(201).json({ ok: true });
});

userRouter.get('/me/experts/requests', requireUser, (req, res) => {
  const requests = listExpertRequestsForCustomer(req.user.sub);
  res.json({ requests });
});

userRouter.get('/me/profile', requireUser, asyncRoute(async (req, res) => {
  const profile = await getCustomerProfile(req.user.sub);
  res.json({ profile });
}));

userRouter.put('/me/profile', requireUser, asyncRoute(async (req, res) => {
  const saved = await upsertCustomerProfile(req.user.sub, req.body || {});
  res.json({ profile: saved });
}));

userRouter.get('/me/profile-packet', requireUser, asyncRoute(async (req, res) => {
  res.json(await buildCustomerProfilePacket(req.user.sub));
}));

userRouter.get('/me/health-profile', requireUser, asyncRoute(async (req, res) => {
  const profile = await getCustomerHealthProfile(req.user.sub);
  res.json({ profile: profile || null });
}));

userRouter.put('/me/health-profile', requireUser, asyncRoute(async (req, res) => {
  await upsertCustomerHealthProfile(req.user.sub, req.body || {});
  res.json({ ok: true });
}));

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
      ? listLiveMessagesForCustomerSince(req.user.sub, since)
      : listLiveMessagesForCustomer(req.user.sub);
  res.json({ messages: list });
});

userRouter.post('/me/live-messages', requireUser, (req, res) => {
  const text = String((req.body || {}).text || '').trim();
  if (!text) {
    res.status(400).json({ error: 'Tin nhắn trống' });
    return;
  }
  const msg = sendLiveChatMessage({
    customerId: req.user.sub,
    senderUserId: req.user.sub,
    senderRole: 'customer',
    content: text,
  });
  if (!msg) {
    res.status(400).json({ error: 'Không gửi được' });
    return;
  }
  res.status(201).json({ message: msg });
});

const CHAT_SYSTEM = `Bạn là trợ lý sức khỏe Tezca — trò chuyện trực tiếp bằng tiếng Việt (Việt Nam).

Độ dài (ưu tiên cao):
- Mặc định **1–3 câu ngắn**; chỉ mở rộng khi người dùng xin chi tiết, danh sách, hoặc kế hoạch từng bước.
- Chào / cảm ơn / xác nhận đơn giản → **một câu** là đủ.
- Không lặp lại câu hỏi; không mở đầu dài ("Cảm ơn bạn đã hỏi…").

Cách viết:
- Giọng ấm, đồng cảm; nối ý tự nhiên như chat.
- Không bullet/đánh số trừ khi được yêu cầu.
- Tránh mở đầu lặp ("Chào bạn") nếu vừa chào trong hội thoại.
- Disclaimer "tham khảo, không thay khám" chỉ khi khuyên sức khỏe cụ thể — tối đa một cụm ngắn cuối, không lặp mỗi lượt.

Phạm vi: dinh dưỡng, vận động an toàn, BMI/lối sống, giấc ngủ, stress — giáo dục, không chẩn đoán/kê đơn.
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
  const { goal, activity, dietNote } = req.body || {};
  const ctx = buildPlanUserContext({
    profile: await getCustomerProfile(req.user.sub),
    healthProfile: await getCustomerHealthProfile(req.user.sub),
    bmiEntries: listBmiForUser(req.user.sub),
  });
  const a = ctx.age;
  if (a == null) {
    res.status(400).json({
      error: 'Chưa có ngày sinh trong hồ sơ. Cập nhật Hồ sơ & cài đặt trước khi sinh kế hoạch.',
      code: 'PROFILE_DOB_REQUIRED',
    });
    return;
  }
  const g = ['lose', 'maintain', 'gain'].includes(goal) ? goal : 'maintain';
  const act = ['low', 'medium', 'high'].includes(activity) ? activity : 'medium';
  const clientNote = typeof dietNote === 'string' ? dietNote.trim() : '';
  const note = [clientNote, ctx.healthSummary].filter(Boolean).join('\n\n').slice(0, 2000);

  const goalVi =
    g === 'lose' ? 'giảm cân bền vững' : g === 'gain' ? 'tăng cân / tăng khối lượng nạc' : 'duy trì cân nặng';
  const actVi =
    act === 'low'
      ? 'ít vận động (văn phòng)'
      : act === 'medium'
        ? 'trung bình'
        : 'cao (tập thường xuyên)';

  const profileBlock =
    ctx.profileLines.length > 0 ? `\n**Hồ sơ khách (từ tài khoản):**\n${ctx.profileLines.map((l) => `- ${l}`).join('\n')}` : '';

  const userPrompt = `Soạn **kế hoạch tập luyện 7 ngày** (tiếng Việt, Markdown). Khách chỉ cần lịch tập đầy đủ + hướng dẫn ngắn — **không** viết kế hoạch dinh dưỡng chi tiết, không mục theo dõi cân/đo riêng.

**Đầu vào:**
- Tuổi: ${a} (từ ngày sinh hồ sơ)
- Mục tiêu: ${goalVi}
- Mức vận động hiện tại: ${actVi}
${profileBlock}
${note ? `\n**Ghi chú / sức khỏe (ưu tiên nếu an toàn):**\n${note}` : ''}

**ĐÚNG format — chỉ 3 mục ## sau (không thêm mục khác):**

## Hướng dẫn ngắn
- Tối đa **4 câu** hoặc **4 bullet**: định hướng tuần, nghỉ/ngày nhẹ, khi nào giảm cường độ.
- Tối đa **1 bullet** gợi ý ăn uống chung (protein/nước) — không liệt kê bữa sáng/trưa/tối.

## Lịch tập 7 ngày
Bắt buộc **đúng 7** tiêu đề con, lần lượt:
### Ngày 1 (Thứ 2)
### Ngày 2 (Thứ 3)
### Ngày 3 (Thứ 4)
### Ngày 4 (Thứ 5)
### Ngày 5 (Thứ 6)
### Ngày 6 (Thứ 7)
### Ngày 7 (Chủ nhật)

Mỗi ngày **4–6 bullet**, tên bài **cụ thể** (VD: "Khởi động hông vai 8 phút", "Goblet squat 3×10"). Mỗi ngày có: khởi động → buổi chính → giãn/phục hồi ngắn.
**Cấm** lặp cùng tên bài (hoặc cùng động tác chính) giữa các ngày trong tuần.

## Lưu ý an toàn
1–2 câu: gợi ý lối sống, không thay khám; bệnh nền/thai kỳ/đang điều trị phải theo bác sĩ. Không kê thuốc hay liều bổ sung.`;

  const PLAN_SYSTEM = `Bạn là huấn luyện viên thể hình — viết tiếng Việt, thực tế, an toàn.
Ưu tiên: lịch 7 ngày đủ, mỗi ngày bài khác nhau; hướng dẫn ngắn gọn.
Không chẩn đoán, không kê đơn. Không viết mục "Dinh dưỡng" hay "Theo dõi" riêng.
Tuân thủ đúng 3 mục ## trong yêu cầu người dùng; dùng ### Ngày 1 … ### Ngày 7 như mẫu.`;

  const planMessages = [
    { role: 'system', content: PLAN_SYSTEM },
    { role: 'user', content: userPrompt },
  ];

  try {
    let plan = await aiChat(planMessages, { temperature: 0.45, max_tokens: 3200 });
    let parsed = parseExercisesByDayFromPlanMarkdown(plan);
    const dayCount = Object.values(parsed.byDay).filter((list) => list.length > 0).length;
    if (parsed.mode !== 'daily' || dayCount < 5) {
      plan = await aiChat(
        [
          ...planMessages,
          { role: 'assistant', content: plan },
          {
            role: 'user',
            content:
              'Phản hồi trước thiếu đủ 7 ngày tập riêng biệt. Viết lại TOÀN BỘ theo đúng format 3 mục ##; phần ## Lịch tập 7 ngày phải có đủ ### Ngày 1 … ### Ngày 7, mỗi ngày 4–6 bullet, không lặp tên bài giữa các ngày.',
          },
        ],
        { temperature: 0.35, max_tokens: 3200 },
      );
    }
    res.json({ plan: polishAiText(plan) });
  } catch (e) {
    const status = e?.status >= 400 && e?.status < 600 ? e.status : 502;
    res.status(status).json({ error: sanitizeClientError(e, 'Lỗi AI') });
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
    const parsed = parseExercisesByDayFromPlanMarkdown(planMd);
    let exercises = parsed.flat;
    let exercisesByDay = parsed.mode === 'daily' ? parsed.byDay : undefined;
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
      exercisesByDay = undefined;
    }
    const saved = integrateTrainingPlanFromAi(req.user.sub, planMd, exercises, exercisesByDay);
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
