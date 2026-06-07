import { Link } from 'react-router';
import { Shield, Lock, AlertCircle } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { ROUTES } from '../routes';
import { tezcaCardStyle, tezcaTheme } from '../lib/tezcaTheme';
import { LandingReveal } from './landing/LandingReveal';
import { cardHover, staggerContainer, staggerItem, viewportOnce } from '../lib/landingMotion';

const cardStyle = {
  ...tezcaCardStyle,
  backgroundColor: tezcaTheme.surface,
} as const;

const trustCards = [
  {
    to: ROUTES.product.security,
    icon: Lock,
    title: 'Dữ liệu thuộc về bạn',
    body: 'Hồ sơ sức khoẻ và nhật ký trò chuyện chỉ dành cho bạn. Tezca không chia sẻ thông tin cá nhân với bên thứ ba mà không có sự đồng ý của bạn.',
  },
  {
    to: ROUTES.product.security,
    icon: Shield,
    title: 'Bảo vệ thông tin sức khoẻ',
    body: 'Dữ liệu được mã hóa và lưu trữ an toàn. Tezca dùng xác thực token và kết nối bảo mật để bảo vệ tài khoản của bạn.',
  },
] as const;

export function TrustDisclaimerSection() {
  const reduce = useReducedMotion();

  return (
    <section
      id="tin-cay"
      className="px-6 py-24 md:py-32 scroll-mt-24 border-y"
      style={{
        backgroundColor: tezcaTheme.bg,
        borderColor: tezcaTheme.border,
      }}
    >
      <div className="max-w-5xl mx-auto">
        <LandingReveal className="text-center mb-12">
          <p className="text-sm font-semibold uppercase tracking-wider mb-3 m-0" style={{ color: tezcaTheme.accentDark }}>
            Tin cậy
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3 m-0" style={{ color: tezcaTheme.text }}>
            Minh bạch và an toàn
          </h2>
          <p className="text-lg m-0" style={{ color: 'rgba(26,32,44,0.6)' }}>
            Chúng tôi nói rõ Tezca làm được gì và giới hạn ở đâu.
          </p>
        </LandingReveal>

        <motion.div
          className="grid md:grid-cols-2 gap-6 mb-12"
          variants={staggerContainer}
          initial={reduce ? false : 'hidden'}
          whileInView="visible"
          viewport={viewportOnce}
        >
          {trustCards.map((card) => {
            const Icon = card.icon;
            return (
              <motion.div key={card.title} variants={staggerItem}>
                <motion.div variants={cardHover} initial="rest" whileHover={reduce ? 'rest' : 'hover'}>
                  <Link to={card.to} className="p-8 rounded-3xl block no-underline h-full" style={cardStyle}>
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
                      style={{ background: tezcaTheme.accentGradient }}
                    >
                      <Icon size={28} style={{ color: 'white' }} />
                    </div>
                    <h3 className="text-xl font-bold mb-3 m-0" style={{ color: tezcaTheme.text }}>
                      {card.title}
                    </h3>
                    <p className="leading-relaxed m-0 text-sm" style={{ color: 'rgba(26,32,44,0.7)' }}>
                      {card.body}
                    </p>
                  </Link>
                </motion.div>
              </motion.div>
            );
          })}
        </motion.div>

        <LandingReveal delay={0.1}>
          <div className="p-8 rounded-3xl" style={cardStyle}>
            <div className="flex gap-4">
              <AlertCircle size={22} className="flex-shrink-0 mt-0.5" style={{ color: tezcaTheme.accent }} />
              <div>
                <h4 className="text-base font-semibold mb-2 m-0" style={{ color: tezcaTheme.text }}>
                  Tezca không thay thế khám bệnh trực tiếp
                </h4>
                <p className="leading-relaxed text-sm m-0" style={{ color: 'rgba(26,32,44,0.7)' }}>
                  Nội dung trên Tezca mang tính tham khảo về sức khỏe và không thay thế tư vấn y tế trực tiếp từ bác sĩ chuyên khoa. Khi gặp vấn đề sức khoẻ nghiêm trọng, hãy đến cơ sở y tế hoặc gọi đường dây khẩn cấp <strong>115</strong>.
                </p>
              </div>
            </div>
          </div>
        </LandingReveal>

        <LandingReveal delay={0.15} className="text-center mt-10">
          <p className="text-sm m-0 flex flex-wrap justify-center gap-x-3 gap-y-1">
            <Link to={ROUTES.legal.root} className="font-medium hover:opacity-80" style={{ color: tezcaTheme.accentDark }}>
              Trung tâm pháp lý
            </Link>
            <span style={{ opacity: 0.3 }}>·</span>
            <Link to={ROUTES.legal.privacy} className="font-medium hover:opacity-80" style={{ color: tezcaTheme.accentDark }}>
              Chính sách bảo mật
            </Link>
            <span style={{ opacity: 0.3 }}>·</span>
            <Link to={ROUTES.legal.terms} className="font-medium hover:opacity-80" style={{ color: tezcaTheme.accentDark }}>
              Điều khoản sử dụng
            </Link>
            <span style={{ opacity: 0.3 }}>·</span>
            <Link to={ROUTES.legal.community} className="font-medium hover:opacity-80" style={{ color: tezcaTheme.accentDark }}>
              Quy tắc cộng đồng
            </Link>
          </p>
        </LandingReveal>
      </div>
    </section>
  );
}
