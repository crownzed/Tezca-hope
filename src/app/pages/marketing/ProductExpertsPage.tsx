import { Link } from 'react-router';
import { StaticArticle } from '../../components/StaticArticle';
import { ROUTES } from '../../routes';
import { useExpertAuth } from '../../context/ExpertAuthContext';
import { EXPERT_SPECIALTY_TYPES } from '../../lib/communityTopics';

export function ProductExpertsPage() {
  const { user: expertUser } = useExpertAuth();
  const expertLoggedIn = expertUser?.role === 'expert';

  return (
    <StaticArticle title="Đội ngũ chuyên gia Tezca" updated="31/05/2026">
      <p>
        Tezca kết nối bạn với các chuyên gia sức khỏe được đào tạo chuyên sâu theo từng lĩnh vực. Mỗi chuyên gia có
        thể theo dõi chỉ số, đọc lịch sử AI và tư vấn trực tiếp — đồng thời tham gia cộng đồng để hỗ trợ thành viên.
      </p>

      <h2>Các loại chuyên gia</h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          margin: '1rem 0',
        }}
      >
        {EXPERT_SPECIALTY_TYPES.map((type) => (
          <div
            key={type.id}
            style={{
              border: '1px solid rgba(45, 212, 191, 0.25)',
              borderRadius: '1rem',
              padding: '1.25rem',
              backgroundColor: 'rgba(45, 212, 191, 0.04)',
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{type.icon}</div>
            <div style={{ fontWeight: 700, marginBottom: '0.25rem', color: '#0F766E' }}>{type.label}</div>
            <div style={{ fontSize: '0.875rem', opacity: 0.75 }}>{type.description}</div>
          </div>
        ))}
      </div>

      <h2>Chuyên gia có thể làm gì?</h2>
      <ul>
        <li>Theo dõi chỉ số sức khỏe và lịch sử chat AI của khách hàng được gán</li>
        <li>Trao đổi trực tiếp với khách hàng qua Doctor Desk</li>
        <li>Tham gia cộng đồng Tezca để chia sẻ kiến thức và hỗ trợ thành viên</li>
        <li>Lập kế hoạch tập luyện và dinh dưỡng tuỳ chỉnh</li>
        <li>Xem báo cáo tuần để nắm bắt tiến độ tổng thể</li>
      </ul>

      <h2>Bắt đầu với tư cách chuyên gia</h2>
      <ol>
        <li>Liên hệ Tezca để được cấp tài khoản chuyên gia phù hợp chuyên môn</li>
        <li>Đăng nhập tại cổng chuyên gia</li>
        <li>Chọn khách hàng trong danh sách được gán và bắt đầu đồng hành</li>
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
