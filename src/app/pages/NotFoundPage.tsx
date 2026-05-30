import { Link } from 'react-router';
import { ROUTES } from '../routes';

export function NotFoundPage() {
  return (
    <div className="max-w-lg mx-auto px-6 py-20 md:py-28 text-center">
      <p className="text-sm font-medium opacity-50 m-0 mb-2" style={{ color: '#1A202C' }}>
        404
      </p>
      <h1 className="text-2xl md:text-3xl font-bold m-0 mb-4" style={{ color: '#1A202C' }}>
        Không tìm thấy trang
      </h1>
      <p className="opacity-70 mb-8 m-0" style={{ color: '#1A202C' }}>
        Đường dẫn không tồn tại hoặc đã được đổi. Bạn có thể về trang chủ hoặc mở ứng dụng.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          to={ROUTES.home}
          className="inline-flex justify-center rounded-full px-6 py-3 text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #2DD4BF 0%, #14B8A6 100%)' }}
        >
          Trang chủ
        </Link>
        <Link
          to={ROUTES.app.dashboard}
          className="inline-flex justify-center rounded-full px-6 py-3 text-sm font-semibold border"
          style={{ borderColor: 'rgba(26, 32, 44, 0.15)', color: '#1A202C' }}
        >
          Ứng dụng
        </Link>
      </div>
      <ul className="mt-10 text-sm space-y-2 text-left inline-block m-0 p-0 list-none">
        <li>
          <Link to={ROUTES.product.features} className="opacity-70 hover:opacity-100" style={{ color: '#0F766E' }}>
            Sản phẩm — Tính năng
          </Link>
        </li>
        <li>
          <Link to={ROUTES.legal.terms} className="opacity-70 hover:opacity-100" style={{ color: '#0F766E' }}>
            Điều khoản sử dụng
          </Link>
        </li>
      </ul>
    </div>
  );
}
