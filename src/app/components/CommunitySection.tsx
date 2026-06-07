import type { ReactNode } from 'react';
import { MessagesSquare, Users } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { ROOM_TOPICS } from '../lib/communityTopics';
import { LandingReveal } from './landing/LandingReveal';
import { landingEase, staggerContainer, staggerItem, viewportOnce } from '../lib/landingMotion';
import { tezcaTheme } from '../lib/tezcaTheme';

/** Chỉ dịch lên — tránh scale làm vỡ bo góc khung thẻ */
const communityCardHover = {
  rest: { y: 0 },
  hover: { y: -5, transition: { duration: 0.3, ease: landingEase } },
};

const cardBaseClass =
  'flex flex-col h-full min-h-[320px] rounded-3xl overflow-hidden';

type CommunityCardProps = {
  icon: typeof Users;
  title: string;
  description: string;
  variant: 'light' | 'gradient';
  children: ReactNode;
};

function CommunityCard({
  icon: Icon,
  title,
  description,
  variant,
  children,
}: CommunityCardProps) {
  const isGradient = variant === 'gradient';

  return (
    <div
      className={cardBaseClass}
      style={
        isGradient
          ? {
              background:
                'linear-gradient(135deg, rgba(45, 212, 191, 0.12) 0%, rgba(20, 184, 166, 0.06) 100%)',
              border: '1px solid rgba(45, 212, 191, 0.25)',
              boxShadow: '0 20px 60px -15px rgba(45, 212, 191, 0.18)',
            }
          : {
              backgroundColor: tezcaTheme.surface,
              border: `1px solid ${tezcaTheme.border}`,
              boxShadow: '0 20px 60px -15px rgba(26, 32, 44, 0.1)',
            }
      }
    >
      <div className="relative flex flex-col flex-1 p-8 md:p-10 min-h-0">
        {isGradient && (
          <div
            className="absolute -top-20 -right-16 w-52 h-52 rounded-full blur-3xl opacity-20 pointer-events-none"
            style={{ backgroundColor: tezcaTheme.accentLight }}
            aria-hidden
          />
        )}
        <div className="relative z-10 flex flex-col flex-1 min-h-0">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shrink-0"
            style={
              isGradient
                ? { backgroundColor: tezcaTheme.accent }
                : { background: tezcaTheme.accentGradient }
            }
          >
            <Icon size={28} className="text-white" strokeWidth={2} />
          </div>
          <h3 className="text-2xl font-bold m-0 mb-3 shrink-0" style={{ color: tezcaTheme.text }}>
            {title}
          </h3>
          <p className="m-0 mb-5 leading-relaxed shrink-0" style={{ color: tezcaTheme.textMuted }}>
            {description}
          </p>
          <div className="flex-1 min-h-0">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function CommunitySection() {
  const reduce = useReducedMotion();

  return (
    <section
      id="cong-dong"
      className="px-6 py-24 md:py-32 scroll-mt-24 border-y overflow-hidden"
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
          <p className="text-lg m-0 leading-relaxed max-w-2xl mx-auto" style={{ color: tezcaTheme.textMuted }}>
            Diễn đàn chia sẻ kinh nghiệm và phòng trò chuyện theo chủ đề — có chuyên gia đồng hành, an toàn và
            tôn trọng quyền riêng tư.
          </p>
        </LandingReveal>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 items-stretch"
          variants={staggerContainer}
          initial={reduce ? false : 'hidden'}
          whileInView="visible"
          viewport={viewportOnce}
        >
          <motion.div variants={staggerItem} className="h-full min-w-0">
            <motion.div
              className="h-full"
              variants={communityCardHover}
              initial="rest"
              whileHover={reduce ? 'rest' : 'hover'}
            >
              <CommunityCard
                icon={Users}
                title="Diễn đàn"
                description="Đăng bài theo chủ đề — thích, bình luận và nhận góp ý từ cộng đồng."
                variant="light"
              >
                <ul className="flex flex-wrap gap-2 list-none p-0 m-0">
                  {ROOM_TOPICS.map((t) => (
                    <li
                      key={t.id}
                      className="text-xs font-medium px-3 py-1.5 rounded-full"
                      style={{
                        backgroundColor: 'rgba(45, 212, 191, 0.1)',
                        color: tezcaTheme.accentDark,
                        border: '1px solid rgba(45, 212, 191, 0.2)',
                      }}
                    >
                      {t.label}
                    </li>
                  ))}
                </ul>
              </CommunityCard>
            </motion.div>
          </motion.div>

          <motion.div variants={staggerItem} className="h-full min-w-0">
            <motion.div
              className="h-full"
              variants={communityCardHover}
              initial="rest"
              whileHover={reduce ? 'rest' : 'hover'}
            >
              <CommunityCard
                icon={MessagesSquare}
                title="Phòng trò chuyện"
                description="Tham gia phòng theo chủ đề, trò chuyện thời gian thực với thành viên và chuyên gia."
                variant="gradient"
              >
                <ul className="space-y-2.5 list-none p-0 m-0">
                  {ROOM_TOPICS.map((t) => (
                    <li
                      key={t.id}
                      className="text-sm leading-snug rounded-xl px-3 py-2.5"
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.65)',
                        border: '1px solid rgba(45, 212, 191, 0.15)',
                        color: tezcaTheme.text,
                      }}
                    >
                      <span className="font-semibold">{t.label}</span>
                      <span style={{ color: tezcaTheme.textMuted }}> — {t.description}</span>
                    </li>
                  ))}
                </ul>
              </CommunityCard>
            </motion.div>
          </motion.div>
        </motion.div>

      </div>
    </section>
  );
}
