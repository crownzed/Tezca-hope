import { normalizeVi } from './textNormalize';

export type PlanInput = {
  age: number;
  goal: 'lose' | 'maintain' | 'gain';
  activity: 'low' | 'medium' | 'high';
  dietNote: string;
};

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

const DAY_HEADERS = [
  'Ngày 1 (Thứ 2)',
  'Ngày 2 (Thứ 3)',
  'Ngày 3 (Thứ 4)',
  'Ngày 4 (Thứ 5)',
  'Ngày 5 (Thứ 6)',
  'Ngày 6 (Thứ 7)',
  'Ngày 7 (Chủ nhật)',
] as const;

/** Mỗi phần tử = bullet cho một ngày; không trùng tên bài trong tuần. */
function weeklyTrainingBullets(input: PlanInput): string[][] {
  const { goal, activity } = input;

  if (activity === 'low') {
    return [
      [
        'Khởi động: đi bộ tại chỗ + xoay khớp cổ vai 5 phút',
        'Đi bộ nhanh liên tục 30 phút (zone 2)',
        'Squat tự trọng 3 hiệp × 12',
        'Giãn cơ đùi sau + lưng dưới 5 phút',
      ],
      [
        'Khởi động: nhảy dây nhẹ hoặc march 4 phút',
        'Gấp người incline (bàn ghế) 3×8–10',
        'Plank 3×30 giây',
        'Đi bộ recovery 15 phút',
      ],
      [
        'Khởi động: hip circle + ankle mobility 5 phút',
        'Bước lên cầu thang 3×10 mỗi chân',
        'Glute bridge 3×15',
        'Thở sâu + thư giãn 5 phút',
      ],
      [
        'Khởi động: cánh tay + xoay hông 5 phút',
        'Đạp xe tĩnh hoặc đi bộ dốc nhẹ 25 phút',
        'Wall sit 3×40 giây',
        'Foam roll hoặc lăn bóng chân 5 phút',
      ],
      [
        'Khởi động: march + squat không tạ 5 phút',
        'Chống đẩy tường 3×12',
        'Bird-dog 3×10 mỗi bên',
        'Yoga nhẹ: tư thế trẻ em + xoay cột sống',
      ],
      [
        'Khởi động: nhảy nhẹ hoặc đi bộ 5 phút',
        'Đi bộ nhanh ngoài trời 35 phút',
        'Calf raise 3×15',
        'Giãn toàn thân 8 phút',
      ],
      [
        'Khởi động: thở bụng + mobility vai 5 phút',
        'Đi bộ thư giãn 20 phút',
        'Stretch hông + ngực 10 phút',
        'Nghỉ chủ động — ghi nhận mức mệt',
      ],
    ];
  }

  if (activity === 'medium') {
    const cardio =
      goal === 'lose' ? 'Cardio zone 2 (đạp xe/đi nhanh) 30 phút' : 'Cardio vừa 25 phút';
    return [
      [
        'Khởi động: hip + ankle mobility 6 phút',
        'Goblet squat 3×10',
        'Romanian deadlift tạ nhẹ 3×10',
        cardio,
        'Giãn cơ sau tập 5 phút',
      ],
      [
        'Khởi động: band pull-apart + rotator 5 phút',
        'Chống đẩy 3×8–12',
        'Hàng tạ một tay hoặc tạ đôi 3×10',
        'Face pull hoặc kéo cáp nhẹ 3×15',
        'Plank 3×40 giây',
      ],
      [
        'Khởi động: đạp xe nhẹ 5 phút',
        'Lunges đi bộ 3×10 mỗi chân',
        'Hip thrust 3×12',
        'Bước bên (lateral lunge) 2×12',
        'Cooldown đi bộ 8 phút',
      ],
      [
        'Khởi động: xoay khớp + squat không tạ 5 phút',
        'Kéo xà hoặc lat pulldown 3×10',
        'Dumbbell row 3×10 mỗi tay',
        'Bơi hoặc đi bộ dốc 20 phút',
        'Giãn lưng + vai 6 phút',
      ],
      [
        'Khởi động: nhảy dây 4 phút',
        'Bench press hoặc chống đẩy tạ 3×8–10',
        'Overhead press tạ nhẹ 3×10',
        'Tricep extension dây 2×15',
        'Mobility ngực + vai 5 phút',
      ],
      [
        'Khởi động: march + leg swing 5 phút',
        'Deadlift trap bar hoặc kettlebell 3×8',
        'Farmer carry 3×30 mét',
        goal === 'gain' ? 'Burpee có kiểm soát 3×6' : 'Đi bộ nhanh 20 phút',
        'Stretch hông gập 6 phút',
      ],
      [
        'Khởi động: yoga flow nhẹ 8 phút',
        'Đi bộ hoặc bơi nhẹ 25 phút',
        'Foam roll + thở sâu 10 phút',
        'Ghi chú cảm giác khớp/cơ',
      ],
    ];
  }

  return [
    [
      'Khởi động: activation glute + hip 8 phút',
      'Back squat 4×6–8 (RPE 7–8)',
      'Leg press 3×10',
      'Walking lunge 3×10 mỗi chân',
      'Cooldown bike 8 phút',
    ],
    [
      'Khởi động: band shoulder 6 phút',
      'Bench press 4×6–8',
      'Incline dumbbell press 3×10',
      'Dips hoặc tricep pushdown 3×12',
      'Chest stretch 5 phút',
    ],
    [
      'Khởi động: row nhẹ 5 phút',
      'Deadlift 4×5',
      'Barbell row 3×8',
      'Lat pulldown 3×10',
      'Hamstring stretch 6 phút',
    ],
    [
      'Khởi động: skip + drill chân 6 phút',
      goal === 'lose' ? 'HIIT bike 8×30s/90s nghỉ' : 'Tempo run 20 phút',
      'Sled push hoặc battle rope 6×20 giây',
      'Core pallof press 3×12',
      'Giãn cơ đùi trước 5 phút',
    ],
    [
      'Khởi động: mobility vai + T-spine 8 phút',
      'Overhead press 4×6',
      'Lateral raise 3×15',
      'Pull-up hoặc assisted 3×max',
      'Face pull 3×15',
    ],
    [
      'Khởi động: hip hinge drill 6 phút',
      'Front squat hoặc goblet 4×8',
      'Romanian deadlift 3×10',
      'Hip thrust 3×12',
      'Calf raise nặng 4×12',
    ],
    [
      'Khởi động: yoga / đi bộ nhẹ 10 phút',
      'Swim hoặc đạp xe recovery 30 phút',
      'Foam roll toàn thân',
      'Ngày nghỉ chủ động — chuẩn bị tuần sau',
    ],
  ];
}

function trainingWeekMarkdown(input: PlanInput): string {
  const weeks = weeklyTrainingBullets(input);
  const lines: string[] = ['## Lịch tập 7 ngày', ''];
  DAY_HEADERS.forEach((header, i) => {
    lines.push(`### ${header}`);
    for (const bullet of weeks[i]!) {
      lines.push(`- ${bullet}`);
    }
    lines.push('');
  });
  return lines.join('\n').trimEnd();
}

function briefGuidanceBlock(input: PlanInput, goalVi: string, actVi: string): string[] {
  const { goal } = input;
  const lines = [
    `- Tuần này: **${goalVi}**, mức vận động **${actVi}**. Tập theo lịch 7 ngày; nếu đau khớp kéo dài thì giảm tải hoặc bỏ buổi.`,
    `- Ngày 7 là **phục hồi** — ưu tiên giấc ngủ và nước.`,
  ];
  if (goal === 'lose') {
    lines.push('- Ăn uống: ưu tiên protein và rau; không nhịn bữa sau buổi tập nặng.');
  } else if (goal === 'gain') {
    lines.push('- Ăn uống: thêm bữa phụ lành mạnh sau buổi sức nếu khó đủ calo.');
  } else {
    lines.push('- Ăn uống: giữ khẩu phần ổn định; uống đủ nước trong ngày tập.');
  }
  return lines;
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

  const dietExtras = dietContextBullets(input.dietNote);

  const lines: string[] = [
    `## Kế hoạch gợi ý (ngoại tuyến)`,
    ``,
    `**Bối cảnh:** ${input.age} tuổi · Mục tiêu: ${goalVi} · Vận động: ${actVi}.`,
    ``,
    `## Hướng dẫn ngắn`,
    ...briefGuidanceBlock(input, goalVi, actVi),
  ];

  if (dietExtras.length) {
    lines.push(`- **Ghi chú của bạn:** ${dietExtras[0]}`);
  }

  lines.push('', trainingWeekMarkdown(input), '', `## Lưu ý an toàn`);
  lines.push(
    `Nội dung chỉ mang tính gợi ý lối sống; không thay khám hoặc điều trị. Bệnh nền, thai kỳ hoặc đang điều trị cần theo bác sĩ.`,
  );

  return lines.join('\n');
}
