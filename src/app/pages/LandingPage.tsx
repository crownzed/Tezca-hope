import { Link } from 'react-router';
import { motion, useReducedMotion } from 'motion/react';
import { MessageCircle, ArrowRight } from 'lucide-react';
import { HeroSection } from '../components/HeroSection';
import { SocialProofBar } from '../components/SocialProofBar';
import { FeaturesSection } from '../components/FeaturesSection';
import { CommunitySection } from '../components/CommunitySection';
import { TrustDisclaimerSection } from '../components/TrustDisclaimerSection';
import { FloatingChatBubble } from '../components/FloatingChatBubble';
import { NewsletterForm } from '../components/NewsletterForm';
import { LandingAmbient } from '../components/landing/LandingAmbient';
import { LandingReveal } from '../components/landing/LandingReveal';
import { tezcaTheme } from '../lib/tezcaTheme';
import { ROUTES } from '../routes';

export function LandingPage() {
  const reduce = useReducedMotion();

  return (
    <>
      <HeroSection />
      <SocialProofBar />
      <FeaturesSection />

      {/* CTA giữa trang */}
      <section className="px-6 py-16 md:py-20">
        <motion.div
          className="max-w-3xl mx-auto text-center space-y-6"
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-10% 0px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 className="text-2xl md:text-3xl font-bold" style={{ color: '#1A202C' }}>
            Bắt đầu miễn phí — không cần đăng ký
          </h2>
          <p className="text-lg" style={{ color: 'rgba(26, 32, 44, 0.7)' }}>
            Trò chuyện ẩn danh với AI ngay bây giờ, hoặc tạo tài khoản để lưu lịch sử và nhận kế hoạch cá nhân hóa.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link
              to={ROUTES.app.chat}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full text-lg font-semibold shadow-lg shadow-teal-500/20 transition-transform hover:scale-[1.03] active:scale-[0.98]"
              style={{ backgroundColor: '#2DD4BF', color: '#1A202C' }}
            >
              <MessageCircle size={22} />
              Chat với AI ngay
            </Link>
            <Link
              to={ROUTES.auth.customerLogin}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full text-lg font-medium transition-transform hover:scale-[1.02] active:scale-[0.98]"
              style={{ color: '#1A202C', border: '2px solid rgba(26, 32, 44, 0.12)' }}
            >
              Tạo tài khoản miễn phí
              <ArrowRight size={20} />
            </Link>
          </div>
        </motion.div>
      </section>

      <CommunitySection />
      <TrustDisclaimerSection />
      <section id="tu-van" className="relative px-6 py-20 md:py-28 scroll-mt-24 overflow-hidden">
        <LandingAmbient />
        <motion.div
          className="max-w-4xl mx-auto rounded-[2rem] p-10 md:p-14 text-center relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(45, 212, 191, 0.12) 0%, rgba(20, 184, 166, 0.06) 100%)',
            border: '1px solid rgba(45, 212, 191, 0.25)',
            boxShadow: '0 24px 80px -24px rgba(45, 212, 191, 0.35)',
          }}
          initial={reduce ? false : { opacity: 0, y: 32, scale: 0.98 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: '-8% 0px' }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.div
            className="absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl opacity-40 pointer-events-none"
            style={{ backgroundColor: tezcaTheme.accentLight }}
            animate={reduce ? undefined : { scale: [1, 1.12, 1], opacity: [0.35, 0.5, 0.35] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="relative z-10">
            <LandingReveal as="h2" className="text-3xl md:text-4xl font-bold tracking-tight mb-4" style={{ color: tezcaTheme.text }}>
              Sẵn sàng đồng hành cùng Tezca?
            </LandingReveal>
            <motion.div
              className="mt-8"
              initial={reduce ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <NewsletterForm />
            </motion.div>
          </div>
        </motion.div>
      </section>
      <FloatingChatBubble />
    </>
  );
}
