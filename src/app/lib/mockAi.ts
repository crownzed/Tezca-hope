/**
 * Phản hồi khi chưa gọi ChatGPT (ngoại tuyến / chưa đăng nhập).
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
      'Nếu bạn đang có ý định tự hại hoặc cảm thấy không an toàn: hãy **rời khỏi nơi nguy hiểm**, báo người tin cậy gần nhất, hoặc gọi **115** / đến cấp cứu ngay. Tezca chỉ là chat thông tin — không thể can thiệp khẩn cấp.',
  },
  {
    weight: 95,
    match: (n) =>
      /(dau nguc|nhoi nguc|ket dia|ta bien|me mi mat|yeu nua nguoi|thinh tho dot ngot)/.test(n),
    reply:
      'Các dấu hiệu bạn mô tả có thể là **cấp cứu**. Đừng chờ chat thêm — **gọi 115 hoặc đến cơ sở y tế gần nhất ngay**, đặc biệt nếu đau ngực lan tay/tranh đổ mồ hôi/khó thở.',
  },
];

/** Intent “thông thường” — xếp weight để tránh chồng lấn (vd: “buồn ăn” vs “buồn”). */
const GENERAL_RULES: IntentRule[] = [
  {
    weight: 62,
    match: (n) =>
      /(bmi|chi so dong khoi|can nang|giam can|tang can|\bkg\b|kilogram|so can)/.test(n),
    reply:
      'Gợi ý: đo cân **vài buổi/tuần cùng một khung giờ**, nhập **Chiều cao — Cân nặng** vào mục BMI trên Tezca để xem xu hướng. BMI chỉ là chỉ báo tổng quát; có bệnh nền hay thuốc đặc biệt thì cần **bác sĩ** đánh giá.',
  },
  {
    weight: 60,
    match: (n) =>
      /(buon chan|tram cam|\bstress\b|cang thang|lo lang|met moi|kho ngu|mat ngu|tri hoan)/.test(n) &&
      !/(buon an|them an)/.test(n),
    reply:
      'Mình lắng nghe bạn. Thử **đi bộ nhẹ 10–15 phút**, **thở bụng 4–6 nhịp**, hoặc ghi **nhật ký cảm xúc** trên app vài dòng. Nếu trầm cảm/lo âu kéo dài hay có ý định tự hại — **liên hệ chuyên khoa tâm thần hoặc đường dây 115**.',
  },
  {
    weight: 58,
    match: (n) =>
      /(dinh duong|calo|protein|chat xo|an kieng|bua an|che do|macro|\bdiet\b)/.test(n),
    reply:
      'Để gợi ý ăn uống phù hợp hơn: mở **Kế hoạch** — nhập tuổi, mục tiêu, mức vận động và ghi chú (dị ứng, tiểu đường…). **Đăng nhập** để nhận bản phân tích sâu qua AI khi máy chủ đã bật.',
  },
  {
    weight: 56,
    match: (n) => /(tap gym|chay bo|cardio|hit\b|the duc|van dong)/.test(n),
    reply:
      'Với vận động: **tăng dần** khối lượng; luôn **khởi động–giãn**; nếu đau nhói khớp hay khó thở khi gắng sức — **dừng và gặp bác sĩ**. Kết hợp với **giấc ngủ** và **ăn đủ protein** giúp phục hồi.',
  },
  {
    weight: 54,
    match: (n) =>
      /(chuyen gia|bac si|bac sy|tu van y te|kham|don thuoc)/.test(n),
    reply:
      'Chat AI chỉ mang tính **thông tin chung**. Để được tư vấn về triệu chứng, thuốc hoặc chỉ định xét nghiệm, hãy **đặt lịch chuyên gia / khám trực tiếp**. Trên Tezca, **Đăng nhập** rồi dùng **Chat chuyên gia** nếu bạn đã được gán.',
  },
  {
    weight: 40,
    match: (n) => /(xin chao|chao ban|chao tezca|^hi\b|hello|hey\b)/.test(n),
    reply:
      'Chào bạn! Mình là **Tezca AI**. Bạn muốn trao đổi về **BMI**, **ăn uống**, **giấc ngủ**, **stress**, hay **vận động** hôm nay?',
  },
];

export function mockAiReply(userText: string): string {
  const raw = userText.trim();
  if (!raw) return 'Bạn gửi giúp một câu hỏi ngắn — ví dụ giấc ngủ, BMI, hay chế độ ăn nhé.';

  const n = normalizeVi(raw);

  const urgent = pickBestReply(n, SAFETY_RULES);
  if (urgent) return urgent;

  const normal = pickBestReply(n, GENERAL_RULES);
  if (normal) return normal;

  return (
    'Cảm ơn bạn đã chia sẻ. Để gợi ý sát hơn, hãy **nêu rối loại** (vd: ngủ kém, giảm cân an toàn, lo âu nhẹ) và **mục tiêu trong 1–2 tuần**. ' +
      'Bạn cũng có thể mở **Kế hoạch** hoặc **Chat AI** sau khi **đăng nhập** để đồng bộ dữ liệu. Thông tin chỉ mang tính tham khảo — không thay cho khám bệnh.'
  );
}
