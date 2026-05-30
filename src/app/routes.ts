/**
 * Đường dẫn chuẩn — cấu trúc phân cấp (section / feature / action).
 * Các path phẳng cũ vẫn redirect trong App.tsx.
 */
export const ROUTES = {
  home: '/',
  auth: {
    hub: '/dang-nhap',
    customerLogin: '/dang-nhap/khach-hang',
    expertLogin: '/dang-nhap/chuyen-gia',
    adminLogin: '/dang-nhap/quan-tri',
    forgotPassword: '/quen-mat-khau',
    resetPassword: '/dat-lai-mat-khau',
  },
  product: {
    root: '/san-pham',
    features: '/san-pham/tinh-nang',
    security: '/san-pham/bao-mat',
    experts: '/san-pham/chuyen-gia',
    pricing: '/san-pham/bang-gia',
  },
  legal: {
    root: '/phap-ly',
    privacy: '/phap-ly/chinh-sach-bao-mat',
    terms: '/phap-ly/dieu-khoan',
    community: '/phap-ly/quy-tac-cong-dong',
    cookie: '/phap-ly/cookie',
    gdpr: '/phap-ly/gdpr',
  },
  /** Ứng dụng khách hàng */
  app: {
    root: '/app',
    login: '/dang-nhap/khach-hang',
    dashboard: '/app/trung-tam-ky-luat',
    health: {
      root: '/app/suc-khoe',
      bmi: '/app/suc-khoe/bmi',
      mood: '/app/suc-khoe/cam-xuc',
      /** @deprecated — gộp vào BMI */
      profile: '/app/suc-khoe/bmi',
    },
    assist: {
      root: '/app/ho-tro',
      aiChat: '/app/ho-tro/tezca-ai',
      expertChat: '/app/ho-tro/chat-chuyen-gia',
      chooseExpert: '/app/ho-tro/chon-chuyen-gia',
    },
    planSection: {
      root: '/app/ke-hoach',
      training: '/app/ke-hoach/luyen-tap',
    },
    achievementSection: {
      root: '/app/thanh-tuu',
      rewards: '/app/thanh-tuu/phan-thuong',
    },
    communitySection: {
      /** @deprecated — dùng ROUTES.community */
      root: '/cong-dong',
      forum: '/cong-dong/dien-dan',
    },
    /** Alias ngắn — dùng trong toàn codebase */
    bmi: '/app/suc-khoe/bmi',
    mood: '/app/suc-khoe/cam-xuc',
    chat: '/app/ho-tro/tezca-ai',
    expertChat: '/app/ho-tro/chat-chuyen-gia',
    chooseExpert: '/app/ho-tro/chon-chuyen-gia',
    plans: '/app/ke-hoach/luyen-tap',
    rewards: '/app/thanh-tuu/phan-thuong',
    /** Alias → khu vực cộng đồng độc lập */
    community: '/cong-dong/dien-dan',
    /** @deprecated alias — hồ sơ bệnh lý nằm trong trang BMI */
    healthProfile: '/app/suc-khoe/bmi',
  },
  /** Doctor Desk & quản lý khách hàng */
  expert: {
    root: '/expert',
    login: '/dang-nhap/chuyen-gia',
    customers: {
      root: '/expert/khach-hang',
      detail: (customerId: string) => expertCustomerPath(customerId),
    },
    workspace: {
      root: '/expert/ban-lam-viec',
      desk: (customerId?: string) => expertDoctorDeskPath(customerId),
    },
    reports: {
      root: '/expert/bao-cao',
      weekly: '/expert/bao-cao/tuan',
    },
    settings: '/expert/cai-dat',
    /** Alias phẳng */
    doctorDesk: '/expert/ban-lam-viec',
    weeklyReport: '/expert/bao-cao/tuan',
  },
  admin: {
    root: '/admin',
    login: '/dang-nhap/quan-tri',
    dashboard: '/admin/quan-ly',
    experts: '/admin/chuyen-gia',
    customers: '/admin/khach-hang',
  },
  /** Cộng đồng — khu chức năng riêng (không nằm trong shell /app) */
  community: {
    root: '/cong-dong',
    forum: '/cong-dong/dien-dan',
    rooms: '/cong-dong/phong-chat',
    announcements: '/cong-dong/thong-bao',
    dm: '/cong-dong/tin-nhan',
  },
} as const;

/** Hồ sơ khách hàng — workspace chuyên gia */
export function expertCustomerPath(customerId: string) {
  return `/expert/khach-hang/${encodeURIComponent(customerId)}`;
}

/** Doctor Desk — tùy chọn khách hàng đang chọn */
export function expertDoctorDeskPath(customerId?: string) {
  const base = ROUTES.expert.workspace.root;
  if (!customerId) return base;
  return `${base}/${encodeURIComponent(customerId)}`;
}

/** Đường dẫn cộng đồng — Diễn đàn hoặc Phòng chat */
export function appCommunityPath(tab?: 'forum' | 'rooms' | 'announcements' | 'dm') {
  if (!tab || tab === 'forum') return ROUTES.community.forum;
  if (tab === 'rooms') return ROUTES.community.rooms;
  if (tab === 'announcements') return ROUTES.community.announcements;
  return ROUTES.community.dm;
}

/** Neo cuộn trên landing (trang chủ) */
export const LANDING_HASH = {
  features: 'tinh-nang',
  community: 'cong-dong',
  trust: 'tin-cay',
  consult: 'tu-van',
} as const;

/** Path cũ → path mới (redirect 301 logic phía client) */
export const LEGACY_APP_REDIRECTS: Record<string, string> = {
  '/app/bmi': ROUTES.app.bmi,
  '/app/mood': ROUTES.app.mood,
  '/app/chat': ROUTES.app.chat,
  '/app/expert-chat': ROUTES.app.expertChat,
  '/app/plans': ROUTES.app.plans,
  '/app/rewards': ROUTES.app.rewards,
  '/app/cong-dong': ROUTES.community.forum,
  '/app/cong-dong/dien-dan': ROUTES.community.forum,
};

export const LEGACY_EXPERT_REDIRECTS: Record<string, string> = {
  '/expert/doctor-desk': ROUTES.expert.doctorDesk,
  '/expert/bao-cao-tuan': ROUTES.expert.weeklyReport,
  '/expert/settings': ROUTES.expert.settings,
  '/expert/dashboard': ROUTES.expert.doctorDesk,
};
