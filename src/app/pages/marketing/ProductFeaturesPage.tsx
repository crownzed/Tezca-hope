import { Link } from 'react-router';
import { StaticArticle } from '../../components/StaticArticle';
import { ROUTES, LANDING_HASH } from '../../routes';

export function ProductFeaturesPage() {
  return (
    <StaticArticle title="Tính năng Tezca" updated="11/05/2026">
      <p>
        Tezca giúp bạn theo dõi BMI, nhật ký cảm xúc, đặt kế hoạch dinh dưỡng &amp; vận động, trò chuyện với trợ lý AI,
        và kết nối chat với chuyên gia được gán khi đã đăng nhập.
      </p>
      <h2>Khách hàng</h2>
      <ul>
        <li>Tổng quan và điều hướng nhanh trong ứng dụng</li>
        <li>Biểu đồ BMI theo thời gian</li>
        <li>Nhật ký tâm trạng</li>
        <li>Chat AI và kế hoạch cá nhân hóa</li>
        <li>Chat chuyên gia (realtime khi có kết nối)</li>
      </ul>
      <h2>Chuyên gia</h2>
      <ul>
        <li>Danh sách khách hàng được gán</li>
        <li>Xem biểu đồ, lịch sử tương tác bot và chat trực tiếp</li>
      </ul>
      <p className="pt-4">
        <Link to={ROUTES.app.dashboard} style={{ color: '#0F766E', fontWeight: 600 }}>
          Vào ứng dụng →
        </Link>
        {' · '}
        <Link to={{ pathname: ROUTES.home, hash: LANDING_HASH.features }} style={{ color: '#0F766E' }}>
          Xem tóm tắt trên trang chủ
        </Link>
      </p>
    </StaticArticle>
  );
}
