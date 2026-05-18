import { Link } from 'react-router';
import { StaticArticle } from '../../components/StaticArticle';
import { ROUTES, LANDING_HASH } from '../../routes';

export function ProductPricingPage() {
  return (
    <StaticArticle title="Bảng giá &amp; gói dịch vụ" updated="11/05/2026">
      <p>
        Tezca đang trong giai đoạn triển khai và thử nghiệm. Giá chính thức sẽ được thông báo khi mở bán hoặc hợp đồng
        theo tổ chức (phòng khám, doanh nghiệp).
      </p>
      <h2>Hiện tại</h2>
      <ul>
        <li>
          <strong>Dùng thử / nội bộ:</strong> theo cấu hình máy chủ của bạn (localhost, Docker, XAMPP + API).
        </li>
        <li>
          <strong>Chat AI:</strong> sử dụng API OpenAI — chi phí theo tài khoản OpenAI của đơn vị vận hành.
        </li>
      </ul>
      <h2>Liên hệ thương mại</h2>
      <p>
        Gửi yêu cầu qua kênh liên hệ chính thức của tổ chức bạn (email doanh nghiệp, form trên trang chủ mục “Tư vấn”).
      </p>
      <p className="pt-2">
        <Link to={{ pathname: ROUTES.home, hash: LANDING_HASH.consult }} style={{ color: '#0F766E', fontWeight: 600 }}>
          Về mục nhận tin trên trang chủ →
        </Link>
      </p>
    </StaticArticle>
  );
}
