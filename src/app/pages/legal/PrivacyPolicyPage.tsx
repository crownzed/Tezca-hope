import { StaticArticle } from '../../components/StaticArticle';

export function PrivacyPolicyPage() {
  return (
    <StaticArticle title="Chính sách bảo mật" updated="11/05/2026">
      <p>
        Tezca thu thập và xử lý dữ liệu cần thiết để vận hành dịch vụ (tài khoản, chỉ số sức khỏe, nhật ký tâm trạng,
        tin nhắn trong phạm vi tính năng). Mục đích: cung cấp trải nghiệm cá nhân hóa, đồng bộ giữa bệnh nhân và chuyên
        gia được ủy quyền, và cải thiện chất lượng sản phẩm.
      </p>
      <h2>Cơ sở pháp lý</h2>
      <p>
        Việc xử lý dựa trên sự đồng ý khi đăng ký và/hoặc thực hiện hợp đồng cung cấp dịch vụ, phù hợp quy định về bảo vệ
        dữ liệu cá nhân áp dụng tại Việt Nam và — khi có liên quan — chuẩn quốc tế như GDPR cho người dùng EU.
      </p>
      <h2>Quyền của bạn</h2>
      <ul>
        <li>Truy cập và yêu cầu chỉnh sửa thông tin tài khoản</li>
        <li>Yêu cầu xóa hoặc hạn chế xử lý theo quy định và khả năng kỹ thuật hệ thống</li>
        <li>Rút lại đồng ý cho các xử lý phụ thuộc đồng ý (khi áp dụng)</li>
      </ul>
      <h2>Bảo mật</h2>
      <p>
        Chúng tôi áp dụng biện pháp kỹ thuật và tổ chức hợp lý (xác thực, phân quyền, truyền dẫn an toàn trong môi trường
        production). Không có hệ thống nào an toàn tuyệt đối; vui lòng bảo vệ mật khẩu và thiết bị của bạn.
      </p>
      <h2>Liên hệ</h2>
      <p>
        Mọi thắc mắc về dữ liệu cá nhân, vui lòng liên hệ đơn vị vận hành Tezca qua kênh chính thức (email hỗ trợ do tổ
        chức bạn cấu hình).
      </p>
    </StaticArticle>
  );
}
