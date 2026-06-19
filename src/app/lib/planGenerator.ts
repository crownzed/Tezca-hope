import { normalizeVi } from './textNormalize';

export type PlanInput = {
  age: number;
  goal: 'lose' | 'maintain' | 'gain';
  activity: 'low' | 'medium' | 'high';
  dietNote: string;
};

type AgeBand = 'teen' | 'adult' | 'senior';

function ageBand(age: number): AgeBand {
  if (age < 18) return 'teen';
  if (age >= 65) return 'senior';
  return 'adult';
}

/** Trích ý ràng buộc / bối cảnh từ ghi chú người dùng (chỉ gợi ý lối sống, không phải tư vấn y khoa). */
function dietContextBullets(note: string): string[] {
  const n = normalizeVi(note);
  if (!n) return [];

  const rules: { keys: RegExp; line: string }[] = [
    { keys: /tieu duong|duong huyet|insulin|\bhba1c\b/, line: 'Theo dõi carb có chỉ số đường huyết thấp/trung bình hơn; chia bữa đều — bám kế hoạch bác sĩ về thuốc và đường máu.' },
    { keys: /huyet ap|cao huyet|tim mach/, line: 'Giảm muối (processed), tăng rau củ; tránh đồ uống tăng huyết áp đột ngột — phối hợp điều trị nếu có.' },
    { keys: /than\b|than man|loc mau/, line: 'Lượng nước và protein theo chỉ định thận — không tự tăng protein cao.' },
    { keys: /chay|thuan chay|vegan/, line: 'Ưu tiên đạm thực vật đủ (đậu, đậu Hà Lan, đậu phụ, hạt); cân nhắc B12/DHA theo hướng dẫn.' },
    { keys: /halal|kosher/, line: 'Chọn nguồn đạm phù hợp quy định tín ngưỡng; đa dạng rau và ngũ cốc nguyên hạt.' },
    { keys: /lactose|khong sua|sua bo/, line: 'Thay sữa bò bằng sữa không lactose hoặc đậu nành (nếu không dị ứng đậu).' },
    { keys: /gluten|celiac|khong gluten/, line: 'Chọn ngũ cốc không gluten được xác nhận; đọc nhãn chế biến sẵn.' },
    { keys: /di ung|phan hoa|cac loai hat/, line: 'Loại hẳn dị nguyên đã biết; thận trọng đồ ăn ngoài và chế biến chung.' },
    { keys: /mang thai|co thai|cho con bu/, line: 'Nhu cầu dinh dưỡng riêng — bắt buộc đồng hành bác sĩ sản khoa/dinh dưỡng; không hạn calo gắt.' },
  ];

  const out: string[] = [];
  const seen = new Set<string>();
  for (const { keys, line } of rules) {
    if (keys.test(n) && !seen.has(line)) {
      seen.add(line);
      out.push(line);
    }
  }
  if (out.length === 0 && note.trim())
    out.push(`Ghi chú của bạn («${note.trim().slice(0, 120)}${note.trim().length > 120 ? '…' : ''}»): áp dụng linh hoạt nếu không trái chỉ định y tế.`);

  return out;
}

function nutritionBlock(input: PlanInput, band: AgeBand): string[] {
  const { goal, activity } = input;
  const lines: string[] = [];

  const base =
    goal === 'lose'
      ? [
          'Tạo **thiếu hụt năng lượng nhẹ** (khoảng 300–500 kcal/ngày so với duy trì) chủ yếu từ giảm đồ calo rỗng, không nhịn bữa.',
          'Ưu tiên **protein nạc** (cá, thịt nạc, đậu, trứng, sữa chua ít đường) ~1.2–1.6 g/kg (tham khảo — điều chỉnh bệnh thận).',
          '**Chất xơ** từ rau, quả, ngũ cốc nguyên hạt để no lâu và ổn định đường huyết.',
        ]
      : goal === 'gain'
        ? [
            'Tăng **surplus nhỏ** (+200–350 kcal/ngày), ưu tiên protein và carb chất lượng — tránh chỉ ăn đồ ngọt.',
            'Chia **5–6 bữa** nếu khó ăn một lúc; snack lành mạnh (sữa chua, hạt, trái cây, bánh mì nguyên cám).',
            'Theo dõi khối lượng/tỷ lệ mỡ-nạc nếu có vòng eo hoặc chỉ số để điều chỉnh.',
          ]
        : [
            'Giữ **ổn định khối lượng**: khẩu phần nhất quán trong tuần; điều chỉnh ±10% khi cân dao động >1 kg.',
            'Ăn đủ protein và rau mỗi bữa chính; hạn chế đồ chiên nhiều dầu và đồ uống có đường.',
          ];

  lines.push(...base);

  if (activity === 'high' && goal !== 'lose') {
    lines.push('Với vận động cao: thêm carb **trước/sau buổi tập** (chuối, cơm gạo lứt nhẹ) và đủ nước điện giải khi ra nhiều mồ hôi.');
  }

  if (band === 'teen') {
    lines.push('**Vị thành niên:** không hạn calo gắt; cần đủ canxi, sắt, protein cho tăng trưởng — phối hợp phụ huynh/bác sĩ.');
  }
  if (band === 'senior') {
    lines.push('**Người cao tuổi:** ưu tiên protein phân bổ đều bữa; kiểm tra nuốt/nhai; tránh giảm cân quá nhanh để bảo toàn cơ.');
  }

  lines.push('Uống **nước lọc** ~1,5–2 lít/ngày (điều chỉnh khi suy tim/thận/bác sĩ giới hạn).');

  return lines.map((s) => `- ${s}`);
}

function exerciseBlock(input: PlanInput): string {
  const { goal, activity } = input;

  if (activity === 'low') {
    return goal === 'lose'
      ? `- **NEAT + cardio nhẹ:** đi bộ nhanh **30–40 phút**/ngày (chia 2 lần được); leo cầu thang khi có thể.\n- **2 buổi/tuần** kháng nhẹ (gấp người, squat tự trọng) để giữ cơ.`
      : `- **Mục tiêu vận động:** đi bộ **25–35 phút**/ngày + **2 buổi/tuần** sức nhẹ toàn thân.\n- Đứng/tập nhẹ **5 phút mỗi giờ** khi làm văn phòng.`;
  }

  if (activity === 'medium') {
    return `- **150–220 phút**/tuần hoạt động vừa (đi nhanh, đạp xe, bơi).\n- **2 buổi/tuần** sức (tạ nhẹ hoặc TRX), xen ngày nghỉ hoặc đi bộ.\n${goal === 'lose' ? '- Ưu tiên **zone 2** (nói được câu ngắn) để tối ưu mỡ mà vẫn phục hồi.' : ''}`;
  }

  return `- Duy trì **khối lượng & cường độ** hiện có; **1–2 ngày active recovery**/tuần (đi bộ, yoga, mobility).\n- Theo dõi **đau khớp/mệt kéo dài** — giảm tải trước khi chấn thương.\n${goal === 'lose' ? '- Xen **buổi HIIT ngắn** (tuần 1–2 lần) nếu đã quen — không khi chưa làm nền.' : ''}`;
}

export function generatePersonalizedPlan(input: PlanInput): string {
  const goalVi =
    input.goal === 'lose'
      ? 'giảm cân bền vững'
      : input.goal === 'gain'
        ? 'tăng cân / khối lượng nạc'
        : 'duy trì cân nặng và thể trạng';

  const actVi =
    input.activity === 'low'
      ? 'ít vận động (văn phòng)'
      : input.activity === 'medium'
        ? 'trung bình (vài buổi/tuần)'
        : 'cao (tập thường xuyên hoặc lao động nặng)';

  const band = ageBand(input.age);
  const dietExtras = dietContextBullets(input.dietNote);
  const nutrition = nutritionBlock(input, band);

  const lines: string[] = [
    `## Kế hoạch gợi ý (ngoại tuyến)`,
    ``,
    `**Bối cảnh:** ${input.age} tuổi · Mục tiêu: ${goalVi} · Vận động: ${actVi}.`,
    ``,
    `### Dinh dưỡng (7 ngày đầu)`,
    ...nutrition,
  ];

  if (dietExtras.length) {
    lines.push('', '**Theo ghi chú của bạn:**');
    dietExtras.forEach((x) => lines.push(`- ${x}`));
  }

  lines.push(
    ``,
    `### Vận động`,
    exerciseBlock(input),
    ``,
    `### Theo dõi`,
    `- Cân **cùng khung giờ** 1–2 lần/tuần; đo vòng eo thêm nếu giảm cân.`,
    `- Ghi **nhật ký cảm xúc & giấc ngủ** — giúc nhận diện trigger ăn uống cảm xúc.`,
    `- Đồng bộ **Tezca** khi đăng nhập để chuyên gia xem xu hướng an toàn.`,
    ``,
    `_Thông tin mang tính giáo dục sức khỏe; không thay cho khám hoặc điều trị chuyên môn._`,
  );

  return lines.join('\n');
}
