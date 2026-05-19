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
} from '../db.js';
import { sendLiveChatMessage } from '../liveChatDelivery.js';
import { authMiddleware } from '../auth.js';
import { aiChat, isAiConfigured } from '../ai.js';
import { aiChatLimiter, aiPlanLimiter } from '../rateLimit.js';
import { sanitizeClientError } from '../secrets.js';

export const userRouter = Router();
const requireUser = authMiddleware('user');

userRouter.get('/me', requireUser, (req, res) => {
  res.json({
    user: { id: req.user.sub, email: req.user.email, name: req.user.name, role: req.user.role },
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

const CHAT_SYSTEM = `Bạn là trợ lý sức khỏe Tezca.
Ngôn ngữ: tiếng Việt. Giọng điệu: đồng cảm, rõ ràng, không phán xét. Độ dài: 3–8 câu trừ khi người dùng yêu cầu chi tiết.
Phạm vi: giáo dục sức khỏe — dinh dưỡng, vận động an toàn, BMI/lối sống, giấc ngủ, stress/nhật ký cảm xúc.
Không đưa ra kết luận y khoa, bệnh danh hay kê đơn; không thay đổi phác đồ thuốc. Khuyến khích tới cơ sở y tế khi có triệu chứng cấp, bệnh nền, mang thai/cho con bú, hay không chắc chắn.
Khẩn cấp / ý định tự hại / đau ngực khó thở / co giật / yếu nửa người đột ngột → yêu cầu gọi 115 hoặc đến cấp cứu ngay.
Luôn nhắc thông tin chỉ mang tính tham khảo khi đưa gợi ý cụ thể.`;

userRouter.post('/me/ai-chat', requireUser, aiChatLimiter, async (req, res) => {
  if (!isAiConfigured()) {
    res.status(503).json({
      error: 'AI chưa được cấu hình (GOOGLE_GENERATIVE_AI_API_KEY).',
    });
    return;
  }
  const { messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'Cần mảng messages' });
    return;
  }
  const trimmed = messages
    .slice(-24)
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({
      role: m.role,
      content: String(m.content).slice(0, 4000),
    }));
  if (trimmed.length === 0) {
    res.status(400).json({ error: 'Không có tin nhắn hợp lệ' });
    return;
  }
  try {
    const payload = [{ role: 'system', content: CHAT_SYSTEM }, ...trimmed];
    const reply = await aiChat(payload, { max_tokens: 900, temperature: 0.55 });
    res.json({ content: reply });
  } catch (e) {
    const status = e?.status >= 400 && e?.status < 600 ? e.status : 502;
    res.status(status).json({ error: sanitizeClientError(e, 'Lỗi AI') });
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

  const PLAN_SYSTEM = `Bạn là chuyên gia dinh dưỡng & hoạt động thể chất (giọng Việt Nam, thực tế).
Nguyên tắc: an toàn > hiệu quả nhanh; tránh cam kết số kg/tuần; nhấn mạnh thói quen bền vững.
Không đưa ra bệnh danh hay kết luận y khoa; chỉ gợi ý dinh dưỡng và vận động mang tính giáo dục sức khỏe.
Phân biệt người trưởng thành khỏe mạnh vs người có ràng buộc y tế — khi có ghi chú người dùng, tôn trọng nhưng không vượt quá vai trò giáo dục.
Viết Markdown rõ ràng; không lặp ý; không chèn disclaimer sau mỗi câu — một khối cuối hoặc xen nhẹ hợp lý.`;

  try {
    const plan = await aiChat(
      [
        { role: 'system', content: PLAN_SYSTEM },
        { role: 'user', content: userPrompt },
      ],
      { temperature: 0.65, max_tokens: 2500 },
    );
    res.json({ plan });
  } catch (e) {
    const status = e?.status >= 400 && e?.status < 600 ? e.status : 502;
    res.status(status).json({ error: sanitizeClientError(e, 'Lỗi AI') });
  }
});
