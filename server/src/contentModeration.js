/**
 * contentModeration.js — Bộ lọc nội dung vi phạm nguyên tắc cộng đồng Tezca.
 *
 * Tầng 1: rule-based (regex theo nhóm), chạy đồng bộ, không phụ thuộc mạng.
 * Dùng chung cho bài cộng đồng, bình luận, thread reply và chat chuyên gia↔khách.
 *
 * Nguyên tắc nguồn: src/app/pages/legal/CommunityGuidelinesPage.tsx
 *   - Quấy rối / thù hận / phân biệt đối xử
 *   - Khiêu dâm, bạo lực, kích động tự hại, hại trẻ vị thành niên
 *   - Spam / quảng cáo trái phép / link độc hại
 *   - Lộ thông tin nhận dạng riêng tư (PII) của người khác
 *   - Thông tin y khoa sai lệch / kê đơn liều thuốc vô căn cứ
 *
 * TRIẾT LÝ NGƯỠNG: ưu tiên 'flag' hơn 'block' ở vùng mơ hồ để tránh chặn nhầm
 * nội dung sức khỏe hợp lệ (vd bàn luận về thuốc, bệnh lý hợp pháp). Chỉ 'block'
 * khi tín hiệu vi phạm mạnh & rõ. Có thể nâng cấp tầng 2 bằng Gemini sau.
 *
 * @typedef {'allow'|'flag'|'block'} ModerationAction
 * @typedef {{ ok: boolean, action: ModerationAction, score: number,
 *   categories: string[], reasons: string[] }} ModerationResult
 */

/** Bỏ dấu tiếng Việt để chống né lọc (vd "đụ" viết "du"). */
function stripVietnameseDiacritics(s) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/**
 * Chuẩn hóa văn bản để dò: lowercase, bỏ dấu, gộp ký tự lặp (vd "địtttt" → "dit"),
 * thay một số ký tự leet phổ biến. Giữ lại khoảng trắng + chữ số để bắt PII.
 */
function normalizeForMatch(text) {
  let s = String(text || '').toLowerCase();
  s = stripVietnameseDiacritics(s);
  // leet cơ bản
  s = s
    .replace(/[@4]/g, 'a')
    .replace(/[3]/g, 'e')
    .replace(/[1!|]/g, 'i')
    .replace(/[0]/g, 'o')
    .replace(/[$5]/g, 's')
    .replace(/[7]/g, 't');
  // gộp ký tự lặp >2 lần → 1 (giữ tối đa 1 để bắt "diiit" và "dit")
  s = s.replace(/(.)\1{1,}/g, '$1');
  // gộp khoảng trắng
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

/**
 * Các nhóm luật. Mỗi nhóm: trọng số + danh sách regex (chạy trên text đã chuẩn hóa).
 * Trọng số cao = vi phạm nghiêm trọng (dễ block).
 */
const RULES = [
  {
    category: 'hate_harassment',
    weight: 3,
    label: 'Quấy rối / thù hận',
    patterns: [
      // Chửi rủa / xúc phạm tiếng Việt (đã bỏ dấu + gộp lặp)
      /\b(dit me|do ngu|do cho|cho de|do dien|thang ngu|con dien|do mat day|im mom|cau dau)\b/,
      /\b(dm|vcl|vl|cmm|clm|dcm|dkm)\b/,
      // Tiếng Anh
      /\b(fuck you|stupid|idiot|retard|moron|shut up)\b/,
      // Phân biệt đối xử
      /\b(do thieu nang|lu suc vat|bon suc vat)\b/,
    ],
  },
  {
    category: 'sexual',
    weight: 4,
    label: 'Khiêu dâm',
    patterns: [
      /\b(phim sex|clip sex|lam tinh|khieu dam|anh nude|gai goi|ban dam|mua dam)\b/,
      /\b(porn|xxx|nude pics|sex video)\b/,
    ],
  },
  {
    category: 'self_harm',
    weight: 5,
    label: 'Tự hại',
    patterns: [
      /\b(tu tu|tu sat|muon chet|cat tay tu|cach tu tu|huong dan tu tu)\b/,
      /\b(suicide|kill myself|how to die)\b/,
    ],
  },
  {
    category: 'violence',
    weight: 4,
    label: 'Bạo lực / kích động',
    patterns: [
      /\b(giet may|giet no|chem chet|danh chet|cho no chet|thanh toan no)\b/,
      /\b(che tao bom|cach lam bom|vu khi tu che)\b/,
      /\b(kill them|make a bomb|how to kill)\b/,
    ],
  },
  {
    category: 'child_safety',
    weight: 6,
    label: 'Hại trẻ vị thành niên',
    patterns: [
      /\b(au dam|am muu tre em|tre em khoa than)\b/,
      /\b(child porn|underage)\b/,
    ],
  },
  {
    category: 'spam_scam',
    weight: 2,
    label: 'Spam / quảng cáo / lừa đảo',
    patterns: [
      /\b(kiem tien tai nha|lam giau nhanh|chot don|inbox dat hang|sieu loi nhuan|von it lai cao)\b/,
      /\b(vay tien nhanh|dao han the|no hu|ca cuoc|ca do bong da|game bai doi thuong|nap rut tien)\b/,
      /\b(click vao day|truy cap ngay|dang ky ngay nhan)\b/,
    ],
  },
  {
    category: 'medical_misinfo',
    weight: 3,
    label: 'Thông tin y khoa sai lệch / kê đơn vô căn cứ',
    patterns: [
      /\b(chua khoi ung thu|chua dut diem ung thu|thuoc chua bach benh|khoi 100% sau)\b/,
      /\b(vaccine gay (vo sinh|tu ky|ung thu)|tiem vaccine la chet)\b/,
      /\b(tu uong thuoc|bo thuoc bac si|khong can di vien)\b/,
    ],
  },
];

/** Phát hiện PII của người khác bị chia sẻ (sđt VN, CMND/CCCD). */
function detectPii(rawText) {
  const reasons = [];
  const digitsOnly = String(rawText).replace(/[.\- ]/g, '');
  // Số điện thoại VN: 0 + 9 chữ số
  if (/\b0\d{9}\b/.test(digitsOnly)) reasons.push('Có thể chứa số điện thoại cá nhân');
  // CCCD 12 số / CMND 9 số
  if (/\b\d{12}\b/.test(digitsOnly) || /(cmnd|cccd|can cuoc|chung minh).{0,12}\d{9,12}/.test(normalizeForMatch(rawText))) {
    reasons.push('Có thể chứa số CMND/CCCD');
  }
  return reasons;
}

/** Đếm số URL — nhiều link là tín hiệu spam. */
function countUrls(rawText) {
  const m = String(rawText).match(/https?:\/\/[^\s]+|www\.[^\s]+/gi);
  return m ? m.length : 0;
}

/**
 * Lọc một đoạn văn bản.
 * @param {string} text
 * @returns {ModerationResult}
 */
export function moderateText(text) {
  const raw = String(text || '');
  const norm = normalizeForMatch(raw);
  const categories = new Set();
  const reasons = [];
  let score = 0;

  for (const rule of RULES) {
    for (const re of rule.patterns) {
      if (re.test(norm)) {
        categories.add(rule.category);
        reasons.push(rule.label);
        score += rule.weight;
        break; // mỗi nhóm tính 1 lần
      }
    }
  }

  // PII (trọng số 2)
  const piiReasons = detectPii(raw);
  if (piiReasons.length) {
    categories.add('pii');
    reasons.push(...piiReasons);
    score += 2;
  }

  // Spam theo số URL (≥3 link → +2, ≥5 → +3)
  const urlCount = countUrls(raw);
  if (urlCount >= 5) {
    categories.add('spam_scam');
    reasons.push('Quá nhiều liên kết (nghi spam)');
    score += 3;
  } else if (urlCount >= 3) {
    categories.add('spam_scam');
    reasons.push('Nhiều liên kết');
    score += 2;
  }

  // Quyết định:
  //   - child_safety / self_harm: luôn BLOCK nếu trúng (an toàn tối thượng).
  //   - score >= 4: block. score 2-3: flag. <2: allow.
  const cats = [...categories];
  const hardBlock = categories.has('child_safety') || categories.has('self_harm');
  let action = 'allow';
  if (hardBlock || score >= 4) action = 'block';
  else if (score >= 2) action = 'flag';

  return {
    ok: action !== 'block',
    action,
    score,
    categories: cats,
    reasons: [...new Set(reasons)],
  };
}

/** Thông điệp thân thiện cho người dùng khi bị chặn/đánh dấu. */
export function moderationMessage(result) {
  if (!result || result.action === 'allow') return '';
  if (result.categories.includes('self_harm')) {
    return 'Nội dung có dấu hiệu liên quan tự hại. Nếu bạn đang gặp khó khăn, hãy gọi 115 hoặc đường dây nóng sức khỏe tâm thần. Bạn không một mình.';
  }
  if (result.action === 'block') {
    return 'Nội dung vi phạm nguyên tắc cộng đồng (' + result.reasons.join('; ') + ') nên không thể đăng. Vui lòng chỉnh sửa lại.';
  }
  return 'Nội dung đã được gửi nhưng bị đánh dấu để kiểm duyệt: ' + result.reasons.join('; ') + '.';
}

export const __test = { normalizeForMatch, stripVietnameseDiacritics, detectPii, countUrls };
