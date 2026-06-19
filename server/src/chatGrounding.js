/**
 * chatGrounding.js — Tầng GROUNDING: bơm dữ liệu THẬT của người dùng vào
 * system prompt để AI bám số liệu thực thay vì "đoán" (giảm hallucination).
 *
 * Thuần (pure): nhận data đã đọc từ DB, trả về một đoạn systemAddon. Route lo
 * phần truy vấn DB; tách vậy để unit-test không cần DB.
 *
 * Nguyên tắc riêng tư: CHỈ đưa dữ liệu của CHÍNH người dùng đang chat. Cắt gọn,
 * không nhồi cả lịch sử dài để tiết kiệm token.
 */

/** Diễn giải BMI sang nhãn tiếng Việt ngắn. */
function bmiLabel(bmi) {
  const n = Number(bmi);
  if (!Number.isFinite(n) || n <= 0) return '';
  if (n < 18.5) return 'thiếu cân';
  if (n < 23) return 'bình thường';
  if (n < 25) return 'thừa cân nhẹ';
  if (n < 30) return 'thừa cân';
  return 'béo phì';
}

/**
 * Dựng đoạn grounding từ dữ liệu người dùng.
 * @param {{
 *   latestBmi?: { bmi?: number, weightKg?: number, heightCm?: number, date?: string } | null,
 *   health?: { currentConditions?: string, allergies?: string, medications?: string, contraindications?: string } | null,
 *   experts?: Array<{ name?: string }> | null,
 * }} data
 * @returns {string} systemAddon (rỗng nếu không có dữ liệu)
 */
export function buildUserGrounding({ latestBmi, health, experts } = {}) {
  const lines = [];

  if (latestBmi && Number(latestBmi.bmi) > 0) {
    const label = bmiLabel(latestBmi.bmi);
    const wh =
      latestBmi.weightKg && latestBmi.heightCm
        ? `${latestBmi.weightKg}kg / ${latestBmi.heightCm}cm, `
        : '';
    lines.push(`- BMI gần nhất: ${wh}BMI ${Number(latestBmi.bmi).toFixed(1)}${label ? ` (${label})` : ''}.`);
  }

  const h = health || {};
  const healthBits = [];
  if (h.currentConditions) healthBits.push(`bệnh nền: ${String(h.currentConditions).slice(0, 300)}`);
  if (h.allergies) healthBits.push(`dị ứng: ${String(h.allergies).slice(0, 200)}`);
  if (h.medications) healthBits.push(`thuốc đang dùng: ${String(h.medications).slice(0, 200)}`);
  if (h.contraindications) healthBits.push(`hạn chế vận động: ${String(h.contraindications).slice(0, 200)}`);
  if (healthBits.length) {
    lines.push(`- Hồ sơ y tế người dùng — ${healthBits.join('; ')}.`);
  }

  if (Array.isArray(experts) && experts.length && experts[0]?.name) {
    lines.push(`- Người dùng đang được chuyên gia ${experts[0].name} đồng hành (có thể gợi ý hỏi chuyên gia khi vượt phạm vi).`);
  }

  if (!lines.length) return '';

  return [
    'DỮ LIỆU THỰC CỦA NGƯỜI DÙNG (dùng để cá nhân hóa, BÁM theo số liệu này, KHÔNG bịa thêm chỉ số):',
    ...lines,
    'Nếu người dùng hỏi về chỉ số/hồ sơ mà dữ liệu trên không có, hãy nói chưa có dữ liệu thay vì đoán.',
  ].join('\n');
}
