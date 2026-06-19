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
import { aiJSON, isAiConfigured } from '../ai.js';
import { generateStructuredPlan, normalizePlanInput } from '../trainingPlanAi.js';
import { polishAiText } from '../polishAiText.js';
import { getLastUserMessage } from '../chatIntent.js';
import { planChatTurn, runChatTurn, runChatTurnStream } from '../chatTurn.js';
import { buildUserGrounding } from '../chatGrounding.js';
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

/**
 * B) Grounding — đọc dữ liệu thật của người dùng (BMI gần nhất, hồ sơ y tế,
 * chuyên gia) và dựng systemAddon + trả expert cho escalation (C).
 * Bọc try/catch để lỗi DB không làm hỏng luồng chat.
 */
function buildChatContext(userId) {
  try {
    const bmiList = listBmiForUser(userId);
    const latestBmi = Array.isArray(bmiList) && bmiList.length ? bmiList[0] : null;
    const health = getCustomerHealthProfile(userId) || null;
    const experts = getExpertsForCustomer(userId) || [];
    const grounding = buildUserGrounding({ latestBmi, health, experts });
    return { grounding, expert: experts[0] || null };
  } catch {
    return { grounding: '', expert: null };
  }
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
    const { grounding, expert } = buildChatContext(req.user.sub);
    const result = await runChatTurn({ systemBase: CHAT_SYSTEM, messages: trimmed, plan, grounding, expert });
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
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  // Keepalive mỗi 15s để proxy (Cloudflare/Vercel) không timeout
  const keepalive = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 15_000);

  // 🟡-2: client ngắt kết nối (đóng tab) → abort để dừng đọc upstream Gemini,
  // tránh tốn token + giữ kết nối. Cờ closed chặn ghi tiếp vào socket đã đóng.
  const ac = new AbortController();
  let closed = false;
  res.on('close', () => {
    closed = true;
    ac.abort();
    clearInterval(keepalive);
  });

  const send = (obj) => {
    if (closed) return;
    res.write(`data: ${JSON.stringify(obj)}\n\n`);
  };

  try {
    const { grounding, expert } = buildChatContext(req.user.sub);
    await runChatTurnStream({
      systemBase: CHAT_SYSTEM,
      messages: trimmed,
      plan,
      send,
      grounding,
      expert,
      signal: ac.signal,
    });
    clearInterval(keepalive);
    if (!closed) res.end();
  } catch (e) {
    clearInterval(keepalive);
    // Client tự ngắt → không phải lỗi, im lặng.
    if (closed || e?.code === 'GEMINI_ABORTED') {
      if (!closed) res.end();
      return;
    }
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
  const a = Number(req.body?.age);
  if (!a || a < 14 || a > 100) {
    res.status(400).json({ error: 'Tuổi không hợp lệ (14–100)' });
    return;
  }

  const input = normalizePlanInput(req.body || {});
  // A3 — nạp hồ sơ y tế của chính người dùng để PT tránh bài tập gây hại.
  const health = getCustomerHealthProfile(req.user.sub) || undefined;

  // Đồng bộ với ai-chat/stream: hủy upstream khi client ngắt kết nối.
  const ac = new AbortController();
  req.on('close', () => ac.abort());

  try {
    const { markdown, json, exercises } = await generateStructuredPlan({
      jsonFn: aiJSON,
      input,
      health,
      signal: ac.signal,
    });
    if (!markdown?.trim()) throw new Error('AI không trả nội dung');
    res.json({ plan: polishAiText(markdown), structured: json, exercises });
  } catch (e) {
    if (e?.code === 'GEMINI_ABORTED') return; // client tự ngắt
    const status = e?.status >= 400 && e?.status < 600 ? e.status : 502;
    res.status(status).json({ error: sanitizeClientError(e, 'Lỗi AI') });
  }
});

/** Plan AI streaming — sinh plan structured (JSON schema, giữ đúng "Ngày N")
 *  rồi stream Markdown ổn định theo từng đoạn để giữ nguyên UX. */
userRouter.post('/me/plan-ai/stream', requireUser, aiPlanLimiter, async (req, res) => {
  if (!isAiConfigured()) {
    res.status(503).json({ error: 'AI chưa được cấu hình.' });
    return;
  }
  const a = Number(req.body?.age);
  if (!a || a < 14 || a > 100) {
    res.status(400).json({ error: 'Tuổi không hợp lệ (14–100)' });
    return;
  }

  const input = normalizePlanInput(req.body || {});
  const health = getCustomerHealthProfile(req.user.sub) || undefined;

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  // Keepalive cho proxy trong khi chờ model sinh JSON (không stream token).
  const keepalive = setInterval(() => res.write(': keepalive\n\n'), 15_000);

  // Đồng bộ với ai-chat/stream: client ngắt → abort upstream + ngừng ghi socket.
  const ac = new AbortController();
  let closed = false;
  res.on('close', () => {
    closed = true;
    ac.abort();
    clearInterval(keepalive);
  });

  try {
    const { markdown } = await generateStructuredPlan({ jsonFn: aiJSON, input, health, signal: ac.signal });
    clearInterval(keepalive);
    const text = polishAiText(markdown || '');
    if (!text.trim()) throw new Error('AI không trả nội dung');

    // Stream theo từng khối (paragraph) để frontend hiển thị dần.
    const blocks = text.split(/\n(?=#{2,4} |> |\*Khởi động|\*Thả lỏng)/);
    for (const block of blocks) {
      const chunk = block.endsWith('\n') ? block : `${block}\n`;
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (e) {
    clearInterval(keepalive);
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
