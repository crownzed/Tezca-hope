import { Link } from 'react-router';
import { ROUTES, LANDING_HASH } from '../routes';
import { tezcaTheme } from '../lib/tezcaTheme';

const productLinks = [
  { label: 'Tính năng', to: { pathname: ROUTES.home, hash: LANDING_HASH.features } },
  { label: 'Cộng đồng', to: ROUTES.community.forum },
  { label: 'Tin cậy', to: { pathname: ROUTES.home, hash: LANDING_HASH.trust } },
  { label: 'Bảo mật', to: ROUTES.product.security },
  { label: 'Chuyên gia', to: ROUTES.product.experts },
  { label: 'Bảng giá', to: ROUTES.product.pricing },
] as const;

const legalLinks = [
  { label: 'Pháp lý', to: ROUTES.legal.root },
  { label: 'Chính sách bảo mật', to: ROUTES.legal.privacy },
  { label: 'Điều khoản', to: ROUTES.legal.terms },
  { label: 'Quy tắc cộng đồng', to: ROUTES.legal.community },
  { label: 'Cookie', to: ROUTES.legal.cookie },
  { label: 'GDPR', to: ROUTES.legal.gdpr },
] as const;

export function Footer() {
  return (
    <footer className="px-6 py-12 border-t" style={{ borderColor: tezcaTheme.border }}>
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          <div className="md:col-span-2">
            <Link to={ROUTES.home} className="inline-flex items-center gap-2 mb-4 no-underline">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: tezcaTheme.accentLight }}>
                <span className="text-white text-xl font-bold">T</span>
              </div>
              <span className="text-3xl font-semibold" style={{ color: tezcaTheme.text }}>
                Tezca
              </span>
            </Link>
            <p className="opacity-60 leading-relaxed max-w-md" style={{ color: tezcaTheme.text }}>
              Nền tảng chăm sóc sức khỏe toàn diện, kết hợp AI và chuyên gia y tế để mang đến trải nghiệm cá nhân hóa tốt nhất.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4" style={{ color: tezcaTheme.text }}>
              Sản phẩm
            </h4>
            <ul className="space-y-3">
              {productLinks.map((item) => (
                <li key={item.label}>
                  <Link
                    to={item.to}
                    className="opacity-60 hover:opacity-100 transition-opacity"
                    style={{ color: tezcaTheme.text }}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4" style={{ color: tezcaTheme.text }}>
              Pháp lý
            </h4>
            <ul className="space-y-3">
              {legalLinks.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="opacity-60 hover:opacity-100 transition-opacity"
                    style={{ color: tezcaTheme.text }}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div
          className="pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4"
          style={{ borderColor: tezcaTheme.border }}
        >
          <p className="text-sm opacity-50 m-0" style={{ color: tezcaTheme.text }}>
            © 2026 Tezca. All rights reserved.
          </p>

          <a
            href="mailto:support@tezca.vn"
            className="text-sm opacity-50 hover:opacity-100 transition-opacity"
            style={{ color: tezcaTheme.text }}
          >
            support@tezca.vn
          </a>
        </div>
      </div>
    </footer>
  );
}
