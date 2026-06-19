/**
 * trainingPlanAi.js — Structured output cho Kế hoạch tập luyện (A2).
 *
 * Thay vì để AI viết Markdown rồi parse bằng regex (dễ vỡ, mất "Ngày N"),
 * ta ép Gemini trả JSON đúng `PLAN_SCHEMA`. Từ JSON đó:
 *   - dựng danh sách `exercises` (đúng định dạng structureExercises kỳ vọng),
 *   - render lại Markdown ổn định để lưu `source_plan_md` + hiển thị.
 *
 * Không phụ thuộc provider cụ thể — nhận hàm `jsonFn` (aiJSON) từ caller.
 */

/** JSON schema (Gemini responseSchema, tập con OpenAPI). */
export const PLAN_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    days: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          day: { type: 'integer' }, // 1..7
          group: { type: 'string' }, // nhóm cơ / tên buổi
          warmup: { type: 'string' },
          cooldown: { type: 'string' },
          exercises: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                sets: { type: 'integer' },
                reps: { type: 'string' },
                rest: { type: 'string' },
                note: { type: 'string' },
              },
              required: ['title', 'sets', 'reps'],
            },
          },
        },
        required: ['day', 'group', 'exercises'],
      },
    },
    progression: { type: 'string' },
    tracking: { type: 'string' },
    disclaimer: { type: 'string' },
  },
  required: ['summary', 'days'],
};

const GOAL_VI = {
  lose: 'giảm cân bền vững',
  gain: 'tăng cân / tăng khối lượng nạc',
  maintain: 'duy trì cân nặng',
};
const ACT_VI = {
  low: 'ít vận động (văn phòng)',
  medium: 'trung bình',
  high: 'cao (tập thường xuyên)',
};
const EQUIP_VI = {
  gym: 'phòng gym',
  home: 'tập tại nhà (không tạ máy)',
  both: 'gym + tại nhà',
};

/** System prompt cho structured plan. Nhấn an toàn (web sức khỏe). */
export const PLAN_SYSTEM = `Bạn là huấn luyện viên cá nhân (PT) chuyên nghiệp, viết tiếng Việt tự nhiên, cụ thể, áp dụng được ngay.
Nguyên tắc bắt buộc:
- An toàn > hiệu quả nhanh. KHÔNG cam kết số kg/tuần. KHÔNG chẩn đoán bệnh, KHÔNG kê thuốc, KHÔNG kê thực phẩm chức năng cụ thể.
- TÔN TRỌNG TUYỆT ĐỐI ghi chú y tế: nếu có bệnh nền / chấn thương / chống chỉ định, TRÁNH các bài tập gây hại và nêu lý do ngắn trong "note".
- Phân chia nhóm cơ khoa học (push/pull/legs, upper/lower, hoặc full body). Mỗi buổi có khởi động + thả lỏng.
- Progressive overload rõ ràng theo tuần.
Trả về JSON đúng schema được yêu cầu. Mỗi buổi là một phần tử trong "days" với "day" là số thứ tự 1..N. KHÔNG gộp nhiều ngày vào một phần tử.`;

/**
 * Dựng user prompt từ input đã validate.
 * @param {object} p
 */
export function buildPlanUserPrompt(p) {
  const {
    age,
    goal,
    activity,
    sessions,
    equipment,
    focus,
    dietNote,
    weightKg,
    heightCm,
    health,
  } = p;

  const lines = [`Tạo kế hoạch tập ${sessions} buổi/tuần (tiếng Việt).`, '', 'Thông tin người tập:'];
  lines.push(`- Tuổi: ${age}`);
  lines.push(`- Mục tiêu: ${GOAL_VI[goal] || GOAL_VI.maintain}`);
  lines.push(`- Mức vận động: ${ACT_VI[activity] || ACT_VI.medium}`);
  lines.push(`- Thiết bị: ${EQUIP_VI[equipment] || EQUIP_VI.both}`);
  lines.push(`- Số buổi/tuần: ${sessions}`);

  if (weightKg && heightCm && heightCm > 0) {
    const bmi = (weightKg / ((heightCm / 100) ** 2)).toFixed(1);
    lines.push(`- Cân nặng/chiều cao: ${weightKg}kg / ${heightCm}cm (BMI ${bmi})`);
  } else if (weightKg) {
    lines.push(`- Cân nặng: ${weightKg}kg`);
  }
  if (focus) lines.push(`- Vùng tập trung: ${focus}`);
  if (dietNote) lines.push(`- Ghi chú thêm: ${dietNote}`);

  // A3 — Health context. Đây là phần an toàn quan trọng nhất với web sức khỏe.
  const h = health || {};
  const healthLines = [];
  if (h.currentConditions) healthLines.push(`- Bệnh nền hiện tại: ${h.currentConditions}`);
  if (h.medicalHistory) healthLines.push(`- Tiền sử y tế: ${h.medicalHistory}`);
  if (h.allergies) healthLines.push(`- Dị ứng: ${h.allergies}`);
  if (h.medications) healthLines.push(`- Thuốc đang dùng: ${h.medications}`);
  if (h.contraindications) healthLines.push(`- Chống chỉ định / hạn chế vận động: ${h.contraindications}`);

  if (healthLines.length) {
    lines.push('', '⚠️ HỒ SƠ Y TẾ (BẮT BUỘC tuân thủ — tránh bài tập gây hại, giải thích trong note):');
    lines.push(...healthLines);
  }

  lines.push(
    '',
    'Yêu cầu nội dung: mỗi buổi có tên nhóm cơ, khởi động, thả lỏng, danh sách bài tập (sets × reps × thời gian nghỉ).',
    'Kèm summary ngắn, hướng dẫn progressive overload, mẹo theo dõi tiến trình, và disclaimer ngắn.',
  );
  return lines.join('\n');
}

/** Chuẩn hóa 1 input thô từ req.body → object đã validate (tái dùng cho cả 2 route). */
export function normalizePlanInput(body = {}) {
  const a = Number(body.age);
  const rawSessions = Number(body.sessionsPerWeek);
  const sessions = Number.isFinite(rawSessions)
    ? Math.min(Math.max(rawSessions, 1), 7)
    : 3;
  return {
    age: a,
    goal: ['lose', 'maintain', 'gain'].includes(body.goal) ? body.goal : 'maintain',
    activity: ['low', 'medium', 'high'].includes(body.activity) ? body.activity : 'medium',
    sessions,
    equipment: ['gym', 'home', 'both'].includes(body.equipment) ? body.equipment : 'both',
    focus: typeof body.focusArea === 'string' ? body.focusArea.trim().slice(0, 200) : '',
    dietNote: typeof body.dietNote === 'string' ? body.dietNote.trim().slice(0, 2000) : '',
    weightKg: Number(body.weightKg) || null,
    heightCm: Number(body.heightCm) || null,
  };
}

/**
 * JSON plan (theo PLAN_SCHEMA) → danh sách exercises cho structureExercises.
 * @param {object} plan
 * @returns {Array<{title,sets,reps,day,group,isPTLocked,completed,actualWeight}>}
 */
export function planJsonToExercises(plan) {
  const out = [];
  const days = Array.isArray(plan?.days) ? plan.days : [];
  for (const d of days) {
    const dayNum = Number(d?.day);
    const day = Number.isInteger(dayNum) && dayNum >= 1 && dayNum <= 7 ? dayNum : null;
    const group = typeof d?.group === 'string' && d.group.trim() ? d.group.trim().slice(0, 60) : null;
    const exs = Array.isArray(d?.exercises) ? d.exercises : [];
    for (const ex of exs) {
      const title = String(ex?.title || '').trim();
      if (title.length < 2) continue;
      const reps =
        ex?.rest && String(ex.rest).trim()
          ? `${ex.reps} • nghỉ ${String(ex.rest).trim()}`
          : String(ex?.reps ?? 'Theo kế hoạch');
      out.push({
        title: title.slice(0, 140),
        sets: Math.max(1, Math.min(20, Number(ex?.sets) || 1)),
        reps: reps.slice(0, 40),
        day,
        group,
        isPTLocked: true,
        completed: false,
        actualWeight: '',
      });
    }
  }
  return out.slice(0, 70);
}

/** JSON plan → Markdown ổn định (lưu source_plan_md + hiển thị). */
export function planJsonToMarkdown(plan) {
  const parts = [];
  if (plan?.summary) parts.push(`## Tổng quan\n\n${String(plan.summary).trim()}`);

  const days = Array.isArray(plan?.days) ? plan.days : [];
  for (const d of days) {
    const dayNum = Number(d?.day) || '?';
    const group = d?.group ? String(d.group).trim() : 'Buổi tập';
    parts.push(`#### Ngày ${dayNum}: ${group}`);
    if (d?.warmup) parts.push(`*Khởi động:* ${String(d.warmup).trim()}`);

    const exs = Array.isArray(d?.exercises) ? d.exercises : [];
    const bullets = [];
    for (const ex of exs) {
      const title = String(ex?.title || '').trim();
      if (!title) continue;
      const segs = [`**${title}**`];
      const sr = [];
      if (ex?.sets) sr.push(`${ex.sets} hiệp`);
      if (ex?.reps) sr.push(`${ex.reps}`);
      if (sr.length) segs.push(sr.join(' × '));
      if (ex?.rest) segs.push(`nghỉ ${String(ex.rest).trim()}`);
      let line = `- ${segs.join(' — ')}`;
      if (ex?.note) line += `\n  - _${String(ex.note).trim()}_`;
      bullets.push(line);
    }
    if (bullets.length) parts.push(bullets.join('\n'));
    if (d?.cooldown) parts.push(`*Thả lỏng:* ${String(d.cooldown).trim()}`);
  }

  if (plan?.progression) parts.push(`### Tăng tiến (Progressive overload)\n\n${String(plan.progression).trim()}`);
  if (plan?.tracking) parts.push(`### Theo dõi tiến trình\n\n${String(plan.tracking).trim()}`);
  if (plan?.disclaimer) parts.push(`> ${String(plan.disclaimer).trim()}`);

  return parts.join('\n\n').trim();
}

/**
 * Sinh plan có cấu trúc. Trả { json, markdown, exercises }.
 * @param {{ jsonFn: Function, input: object, health?: object, signal?: AbortSignal }} args
 */
export async function generateStructuredPlan({ jsonFn, input, health, signal }) {
  const user = buildPlanUserPrompt({ ...input, health });
  const json = await jsonFn({
    system: PLAN_SYSTEM,
    user,
    schema: PLAN_SCHEMA,
    temperature: 0.5,
    max_tokens: 4000,
    signal,
  });
  return {
    json,
    markdown: planJsonToMarkdown(json),
    exercises: planJsonToExercises(json),
  };
}
