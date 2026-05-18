import React from 'react';
import { HeroSection } from '../components/HeroSection';
import { SocialProofBar } from '../components/SocialProofBar';
import { FeaturesSection } from '../components/FeaturesSection';
import { TrustDisclaimerSection } from '../components/TrustDisclaimerSection';
import { FloatingChatBubble } from '../components/FloatingChatBubble';

export function LandingPage() {
  return (
    <>
      <HeroSection />
      <SocialProofBar />
      <FeaturesSection />
      <TrustDisclaimerSection />
      <section id="tu-van" className="px-6 py-20 md:py-28 scroll-mt-24">
        <div
          className="max-w-4xl mx-auto rounded-[2rem] p-10 md:p-14 text-center relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(45, 212, 191, 0.12) 0%, rgba(20, 184, 166, 0.06) 100%)',
            border: '1px solid rgba(45, 212, 191, 0.25)',
            boxShadow: '0 24px 80px -24px rgba(45, 212, 191, 0.35)',
          }}
        >
          <div
            className="absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl opacity-40 pointer-events-none"
            style={{ backgroundColor: '#2DD4BF' }}
          />
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4" style={{ color: '#1A202C' }}>
              Sẵn sàng đồng hành cùng Tezca?
            </h2>
            <p className="text-lg opacity-70 max-w-2xl mx-auto mb-8" style={{ color: '#1A202C' }}>
              Để lại email — đội ngũ sẽ gửi hướng dẫn bắt đầu và ưu đãi dùng thử sớm nhất.
            </p>
            <form className="mx-auto max-w-xl flex flex-col sm:flex-row gap-3" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                required
                placeholder="you@email.com"
                className="flex-1 rounded-full px-5 py-3.5 text-sm outline-none transition-shadow focus:ring-4"
                style={{
                  border: '1px solid rgba(26, 32, 44, 0.12)',
                  backgroundColor: 'white',
                  color: '#1A202C',
                  boxShadow: 'none',
                }}
              />
              <button
                type="submit"
                className="rounded-full px-8 py-3.5 text-sm font-semibold text-white transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #2DD4BF 0%, #14B8A6 100%)',
                }}
              >
                Nhận tin tức
              </button>
            </form>
          </div>
        </div>
      </section>
      <FloatingChatBubble />
    </>
  );
}
