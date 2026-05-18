/** Đường dẫn chuẩn — dùng xuyên suốt Header, Footer, CTA */
export const ROUTES = {
  home: '/',
  auth: {
    hub: '/dang-nhap',
    patientLogin: '/dang-nhap/benh-nhan',
    expertLogin: '/dang-nhap/chuyen-gia',
  },
  product: {
    features: '/san-pham/tinh-nang',
    security: '/san-pham/bao-mat',
    experts: '/san-pham/chuyen-gia',
    pricing: '/san-pham/bang-gia',
  },
  legal: {
    privacy: '/phap-ly/chinh-sach-bao-mat',
    terms: '/phap-ly/dieu-khoan',
    cookie: '/phap-ly/cookie',
    gdpr: '/phap-ly/gdpr',
  },
  app: {
    root: '/app',
    login: '/dang-nhap/benh-nhan',
    bmi: '/app/bmi',
    mood: '/app/mood',
    chat: '/app/chat',
    expertChat: '/app/expert-chat',
    plans: '/app/plans',
    rewards: '/app/rewards',
  },
  expert: {
    login: '/dang-nhap/chuyen-gia',
    root: '/expert',
    doctorDesk: '/expert/doctor-desk',
    settings: '/expert/settings',
  },
} as const;

/** Hồ sơ bệnh nhân trong dashboard chuyên gia */
export function expertPatientPath(patientId: string) {
  return `/expert/patients/${encodeURIComponent(patientId)}`;
}

/** Neo cuộn trên landing (trang chủ) */
export const LANDING_HASH = {
  features: 'tinh-nang',
  trust: 'tin-cay',
  consult: 'tu-van',
} as const;
