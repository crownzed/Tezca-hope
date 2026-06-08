import { Link } from 'react-router';
import { StaticArticle } from '../../components/StaticArticle';
import { LegalDocNav } from '../../components/legal/LegalDocNav';
import { LEGAL_LAST_UPDATED, LEGAL_PRIVACY_EMAIL, LEGAL_SUPPORT_EMAIL } from '../../lib/legalContent';
import { ROUTES } from '../../routes';

export function PrivacyPolicyPage() {
  return (
    <StaticArticle
      title="Chính sách bảo mật & quyền riêng tư"
      updated={LEGAL_LAST_UPDATED}
      footer={<LegalDocNav currentPath={ROUTES.legal.privacy} />}
    >
      <p>
        Chính sách này giải thích cách <strong>Tezca</strong> (sau đây gọi là &quot;chúng tôi&quot;, &quot;nền
        tảng&quot;) thu thập, sử dụng, lưu trữ, chia sẻ và bảo vệ dữ liệu cá nhân — đặc biệt là dữ liệu liên quan sức
        khỏe — khi bạn truy cập website/ứng dụng, đăng ký tài khoản hoặc sử dụng các tính năng (theo dõi BMI, nhật ký
        cảm xúc, chat AI, chat chuyên gia, diễn đàn cộng đồng, v.v.).
      </p>

      <h2>1. Phạm vi áp dụng</h2>
      <p>
        Chính sách áp dụng cho khách hàng (vai trò <code>user</code>), chuyên gia (<code>expert</code>), quản trị viên
        nội bộ (<code>admin</code>) và khách truy cập trang marketing. Bằng việc sử dụng dịch vụ, bạn xác nhận đã đọc và
        hiểu chính sách; nếu không đồng ý, vui lòng ngừng sử dụng và liên hệ để xóa tài khoản (nếu đã tạo).
      </p>
      <p>
        Chúng tôi tuân thủ quy định bảo vệ dữ liệu cá nhân tại Việt Nam (bao gồm Nghị định 13/2023/NĐ-CP và luật liên
        quan). Đối với người dùng tại EU/EEA, xem thêm{' '}
        <Link to={ROUTES.legal.gdpr}>Thông báo GDPR</Link>.
      </p>

      <h2>2. Dữ liệu chúng tôi thu thập</h2>
      <h3>2.1. Dữ liệu tài khoản</h3>
      <ul>
        <li>Họ tên, email, mật khẩu (lưu dạng băm), vai trò, thời điểm tạo tài khoản</li>
        <li>Hồ sơ khách hàng/chuyên gia: giới tính, ngày sinh, điện thoại, địa chỉ, chuyên ngành, mã chứng chỉ (nếu có)</li>
      </ul>
      <h3>2.2. Dữ liệu sức khỏe & hành vi</h3>
      <ul>
        <li>Chỉ số BMI, cân nặng, chiều cao theo ngày</li>
        <li>Nhật ký cảm xúc (nhãn, điểm, biểu tượng)</li>
        <li>Hồ sơ sức khỏe: bệnh nền, dị ứng, thuốc đang dùng, chống chỉ định (do bạn khai báo)</li>
        <li>Kế hoạch tập luyện, tiến độ bài tập, ghi chú chuyên gia</li>
        <li>Tin nhắn với chatbot AI và tin nhắn trực tiếp với chuyên gia được gán</li>
      </ul>
      <h3>2.3. Dữ liệu cộng đồng</h3>
      <ul>
        <li>Bài viết, bình luận, lượt thích, báo cáo vi phạm trên diễn đàn</li>
        <li>Tin nhắn trong phòng chat theo chủ đề (dinh dưỡng, tâm lý, cơ–xương–khớp)</li>
        <li>Nhật ký kiểm duyệt (<code>audit_log</code>) khi admin/chuyên gia ẩn hoặc xóa nội dung vi phạm</li>
      </ul>
      <h3>2.4. Dữ liệu kỹ thuật</h3>
      <ul>
        <li>Token phiên đăng nhập (JWT), log truy cập API cơ bản, địa chỉ IP (nếu máy chủ ghi nhận)</li>
        <li>Cookie và local storage trên trình duyệt (xem <Link to={ROUTES.legal.cookie}>Chính sách cookie</Link>)</li>
      </ul>

      <h2>3. Mục đích xử lý</h2>
      <ul>
        <li>Cung cấp và vận hành tài khoản, xác thực, phân quyền theo vai trò</li>
        <li>Đồng bộ dữ liệu sức khỏe giữa thiết bị và máy chủ; hiển thị cho chuyên gia đã được bạn/chúng tôi gán hợp lệ</li>
        <li>Gợi ý nội dung AI, kế hoạch tập và báo cáo tuần (trong phạm vi tính năng)</li>
        <li>Vận hành diễn đàn & phòng chat; kiểm duyệt nội dung theo <Link to={ROUTES.legal.community}>Quy tắc cộng đồng</Link></li>
        <li>Bảo mật, phòng chống lạm dụng, tuân thủ pháp luật và giải quyết khiếu nại</li>
        <li>Cải thiện sản phẩm (thống kê ẩn danh khi có thể)</li>
      </ul>

      <h2>4. Cơ sở pháp lý</h2>
      <ul>
        <li><strong>Thực hiện hợp đồng / cung cấp dịch vụ:</strong> vận hành tài khoản và tính năng bạn yêu cầu</li>
        <li><strong>Đồng ý:</strong> đăng ký, bật tính năng tùy chọn, đăng bài công khai trên cộng đồng</li>
        <li><strong>Lợi ích hợp pháp:</strong> bảo mật hệ thống, chống gian lận, kiểm duyệt nội dung vi phạm</li>
        <li><strong>Nghĩa vụ pháp lý:</strong> khi cơ quan có thẩm quyền yêu cầu hợp lệ</li>
      </ul>

      <h2>5. Chia sẻ dữ liệu</h2>
      <p>Chúng tôi <strong>không bán</strong> dữ liệu cá nhân. Dữ liệu có thể được chia sẻ trong các trường hợp:</p>
      <ul>
        <li>
          <strong>Chuyên gia được gán:</strong> chỉ khách hàng ở trạng thái <code>accepted</code> trong hệ thống gán
          mới truy cập hồ sơ và tin nhắn tương ứng
        </li>
        <li>
          <strong>Nhà cung cấp hạ tầng:</strong> hosting (ví dụ Vercel), email giao dịch, nhà cung cấp AI (khi bật chat
          AI) — theo hợp đồng xử lý dữ liệu và chỉ trong phạm vi cần thiết
        </li>
        <li>
          <strong>Pháp luật:</strong> khi bắt buộc bởi quyết định có thẩm quyền
        </li>
      </ul>
      <p>
        Nội đăng trên diễn đàn/phòng chat có thể hiển thị với thành viên đã đăng nhập trong phạm vi tính năng — không coi
        là &quot;riêng tư&quot; như tin nhắn 1-1 với chuyên gia.
      </p>

      <h2>6. Lưu trữ & thời hạn</h2>
      <ul>
        <li>Dữ liệu tài khoản và sức khỏe: trong thời gian tài khoản còn hoạt động và thêm khoảng hợp lý để sao lưu/pháp lý</li>
        <li>Tin nhắn & bài cộng đồng: theo chính sách lưu trữ hệ thống hoặc đến khi bạn/chúng tôi xóa/ẩn theo quy tắc kiểm duyệt</li>
        <li>Nhật ký kiểm duyệt: lưu để chứng minh thao tác admin/chuyên gia theo yêu cầu an toàn thông tin</li>
      </ul>
      <p>
        Khi xóa tài khoản (theo yêu cầu hợp lệ), chúng tôi xóa hoặc ẩn danh hóa dữ liệu trong giới hạn kỹ thuật, trừ dữ
        liệu phải giữ theo luật hoặc log bảo mật tối thiểu.
      </p>

      <h2>7. Bảo mật</h2>
      <p>
        Chúng tôi áp dụng xác thực JWT, phân quyền theo vai trò, HTTPS trên môi trường production, hạn chế quyền truy
        cập máy chủ và không đưa khóa bí mật (JWT, API AI) ra phía trình duyệt. Chi tiết kỹ thuật:{' '}
        <Link to={ROUTES.product.security}>Bảo mật &amp; dữ liệu</Link>.
      </p>
      <p>
        Không có hệ thống an toàn tuyệt đối. Bạn cần bảo vệ mật khẩu, không chia sẻ token, đăng xuất trên thiết bị dùng
        chung.
      </p>

      <h2>8. Quyền của chủ thể dữ liệu</h2>
      <p>Theo quy định áp dụng, bạn có thể:</p>
      <ul>
        <li>Truy cập, chỉnh sửa thông tin tài khoản và hồ sơ trong ứng dụng</li>
        <li>Yêu cầu xuất bản sao dữ liệu (trong khả năng kỹ thuật)</li>
        <li>Yêu cầu xóa, hạn chế xử lý hoặc rút đồng ý (đối với xử lý dựa trên đồng ý)</li>
        <li>Khiếu nại với cơ quan quản lý nhà nước có thẩm quyền tại Việt Nam</li>
      </ul>
      <p>
        Gửi yêu cầu tới <a href={`mailto:${LEGAL_PRIVACY_EMAIL}`}>{LEGAL_PRIVACY_EMAIL}</a> hoặc{' '}
        <a href={`mailto:${LEGAL_SUPPORT_EMAIL}`}>{LEGAL_SUPPORT_EMAIL}</a>. Chúng tôi phản hồi trong thời hạn hợp lý
        (thường không quá 30 ngày, trừ trường hợp phức tạp).
      </p>

      <h2>9. Trẻ vị thành niên</h2>
      <p>
        Tezca không hướng tới người dưới 16 tuổi. Nếu phát hiện tài khoản của trẻ em mà không có sự đồng ý của cha mẹ/người
        giám hộ hợp pháp, chúng tôi có thể khóa hoặc xóa tài khoản sau khi xác minh.
      </p>

      <h2>10. Chuyển dữ liệu ra nước ngoài</h2>
      <p>
        Máy chủ hoặc nhà cung cấp đám mây có thể đặt tại hoặc xử lý dữ liệu ngoài Việt Nam (ví dụ trung tâm dữ liệu quốc
        tế). Khi đó chúng tôi áp dụng biện pháp bảo vệ phù hợp (hợp đồng, tiêu chuẩn bảo mật của nhà cung cấp).
      </p>

      <h2>11. Thay đổi chính sách</h2>
      <p>
        Chúng tôi có thể cập nhật chính sách; ngày hiệu lực ghi ở đầu trang. Thay đổi quan trọng có thể thông báo qua
        email hoặc banner trong ứng dụng. Tiếp tục sử dụng sau khi cập nhật đồng nghĩa bạn chấp nhận phiên bản mới, trừ
        khi pháp luật yêu cầu đồng ý riêng.
      </p>
    </StaticArticle>
  );
}
