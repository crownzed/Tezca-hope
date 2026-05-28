import { motion, useReducedMotion } from 'motion/react';
import { HeroSection } from '../components/HeroSection';
import { SocialProofBar } from '../components/SocialProofBar';
import { FeaturesSection } from '../components/FeaturesSection';
import { TrustDisclaimerSection } from '../components/TrustDisclaimerSection';
import { FloatingChatBubble } from '../components/FloatingChatBubble';
import { NewsletterForm } from '../components/NewsletterForm';
import { LandingAmbient } from '../components/landing/LandingAmbient';
import { LandingReveal } from '../components/landing/LandingReveal';

export function LandingPage() {
  const reduce = useReducedMotion();

  return (
    <>
      <HeroSection />
      <SocialProofBar />
      <FeaturesSection />
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
            style={{ backgroundColor: '#2DD4BF' }}
            animate={reduce ? undefined : { scale: [1, 1.12, 1], opacity: [0.35, 0.5, 0.35] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="relative z-10">
            <LandingReveal as="h2" className="text-3xl md:text-4xl font-bold tracking-tight mb-4" style={{ color: '#1A202C' }}>
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
