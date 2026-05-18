import { Link } from 'react-router';
import { ROUTES, LANDING_HASH } from '../routes';

const productLinks = [
  { label: 'Tính năng', to: ROUTES.product.features },
  { label: 'Bảo mật', to: ROUTES.product.security },
  { label: 'Chuyên gia', to: ROUTES.product.experts },
  { label: 'Bảng giá', to: ROUTES.product.pricing },
] as const;

const legalLinks = [
  { label: 'Chính sách bảo mật', to: ROUTES.legal.privacy },
  { label: 'Điều khoản sử dụng', to: ROUTES.legal.terms },
  { label: 'Cookie', to: ROUTES.legal.cookie },
  { label: 'GDPR', to: ROUTES.legal.gdpr },
] as const;

export function Footer() {
  return (
    <footer className="px-6 py-12 border-t" style={{ borderColor: 'rgba(26, 32, 44, 0.08)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          <div className="md:col-span-2">
            <Link to={ROUTES.home} className="inline-flex items-center gap-2 mb-4 no-underline">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#2DD4BF' }}>
                <span className="text-white text-xl font-bold">T</span>
              </div>
              <span className="text-3xl font-semibold" style={{ color: '#1A202C' }}>
                Tezca
              </span>
            </Link>
            <p className="opacity-60 leading-relaxed max-w-md" style={{ color: '#1A202C' }}>
              Nền tảng chăm sóc sức khỏe toàn diện, kết hợp AI và chuyên gia y tế để mang đến trải nghiệm cá nhân hóa tốt nhất.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4" style={{ color: '#1A202C' }}>
              Sản phẩm
            </h4>
            <ul className="space-y-3">
              {productLinks.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="opacity-60 hover:opacity-100 transition-opacity"
                    style={{ color: '#1A202C' }}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4" style={{ color: '#1A202C' }}>
              Pháp lý
            </h4>
            <ul className="space-y-3">
              {legalLinks.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="opacity-60 hover:opacity-100 transition-opacity"
                    style={{ color: '#1A202C' }}
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
          style={{ borderColor: 'rgba(26, 32, 44, 0.08)' }}
        >
          <p className="text-sm opacity-50 m-0" style={{ color: '#1A202C' }}>
            © 2026 Tezca. All rights reserved.
          </p>

          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            <a
              href="mailto:support@tezca.vn"
              className="text-sm opacity-50 hover:opacity-100 transition-opacity"
              style={{ color: '#1A202C' }}
            >
              support@tezca.vn
            </a>
            <Link
              to={ROUTES.legal.privacy}
              className="text-sm opacity-50 hover:opacity-100 transition-opacity"
              style={{ color: '#1A202C' }}
            >
              Bảo mật
            </Link>
            <Link
              to={{ pathname: ROUTES.home, hash: LANDING_HASH.consult }}
              className="text-sm opacity-50 hover:opacity-100 transition-opacity"
              style={{ color: '#1A202C' }}
            >
              Nhận tin
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
