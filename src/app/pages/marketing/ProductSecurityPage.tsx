import { Link } from 'react-router';
import { StaticArticle } from '../../components/StaticArticle';
import { ROUTES } from '../../routes';

export function ProductSecurityPage() {
  return (
    <StaticArticle title="Bảo mật &amp; dữ liệu" updated="11/05/2026">
      <p>
        Tezca phân tách vai trò <strong>bệnh nhân</strong> và <strong>chuyên gia</strong>. Phiên đăng nhập dùng JWT;
        API và WebSocket chỉ chấp nhận liên kết hợp lệ từ backend đã cấu hình.
      </p>
      <h2>Lưu trữ</h2>
      <p>
        Dữ liệu vận hành được lưu trong cơ sở dữ liệu do máy chủ quản lý (SQLite trong môi trường triển khai mặc định).
        Không đặt khóa OpenAI hay bí mật JWT trên trình duyệt người dùng.
      </p>
      <h2>Gợi ý triển khai production</h2>
      <ul>
        <li>Đặt HTTPS và biến môi trường bí mật (JWT, khóa AI) trên máy chủ</li>
        <li>Hạn chế quyền truy cập file dữ liệu và sao lưu định kỳ</li>
        <li>Rà soát quyền chuyên gia — chỉ bệnh nhân được gán mới hiển thị trong dashboard</li>
      </ul>
      <p>
        Chi tiết xử lý dữ liệu cá nhân xem thêm{' '}
        <Link to={ROUTES.legal.privacy} style={{ color: '#0F766E' }}>
          Chính sách bảo mật
        </Link>
        .
      </p>
    </StaticArticle>
  );
}
