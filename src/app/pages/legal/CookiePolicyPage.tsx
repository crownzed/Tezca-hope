import { Link } from 'react-router';
import { StaticArticle } from '../../components/StaticArticle';
import { LegalDocNav } from '../../components/legal/LegalDocNav';
import { LEGAL_LAST_UPDATED } from '../../lib/legalContent';
import { ROUTES } from '../../routes';

export function CookiePolicyPage() {
  return (
    <StaticArticle
      title="Chính sách cookie & lưu trữ cục bộ"
      updated={LEGAL_LAST_UPDATED}
      footer={<LegalDocNav currentPath={ROUTES.legal.cookie} />}
    >
      <p>
        Trang này mô tả cách Tezca và trình duyệt của bạn sử dụng cookie, local storage và công nghệ tương tự. Chi tiết
        xử lý dữ liệu cá nhân xem <Link to={ROUTES.legal.privacy}>Chính sách bảo mật</Link>.
      </p>

      <h2>1. Cookie là gì?</h2>
      <p>
        Cookie là tệp văn bản nhỏ lưu trên thiết bị khi bạn truy cập website. <strong>Local storage</strong> và{' '}
        <strong>session storage</strong> là vùng lưu trên trình duyệt mà ứng dụng web có thể dùng để ghi token đăng
        nhập, tùy chọn giao diện hoặc dữ liệu tạm (ví dụ tiến độ tập luyện offline).
      </p>

      <h2>2. Chúng tôi dùng gì trên Tezca?</h2>
      <table className="w-full text-sm border-collapse my-4">
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(26,32,44,0.15)' }}>
            <th className="text-left py-2 pr-3">Loại</th>
            <th className="text-left py-2 pr-3">Mục đích</th>
            <th className="text-left py-2">Thời hạn</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: '1px solid rgba(26,32,44,0.08)' }}>
            <td className="py-2 pr-3 align-top">Phiên đăng nhập (JWT trong storage)</td>
            <td className="py-2 pr-3 align-top">Duy trì trạng thái đã đăng nhập</td>
            <td className="py-2 align-top">Đến khi hết hạn token hoặc đăng xuất</td>
          </tr>
          <tr style={{ borderBottom: '1px solid rgba(26,32,44,0.08)' }}>
            <td className="py-2 pr-3 align-top">Tùy chọn / cache cục bộ</td>
            <td className="py-2 pr-3 align-top">Đồng bộ BMI, mood, kế hoạch khi offline</td>
            <td className="py-2 align-top">Theo cài đặt trình duyệt</td>
          </tr>
          <tr>
            <td className="py-2 pr-3 align-top">Cookie kỹ thuật (nếu hosting đặt)</td>
            <td className="py-2 pr-3 align-top">Cân bằng tải, bảo mật CDN</td>
            <td className="py-2 align-top">Theo nhà cung cấp</td>
          </tr>
        </tbody>
      </table>

      <h2>3. Cookie bên thứ ba</h2>
      <p>
        Bản triển khai tiêu chuẩn <strong>không</strong> nhúng quảng cáo theo dõi hành vi. Nếu sau này tích hợp phân
        tích (ví dụ Vercel Analytics, Speed Insights), chúng tôi sẽ cập nhật bảng trên và — khi pháp luật yêu cầu — hiển
        thị cơ chế đồng ý.
      </p>

      <h2>4. Quản lý cookie</h2>
      <ul>
        <li>Xóa cookie và dữ liệu trang web trong cài đặt trình duyệt (Chrome, Safari, Firefox, Edge…)</li>
        <li>Đăng xuất Tezca trên thiết bị dùng chung</li>
        <li>Chế độ duyệt riêng tư hạn chế lưu trữ (có thể làm mất tiến độ chưa đồng bộ)</li>
      </ul>

      <h2>5. Từ chối cookie</h2>
      <p>
        Một số cookie/storage là <strong>cần thiết</strong> để đăng nhập. Từ chối hoàn toàn có thể khiến bạn không sử dụng
        được ứng dụng. Cookie không thiết yếu (khi có) sẽ có tùy chọn tắt riêng.
      </p>
    </StaticArticle>
  );
}
