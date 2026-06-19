/**
 * Phản hồi khi chưa gọi Gemini (ngoại tuyến / chưa đăng nhập).
 * Ưu tiên an toàn → intent có độ cụ thể cao → fallback chung.
 */
import { normalizeVi } from './textNormalize';

type IntentRule = {
  /** Điểm càng cao càng ưu tiên khi nhiều rule khớp */
  weight: number;
  /** Kiểm tra trên chuỗi đã normalize (không dấu, thường) */
  match: (n: string) => boolean;
  reply: string;
};

function pickBestReply(n: string, rules: IntentRule[]): string | null {
  let best: IntentRule | null = null;
  for (const r of rules) {
    if (!r.match(n)) continue;
    if (!best || r.weight > best.weight) best = r;
  }
  return best?.reply ?? null;
}

const SAFETY_RULES: IntentRule[] = [
  {
    weight: 100,
    match: (n) =>
      /(tu sat|tu tong|chet di|khong muon song|muon chet|tim cach chet)/.test(n) ||
      /(tu tong dot ngot|lan lon sau chan thuong)/.test(n),
    reply:
      'Nếu bạn không an toàn hoặc có ý định tự hại: rời nơi nguy hiểm, báo người tin cậy, hoặc gọi **115** ngay. Tezca không can thiệp khẩn cấp.',
  },
  {
    weight: 95,
    match: (n) =>
      /(dau nguc|nhoi nguc|ket dia|ta bien|me mi mat|yeu nua nguoi|thinh tho dot ngot)/.test(n),
    reply:
      'Dấu hiệu này có thể **cấp cứu** — **gọi 115** hoặc đến cơ sở y tế gần nhất ngay, đừng chờ chat thêm.',
  },
];

/** Intent “thông thường” — xếp weight để tránh chồng lấn (vd: “buồn ăn” vs “buồn”). */
const GENERAL_RULES: IntentRule[] = [
  {
    weight: 62,
    match: (n) =>
      /(bmi|chi so dong khoi|can nang|giam can|tang can|\bkg\b|kilogram|so can)/.test(n),
    reply:
      'Đo cân **vài lần/tuần cùng khung giờ**, nhập **BMI** trên Tezca để xem xu hướng. Có bệnh nền thì cần **bác sĩ** đánh giá.',
  },
  {
    weight: 60,
    match: (n) =>
      /(buon chan|tram cam|\bstress\b|cang thang|lo lang|met moi|kho ngu|mat ngu|tri hoan)/.test(n) &&
      !/(buon an|them an)/.test(n),
    reply:
      'Thử **đi bộ nhẹ 10–15 phút**, **thở bụng**, hoặc ghi **nhật ký cảm xúc** trên app. Lo âu/trầm cảm kéo dài hoặc có ý định tự hại — gặp chuyên khoa hoặc **115**.',
  },
  {
    weight: 58,
    match: (n) =>
      /(dinh duong|calo|protein|chat xo|an kieng|bua an|che do|macro|\bdiet\b)/.test(n),
    reply:
      'Mở **Kế hoạch**, nhập tuổi/mục tiêu/vận động và ghi chú (dị ứng…). **Đăng nhập** để AI soạn bản chi tiết hơn.',
  },
  {
    weight: 56,
    match: (n) => /(tap gym|chay bo|cardio|hit\b|the duc|van dong)/.test(n),
    reply:
      '**Tăng dần** tải, **khởi động–giãn**; đau nhói hoặc khó thở khi gắng — **dừng, gặp bác sĩ**. Ngủ đủ và **protein** giúp phục hồi.',
  },
  {
    weight: 54,
    match: (n) =>
      /(chuyen gia|bac si|bac sy|tu van y te|kham|don thuoc)/.test(n),
    reply:
      'AI chỉ là **thông tin chung** — triệu chứng/thuốc cần **khám trực tiếp**. Đã có chuyên gia? **Đăng nhập** → **Chat chuyên gia**.',
  },
  {
    weight: 40,
    match: (n) => /(xin chao|chao ban|chao tezca|^hi\b|hello|hey\b)/.test(n),
    reply: 'Chào bạn! Hôm nay bạn muốn nói về **BMI**, **ăn uống**, **ngủ**, **stress** hay **vận động**?',
  },
];

export function mockAiReply(userText: string): string {
  const raw = userText.trim();
  if (!raw) return 'Gửi giúp một câu hỏi ngắn — ví dụ ngủ, BMI, hoặc ăn uống.';

  const n = normalizeVi(raw);

  const urgent = pickBestReply(n, SAFETY_RULES);
  if (urgent) return urgent;

  const normal = pickBestReply(n, GENERAL_RULES);
  if (normal) return normal;

  return (
    'Bạn mô tả thêm **vấn đề** (vd: ngủ kém, giảm cân) và **mục tiêu 1–2 tuần** nhé. Có thể mở **Kế hoạch** sau khi **đăng nhập**. Thông tin chỉ tham khảo.'
  );
}
