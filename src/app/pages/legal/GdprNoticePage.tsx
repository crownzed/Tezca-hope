import { Link } from 'react-router';
import { StaticArticle } from '../../components/StaticArticle';
import { LegalDocNav } from '../../components/legal/LegalDocNav';
import { LEGAL_LAST_UPDATED, LEGAL_PRIVACY_EMAIL } from '../../lib/legalContent';
import { ROUTES } from '../../routes';

export function GdprNoticePage() {
  return (
    <StaticArticle
      title="Thông báo GDPR (EU/EEA & UK)"
      updated={LEGAL_LAST_UPDATED}
      footer={<LegalDocNav currentPath={ROUTES.legal.gdpr} />}
    >
      <p>
        Thông báo này dành cho người dùng cư trú tại <strong>Khu vực Kinh tế Châu Âu (EEA)</strong>,{' '}
        <strong>Vương quốc Anh</strong> hoặc các trường hợp Quy định chung về bảo vệ dữ liệu (GDPR) áp dụng. Nó bổ sung
        cho <Link to={ROUTES.legal.privacy}>Chính sách bảo mật</Link> và không thay thế quyền theo luật địa phương khác.
      </p>

      <h2>1. Vai trò xử lý dữ liệu</h2>
      <ul>
        <li>
          <strong>Data Controller (bên kiểm soát):</strong> đơn vị vận hành Tezca quyết định mục đích và phương thức xử
          lý dữ liệu cá nhân của người dùng nền tảng
        </li>
        <li>
          <strong>Processors (bên xử lý):</strong> nhà cung cấp hosting, email, AI — xử lý theo hợp đồng và chỉ theo chỉ
          dẫn của chúng tôi
        </li>
      </ul>

      <h2>2. Cơ sở pháp lý (Điều 6 GDPR)</h2>
      <table className="w-full text-sm border-collapse my-4">
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(26,32,44,0.15)' }}>
            <th className="text-left py-2 pr-3">Hoạt động</th>
            <th className="text-left py-2">Cơ sở</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: '1px solid rgba(26,32,44,0.08)' }}>
            <td className="py-2 pr-3 align-top">Tài khoản & cung cấp dịch vụ</td>
            <td className="py-2 align-top">Hợp đồng (Art. 6(1)(b))</td>
          </tr>
          <tr style={{ borderBottom: '1px solid rgba(26,32,44,0.08)' }}>
            <td className="py-2 pr-3 align-top">Bảo mật, chống lạm dụng</td>
            <td className="py-2 align-top">Lợi ích hợp pháp (Art. 6(1)(f))</td>
          </tr>
          <tr style={{ borderBottom: '1px solid rgba(26,32,44,0.08)' }}>
            <td className="py-2 pr-3 align-top">Đăng bài cộng đồng (tùy chọn)</td>
            <td className="py-2 align-top">Đồng ý (Art. 6(1)(a))</td>
          </tr>
          <tr>
            <td className="py-2 pr-3 align-top">Tuân thủ pháp luật</td>
            <td className="py-2 align-top">Nghĩa vụ pháp lý (Art. 6(1)(c))</td>
          </tr>
        </tbody>
      </table>

      <h2>3. Quyền của bạn</h2>
      <ul>
        <li>Quyền truy cập (Art. 15) — nhận bản sao dữ liệu đang xử lý</li>
        <li>Quyền chỉnh sửa (Art. 16)</li>
        <li>Quyền xóa — “quyền được lãng quên” (Art. 17), trong giới hạn ngoại lệ pháp luật</li>
        <li>Quyền hạn chế xử lý (Art. 18)</li>
        <li>Quyền di chuyển dữ liệu (Art. 20) — định dạng có cấu trúc, phổ biến</li>
        <li>Quyền phản đối xử lý dựa trên lợi ích hợp pháp (Art. 21)</li>
        <li>Quyền rút đồng ý bất cứ lúc nào, không ảnh hưởng tính hợp pháp của xử lý trước đó</li>
        <li>Quyền khiếu nại với cơ quan giám sát tại quốc gia EU/EEA bạn cư trú</li>
      </ul>

      <h2>4. Chuyển dữ liệu quốc tế</h2>
      <p>
        Dữ liệu có thể được xử lý tại Việt Nam, Hoa Kỳ hoặc quốc gia khác nơi đặt máy chủ đám mây. Khi chuyển ra EEA,
        chúng tôi dựa trên Điều khoản hợp đồng chuẩn (SCC), quyết định tương đương hoặc biện pháp bổ sung phù hợp theo
        khuyến nghị Ủy ban Châu Âu.
      </p>

      <h2>5. Thời gian lưu</h2>
      <p>
        Chúng tôi chỉ lưu dữ liệu trong thời gian cần thiết cho mục đích đã nêu trong Chính sách bảo mật, trừ khi luật
        yêu cầu lưu lâu hơn (ví dụ tranh chấp pháp lý).
      </p>

      <h2>6. Tự động hóa & profiling</h2>
      <p>
        Chat AI có thể tạo phản hồi dựa trên đầu vào của bạn; đây không phải quyết định pháp lý hoặc tương tự có hiệu
        lực ràng buộc đối với bạn theo nghĩa Art. 22 GDPR. Bạn luôn nên xác minh thông tin y tế với chuyên gia.
      </p>

      <h2>7. Liên hệ & DPO</h2>
      <p>
        Thực hiện quyền GDPR: <a href={`mailto:${LEGAL_PRIVACY_EMAIL}`}>{LEGAL_PRIVACY_EMAIL}</a>. Nếu chúng tôi chỉ định
        Data Protection Officer (DPO), thông tin sẽ được cập nhật tại đây. Thời hạn phản hồi mục tiêu: trong vòng{' '}
        <strong>30 ngày</strong> (có thể gia hạn 60 ngày với thông báo lý do).
      </p>
    </StaticArticle>
  );
}
