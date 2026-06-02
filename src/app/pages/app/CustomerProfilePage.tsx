import { Link } from 'react-router';
import { FileUser } from 'lucide-react';
import { useCustomerSession } from '../../lib/customerSessionGate';
import { CustomerProfileForm } from '../../components/CustomerProfileForm';
import { HealthProfileForm } from '../../components/HealthProfileForm';
import { SessionLoading } from '../../components/tezca/SessionLoading';
import { ROUTES } from '../../routes';
import { tezcaCardStyle, tezcaTheme } from '../../lib/tezcaTheme';

export function CustomerProfilePage() {
  const { token, isVerifying, sessionReady } = useCustomerSession();

  if (!sessionReady || isVerifying) {
    return <SessionLoading title="Đang tải hồ sơ…" hint="" />;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold m-0 flex items-center gap-2" style={{ color: tezcaTheme.text }}>
          <FileUser size={28} style={{ color: tezcaTheme.accentDark }} aria-hidden />
          Hồ sơ của tôi
        </h1>
        <p className="text-sm opacity-70 mt-2 m-0 leading-relaxed" style={{ color: tezcaTheme.text }}>
          Xem thông tin đã lưu theo từng mục. Nhấn <strong>Sửa</strong> khi cần cập nhật — dữ liệu được gửi tới chuyên gia khi bạn{' '}
          <Link to={ROUTES.app.chooseExpert} className="font-semibold" style={{ color: tezcaTheme.accentDark }}>
            chọn chuyên gia
          </Link>
          .
        </p>
      </div>

      <section className="rounded-2xl border p-5 md:p-6" style={tezcaCardStyle}>
        <CustomerProfileForm token={token} />
      </section>

      <section className="rounded-2xl border p-5 md:p-6" style={tezcaCardStyle}>
        <h2 className="text-lg font-semibold m-0 mb-4" style={{ color: tezcaTheme.text }}>
          Hồ sơ bệnh lý & sức khỏe
        </h2>
        <p className="text-sm opacity-70 m-0 mb-4 -mt-2" style={{ color: tezcaTheme.text }}>
          Bệnh nền, dị ứng và chống chỉ định — mỗi mục ghi chú riêng để chuyên gia đọc nhanh.
        </p>
        <HealthProfileForm token={token} />
      </section>
    </div>
  );
}
