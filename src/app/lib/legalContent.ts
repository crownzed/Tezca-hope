import { ROUTES } from '../routes';

/** Ngày cập nhật hiển thị trên mọi tài liệu pháp lý */
export const LEGAL_LAST_UPDATED = '28/05/2026';

/** Kênh liên hệ quyền riêng tư / pháp lý — thay bằng email thật khi triển khai */
export const LEGAL_PRIVACY_EMAIL = 'privacy@tezca.vn';
export const LEGAL_SUPPORT_EMAIL = 'hotro@tezca.vn';

export type LegalDoc = {
  path: string;
  title: string;
  description: string;
};

export const LEGAL_DOCUMENTS: LegalDoc[] = [
  {
    path: ROUTES.legal.privacy,
    title: 'Chính sách bảo mật',
    description: 'Thu thập, sử dụng, lưu trữ và bảo vệ dữ liệu cá nhân & sức khỏe trên Tezca.',
  },
  {
    path: ROUTES.legal.terms,
    title: 'Điều khoản sử dụng',
    description: 'Quyền và nghĩa vụ khi dùng nền tảng, tài khoản, AI và tính năng chuyên gia.',
  },
  {
    path: ROUTES.legal.community,
    title: 'Quy tắc cộng đồng',
    description: 'Chuẩn ứng xử trên diễn đàn, phòng chat và cơ chế kiểm duyệt.',
  },
  {
    path: ROUTES.legal.cookie,
    title: 'Chính sách cookie',
    description: 'Cookie, local storage và công nghệ tương tự trên trình duyệt.',
  },
  {
    path: ROUTES.legal.gdpr,
    title: 'Thông báo GDPR',
    description: 'Quyền của cư dân EU/EEA và cơ sở xử lý theo GDPR.',
  },
];
