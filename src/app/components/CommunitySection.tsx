import { Link } from 'react-router';
import { ArrowRight, MessagesSquare, Users } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { ROUTES, appCommunityPath } from '../routes';
import { ROOM_TOPICS } from '../lib/communityTopics';
import { LandingReveal } from './landing/LandingReveal';
import { cardHover, staggerContainer, staggerItem, viewportOnce } from '../lib/landingMotion';
import { tezcaTheme } from '../lib/tezcaTheme';

const cardLinkClass =
  'block h-full no-underline text-inherit rounded-3xl transition-shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600';

export function CommunitySection() {
  const reduce = useReducedMotion();

  return (
    <section
      id="cong-dong"
      className="px-6 py-24 md:py-32 scroll-mt-24 border-y"
      style={{
        backgroundColor: tezcaTheme.subtleBg,
        borderColor: tezcaTheme.border,
      }}
    >
      <div className="max-w-7xl mx-auto">
        <LandingReveal className="text-center mb-12 md:mb-16 max-w-3xl mx-auto">
          <p className="text-sm font-semibold uppercase tracking-wider mb-3 m-0" style={{ color: tezcaTheme.accentDark }}>
            Cộng đồng
          </p>
          <h2 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight m-0" style={{ color: tezcaTheme.text }}>
            Cùng nhau trên hành trình sức khỏe
          </h2>
          <p className="text-lg opacity-70 m-0 leading-relaxed" style={{ color: tezcaTheme.text }}>
            Diễn đàn chia sẻ kinh nghiệm và phòng trò chuyện theo chủ đề — có chuyên gia đồng hành, an toàn và
            tôn trọng quyền riêng tư.
          </p>
        </LandingReveal>

        <motion.div
          className="grid md:grid-cols-2 gap-6 mb-10"
          variants={staggerContainer}
          initial={reduce ? false : 'hidden'}
          whileInView="visible"
          viewport={viewportOnce}
        >
          <motion.div variants={staggerItem}>
            <motion.div variants={cardHover} initial="rest" whileHover={reduce ? 'rest' : 'hover'} className="h-full">
              <Link to={appCommunityPath('forum')} className={cardLinkClass} aria-label="Vào diễn đàn cộng đồng">
                <div
                  className="h-full p-8 md:p-10 cursor-pointer"
                  style={{
                    backgroundColor: tezcaTheme.surface,
                    border: `1px solid ${tezcaTheme.border}`,
                    boxShadow: '0 20px 60px -15px rgba(26, 32, 44, 0.1)',
                  }}
                >
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
                    style={{ background: tezcaTheme.accentGradient }}
                  >
                    <Users size={28} style={{ color: tezcaTheme.surface }} />
                  </div>
                  <h3 className="text-2xl font-bold m-0 mb-3" style={{ color: tezcaTheme.text }}>
                    Diễn đàn
                  </h3>
                  <p className="opacity-70 m-0 mb-6 leading-relaxed" style={{ color: tezcaTheme.text }}>
                    Đăng bài theo chủ đề dinh dưỡng, tâm lý, cơ · xương · khớp — thích, bình luận và nhận góp ý từ
                    cộng đồng.
                  </p>
                  <ul className="flex flex-wrap gap-2 list-none p-0 m-0">
                    {ROOM_TOPICS.map((t) => (
                      <li
                        key={t.id}
                        className="text-xs font-medium px-3 py-1.5 rounded-full"
                        style={{ backgroundColor: tezcaTheme.subtleBg, color: tezcaTheme.accentDark }}
                      >
                        {t.label}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-6 mb-0 text-sm font-semibold inline-flex items-center gap-1" style={{ color: tezcaTheme.accentDark }}>
                    Vào diễn đàn
                    <ArrowRight size={16} aria-hidden />
                  </p>
                </div>
              </Link>
            </motion.div>
          </motion.div>

          <motion.div variants={staggerItem}>
            <motion.div variants={cardHover} initial="rest" whileHover={reduce ? 'rest' : 'hover'} className="h-full">
              <Link to={appCommunityPath('rooms')} className={cardLinkClass} aria-label="Vào phòng chat cộng đồng">
                <div
                  className="h-full p-8 md:p-10 relative overflow-hidden cursor-pointer"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(45, 212, 191, 0.12) 0%, rgba(20, 184, 166, 0.06) 100%)',
                    border: '1px solid rgba(45, 212, 191, 0.25)',
                    boxShadow: '0 20px 60px -15px rgba(45, 212, 191, 0.2)',
                  }}
                >
                  <motion.div
                    className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl opacity-25 pointer-events-none"
                    style={{ backgroundColor: tezcaTheme.accentLight }}
                    animate={reduce ? undefined : { scale: [1, 1.1, 1] }}
                    transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <div className="relative z-10">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
                      style={{ backgroundColor: tezcaTheme.accentLight }}
                    >
                      <MessagesSquare size={28} style={{ color: tezcaTheme.surface }} />
                    </div>
                    <h3 className="text-2xl font-bold m-0 mb-3" style={{ color: tezcaTheme.text }}>
                      Phòng trò chuyện
                    </h3>
                    <p className="opacity-70 m-0 mb-4 leading-relaxed" style={{ color: tezcaTheme.text }}>
                      Tham gia phòng theo chủ đề, trò chuyện thời gian thực với thành viên và chuyên gia Tezca.
                    </p>
                    <ul className="space-y-2 list-none p-0 m-0 text-sm opacity-80" style={{ color: tezcaTheme.text }}>
                      {ROOM_TOPICS.map((t) => (
                        <li key={t.id}>
                          <span className="font-semibold">{t.label}</span>
                          <span className="opacity-70"> — {t.description}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-6 mb-0 text-sm font-semibold inline-flex items-center gap-1" style={{ color: tezcaTheme.accentDark }}>
                      Vào phòng chat
                      <ArrowRight size={16} aria-hidden />
                    </p>
                  </div>
                </div>
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>

        <LandingReveal className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to={ROUTES.community.forum}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-sm font-semibold no-underline transition-opacity hover:opacity-90"
            style={{ background: tezcaTheme.accentGradient, color: tezcaTheme.text }}
          >
            Vào cộng đồng
            <ArrowRight size={18} />
          </Link>
          <Link
            to={ROUTES.auth.customerLogin}
            state={{ from: ROUTES.community.forum }}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-sm font-semibold no-underline border transition-opacity hover:opacity-90"
            style={{ borderColor: tezcaTheme.borderStrong, color: tezcaTheme.text }}
          >
            Đăng nhập để tham gia
          </Link>
        </LandingReveal>
      </div>
    </section>
  );
}
