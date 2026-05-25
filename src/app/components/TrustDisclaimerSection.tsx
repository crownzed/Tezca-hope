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
    title: 'Quyền riêng tư tuyệt đối',
    body: 'Mọi cuộc trò chuyện được mã hóa đầu cuối. Dữ liệu của bạn thuộc về bạn và chỉ bạn mới có quyền truy cập.',
  },
  {
    to: ROUTES.product.security,
    icon: Shield,
    title: 'Bảo mật cấp ngân hàng',
    body: 'Chúng tôi sử dụng công nghệ bảo mật tiên tiến nhất để đảm bảo thông tin sức khỏe của bạn luôn an toàn.',
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
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3 m-0" style={{ color: tezcaTheme.text }}>
            Tin cậy & minh bạch
          </h2>
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
                    <h3 className="text-2xl font-bold mb-3 m-0" style={{ color: tezcaTheme.text }}>
                      {card.title}
                    </h3>
                    <p className="leading-relaxed m-0 opacity-70" style={{ color: tezcaTheme.text }}>
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
              <AlertCircle size={24} className="flex-shrink-0 mt-1" style={{ color: tezcaTheme.accent }} />
              <div>
                <h4 className="text-lg font-semibold mb-2 m-0" style={{ color: tezcaTheme.text }}>
                  Lưu ý Y khoa
                </h4>
                <p className="leading-relaxed text-sm m-0 opacity-70" style={{ color: tezcaTheme.text }}>
                  Tezca cung cấp thông tin tham khảo về sức khỏe và không thay thế cho khám và tư vấn y tế trực tiếp từ
                  chuyên khoa. Nếu bạn đang gặp vấn đề sức khỏe nghiêm trọng, vui lòng liên hệ với bác sĩ hoặc cơ sở y
                  tế gần nhất. Trong trường hợp khẩn cấp, hãy gọi ngay đường dây nóng 115.
                </p>
              </div>
            </div>
          </div>
        </LandingReveal>

        <LandingReveal delay={0.15} className="text-center mt-12">
          <p className="text-sm m-0">
            <Link to={ROUTES.legal.privacy} className="font-medium hover:opacity-80" style={{ color: tezcaTheme.accentDark }}>
              Chính sách bảo mật
            </Link>
            <span className="mx-2 opacity-30" style={{ color: tezcaTheme.text }}>
              ·
            </span>
            <Link to={ROUTES.legal.terms} className="font-medium hover:opacity-80" style={{ color: tezcaTheme.accentDark }}>
              Điều khoản sử dụng
            </Link>
          </p>
        </LandingReveal>
      </div>
    </section>
  );
}
