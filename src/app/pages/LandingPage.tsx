import { Link } from 'react-router';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { HeroSection } from '../components/HeroSection';
import { SocialProofBar } from '../components/SocialProofBar';
import { FeaturesSection } from '../components/FeaturesSection';
import { CommunitySection } from '../components/CommunitySection';
import { TrustDisclaimerSection } from '../components/TrustDisclaimerSection';
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
      <CommunitySection />
      <TrustDisclaimerSection />

      {/* CTA Section */}
      <section id="tu-van" className="relative px-6 py-20 md:py-28 scroll-mt-24 overflow-hidden">
        <LandingAmbient />
        <motion.div
          className="max-w-3xl mx-auto rounded-[2rem] p-10 md:p-14 text-center relative overflow-hidden"
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
            className="absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl opacity-35 pointer-events-none"
            style={{ backgroundColor: tezcaTheme.accentLight }}
            animate={reduce ? undefined : { scale: [1, 1.12, 1], opacity: [0.3, 0.45, 0.3] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="relative z-10">
            <LandingReveal>
              <p
                className="text-sm font-semibold uppercase tracking-wider mb-4 m-0"
                style={{ color: tezcaTheme.accentDark }}
              >
                Ứng dụng
              </p>
              <h2
                className="text-3xl md:text-4xl font-bold tracking-tight mb-3 m-0"
                style={{ color: tezcaTheme.text }}
              >
                Hành trình sức khoẻ của bạn bắt đầu từ đây
              </h2>
              <p className="text-lg mb-0 mt-2 m-0" style={{ color: 'rgba(26,32,44,0.65)' }}>
                Theo dõi sức khoẻ, dinh dưỡng và nhận tư vấn từ chuyên gia — mọi lúc, mọi nơi.
              </p>
            </LandingReveal>

            {/* Primary CTA */}
            <motion.div
              className="flex flex-col sm:flex-row gap-3 justify-center mt-8"
              initial={reduce ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <motion.div
                whileHover={reduce ? undefined : { scale: 1.04 }}
                whileTap={reduce ? undefined : { scale: 0.97 }}
              >
                <Link
                  to={ROUTES.app.dashboard}
                  className="inline-flex items-center gap-2.5 px-8 py-4 rounded-full text-base font-bold no-underline shadow-lg shadow-teal-400/25"
                  style={{ background: tezcaTheme.accentGradient, color: '#fff' }}
                >
                  Vào ứng dụng
                  <ArrowRight size={18} />
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </section>

    </>
  );
}
