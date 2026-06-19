/**
 * chatGuards.js — Tầng kiểm soát PHẠM VI & ĐỘ AN TOÀN cho AI chat sức khỏe.
 *
 * Hai guard chạy SAU moderation, TRƯỚC khi gọi LLM (input rail bổ sung):
 *
 *  A. classifyScope()      — chặn câu hỏi NGOÀI phạm vi sức khỏe (chính trị,
 *                            lập trình, đầu tư, pháp lý, làm bài hộ…). Trả lời
 *                            mẫu lịch sự, KHÔNG tốn lượt gọi LLM.
 *
 *  C. needsExpertEscalation() — phát hiện câu hỏi VƯỢT mức giáo dục (xin chẩn
 *                            đoán bệnh, xin kê đơn/liều thuốc, triệu chứng dai
 *                            dẳng cần khám) → hướng người dùng hỏi CHUYÊN GIA
 *                            thay vì để AI tự "đoán".
 *
 * CÁCH LỌC (cùng triết lý contentModeration.js):
 *   1) Chuẩn hóa text: bỏ dấu tiếng Việt + lowercase (chống né "đầu tư"→"dau tu")
 *      qua normalizeVi (đã dùng cho classifier).
 *   2) WHITELIST sức khỏe ưu tiên: nếu câu có thuật ngữ sức khỏe rõ ràng thì
 *      KHÔNG coi là ngoài phạm vi (giảm false-positive — vd "ăn gì giảm mỡ"
 *      chứa "gì" nhưng vẫn là dinh dưỡng).
 *   3) Khớp pattern theo nhóm; nhóm đầu tiên trúng → trả lời mẫu tương ứng.
 */
import { normalizeVi } from './chatClassifier.js';

/**
 * Khớp một "term" với chuỗi đã chuẩn hóa theo TỪ NGUYÊN (word-boundary),
 * tránh false-positive kiểu 'an' khớp trong "mặt bằng"/"đoạn". Term nhiều từ
 * (có khoảng trắng) dùng so khớp cụm có ranh giới.
 * @param {string} norm chuỗi đã normalizeVi
 * @param {string} term từ/cụm khóa (sẽ được normalizeVi)
 */
function hasTerm(norm, term) {
  const t = normalizeVi(term);
  if (!t) return false;
  return new RegExp(`(^|\\s)${t.replace(/\s+/g, '\\s+')}(\\s|$)`).test(norm);
}

/* ------------------------------------------------------------------ *
 * A. SCOPE — chủ đề NGOÀI phạm vi
 * ------------------------------------------------------------------ */

/** Thuật ngữ sức khỏe — nếu xuất hiện, KHÔNG chặn vì ngoài phạm vi.
 * LƯU Ý: tránh token ngắn/đa nghĩa sau khi bỏ dấu (vd 'co the' = cơ thể
 * nhưng cũng = "có thể"; 'an' = ăn nhưng cũng nằm trong "làm ăn"). Những
 * token này gây false-negative cho scope guard nên đã loại/thay bằng cụm rõ. */
const HEALTH_WHITELIST = [
  'an uong', 'che do an', 'dinh duong', 'calo', 'protein', 'tinh bot', 'chat beo', 'rau xanh',
  'tap luyen', 'tap gym', 'gym', 'chay bo', 'co bap', 'giam can', 'tang can', 'giam mo', 'vong eo',
  'bmi', 'can nang', 'chieu cao', 'beo phi',
  'giac ngu', 'mat ngu', 'kho ngu', 'stress', 'cang thang', 'tam trang', 'lo au',
  'suc khoe', 'the duc', 'the luc', 'uong nuoc', 'vitamin', 'khoi dong', 'gian co',
  'huyet ap', 'duong huyet', 'tim mach', 'co the nguoi', 'suc ben', 'deo dai', 'van dong',
];

/**
 * Các nhóm ngoài phạm vi. Mỗi nhóm: từ khóa (đã chuẩn hóa) + câu trả lời mẫu.
 * Thứ tự = ưu tiên (nhóm trên cùng kiểm trước).
 */
const OUT_OF_SCOPE = [
  {
    category: 'coding_tech',
    any: ['lap trinh', 'viet code', 'code gium', 'javascript', 'python', 'thuat toan', 'sql', 'debug', 'react', 'lap trinh vien'],
    reply: 'Mình là trợ lý sức khỏe của Tezca nên không hỗ trợ lập trình. Mình có thể giúp bạn về dinh dưỡng, vận động, giấc ngủ và lối sống lành mạnh.',
  },
  {
    category: 'finance',
    any: ['dau tu', 'chung khoan', 'co phieu', 'tien ao', 'bitcoin', 'forex', 'vay von', 'lai suat', 'lam giau', 'kiem tien'],
    reply: 'Chủ đề tài chính nằm ngoài phạm vi của mình. Mình chỉ đồng hành cùng bạn về sức khỏe — dinh dưỡng, tập luyện, giấc ngủ và tinh thần.',
  },
  {
    category: 'politics',
    any: ['chinh tri', 'bau cu', 'tong thong', 'dang phai', 'chinh phu', 'bo truong', 'chien tranh', 'bieu tinh'],
    reply: 'Mình không trao đổi về chính trị. Mình ở đây để giúp bạn về sức khỏe và lối sống lành mạnh thôi nhé.',
  },
  {
    category: 'legal',
    any: ['luat su', 'kien tung', 'hop dong', 'ly hon', 'thua ke', 'pham luat', 'toa an'],
    reply: 'Vấn đề pháp lý nằm ngoài chuyên môn của mình. Mình có thể hỗ trợ bạn các nội dung về sức khỏe và thể chất.',
  },
  {
    category: 'homework_general',
    any: ['lam bai tap gium', 'giai toan', 'viet van gium', 'dich bai', 'lam ho bai', 'lam giup bai tap'],
    reply: 'Mình chỉ tập trung vào sức khỏe nên không làm bài tập hộ được. Nếu bạn quan tâm dinh dưỡng hay vận động thì mình giúp ngay.',
  },
];

/**
 * Phân loại phạm vi câu hỏi.
 * @param {string} text
 * @returns {{ inScope: boolean, category: string|null, reply: string }}
 */
export function classifyScope(text) {
  const norm = normalizeVi(text);
  if (!norm) return { inScope: true, category: null, reply: '' };

  // Bước 2: whitelist sức khỏe ưu tiên — câu rõ ràng về sức khỏe luôn in-scope.
  if (HEALTH_WHITELIST.some((k) => hasTerm(norm, k))) {
    return { inScope: true, category: null, reply: '' };
  }

  // Bước 3: khớp nhóm ngoài phạm vi.
  for (const group of OUT_OF_SCOPE) {
    if (group.any.some((k) => hasTerm(norm, k))) {
      return { inScope: false, category: group.category, reply: group.reply };
    }
  }
  return { inScope: true, category: null, reply: '' };
}

/* ------------------------------------------------------------------ *
 * C. ESCALATION — câu hỏi VƯỢT mức giáo dục → hướng tới chuyên gia
 * ------------------------------------------------------------------ */

/** Yêu cầu chẩn đoán bệnh ("tôi bị bệnh gì", "đây là bệnh gì"). */
const DIAGNOSIS_PATTERNS = [
  /\b(toi|minh|em|con|chau|be) (bi|mac|dang bi) (benh|gi|sao)\b/,
  /\b(chan doan|chuan doan)\b/,
  /\b(day la benh gi|do la benh gi|co phai (bi|la) benh|benh gi day)\b/,
  /\b(co phai ung thu|co phai (bi )?(tieu duong|ung thu|lao|hiv|viem gan))\b/,
];

/** Xin kê đơn / liều thuốc cụ thể. */
const PRESCRIPTION_PATTERNS = [
  /\b(uong thuoc gi|dung thuoc gi|thuoc nao|ke don|ke thuoc|don thuoc)\b/,
  /\b(lieu (luong|dung)|uong (bao nhieu|may vien)|may vien( mot ngay)?)\b/,
  /\b(khang sinh|paracetamol|amoxicillin|thuoc khang)\b.*\b(uong|dung|lieu|bao nhieu)\b/,
];

/** Triệu chứng dai dẳng / cần khám (không phải khẩn cấp 115). */
const PERSISTENT_SYMPTOM_PATTERNS = [
  /\b(dau|nhuc|sot|ho|chong mat|buon non|mat ngu) .*\b(nhieu ngay|may tuan|keo dai|lien tuc|hoai|mai khong khoi)\b/,
  /\b(da \d+ (ngay|tuan|thang))\b.*\b(dau|sot|ho|met|chong mat)\b/,
];

/**
 * Phát hiện câu hỏi nên chuyển cho chuyên gia.
 * @param {string} text
 * @returns {{ escalate: boolean, reason: string|null }}
 */
export function needsExpertEscalation(text) {
  const norm = normalizeVi(text);
  if (!norm) return { escalate: false, reason: null };

  if (DIAGNOSIS_PATTERNS.some((re) => re.test(norm))) {
    return { escalate: true, reason: 'diagnosis' };
  }
  if (PRESCRIPTION_PATTERNS.some((re) => re.test(norm))) {
    return { escalate: true, reason: 'prescription' };
  }
  if (PERSISTENT_SYMPTOM_PATTERNS.some((re) => re.test(norm))) {
    return { escalate: true, reason: 'persistent_symptom' };
  }
  return { escalate: false, reason: null };
}

/**
 * Câu trả lời escalation, có gắn tên chuyên gia nếu biết.
 * @param {string} reason
 * @param {{ name?: string }|null} expert
 */
export function escalationReply(reason, expert = null) {
  const who = expert?.name ? `chuyên gia ${expert.name}` : 'chuyên gia đang đồng hành cùng bạn';
  const base = {
    diagnosis:
      `Mình không thể chẩn đoán bệnh — việc này cần người có chuyên môn thăm khám trực tiếp. Bạn nên đặt câu hỏi này cho ${who} trong mục Chuyên gia, hoặc đi khám nếu thấy lo.`,
    prescription:
      `Mình không kê đơn hay tư vấn liều thuốc được. Hãy hỏi ${who} hoặc bác sĩ/dược sĩ để được hướng dẫn an toàn theo đúng tình trạng của bạn.`,
    persistent_symptom:
      `Triệu chứng kéo dài nên được người có chuyên môn xem trực tiếp. Bạn nên trao đổi với ${who} hoặc đi khám để được đánh giá kỹ hơn. Mình chỉ hỗ trợ kiến thức chung về sức khỏe.`,
  };
  return base[reason] || base.diagnosis;
}

/* ------------------------------------------------------------------ *
 * D. ANTI PROMPT-INJECTION — chống thao túng chỉ thị hệ thống
 * ------------------------------------------------------------------ */

/**
 * Pattern jailbreak / prompt-injection phổ biến (chạy trên text đã normalizeVi).
 * Chia nhóm để dễ mở rộng; chỉ cần trúng 1 pattern là coi là injection.
 */
const INJECTION_PATTERNS = [
  // Yêu cầu bỏ qua / quên chỉ thị trước
  /\b(bo qua|quen het|quen di|khong can theo|phot lo) .*(huong dan|chi thi|chi dan|quy tac|lenh|yeu cau) (truoc|tren|he thong|ban dau)\b/,
  /\bignore (all |the |previous |prior |above )?(instruction|prompt|rule|context)/,
  /\bdisregard (all |the |previous |prior )?(instruction|prompt|rule)/,
  // Ép đổi vai / nhân cách
  /\b(dong vai|gia vo (la|lam)|tu nay (ban|may) la|ban gio la|hay lam) .*(bac si|duoc si|chuyen gia|nguoi khac|mot ai do)\b/,
  /\byou are now\b|\bact as (a |an )?(doctor|different|new)\b|\bpretend (to be|you are)\b/,
  /\b(che do|mode) (dan|jailbreak|nha phat trien|developer|khong gioi han)\b/,
  /\bjailbreak\b|\bdan mode\b/,
  // Đòi lộ system prompt / cấu hình nội bộ
  /\b(xem|biet|in ra|tiet lo|lo|hien thi|doc) .{0,20}(system prompt|prompt he thong|chi thi he thong|cau hinh he thong|huong dan goc)\b/,
  /\b(system prompt|prompt he thong|chi thi he thong)\b.{0,12}\b(la gi|cua ban|the nao)\b/,
  /\b(reveal|show|print|repeat) (me )?(your |the )?(system )?(prompt|instruction|rule)/,
  // Ép bỏ luật an toàn
  /\b(bo|tat|vo hieu|khong ap dung) .*(kiem duyet|bo loc|gioi han an toan|quy tac an toan|safety)\b/,
];

/**
 * Phát hiện mưu toan thao túng chỉ thị hệ thống.
 * @param {string} text
 * @returns {{ injected: boolean, reply: string }}
 */
export function detectPromptInjection(text) {
  const norm = normalizeVi(text);
  if (!norm) return { injected: false, reply: '' };
  const hit = INJECTION_PATTERNS.some((re) => re.test(norm));
  if (!hit) return { injected: false, reply: '' };
  return {
    injected: true,
    reply:
      'Mình giữ đúng vai trò trợ lý sức khỏe của Tezca và không thay đổi cách hoạt động theo yêu cầu đó. Mình có thể giúp bạn về dinh dưỡng, vận động, giấc ngủ và lối sống lành mạnh.',
  };
}

/* ------------------------------------------------------------------ *
 * E. TRUST / FALLBACK — chấm điểm độ tin cậy output, fallback nếu yếu
 * ------------------------------------------------------------------ */

/** Dấu hiệu câu trả lời "rỗng nghĩa" / lảng tránh (đã normalizeVi). */
const LOW_TRUST_PATTERNS = [
  /\b(toi|minh) khong biet\b/,
  /\b(toi|minh) khong (the|du kha nang) (tra loi|giup|ho tro)\b/,
  /\bkhong co thong tin\b/,
  /\bnhu mot (mo hinh|ai|tro ly ngon ngu)\b/,
  /\bas an ai (language )?model\b/,
  /\bi (cannot|can't|am unable to) (help|answer|assist)\b/,
];

/**
 * Chấm điểm độ tin cậy output của LLM (heuristic nhẹ, không gọi mạng).
 * Bảo thủ: chỉ coi là KHÔNG đạt khi tín hiệu yếu rõ ràng, tránh chặn nhầm.
 * @param {string} text output đã polish
 * @returns {{ trusted: boolean, reason: string|null }}
 */
export function scoreResponseTrust(text) {
  const raw = String(text || '').trim();
  // Rỗng hoặc quá ngắn (không tính là câu trả lời có nghĩa).
  if (raw.length < 8) return { trusted: false, reason: 'empty' };

  const norm = normalizeVi(raw);
  // Lảng tránh + ngắn → thấp. Câu dài dù có cụm này vẫn coi là có nội dung.
  if (raw.length < 60 && LOW_TRUST_PATTERNS.some((re) => re.test(norm))) {
    return { trusted: false, reason: 'evasive' };
  }
  return { trusted: true, reason: null };
}

/** Câu fallback an toàn khi output không đạt độ tin cậy. */
export function trustFallbackReply(expert = null) {
  const who = expert?.name ? `chuyên gia ${expert.name}` : 'chuyên gia của bạn';
  return `Mình chưa có câu trả lời chắc chắn cho điều này. Bạn thử hỏi lại cụ thể hơn, hoặc trao đổi với ${who} để được hỗ trợ sát hơn nhé.`;
}
