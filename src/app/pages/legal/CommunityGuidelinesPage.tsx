import { Link } from 'react-router';
import { StaticArticle } from '../../components/StaticArticle';
import { LegalDocNav } from '../../components/legal/LegalDocNav';
import { LEGAL_LAST_UPDATED, LEGAL_SUPPORT_EMAIL } from '../../lib/legalContent';
import { ROUTES } from '../../routes';

export function CommunityGuidelinesPage() {
  return (
    <StaticArticle
      title="Quy tắc cộng đồng Tezca"
      updated={LEGAL_LAST_UPDATED}
      footer={<LegalDocNav currentPath={ROUTES.legal.community} />}
    >
      <p>
        Không gian cộng đồng (diễn đàn, phòng chat theo chủ đề) nhằm chia sẻ kinh nghiệm sống khỏe, động viên lẫn nhau
        trong khuôn khổ an toàn. Quy tắc này bổ sung cho{' '}
        <Link to={ROUTES.legal.terms}>Điều khoản sử dụng</Link> và{' '}
        <Link to={ROUTES.legal.privacy}>Chính sách bảo mật</Link>.
      </p>

      <h2>1. Nguyên tắc chung</h2>
      <ul>
        <li>Tôn trọng, không quấy rối, phân biệt đối xử hay ngôn từ thù hận</li>
        <li>Không chia sẻ thông tin y khoa sai lệch hoặc khuyến khích tự điều trị nguy hiểm</li>
        <li>Bảo vệ quyền riêng tư: không đăng dữ liệu nhận dạng, hình ảnh riêng tư của người khác khi chưa được phép</li>
        <li>Không spam, quảng cáo trái phép hoặc liên kết độc hại</li>
      </ul>

      <h2>2. Nội dung bị cấm</h2>
      <ul>
        <li>Nội dung khiêu dâm, bạo lực, kích động tự hại hoặc gây hại cho trẻ vị thành niên</li>
        <li>Tư vấn thay thế khám bệnh: chẩn đoán cụ thể, kê đơn, liều thuốc không có căn cứ chuyên môn công khai</li>
        <li>Thông tin sai lệch có hại về vaccine, bệnh truyền nhiễm hoặc phương pháp “chữa bệnh” chưa được chứng minh</li>
        <li>Vi phạm pháp luật Việt Nam hoặc quyền sở hữu trí tuệ</li>
      </ul>

      <h2>3. Chủ đề & phòng chat</h2>
      <p>
        Bài viết diễn đàn được phân theo chủ đề (tổng quát, dinh dưỡng, tâm lý, cơ–xương–khớp). Phòng chat gồm các phòng
        chuyên đề tương ứng. Hãy đăng đúng chủ đề để cộng đồng dễ theo dõi.
      </p>

      <h2>4. Báo cáo & kiểm duyệt (UC-11)</h2>
      <p>
        Mọi thành viên có thể <strong>báo cáo</strong> bài viết vi phạm. Quản trị viên và chuyên gia được phép{' '}
        <strong>ẩn hoặc xóa</strong> bài viết/bình luận vi phạm. Mỗi thao tác kiểm duyệt được ghi vào nhật ký hệ thống
        (<code>audit_log</code>) gồm mã nội dung, người thực hiện và thời gian — phục vụ minh bạch và an toàn thông tin.
      </p>
      <p>
        Quyết định kiểm duyệt nhằm bảo vệ cộng đồng; không thay thế quy trình pháp lý hoặc khiếu nại chính thức tại cơ
        quan nhà nước.
      </p>

      <h2>5. Trách nhiệm người đăng</h2>
      <p>
        Bạn chịu trách nhiệm về nội dung mình đăng. Nội đăng công khai có thể được thành viên khác đọc; không coi là kênh
        bảo mật y tế như tin nhắn riêng với chuyên gia được gán.
      </p>

      <h2>6. Hậu quả vi phạm</h2>
      <ul>
        <li>Ẩn hoặc xóa nội dung</li>
        <li>Cảnh cáo qua email (nếu có)</li>
        <li>Tạm khóa hoặc chấm dứt tài khoản theo Điều khoản sử dụng</li>
      </ul>

      <h2>7. Liên hệ</h2>
      <p>
        Báo cáo nội dung qua nút Báo cáo trên diễn đàn hoặc email{' '}
        <a href={`mailto:${LEGAL_SUPPORT_EMAIL}`}>{LEGAL_SUPPORT_EMAIL}</a>. Tham gia cộng đồng tại{' '}
        <Link to={ROUTES.app.community}>ứng dụng Tezca</Link> (yêu cầu đăng nhập).
      </p>
    </StaticArticle>
  );
}
