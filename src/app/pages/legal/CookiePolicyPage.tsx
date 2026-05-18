import { StaticArticle } from '../../components/StaticArticle';

export function CookiePolicyPage() {
  return (
    <StaticArticle title="Chính sách cookie" updated="11/05/2026">
      <p>
        Trình duyệt và server có thể lưu các dữ liệu nhỏ (cookie, local storage) để duy trì phiên đăng nhập và tùy chọn giao
        diện. Ứng dụng web Tezca có thể lưu token/lựa chọn cục bộ trên thiết bị của bạn để tránh đăng nhập lại.
      </p>
      <h2>Cookie bên thứ ba</h2>
      <p>
        Trên bản triển khai tiêu chuẩn, không nhúng theo dõi quảng cáo bắt buộc. Nếu tích hợp phân tích hoặc nhúng bên thứ
        ba trong tương lai, chính sách này sẽ được bổ sung danh mục và mục đích cụ thể.
      </p>
      <h2>Quản lý</h2>
      <p>
        Bạn có thể xóa cookie và dữ liệu trang web trong cài đặt trình duyệt; đăng xuất khỏi Tezca để giảm lưu token trên
        máy dùng chung.
      </p>
    </StaticArticle>
  );
}
