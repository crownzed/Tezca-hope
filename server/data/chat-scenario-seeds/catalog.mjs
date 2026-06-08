/**
 * Catalog seed → 500+ tình huống (sinh bằng từ khóa + tổ hợp).
 * Chạy: npm run chat:scenarios:build
 */

const LLM = {
  sleep: {
    systemAddon:
      'Chủ đề **giấc ngủ**: 2–4 câu thực tế (thói quen, ánh sáng, caffeine); gợi ý nhật ký; kéo dài → bác sĩ.',
    maxTokens: 480,
    temperature: 0.58,
  },
  nutrition: {
    systemAddon:
      'Chủ đề **dinh dưỡng**: 2–4 câu; gợi ý **Kế hoạch** Tezca; không liều thuốc/bổ sung cụ thể.',
    maxTokens: 520,
    temperature: 0.58,
  },
  exercise: {
    systemAddon:
      'Chủ đề **vận động**: 2–4 câu an toàn; tăng dần; đau/khó thở → dừng, gặp bác sĩ.',
    maxTokens: 480,
    temperature: 0.58,
  },
  mood: {
    systemAddon:
      'Chủ đề **cảm xúc/stress**: 2–4 câu đồng cảm; nhật ký cảm xúc; tự hại → 115.',
    maxTokens: 520,
    temperature: 0.58,
  },
  bmi: {
    systemAddon: 'Chủ đề **BMI/cân nặng**: 2–4 câu; mục BMI trên app; bệnh nền → bác sĩ.',
    maxTokens: 480,
    temperature: 0.58,
  },
  symptom: {
    systemAddon:
      'Chủ đề **triệu chứng chung** (không chẩn đoán): 2–4 câu giáo dục; triệu chứng nặng/đột ngột → khám/115.',
    maxTokens: 460,
    temperature: 0.56,
  },
  chronic: {
    systemAddon:
      'Chủ đề **bệnh nền / mãn tính**: 2–4 câu lối sống; nhấn theo hướng dẫn bác sĩ; không đổi thuốc.',
    maxTokens: 500,
    temperature: 0.56,
  },
  lifestyle: {
    systemAddon: 'Chủ đề **thói quen / lối sống**: 2–3 câu thực tế, không phán xét.',
    maxTokens: 440,
    temperature: 0.58,
  },
  womens: {
    systemAddon:
      'Chủ đề **sức khỏe phụ nữ**: 2–4 câu; mang thai/cho con bú/kỳ kinh → bác sĩ sản/phụ khoa.',
    maxTokens: 500,
    temperature: 0.56,
  },
  mens: {
    systemAddon: 'Chủ đề **sức khỏe nam**: 2–4 câu giáo dục; không thay tư vấn y khoa.',
    maxTokens: 460,
    temperature: 0.58,
  },
  app: {
    systemAddon:
      'Chủ đề **dùng app Tezca**: 2–3 câu hướng dẫn tính năng (BMI, Kế hoạch, nhật ký, chat chuyên gia).',
    maxTokens: 380,
    temperature: 0.55,
  },
  substance: {
    systemAddon:
      'Chủ đề **chất kích thích / rượu / thuốc lá**: 2–3 câu giảm hại; cai nghiện khó → hỗ trợ chuyên môn.',
    maxTokens: 440,
    temperature: 0.56,
  },
};

/**
 * @param {string} id
 * @param {string} label
 * @param {number} weight
 * @param {string[]} keywords
 * @param {keyof typeof LLM} llmKey
 * @param {string[]} [none]
 */
function scenario(id, label, weight, keywords, llmKey, none = []) {
  return {
    id,
    label,
    weight,
    mode: 'llm',
    match: { type: 'keywords', any: keywords, ...(none.length ? { none } : {}) },
    llm: { ...LLM[llmKey] },
  };
}

/** @param {Array<{ id: string; label: string; keywords: string[] }>} items */
function batch(prefix, weight, llmKey, items) {
  return items.map(({ id, label, keywords }) =>
    scenario(`${prefix}_${id}`, label, weight, keywords, llmKey),
  );
}

/** Sinh tổ hợp — mỗi cặp = 1 tình huống */
function combine(prefix, weight, llmKey, left, right, labelFn) {
  const out = [];
  for (const a of left) {
    for (const b of right) {
      const id = `${prefix}_${a.k}_${b.k}`.replace(/[^a-z0-9_]/g, '_').slice(0, 64);
      out.push(
        scenario(
          id,
          labelFn(a, b),
          weight,
          [...new Set([...a.words, ...b.words, `${a.words[0]} ${b.words[0]}`.trim()])],
          llmKey,
        ),
      );
    }
  }
  return out;
}

const GOALS = [
  { k: 'giam', words: ['giam can', 'giam mo', 'giam can an toan'] },
  { k: 'tang', words: ['tang can', 'tang can lanh manh'] },
  { k: 'co', words: ['tang co', 'tang co nac', 'co bap'] },
  { k: 'duy_tri', words: ['duy tri can', 'on dinh can nang'] },
  { k: 'suc_khoe', words: ['suc khoe tong the', 'an lanh manh'] },
];

const MEALS = [
  { k: 'sang', words: ['bua sang', 'an sang'] },
  { k: 'trua', words: ['bua trua', 'an trua'] },
  { k: 'toi', words: ['bua toi', 'an toi'] },
  { k: 'vat', words: ['an vat', 'doi bung'] },
  { k: 'dem', words: ['an dem', 'an khoa'] },
];

const ACT_TYPES = [
  { k: 'gym', words: ['tap gym', 'nang ta'] },
  { k: 'chay', words: ['chay bo', 'chay bo'] },
  { k: 'bo', words: ['di bo', 'di bo nhe'] },
  { k: 'yoga', words: ['yoga', 'stretching'] },
  { k: 'boi', words: ['boi loi', 'boi'] },
  { k: 'xe', words: ['dap xe', 'dap xe dap'] },
  { k: 'hit', words: ['hit', 'hiit', 'tap cang dau'] },
  { k: 'home', words: ['tap tai nha', 'bai tap tai nha'] },
];

const LEVELS = [
  { k: 'moi', words: ['moi bat dau', 'nguoi moi'] },
  { k: 'tb', words: ['trung binh', 'tap thuong xuyen'] },
  { k: 'cao', words: ['cao', 'tap nang'] },
  { k: 'phuc_hoi', words: ['phuc hoi', 'rest day'] },
  { k: 'chan_thuong', words: ['chan thuong', 'dau khop'] },
];

const MOOD_TAGS = [
  { k: 'stress', words: ['stress', 'cang thang'] },
  { k: 'buon', words: ['buon', 'buon chan'] },
  { k: 'lo', words: ['lo lang', 'hoang mang'] },
  { k: 'met', words: ['met moi', 'kiet suc'] },
  { k: 'kho_tap', words: ['kho tap trung', 'tri hoan'] },
  { k: 'soc', words: ['soc', 'suy giam tam ly'] },
  { k: 'dong_luc', words: ['mat dong luc', 'chan nan'] },
  { k: 'tu_tin', words: ['tu tin', 'tu tin hon'] },
];

const COPING = [
  { k: 'tho', words: ['tho bung', 'hit tho'] },
  { k: 'nhat_ky', words: ['nhat ky cam xuc', 'ghi cam xuc'] },
  { k: 'di_bo', words: ['di bo', 'ra ngoai'] },
  { k: 'ngu', words: ['ngu du', 'nghi ngoi'] },
  { k: 'ban_be', words: ['noi chuyen', 'ho tro xa hoi'] },
];

const SLEEP_ISSUES = [
  ['insomnia', 'Mất ngủ', ['mat ngu', 'kho ngu', 'tron giac']],
  ['early_wake', 'Thức sớm', ['thuc som', 'day som som']],
  ['snore', 'Ngáy', ['ngu ngay', 'ngu bi ngay', 'danh thuc ban dem']],
  ['nap', 'Ngủ trưa', ['ngu trua', 'gap trua']],
  ['screen', 'Màn hình trước ngủ', ['dien thoai truoc ngu', 'xanh duong']],
  ['caffeine', 'Caffeine & ngủ', ['cafe muon', 'tra den ngu']],
  ['shift', 'Ca đêm', ['ca dem', 'lam dem']],
  ['jetlag', 'Jet lag', ['jet lag', 'mui gio']],
  ['nightmare', 'Ác mộng', ['ac mong', 'mo hon mong']],
  ['restless', 'Bồn chừ', ['bon chung', 'luong phai']],
];

const SYMPTOM_PAIRS = [
  ['dau_dau', 'Đau đầu', ['dau dau', 'nhuc dau']],
  ['dau_lung', 'Đau lưng', ['dau lung', 'lung duoi']],
  ['dau_bung', 'Đau bụng', ['dau bung', 'kho tieu']],
  ['ho', 'Ho', ['ho', 'ho khan']],
  ['sot', 'Sốt', ['sot', 'sot nhe']],
  ['chong_mat', 'Chóng mặt', ['chong mat', 'hoa mat']],
  ['dau_hong', 'Đau họng', ['dau hong', 'vien hong']],
  ['di_ung', 'Dị ứng', ['di ung', 'ngua']],
  ['tieu_chay', 'Tiêu chảy', ['tieu chay', 'ran loan tieu hoa']],
  ['tao_bon', 'Táo bón', ['tao bon', 'kho di ve sinh']],
  ['dau_co', 'Đau cơ', ['dau co', 'bi bat co']],
  ['phan_ung', 'Phát ban', ['phan ung da', 'noi me day']],
  ['met_immune', 'Mệt kéo dài', ['met keo dai', 'met bat thuong']],
  ['sut_can', 'Sụt cân', ['sut can', 'giam can bat thuong']],
  ['thirst', 'Khát nước', ['khat nuoc', 'khat nhieu']],
];

const CHRONIC = [
  ['tieu_duong', 'Tiểu đường', ['tieu duong', 'duong huyet']],
  ['huyet_ap', 'Huyết áp', ['huyet ap', 'ha huyet ap', 'cao huyet ap']],
  ['gan', 'Gan', ['gan nhiem mo', 'men gan']],
  ['than', 'Thận', ['than', 'suy than']],
  ['tim', 'Tim mạch', ['tim mach', 'cholesterol']],
  ['thoai_hoa', 'Thoái hóa', ['thoai hoa', 'khop']],
  ['gout', 'Gout', ['gout', 'acid uric']],
  ['viem_khop', 'Viêm khớp', ['viem khop', 'dau khop man']],
  ['hen', 'Hen suyễn', ['hen suyen', 'kho tho man']],
  ['viem_da', 'Da liễu', ['viem da', 'mun an nang']],
  ['dao_on', 'Rối loạn nội tiết', ['noi tiết', 'roi loan noi tiết']],
  ['mien_dich', 'Miễn dịch', ['mien dich', 'tu mien']],
];

const WOMENS = [
  ['kinh', 'Kỳ kinh', ['ky kinh', 'dau bung kinh']],
  ['pcos', 'PCOS', ['pcos', 'buong trung da nang']],
  ['mang_thai', 'Mang thai', ['mang thai', 'thai ky']],
  ['cho_con_bu', 'Cho con bú', ['cho con bu', 'sua me']],
  ['menopause', 'Mãn kinh', ['man kinh', 'tam ngung kinh']],
  ['vo_sinh', 'Vô sinh hiếm muộn', ['hiem muon', 'vo sinh']],
  ['pill', 'Thuốc tránh thai', ['thuoc tranh thai', 'ngua thai']],
];

const SUBSTANCES = [
  ['cafe', 'Cà phê', ['ca phe', 'caffeine']],
  ['ruou', 'Rượu bia', ['ruou', 'bia', 'uong ruou']],
  ['thuoc_la', 'Thuốc lá', ['thuoc la', 'hat thuoc']],
  ['vape', 'Vape', ['vape', 'dien tu']],
  ['duong', 'Đường/ngọt', ['an ngot', 'duong', 'tra sua']],
  ['muoi', 'Muối', ['an man', 'muoi nhieu']],
];

const APP_FEATURES = [
  ['bmi', 'Tính BMI', ['tinh bmi', 'nhap bmi', 'muc bmi', 'tren app', 'huong dan app', 'tinh bmi tren app']],
  ['ke_hoach', 'Kế hoạch', ['ke hoach', 'lap ke hoach']],
  ['nhat_ky', 'Nhật ký cảm xúc', ['nhat ky cam xuc', 'ghi mood']],
  ['chuyen_gia', 'Chat chuyên gia', ['chat chuyen gia', 'bac si tren app']],
  ['community', 'Cộng đồng', ['cong dong', 'dien dan']],
  ['dang_nhap', 'Đăng nhập', ['dang nhap', 'tai khoan']],
  ['mat_khau', 'Mật khẩu', ['mat khau', 'quen mat khau']],
  ['ho so', 'Hồ sơ sức khỏe', ['ho so suc khoe', 'cap nhat ho so']],
];

/** @returns {object[]} */
export function buildCatalogScenarios() {
  const all = [];

  all.push(
    ...batch(
      'sleep',
      58,
      'sleep',
      SLEEP_ISSUES.map(([id, label, keywords]) => ({ id, label, keywords })),
    ),
  );

  all.push(
    ...combine('nut', 57, 'nutrition', MEALS, GOALS, (m, g) => `${m.words[0]} — ${g.words[0]}`),
  );

  all.push(
    ...combine('fit', 56, 'exercise', ACT_TYPES, LEVELS, (a, l) => `${a.words[0]} — ${l.words[0]}`),
  );

  all.push(
    ...combine('mood', 59, 'mood', MOOD_TAGS, COPING, (m, c) => `${m.words[0]} — ${c.words[0]}`),
  );

  const BMI_CONTEXT = [
    { k: 'tre', words: ['tre em', 'bmi tre em'] },
    { k: 'teen', words: ['vi thanh nien', 'tuoi day thi'] },
    { k: 'office', words: ['van phong', 'it van dong'] },
    { k: 'sau_sinh', words: ['sau sinh', 'sau de'] },
    { k: 'cao_tuoi', words: ['nguoi gia', 'cao tuoi'] },
  ];
  const BMI_Q = [
    { k: 'co_hoi', words: ['bmi bao nhieu', 'chi so bmi'] },
    { k: 'cao', words: ['bmi cao', 'thua can'] },
    { k: 'thap', words: ['bmi thap', 'gay'] },
    { k: 'muc_tieu', words: ['muc tieu can nang', 'can nang ly tuong'] },
    { k: 'do_chinh', words: ['do chinh xac bmi', 'bmi co chinh xac khong'] },
  ];
  all.push(...combine('bmi', 61, 'bmi', BMI_Q, BMI_CONTEXT, (q, c) => `BMI ${q.words[0]} — ${c.words[0]}`));

  all.push(
    ...batch(
      'sym',
      55,
      'symptom',
      SYMPTOM_PAIRS.map(([id, label, keywords]) => ({ id, label, keywords })),
    ),
  );

  all.push(
    ...batch(
      'chr',
      54,
      'chronic',
      CHRONIC.map(([id, label, keywords]) => ({ id, label, keywords })),
    ),
  );

  all.push(
    ...batch(
      'wom',
      53,
      'womens',
      WOMENS.map(([id, label, keywords]) => ({ id, label, keywords })),
    ),
  );

  all.push(
    ...batch(
      'sub',
      52,
      'substance',
      SUBSTANCES.map(([id, label, keywords]) => ({ id, label, keywords })),
    ),
  );

  all.push(
    ...batch(
      'app',
      63,
      'app',
      APP_FEATURES.map(([id, label, keywords]) => ({ id, label, keywords })),
    ),
  );

  const FOODS = [
    'ga', 'bo', 'ca', 'trung', 'sua', 'com', 'yen mach', 'khoai tay', 'salad', 'hoa qua',
    'rau xanh', 'dau phu', 'hat dieu', 'banh mi', 'mi y', 'lau', 'fast food', 'chay',
    'eat clean', 'keto', 'low carb', 'intermittent fasting', 'nhin an', 'meal prep',
    'pho', 'bun', 'xoi', 'che', 'sinh to', 'sua chua', 'phomai', 'thit heo', 'tom',
    'cua', 'muc', 'dau an', 'oliu', 'bo dam', 'mat ong',
  ];
  const FOOD_Q = ['an duoc khong', 'bao nhieu calo', 'thay the', 'an toi', 'an sang', 'giam mo'];
  for (const food of FOODS) {
    for (const q of FOOD_Q) {
      const id = `food_${food}_${q}`.replace(/\s+/g, '_').slice(0, 48);
      all.push(
        scenario(
          id,
          `${food} — ${q}`,
          56,
          [`${food}`, q, `${q} ${food}`],
          'nutrition',
        ),
      );
    }
  }

  const LIFESTYLE = [
    ['nuoc', 'Uống nước', ['uong nuoc', 'nuoc loc', 'mat nuoc', 'nhieu nuoc', 'bao nhieu nuoc']],
    ['buoc_chan', 'Bước chân', ['buoc chan', '10000 buoc']],
    ['dung', 'Đứng lâu', ['dung lau', 'van phong dung']],
    ['ergonomic', 'Công thái', ['cong thai hoc', 'tu the ngoi']],
    ['lanh', 'Tập lạnh', ['tap lanh', 'tam lanh']],
    ['nang', 'Tập nắng', ['tap nang', 'nang nong']],
    ['wfh', 'Làm tại nhà', ['lam tai nha', 'wfh']],
    ['shift_work', 'Ca kíp', ['ca kip', 'lam ca']],
  ];
  all.push(
    ...batch(
      'life',
      52,
      'lifestyle',
      LIFESTYLE.map(([id, label, keywords]) => ({ id, label, keywords })),
    ),
  );

  const MENS = [
    ['prostate', 'Tiền liệt tuyến', ['tien liet tuyen', 'tiet nieu']],
    ['testosterone', 'Testosterone', ['testosterone', 'noi tiết nam']],
    ['rung', 'Rối loạn cương', ['roi loan cuong duong', 'sinh ly nam']],
    ['gym_nam', 'Gym nam', ['tap gym nam', 'tang co nam']],
  ];
  all.push(
    ...batch(
      'men',
      52,
      'mens',
      MENS.map(([id, label, keywords]) => ({ id, label, keywords })),
    ),
  );

  const DETAIL_PHRASES = [
    'lam sao de', 'huong dan', 'goi y', 'vi du cu the', 'checklist', 'lich trinh',
    'thuc don mau', 'bai tap mau', 'tuan 1', 'tuan 2', 'thang dau', 'ke hoach chi tiet',
    'phan tich', 'so sanh', 'uu nhuoc diem',
  ];
  const DETAIL_TOPICS = [
    'an', 'tap', 'ngu', 'giam can', 'tang co', 'stress', 'nuoc', 'protein', 'cardio', 'bmi',
  ];

  const BODY = [
    { k: 'co_tay', words: ['co tay', 'co'] },
    { k: 'co_chan', words: ['co chan'] },
    { k: 'khop', words: ['khop', 'khop goi'] },
    { k: 'co_vai', words: ['co vai'] },
    { k: 'bung', words: ['bung', 'mo bung'] },
    { k: 'chan', words: ['chan', 'phu chan'] },
    { k: 'tay', words: ['tay', 'mo tay'] },
    { k: 'co_lung', words: ['co lung', 'lung'] },
  ];
  const CONCERN = [
    { k: 'dau', words: ['dau', 'nhuc'] },
    { k: 'cang', words: ['cang', 'stiff'] },
    { k: 'yeu', words: ['yeu', 'suy yeu'] },
    { k: 'teo', words: ['teo', 'mat co'] },
    { k: 'phu', words: ['phu', 'san phu'] },
    { k: 'cai_thien', words: ['cai thien', 'tang cuong'] },
  ];
  all.push(
    ...combine('body', 54, 'symptom', BODY, CONCERN, (b, c) => `${b.words[0]} — ${c.words[0]}`),
  );
  for (const p of DETAIL_PHRASES) {
    for (const t of DETAIL_TOPICS) {
      all.push(
        scenario(
          `det_${p}_${t}`.replace(/\s+/g, '_').slice(0, 48),
          `Chi tiết: ${p} — ${t}`,
          55,
          [`${p} ${t}`],
          'nutrition',
        ),
      );
    }
  }

  const ids = new Set();
  for (const s of all) {
    if (ids.has(s.id)) throw new Error(`Trùng id trong catalog: ${s.id}`);
    ids.add(s.id);
  }

  return all;
}

export function countCatalogScenarios() {
  return buildCatalogScenarios().length;
}
