/**
 * Tình huống instant — trả lời có sẵn, không gọi LLM (phản hồi nhanh).
 * weight 64–68: cao hơn topic_* (54–62) để ưu tiên khi khớp câu FAQ cụ thể.
 */
import { buildRealworldInstantScenarios } from './realworld-phrases.mjs';

const DISCLAIM = ' Thông tin chỉ tham khảo — không thay khám bệnh.';

/**
 * @param {string} id
 * @param {string} label
 * @param {number} weight
 * @param {string[]} keywords
 * @param {string} reply
 */
function instant(id, label, weight, keywords, reply) {
  return {
    id: `fast_${id}`,
    label,
    weight,
    mode: 'instant',
    reply,
    match: { type: 'keywords', any: keywords },
    llm: { systemAddon: 'Trả lời ngắn.', maxTokens: 80, temperature: 0.5 },
  };
}

function instantRegex(id, label, weight, pattern, reply) {
  return {
    id: `fast_${id}`,
    label,
    weight,
    mode: 'instant',
    reply,
    match: { type: 'regex', pattern },
    llm: { systemAddon: 'Trả lời ngắn.', maxTokens: 80, temperature: 0.5 },
  };
}

/** @returns {object[]} */
export function buildInstantScenarios() {
  const all = [
    instantRegex(
      'goodbye',
      'Tạm biệt',
      43,
      '(tam biet|hen gap lai|bye bye|^bye\\b)',
      'Tạm biệt bạn! Hẹn gặp lại trên Tezca.',
    ),
    instantRegex(
      'how_are_you',
      'Hỏi thăm',
      41,
      '(ban khoe khong|the nao|hom nay the nao|on khong)',
      'Mình ổn, cảm ơn bạn! Bạn muốn hỏi về **BMI**, **ăn uống**, **ngủ** hay **vận động**?',
    ),
    instant(
      'who_tezca',
      'Tezca là gì',
      44,
      ['tezca la gi', 'ban la ai', 'ai la tezca'],
      'Mình là **Tezca AI** — trợ lý sức khỏe trên app (BMI, kế hoạch, nhật ký cảm xúc). Bạn cần hỗ trợ gì?',
    ),

    // --- BMI ---
    instant(
      'bmi_what',
      'BMI là gì',
      66,
      ['bmi la gi', 'chi so bmi la gi', 'chỉ số bmi'],
      '**BMI** ước lượng mức cân nặng so với chiều cao. Vào **BMI** trên Tezca, nhập số đo để xem xu hướng.' +
        DISCLAIM,
    ),
    instant(
      'bmi_how',
      'Cách tính BMI',
      66,
      ['tinh bmi', 'tinh bmi nhu the nao', 'cong thuc bmi'],
      'BMI ≈ **cân (kg) ÷ (cao m)²**. Nhập **Chiều cao** và **Cân nặng** trong mục BMI — app tự tính.',
    ),
    instant(
      'bmi_normal',
      'BMI bình thường',
      65,
      ['bmi bao nhieu la tot', 'bmi chuan', 'bmi binh thuong'],
      'Người trưởng thành thường **18,5–22,9** (WHO). Chỉ là chỉ báo chung — có bệnh nền cần **bác sĩ** đánh giá.',
    ),
    instant(
      'bmi_over',
      'BMI cao',
      65,
      ['bmi cao', 'thua can', 'béo phì'],
      'BMI cao gợi ý thừa cân — ưu tiên **ăn đủ protein/rau**, **vận động đều**. Mở **Kế hoạch** trên Tezca để gợi ý tuần đầu.',
    ),
    instant(
      'bmi_under',
      'BMI thấp',
      65,
      ['bmi thap', 'gay', 'suy dinh duong'],
      'BMI thấp có thể thiếu năng lượng — ăn đủ bữa, protein; nếu sụt cân không rõ → **khám**.',
    ),

    // --- App ---
    instant(
      'app_plan',
      'Mở Kế hoạch',
      67,
      ['mo ke hoach', 'ke hoach o dau', 'lap ke hoach o dau'],
      '**Đăng nhập** → menu **Kế hoạch** → nhập tuổi, mục tiêu, vận động → bấm tạo (AI nếu đã bật).',
    ),
    instant(
      'app_mood',
      'Nhật ký cảm xúc',
      67,
      ['nhat ky cam xuc', 'ghi mood', 'mood o dau'],
      'Vào **Nhật ký cảm xúc** (sau đăng nhập) — chọn mức cảm xúc và vài dòng ghi chú mỗi ngày.',
    ),
    instant(
      'app_expert',
      'Chat chuyên gia',
      67,
      ['chat chuyen gia', 'bac si tren app', 'lien he chuyen gia'],
      '**Đăng nhập** → **Chat chuyên gia** (cần được gán chuyên gia). AI không thay tư vấn trực tiếp.',
    ),
    instant(
      'app_login',
      'Đăng nhập',
      66,
      ['dang nhap', 'dang ky', 'tao tai khoan'],
      'Bấm **Đăng nhập** góc trên — email/mật khẩu hoặc đăng ký mới. Quên mật khẩu có link **Quên mật khẩu**.',
    ),

    // --- Dinh dưỡng (FAQ ngắn) ---
    instant(
      'eat_breakfast',
      'Ăn sáng',
      65,
      ['co nen an sang', 'an sang quan trong', 'bo an sang'],
      'Nên **ăn sáng** đủ protein/chất xo để ổn định đường huyết. Bỏ sáng lâu ngày → cân nhắc **bác sĩ/dinh dưỡng**.',
    ),
    instant(
      'protein_day',
      'Protein/ngày',
      65,
      ['protein mot ngay', 'an bao nhieu protein', 'thieu protein'],
      'Gợi ý chung người lớn: khoảng **0,8–1,2 g/kg/ngày** (tập nặng có thể cao hơn). Cá nhân hóa trong **Kế hoạch** Tezca.',
    ),
    instant(
      'water_day',
      'Uống nước',
      66,
      ['uong bao nhieu nuoc', 'nuoc mot ngay', 'mat nuoc'],
      'Thường **~30–35 ml/kg/ngày**, tăng khi nóng hoặc tập nhiều. Theo màu nước tiểu vàng nhạt là ổn.',
    ),
    instant(
      'calorie_deficit',
      'Calo giảm cân',
      65,
      ['giam calo', 'thieu hut calo', 'calo giam can'],
      'Giảm cân an toàn thường **~300–500 kcal/ngày** dưới mức duy trì — không cực đoan. Dùng **Kế hoạch** trên app.',
    ),

    // --- Vận động ---
    instant(
      'walk_day',
      'Đi bộ',
      65,
      ['di bo bao nhieu', '10000 buoc', 'di bo giam can'],
      '**Đi bộ 20–30 phút/ngày** là khởi đầu tốt; tăng dần. Đau nhói/khó thở → dừng, gặp **bác sĩ**.',
    ),
    instant(
      'gym_begin',
      'Gym người mới',
      65,
      ['tap gym lan dau', 'moi tap gym', 'bat dau gym'],
      'Tuần đầu: **học động tác**, tải nhẹ, nghỉ 48h giữa buổi cùng nhóm cơ. Khởi động 5–10 phút.',
    ),
    instant(
      'rest_day',
      'Ngày nghỉ',
      64,
      ['ngay nghi', 'rest day', 'co can nghi khong'],
      'Có — cơ cần **phục hồi**. Ngày nghỉ: đi bộ nhẹ, giãn cơ, ngủ đủ.',
    ),

    // --- Giấc ngủ ---
    instant(
      'sleep_hours',
      'Giờ ngủ',
      65,
      ['ngu may tieng', 'bao nhieu tieng ngu', '7 tieng'],
      'Người lớn thường **7–9 tiếng/đêm**. Giữ giờ đi ngủ cố định, hạn chế màn hình trước ngủ 30–60 phút.',
    ),
    instant(
      'insomnia_tip',
      'Khó ngủ',
      66,
      ['kho ngu', 'mat ngu', 'khong ngu duoc'],
      'Thử tối **không caffeine**, phòng tối mát, thở chậm. Kéo dài >2–3 tuần → **khám** giấc ngủ.',
    ),

    // --- Cảm xúc ---
    instant(
      'stress_quick',
      'Stress nhanh',
      66,
      ['stress', 'cang thang', 'met tinh than'],
      'Thử **thở 4–6 nhịp**, đi bộ 10 phút, ghi **nhật ký cảm xúc**. Kéo dài hoặc tự hại → **115**/chuyên khoa.',
    ),
    instant(
      'anxiety_light',
      'Lo âu nhẹ',
      65,
      ['lo lang', 'hoang mang', 'bat on'],
      'Lo âu nhẹ: giảm caffeine, ngủ đủ, chia sẻ với người tin cậy. Nặng dần → **tư vấn tâm lý**.',
    ),

    // --- Khám / thuốc (chuyển hướng nhanh) ---
    instant(
      'see_doctor',
      'Khi nào khám',
      66,
      ['khi nao di kham', 'khi nao can di kham', 'co can di kham', 'gap bac si', 'di kham'],
      'Khám khi triệu chứng **đột ngột, nặng, kéo dài** hoặc ảnh hưởng sinh hoạt. Tezca không chẩn đoán.',
    ),
    instant(
      'no_prescription',
      'Không kê đơn',
      68,
      ['ke don', 'thuoc gi cho toi', 'mua thuoc gi'],
      'Tezca **không kê đơn**. Hỏi thuốc cần **bác sĩ** hoặc **dược sĩ** — đừng tự ý đổi liều.',
    ),

    // --- Chào hỏi biến thể ---
    instantRegex(
      'morning',
      'Chào buổi sáng',
      43,
      '(chao buoi sang|good morning)',
      'Chào buổi sáng! Bạn muốn bắt đầu với **bữa sáng**, **vận động** hay **kế hoạch ngày**?',
    ),
    instantRegex(
      'evening',
      'Chào buổi tối',
      43,
      '(chao buoi toi|good night|ngu ngon)',
      'Chúc bạn buổi tối an lành! Cần gợi ý **giấc ngủ** hay **ăn tối** nhẹ không?',
    ),
  ];

  // Sinh thêm FAQ: "X co tot khong" / "nen X khong"
  const YESNO_ITEMS = [
    ['an_sang', 'ăn sáng', ['an sang', 'bua sang'], 'Nên ăn sáng đủ chất — tránh nhịn rồi ăn dồn tối.'],
    ['tap_sang', 'tập sáng', ['tap buoi sang', 'tap sang som'], 'Tập sáng ổn nếu đã ăn nhẹ và khởi động — tránh gắng ngay khi mới dậy.'],
    ['nhin_an', 'nhịn ăn', ['nhin an', 'intermittent fasting'], 'Nhịn ăn có người hợp, người không — đái tháo đường, mang thai, rối loạn ăn → hỏi **bác sĩ**.'],
    ['whey', 'whey protein', ['whey', 'bo sung whey'], 'Whey bổ sung protein tiện — không thay bữa ăn; dị ứng sữa hoặc bệnh thận → **bác sĩ**.'],
    ['detox', 'detox', ['detox', 'thanh loc co the'], 'Không cần “detox” thịnh hành — gan/thận tự xử lý; ăn cân bằng, ngủ đủ hiệu quả hơn.'],
    ['yoga', 'yoga', ['co nen tap yoga', 'yoga giam can'], 'Yoga tốt cho giãn cơ, giảm stress — kết hợp cardio nếu mục tiêu giảm mỡ.'],
    ['chay', 'chạy bộ', ['chay bo giam can', 'chay buoi toi'], 'Chạy bộ hiệu quả nếu tăng dần — đau gối/cẳng → nghỉ, khám cơ xương khớp.'],
    ['gap_trua', 'ngủ trưa', ['ngu trua', 'gap trua'], 'Ngủ trưa **15–30 phút** có thể tỉnh táo; dài quá dễ trễ ngủ đêm.'],
    ['vitamin', 'vitamin tổng hợp', ['uong vitamin', 'multivitamin'], 'Bổ sung chỉ khi thiếu cụ thể — ăn đa dạng trước; liều cao → hỏi **bác sĩ**.'],
    ['ruou', 'bỏ rượu', ['bo ruou', 'uong ruou co hai'], 'Hạn chế rượu giúp gan, giấc ngủ, calo — cai nghiện khó có hỗ trợ chuyên môn.'],
  ];

  for (const [id, label, keys, reply] of YESNO_ITEMS) {
    all.push(instant(id, label, 65, keys, reply + DISCLAIM));
  }

  // Cụm "la gi" theo chủ đề
  const WHAT_IS = [
    ['calo', 'calo là gì', ['calo la gi', 'calorie la gi'], '**Calo** đo năng lượng thức ăn — cân bằng calo với mục tiêu (giảm/duy trì/tăng).'],
    ['macro', 'macro là gì', ['macro la gi', 'macronutrient'], '**Macro**: protein, carb, fat — chia tỷ lệ theo mục tiêu trong **Kế hoạch**.'],
    ['cardio', 'cardio', ['cardio la gi', 'tap cardio'], '**Cardio** tăng nhịp tim (chạy, đạp…) — tốt tim phổi, hỗ trợ giảm mỡ kèm ăn uống.'],
    ['hit_def', 'HIIT', ['hiit la gi', 'tap hiit'], '**HIIT**: cường độ cao ngắt quãng — hiệu quả nhưng không phù hợp mọi người; tim mạch → hỏi **bác sĩ**.'],
    ['fiber', 'chất xơ', ['chat xo', 'fiber la gi'], '**Chất xo** giúp no, tiêu hóa — rau, đậu, ngũ cốc nguyên hạt.'],
  ];
  for (const [id, label, keys, reply] of WHAT_IS) {
    all.push(instant(`what_${id}`, label, 65, keys, reply + DISCLAIM));
  }

  // Mở rộng: câu hỏi một từ + ngữ cảnh (combinator nhỏ)
  const SNACKS = ['hat dieu', 'chuoi', 'sua chua', 'pho mai', 'banh mi'];
  const SNACK_Q = ['an duoc khong', 'tot khong'];
  for (const s of SNACKS) {
    for (const q of SNACK_Q) {
      all.push(
        instant(
          `snack_${s.replace(/\s/g, '_')}_${q.replace(/\s/g, '_')}`,
          `${s} — ${q}`,
          64,
          [`${s} ${q}`],
          `**${s}** có thể phù hợp tùy mục tiêu calo — ăn vừa phải, ưu tiên bữa chính đủ chất. Chi tiết: **Kế hoạch** Tezca.`,
        ),
      );
    }
  }

  const FOODS_FAST = [
    'ga', 'ca', 'bo', 'trung', 'tom', 'cua', 'lau', 'pho', 'bun', 'com trang',
    'khoai lang', 'bi dao', 'broccoli', 'socola', 'keo', 'tra sua', 'nuoc ngot',
    'banh ngot', 'thit heo', 'dau hu', 'nam', 'rau muong', 'ca chua', 'ot',
    'gung', 'toi', 'yen mach', 'granola', 'sinh to', 'salad tron',
  ];
  for (const f of FOODS_FAST) {
    const k = f.replace(/\s/g, '_');
    all.push(
      instant(
        `food_${k}`,
        `Ăn ${f}`,
        64,
        [`${f} tot khong`, `an ${f} duoc khong`, `${f} an duoc khong`, `nen an ${f}`],
        `**${f}**: tùy mục tiêu calo/sức khỏe — ăn vừa phần, kết hợp rau/protein. Hỏi sâu → **Kế hoạch** Tezca.`,
      ),
    );
  }

  const SYMPTOM_FAST = [
    ['dau_dau', 'đau đầu', ['dau dau nhẹ', 'bi dau dau'], 'Nghỉ, uống đủ nước; đột ngột dữ dội → **khám** ngay.'],
    ['ho', 'ho khan', ['ho khan', 'ho lau ngay'], 'Uống ấm, ẩm phòng; ho ra máu, sốt cao → **khám**.'],
    ['sot', 'sốt', ['sot nhe', 'bi sot'], 'Nghỉ, nước/điện giải; sốt cao kéo dài → **khám**.'],
    ['met', 'mệt', ['met moi', 'rat met'], 'Ngủ đủ, ăn đủ; mệt kéo dài + sụt cân → **khám**.'],
    ['chong_mat', 'chóng mặt', ['chong mat', 'hoa mat'], 'Ngồi/cố định, uống nước; ngất, đau ngực → **115/khám**.'],
  ];
  for (const [id, label, keys, reply] of SYMPTOM_FAST) {
    all.push(instant(`sym_${id}`, label, 64, keys, reply + DISCLAIM));
  }

  const CHRONIC_FAST = [
    ['tieu_duong', 'tiểu đường', ['song voi tieu duong', 'duong huyet cao'], 'Theo dõi đường huyết, ăn đều; **không đổi thuốc** tự ý — theo bác sĩ.'],
    ['huyet_ap', 'huyết áp', ['huyet ap cao', 'ha huyet ap'], 'Giảm muối, vận động vừa; đo huyết áp đều — điều trị do **bác sĩ**.'],
    ['gan', 'gan nhiễm mỡ', ['gan nhiem mo', 'men gan cao'], 'Giảm cân, hạn chế rượu/ngọt; theo dõi men gan theo chỉ định.'],
    ['than', 'thận', ['suy than', 'benh than'], 'Hạn chế muối/protein theo **bác sĩ** — không tự chế độ.'],
    ['hen', 'hen suyễn', ['hen suyen', 'hen'], 'Tránh yếu tố kích thích; thuốc cắt cơn theo đơn — **không tự bỏ thuốc**.'],
  ];
  for (const [id, label, keys, reply] of CHRONIC_FAST) {
    all.push(instant(`chr_${id}`, label, 64, keys, reply + DISCLAIM));
  }

  const EXERCISE_FAST = [
    ['plank', 'plank', ['plank', 'bai plank'], 'Plank tốt cho core — giữ form, tăng dần thời gian.'],
    ['squat', 'squat', ['squat', 'ngoi squat'], 'Squat cơ bản tốt — gối theo mũi chân, không bẹp lưng.'],
    ['pushup', 'hít đất', ['hit dat', 'push up'], 'Chống đẩy tăng dầu số lần — đau vai → dừng.'],
    ['stretch', 'giãn cơ', ['gian co', 'stretching'], 'Giãn sau tập 5–10 phút — giảm cứng cơ.'],
    ['warmup', 'khởi động', ['khoi dong', 'warm up'], 'Khởi động 5–10 phút trước tập — giảm chấn thương.'],
  ];
  for (const [id, label, keys, reply] of EXERCISE_FAST) {
    all.push(instant(`fit_${id}`, label, 64, keys, reply + DISCLAIM));
  }

  const APP_FAST = [
    ['bmi_app', 'BMI app', ['bmi tren app', 'nhap bmi o dau'], 'Menu **BMI** → nhập chiều cao + cân → xem chỉ số và lịch sử.'],
    ['plan_app', 'Kế hoạch app', ['tao ke hoach tren app'], '**Kế hoạch** → điền form → tạo bản gợi ý tuần (AI nếu bật).'],
    ['export', 'Xuất dữ liệu', ['xuat du lieu', 'export du lieu'], 'Tính năng xuất (nếu có) trong **Hồ sơ / Cài đặt** — đăng nhập để đồng bộ.'],
  ];
  for (const [id, label, keys, reply] of APP_FAST) {
    all.push(instant(`app_${id}`, label, 67, keys, reply));
  }

  all.push(...buildRealworldInstantScenarios());

  const ids = new Set();
  for (const s of all) {
    if (ids.has(s.id)) throw new Error(`Trùng instant id: ${s.id}`);
    ids.add(s.id);
  }

  return all;
}

export function countInstantScenarios() {
  return buildInstantScenarios().length;
}
