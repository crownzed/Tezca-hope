import { Link } from 'react-router';
import { StaticArticle } from '../../components/StaticArticle';
import { LegalDocNav } from '../../components/legal/LegalDocNav';
import { LEGAL_LAST_UPDATED } from '../../lib/legalContent';
import { ROUTES } from '../../routes';

export function ProductSecurityPage() {
  return (
    <StaticArticle
      title="Bảo mật & dữ liệu"
      updated={LEGAL_LAST_UPDATED}
      footer={<LegalDocNav currentPath={ROUTES.product.security} />}
    >
      <p>
        Tezca phân tách vai trò <strong>khách hàng</strong> và <strong>chuyên gia</strong>. Phiên đăng nhập dùng JWT;
        API và WebSocket chỉ chấp nhận liên kết hợp lệ từ backend đã cấu hình.
      </p>
      <h2>Lưu trữ</h2>
      <p>
        Dữ liệu vận hành được lưu trong cơ sở dữ liệu do máy chủ quản lý (SQLite trong môi trường triển khai mặc định).
        Không đặt khóa Gemini hay bí mật JWT trên trình duyệt người dùng.
      </p>
      <h2>Gợi ý triển khai production</h2>
      <ul>
        <li>Đặt HTTPS và biến môi trường bí mật (JWT, khóa AI) trên máy chủ</li>
        <li>Hạn chế quyền truy cập file dữ liệu và sao lưu định kỳ</li>
        <li>Rà soát quyền chuyên gia — chỉ khách hàng được gán mới hiển thị trong dashboard</li>
      </ul>
      <h2>Quyền riêng tư & pháp lý</h2>
      <p>
        Xem <Link to={ROUTES.legal.privacy}>Chính sách bảo mật</Link>,{' '}
        <Link to={ROUTES.legal.terms}>Điều khoản sử dụng</Link>,{' '}
        <Link to={ROUTES.legal.community}>Quy tắc cộng đồng</Link> và{' '}
        <Link to={ROUTES.legal.root}>Trung tâm pháp lý</Link>.
      </p>
    </StaticArticle>
  );
}
