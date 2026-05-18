import { Link } from 'react-router';
import { Shield, Lock, AlertCircle } from 'lucide-react';
import { ROUTES } from '../routes';

export function TrustDisclaimerSection() {
  return (
    <section 
      id="tin-cay"
      className="px-6 py-24 md:py-32 scroll-mt-24"
      style={{ 
        background: 'linear-gradient(135deg, #1A202C 0%, #2D3748 100%)'
      }}
    >
      <div className="max-w-5xl mx-auto">
        {/* Trust Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* Privacy */}
          <div 
            className="p-8 rounded-3xl backdrop-blur-xl"
            style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <div 
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
              style={{ backgroundColor: '#2DD4BF' }}
            >
              <Lock size={28} style={{ color: 'white' }} />
            </div>
            
            <h3 className="text-2xl font-bold mb-3 text-white">
              Quyền riêng tư tuyệt đối
            </h3>
            
            <p className="text-white opacity-70 leading-relaxed">
              Mọi cuộc trò chuyện được mã hóa đầu cuối. Dữ liệu của bạn thuộc về bạn và chỉ bạn mới có quyền truy cập.
            </p>
          </div>
          
          {/* Security */}
          <div 
            className="p-8 rounded-3xl backdrop-blur-xl"
            style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <div 
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
              style={{ backgroundColor: '#2DD4BF' }}
            >
              <Shield size={28} style={{ color: 'white' }} />
            </div>
            
            <h3 className="text-2xl font-bold mb-3 text-white">
              Bảo mật cấp ngân hàng
            </h3>
            
            <p className="text-white opacity-70 leading-relaxed">
              Chúng tôi sử dụng công nghệ bảo mật tiên tiến nhất để đảm bảo thông tin sức khỏe của bạn luôn an toàn.
            </p>
          </div>
        </div>
        
        {/* Medical Disclaimer */}
        <div 
          className="p-8 rounded-3xl backdrop-blur-xl"
          style={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          <div className="flex gap-4">
            <AlertCircle size={24} className="flex-shrink-0 mt-1 text-white opacity-60" />
            <div>
              <h4 className="text-lg font-semibold mb-2 text-white">
                Lưu ý Y khoa
              </h4>
              <p className="text-white opacity-70 leading-relaxed text-sm">
        Tezca cung cấp thông tin tham khảo về sức khỏe và không thay thế cho khám và tư vấn y tế trực tiếp từ chuyên khoa. 
                Nếu bạn đang gặp vấn đề sức khỏe nghiêm trọng, vui lòng liên hệ với bác sĩ hoặc cơ sở y tế gần nhất. 
                Trong trường hợp khẩn cấp, hãy gọi ngay đường dây nóng 115.
              </p>
            </div>
          </div>
        </div>
        
        {/* Additional Info */}
        <div className="text-center mt-12 space-y-3">
          <p className="text-white opacity-50 text-sm m-0">
            Được phát triển với 💚 bởi đội ngũ chuyên gia y tế và công nghệ AI hàng đầu Việt Nam
          </p>
          <p className="text-sm m-0">
            <Link to={ROUTES.legal.privacy} className="text-teal-400/90 hover:text-teal-300 underline-offset-2">
              Chính sách bảo mật
            </Link>
            <span className="text-white/40 mx-2">·</span>
            <Link to={ROUTES.legal.terms} className="text-teal-400/90 hover:text-teal-300 underline-offset-2">
              Điều khoản sử dụng
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
