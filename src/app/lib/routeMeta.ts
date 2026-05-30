import { ROUTES } from '../routes';

export type BreadcrumbItem = {
  label: string;
  to?: string;
};

export type RouteMeta = {
  title: string;
  section?: string;
  breadcrumbs: BreadcrumbItem[];
};

const SITE = 'Tezca';

function meta(title: string, breadcrumbs: BreadcrumbItem[], section?: string): RouteMeta {
  return {
    title: `${title} · ${SITE}`,
    section,
    breadcrumbs,
  };
}

const appRoot: BreadcrumbItem = { label: 'Ứng dụng', to: ROUTES.app.dashboard };
const expertRoot: BreadcrumbItem = { label: 'Chuyên gia', to: ROUTES.expert.customers.root };

/** Metadata theo pathname (sau redirect). */
export function getRouteMeta(pathname: string): RouteMeta | null {
  const p = pathname.replace(/\/$/, '') || '/';

  if (p === ROUTES.home) {
    return meta('Trang chủ', [{ label: 'Trang chủ' }]);
  }

  if (p === ROUTES.auth.hub) return meta('Đăng nhập', [{ label: 'Đăng nhập' }]);
  if (p === ROUTES.auth.customerLogin) {
    return meta('Đăng nhập khách hàng', [
      { label: 'Đăng nhập', to: ROUTES.auth.hub },
      { label: 'Khách hàng' },
    ]);
  }
  if (p === ROUTES.auth.expertLogin) {
    return meta('Đăng nhập chuyên gia', [
      { label: 'Đăng nhập', to: ROUTES.auth.hub },
      { label: 'Chuyên gia' },
    ]);
  }
  if (p === ROUTES.auth.forgotPassword) {
    return meta('Quên mật khẩu', [{ label: 'Quên mật khẩu' }]);
  }
  if (p === ROUTES.auth.resetPassword) {
    return meta('Đặt lại mật khẩu', [{ label: 'Đặt lại mật khẩu' }]);
  }

  if (p.startsWith(ROUTES.product.root)) {
    const map: Record<string, string> = {
      [ROUTES.product.features]: 'Tính năng',
      [ROUTES.product.security]: 'Bảo mật',
      [ROUTES.product.experts]: 'Chuyên gia đồng hành',
      [ROUTES.product.pricing]: 'Bảng giá',
    };
    const label = map[p] ?? 'Sản phẩm';
    return meta(label, [{ label: 'Sản phẩm', to: ROUTES.product.features }, { label }]);
  }

  if (p.startsWith(ROUTES.legal.root)) {
    const map: Record<string, string> = {
      [ROUTES.legal.root]: 'Trung tâm pháp lý',
      [ROUTES.legal.privacy]: 'Chính sách bảo mật',
      [ROUTES.legal.terms]: 'Điều khoản',
      [ROUTES.legal.community]: 'Quy tắc cộng đồng',
      [ROUTES.legal.cookie]: 'Cookie',
      [ROUTES.legal.gdpr]: 'GDPR',
    };
    const label = map[p] ?? 'Pháp lý';
    const crumbs =
      p === ROUTES.legal.root
        ? [{ label }]
        : [{ label: 'Pháp lý', to: ROUTES.legal.root }, { label }];
    return meta(label, crumbs);
  }

  if (p === ROUTES.app.root || p === ROUTES.app.dashboard) {
    return meta('Trung tâm Kỷ luật', [appRoot], 'Kỷ luật');
  }
  if (p === ROUTES.app.health.bmi || p === ROUTES.app.health.profile) {
    return meta('Theo dõi sức khỏe', [appRoot, { label: 'Sức khỏe', to: ROUTES.app.health.root }, { label: 'BMI & hồ sơ' }], 'Sức khỏe');
  }
  if (p === ROUTES.app.health.mood) {
    return meta('Nhật ký cảm xúc', [appRoot, { label: 'Sức khỏe', to: ROUTES.app.health.root }, { label: 'Cảm xúc' }], 'Sức khỏe');
  }
  if (p === ROUTES.app.health.root) {
    return meta('Sức khỏe', [appRoot, { label: 'Sức khỏe' }], 'Sức khỏe');
  }
  if (p === ROUTES.app.assist.aiChat) {
    return meta('Tezca AI', [appRoot, { label: 'Hỗ trợ', to: ROUTES.app.assist.root }, { label: 'Tezca AI' }], 'Hỗ trợ');
  }
  if (p === ROUTES.app.assist.expertChat) {
    return meta('Chat chuyên gia', [appRoot, { label: 'Hỗ trợ', to: ROUTES.app.assist.root }, { label: 'Chat chuyên gia' }], 'Hỗ trợ');
  }
  if (p === ROUTES.app.chooseExpert) {
    return meta('Chọn chuyên gia', [appRoot, { label: 'Hỗ trợ', to: ROUTES.app.assist.root }, { label: 'Chọn chuyên gia' }], 'Hỗ trợ');
  }
  if (p === ROUTES.app.assist.root) {
    return meta('Hỗ trợ', [appRoot, { label: 'Hỗ trợ' }], 'Hỗ trợ');
  }
  if (p === ROUTES.app.plans || p === ROUTES.app.planSection.root) {
    return meta('Kế hoạch luyện tập', [appRoot, { label: 'Kế hoạch', to: ROUTES.app.planSection.root }, { label: 'Luyện tập' }], 'Kế hoạch');
  }
  if (p === ROUTES.app.rewards || p === ROUTES.app.achievementSection.root) {
    return meta('Phần thưởng', [appRoot, { label: 'Thành tựu', to: ROUTES.app.achievementSection.root }, { label: 'Phần thưởng' }], 'Thành tựu');
  }
  if (p === ROUTES.community.root) {
    return meta('Cộng đồng', [{ label: 'Cộng đồng', to: ROUTES.community.forum }], 'Cộng đồng');
  }
  if (p === ROUTES.community.forum) {
    return meta('Diễn đàn', [{ label: 'Cộng đồng', to: ROUTES.community.forum }, { label: 'Diễn đàn' }], 'Cộng đồng');
  }
  if (p === ROUTES.community.rooms) {
    return meta('Phòng chat', [{ label: 'Cộng đồng', to: ROUTES.community.forum }, { label: 'Phòng chat' }], 'Cộng đồng');
  }
  if (p === ROUTES.app.community || p.startsWith('/app/cong-dong')) {
    return meta('Cộng đồng', [{ label: 'Cộng đồng', to: ROUTES.community.forum }], 'Cộng đồng');
  }

  if (p === ROUTES.expert.customers.root || p === ROUTES.expert.root) {
    return meta('Danh sách khách hàng', [expertRoot], 'Khách hàng');
  }
  if (p.startsWith(`${ROUTES.expert.customers.root}/`)) {
    return meta('Hồ sơ khách hàng', [expertRoot, { label: 'Hồ sơ' }], 'Khách hàng');
  }
  if (p === ROUTES.expert.workspace.root) {
    return meta('Doctor Desk', [expertRoot, { label: 'Doctor Desk' }], 'Doctor Desk');
  }
  if (p.startsWith(`${ROUTES.expert.workspace.root}/`)) {
    return meta('Doctor Desk', [expertRoot, { label: 'Doctor Desk', to: ROUTES.expert.workspace.root }, { label: 'Phiên chat' }], 'Doctor Desk');
  }
  if (p === ROUTES.expert.reports.weekly) {
    return meta('Báo cáo tuần', [expertRoot, { label: 'Báo cáo', to: ROUTES.expert.reports.root }, { label: 'Tuần' }], 'Báo cáo');
  }
  if (p === ROUTES.expert.settings) {
    return meta('Cài đặt', [expertRoot, { label: 'Cài đặt' }], 'Cài đặt');
  }

  return null;
}
