import { Link } from 'react-router';
import { StaticArticle } from '../../components/StaticArticle';
import { LEGAL_DOCUMENTS, LEGAL_LAST_UPDATED, LEGAL_PRIVACY_EMAIL } from '../../lib/legalContent';
import { ROUTES } from '../../routes';

export function LegalHubPage() {
  return (
    <StaticArticle title="Trung tâm pháp lý Tezca" updated={LEGAL_LAST_UPDATED}>
      <p>
        Tài liệu dưới đây mô tả cách Tezca thu thập và bảo vệ dữ liệu, điều kiện sử dụng dịch vụ, quy tắc cộng đồng và
        quyền của người dùng — bao gồm cư dân EU/EEA theo GDPR. Vui lòng đọc trước khi đăng ký hoặc chia sẻ thông tin sức
        khỏe trên nền tảng.
      </p>

      <div className="grid sm:grid-cols-2 gap-4 not-prose">
        {LEGAL_DOCUMENTS.map((doc) => (
          <Link
            key={doc.path}
            to={doc.path}
            className="block p-5 rounded-2xl no-underline border transition-shadow hover:shadow-md"
            style={{ borderColor: 'rgba(26, 32, 44, 0.1)', color: '#1A202C' }}
          >
            <h2 className="text-lg font-semibold m-0 mb-2" style={{ color: '#0F766E' }}>
              {doc.title}
            </h2>
            <p className="text-sm m-0 opacity-70 leading-relaxed">{doc.description}</p>
          </Link>
        ))}
      </div>

      <h2>Liên hệ</h2>
      <p>
        Câu hỏi về quyền riêng tư hoặc thực hiện quyền dữ liệu:{' '}
        <a href={`mailto:${LEGAL_PRIVACY_EMAIL}`}>{LEGAL_PRIVACY_EMAIL}</a>. Thông tin kỹ thuật triển khai:{' '}
        <Link to={ROUTES.product.security}>Bảo mật &amp; dữ liệu</Link>.
      </p>

      <p className="text-sm opacity-60">
        Tezca là công cụ hỗ trợ theo dõi sức khỏe và kết nối chuyên gia; không thay thế khám, chẩn đoán hay điều trị y
        khoa. Trường hợp khẩn cấp, gọi <strong>115</strong>.
      </p>
    </StaticArticle>
  );
}
