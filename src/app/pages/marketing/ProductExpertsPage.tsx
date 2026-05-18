import { Link } from 'react-router';
import { StaticArticle } from '../../components/StaticArticle';
import { ROUTES } from '../../routes';
import { useExpertAuth } from '../../context/ExpertAuthContext';

export function ProductExpertsPage() {
  const { user: expertUser } = useExpertAuth();
  const expertLoggedIn = expertUser?.role === 'expert';

  return (
    <StaticArticle title="Dành cho chuyên gia" updated="11/05/2026">
      <p>
        Nền tảng hỗ trợ chuyên gia theo dõi người dùng đã được gán: xem chỉ số, lịch sử chat AI và trao đổi trực tiếp
        qua WebSocket.
      </p>
      <h2>Bắt đầu</h2>
      <ol>
        <li>Tạo hoặc dùng tài khoản vai trò chuyên gia</li>
        <li>Đăng nhập tại cổng chuyên gia</li>
        <li>Chọn bệnh nhân trong danh sách được gán</li>
      </ol>
      <p className="pt-4">
        {expertLoggedIn ? (
          <Link to={ROUTES.expert.doctorDesk} style={{ color: '#0F766E', fontWeight: 600 }}>
            Vào Doctor Desk →
          </Link>
        ) : (
          <Link to={ROUTES.expert.login} style={{ color: '#0F766E', fontWeight: 600 }}>
            Đăng nhập chuyên gia →
          </Link>
        )}
      </p>
    </StaticArticle>
  );
}
