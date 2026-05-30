import { Link } from 'react-router';
import { StaticArticle } from '../../components/StaticArticle';
import { LegalDocNav } from '../../components/legal/LegalDocNav';
import { LEGAL_LAST_UPDATED, LEGAL_SUPPORT_EMAIL } from '../../lib/legalContent';
import { ROUTES } from '../../routes';

export function TermsOfServicePage() {
  return (
    <StaticArticle
      title="Điều khoản sử dụng"
      updated={LEGAL_LAST_UPDATED}
      footer={<LegalDocNav currentPath={ROUTES.legal.terms} />}
    >
      <p>
        Điều khoản này là thỏa thuận pháp lý giữa bạn và đơn vị vận hành nền tảng <strong>Tezca</strong>. Vui lòng đọc
        kỹ trước khi đăng ký, đăng nhập hoặc sử dụng bất kỳ tính năng nào.
      </p>

      <h2>1. Chấp nhận điều khoản</h2>
      <p>
        Bằng việc truy cập Tezca, bạn xác nhận đủ năng lực hành vi dân sự theo luật Việt Nam (hoặc luật nơi bạn cư trú),
        đồng ý với Điều khoản này, <Link to={ROUTES.legal.privacy}>Chính sách bảo mật</Link> và — khi tham gia cộng
        đồng — <Link to={ROUTES.legal.community}>Quy tắc cộng đồng</Link>. Nếu không đồng ý, không sử dụng dịch vụ.
      </p>

      <h2>2. Bản chất dịch vụ</h2>
      <p>
        Tezca cung cấp công cụ theo dõi sức khỏe, giáo dục sức khỏe, gợi ý AI, kế hoạch tập luyện, kênh liên lạc với
        chuyên gia được gán và không gian cộng đồng theo chủ đề.
      </p>
      <p>
        <strong>
          Tezca không phải cơ sở khám chữa bệnh. Nội dung, chatbot AI, bài đăng cộng đồng và gợi ý từ chuyên gia không
          thay thế khám, chẩn đoán, kê đơn hay điều trị y khoa trực tiếp.
        </strong>{' '}
        Luôn tham khảo bác sĩ có chứng chỉ hành nghề cho quyết định y tế. Trường hợp khẩn cấp, gọi <strong>115</strong>.
      </p>

      <h2>3. Tài khoản & vai trò</h2>
      <ul>
        <li>
          <strong>Khách hàng (user):</strong> nhập dữ liệu sức khỏe, chọn chuyên gia, sử dụng cộng đồng theo quyền đã
          cấp
        </li>
        <li>
          <strong>Chuyên gia (expert):</strong> chỉ truy cập khách hàng đã được gán và chấp nhận; có thể kiểm duyệt nội
          dung cộng đồng trong phạm vi hệ thống
        </li>
        <li>
          <strong>Quản trị (admin):</strong> quản lý người dùng, gán chuyên gia, kiểm duyệt — theo chính sách nội bộ
        </li>
      </ul>
      <p>Bạn cam kết thông tin đăng ký chính xác, bảo mật mật khẩu và chịu trách nhiệm mọi hoạt động dưới tài khoản của mình.</p>

      <h2>4. Quan hệ chuyên gia – khách hàng</h2>
      <p>
        Việc gán chuyên gia tuân theo quy trình yêu cầu/duyệt trên nền tảng. Chuyên gia không được truy cập dữ liệu khách
        hàng ngoài phạm vi đã gán. Khách hàng có thể chấm dứt gán theo tính năng hiện có. Tezca là nền tảng kết nối; không
        chịu trách nhiệm cho tư vấn chuyên môn độc lập của từng chuyên gia ngoài phạm vi pháp luật bắt buộc.
      </p>

      <h2>5. Sử dụng AI & nội dung tự động</h2>
      <ul>
        <li>Gợi ý AI có thể sai hoặc không phù hợp với tình trạng cá nhân bạn</li>
        <li>Không dùng kết quả AI làm căn cứ duy nhất cho quyết định y tế</li>
        <li>Không nhập thông tin nhạy cảm không cần thiết vào chat nếu bạn không muốn lưu trữ</li>
      </ul>

      <h2>6. Cộng đồng</h2>
      <p>
        Khi tham gia diễn đàn hoặc phòng chat, bạn tuân thủ{' '}
        <Link to={ROUTES.legal.community}>Quy tắc cộng đồng</Link>. Admin và chuyên gia có thể ẩn/xóa nội dung vi phạm;
        hành động kiểm duyệt được ghi nhật ký theo chính sách bảo mật.
      </p>

      <h2>7. Hành vi bị cấm</h2>
      <ul>
        <li>Giả mạo danh tính, truy cập trái phép dữ liệu người khác hoặc vượt quyền vai trò</li>
        <li>Phát tán malware, tấn công, reverse engineering trái phép</li>
        <li>Quấy rối, ngôn từ thù hận, nội dung khiêu dâm, bạo lực hoặc vi phạm pháp luật Việt Nam</li>
        <li>Quảng cáo trái phép, lừa đảo y tế, bán thuốc không phép</li>
        <li>Sao chép, khai thác thương mại nội dung nền tảng khi chưa được phép</li>
      </ul>

      <h2>8. Quyền sở hữu trí tuệ</h2>
      <p>
        Giao diện, logo, mã nguồn và tài liệu do Tezca sở hữu hoặc cấp phép. Bạn giữ quyền đối với nội dung do mình đăng;
        khi đăng lên cộng đồng, bạn cấp cho chúng tôi quyền không độc quyền, miễn phí bản quyền để lưu trữ, hiển thị và
        kiểm duyện nội dung đó trên nền tảng.
      </p>

      <h2>9. Tạm ngưng & chấm dứt</h2>
      <p>
        Chúng tôi có thể tạm khóa hoặc chấm dứt tài khoản nếu vi phạm điều khoản, có rủi ro bảo mật hoặc theo yêu cầu
        pháp luật. Bạn có thể ngừng sử dụng và yêu cầu xóa tài khoản theo chính sách bảo mật.
      </p>

      <h2>10. Giới hạn trách nhiệm</h2>
      <p>
        Trong phạm vi pháp luật cho phép, Tezca và đơn vị vận hành không chịu trách nhiệm cho thiệt hại gián tiếp, mất
        lợi nhuận, hoặc hậu quả từ việc dựa vào nội dung trên nền tảng. Dịch vụ cung cấp &quot;như hiện có&quot; (
        <em>as is</em>).
      </p>

      <h2>11. Thay đổi dịch vụ & điều khoản</h2>
      <p>
        Chúng tôi có thể sửa tính năng hoặc cập nhật điều khoản; phiên bản mới có ngày hiệu lực trên trang này. Tiếp tục
        sử dụng sau thông báo hợp lý được coi là chấp nhận, trừ khi pháp luật yêu cầu khác.
      </p>

      <h2>12. Luật áp dụng & tranh chấp</h2>
      <p>
        Điều khoản chịu sự điều chỉnh của pháp luật Việt Nam, trừ khi quy định bắt buộc khác áp dụng cho người dùng EU.
        Tranh chấp ưu tiên giải quyết thương lượng; không thành có thể đưa ra tòa án có thẩm quyền tại Việt Nam.
      </p>

      <h2>13. Liên hệ</h2>
      <p>
        Hỗ trợ chung: <a href={`mailto:${LEGAL_SUPPORT_EMAIL}`}>{LEGAL_SUPPORT_EMAIL}</a>. Vấn đề dữ liệu cá nhân: xem{' '}
        <Link to={ROUTES.legal.privacy}>Chính sách bảo mật</Link>.
      </p>
    </StaticArticle>
  );
}
