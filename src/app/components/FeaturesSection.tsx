import { MessageCircle, TrendingUp, Stethoscope, Heart, Users } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { LandingReveal } from './landing/LandingReveal';
import { cardHover, landingEase, staggerContainer, staggerItem, viewportOnce } from '../lib/landingMotion';

const features = [
  {
    col: 'md:col-span-7',
    icon: MessageCircle,
    title: 'AI Chatbot Tâm giao',
    desc: 'Trợ lý AI lắng nghe và đồng hành — chia sẻ bất cứ lúc nào, cá nhân hoá theo bạn.',
    variant: 'gradient' as const,
    preview: 'chat' as const,
  },
  {
    col: 'md:col-span-5',
    icon: TrendingUp,
    title: 'Dinh dưỡng & Tập luyện',
    desc: 'AI sinh kế hoạch 7 ngày dựa trên hồ sơ và mục tiêu cá nhân của bạn.',
    variant: 'white' as const,
    preview: 'nutrition' as const,
  },
  {
    col: 'md:col-span-5',
    icon: Stethoscope,
    title: 'Tư vấn Chuyên gia',
    desc: 'Chat trực tiếp với chuyên gia y tế được gán — nhận phản hồi cá nhân hoá.',
    variant: 'white' as const,
    preview: 'care' as const,
  },
  {
    col: 'md:col-span-7',
    icon: Heart,
    title: 'Nhật ký Cảm xúc',
    desc: 'Ghi lại tâm trạng mỗi ngày và theo dõi xu hướng sức khoẻ tinh thần theo thời gian.',
    variant: 'gradient' as const,
    preview: 'mood' as const,
  },
  {
    col: 'md:col-span-12',
    icon: Users,
    title: 'Cộng đồng Sức khoẻ',
    desc: 'Diễn đàn và phòng chat theo chủ đề — chia sẻ, học hỏi và đồng hành cùng nhau.',
    variant: 'white' as const,
    preview: 'community' as const,
  },
];

const moodHeights = [40, 65, 45, 80, 70, 85, 60];
const moodLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function FeaturePreview({ type }: { type: (typeof features)[number]['preview'] }) {
  const reduce = useReducedMotion();

  if (type === 'chat') {
    return (
      <div className="space-y-3">
        <motion.div
          className="p-4 rounded-2xl backdrop-blur-xl inline-block"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', border: '1px solid rgba(26, 32, 44, 0.1)' }}
          initial={reduce ? false : { opacity: 0, x: -12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={viewportOnce}
          transition={{ duration: 0.45, ease: landingEase }}
        >
          <p className="text-sm m-0" style={{ color: '#1A202C' }}>
            &quot;Hôm nay mình cảm thấy hơi căng thẳng...&quot;
          </p>
        </motion.div>
        <motion.div
          className="p-4 rounded-2xl ml-8"
          style={{ background: 'linear-gradient(135deg, #2DD4BF 0%, #14B8A6 100%)', color: 'white' }}
          initial={reduce ? false : { opacity: 0, x: 12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={viewportOnce}
          transition={{ duration: 0.45, delay: 0.12, ease: landingEase }}
        >
          <p className="text-sm m-0">Mình hiểu bạn đang trải qua giai đoạn khó. Bạn muốn chia sẻ thêm không? 💚</p>
        </motion.div>
      </div>
    );
  }

  if (type === 'nutrition') {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="relative w-40 h-40">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="80" cy="80" r="70" stroke="rgba(45, 212, 191, 0.1)" strokeWidth="12" fill="none" />
            <motion.circle
              cx="80"
              cy="80"
              r="70"
              stroke="#2DD4BF"
              strokeWidth="12"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={440}
              initial={reduce ? false : { strokeDashoffset: 440 }}
              whileInView={{ strokeDashoffset: 110 }}
              viewport={viewportOnce}
              transition={{ duration: 1.2, ease: landingEase }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-3xl font-bold" style={{ color: '#1A202C' }}>
              1,420
            </div>
            <div className="text-xs font-semibold mt-1" style={{ color: '#2DD4BF' }}>
              kcal / 2,000 mục tiêu
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'care') {
    return (
      <div className="space-y-3">
        <div
          className="p-4 rounded-2xl flex items-center gap-3"
          style={{ backgroundColor: 'rgba(45, 212, 191, 0.06)', border: '1px solid rgba(45,212,191,0.15)' }}
        >
          <div
            className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-lg"
            style={{ background: 'linear-gradient(135deg, #2DD4BF 0%, #14B8A6 100%)' }}
          >
            <span>👨‍⚕️</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold" style={{ color: '#1A202C' }}>
              Chuyên gia sức khoẻ
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="text-xs" style={{ color: 'rgba(26,32,44,0.55)' }}>
                Đang hoạt động
              </span>
            </div>
          </div>
        </div>
        <motion.div
          className="p-4 rounded-2xl"
          style={{ backgroundColor: 'rgba(255,255,255,0.8)', border: '1px solid rgba(26,32,44,0.09)' }}
          initial={reduce ? false : { opacity: 0, x: -10 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={viewportOnce}
          transition={{ duration: 0.4, delay: 0.1, ease: landingEase }}
        >
          <p className="text-sm m-0" style={{ color: '#1A202C' }}>
            Bạn đã uống đủ nước hôm nay chưa? Nhớ ngủ đủ giấc — điều đó quan trọng hơn tập luyện đấy 🌙
          </p>
        </motion.div>
        <motion.div
          className="p-3 rounded-2xl ml-6"
          style={{ background: 'linear-gradient(135deg, #2DD4BF 0%, #14B8A6 100%)', color: 'white' }}
          initial={reduce ? false : { opacity: 0, x: 10 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={viewportOnce}
          transition={{ duration: 0.4, delay: 0.2, ease: landingEase }}
        >
          <p className="text-sm m-0">Cảm ơn bác sĩ! Mình sẽ ngủ sớm hơn 🙏</p>
        </motion.div>
      </div>
    );
  }

  if (type === 'community') {
    return (
      <div className="grid sm:grid-cols-3 gap-3">
        {[
          { badge: 'Dinh dưỡng', text: 'Chia sẻ thực đơn tuần này của mọi người thế nào?' },
          { badge: 'Tâm lý', text: 'Cảm ơn cộng đồng đã lắng nghe — mình thấy nhẹ hơn rồi.' },
          { badge: 'Phòng chat', text: 'Chào mọi người! Ai đang tập phục hồi vai gáy không?' },
        ].map((item, i) => (
          <motion.div
            key={item.badge}
            className="p-4 rounded-2xl"
            style={{ backgroundColor: 'rgba(45, 212, 191, 0.06)', border: '1px solid rgba(45, 212, 191, 0.15)' }}
            initial={reduce ? false : { opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportOnce}
            transition={{ delay: 0.08 * i, duration: 0.4, ease: landingEase }}
          >
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full inline-block mb-2"
              style={{ backgroundColor: 'rgba(45, 212, 191, 0.2)', color: '#0F766E' }}
            >
              {item.badge}
            </span>
            <p className="text-sm m-0 opacity-80" style={{ color: '#1A202C' }}>
              {item.text}
            </p>
          </motion.div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="text-4xl mb-4">🧘‍♀️</div>
      <div className="flex items-end gap-1.5 h-20">
        {moodHeights.map((height, index) => (
          <div key={index} className="flex-1 flex flex-col items-center gap-1">
            <motion.div
              className="w-full rounded-t-lg origin-bottom"
              style={{
                background: index === 5 ? '#2DD4BF' : 'rgba(45, 212, 191, 0.3)',
              }}
              initial={reduce ? { height: `${height}%` } : { height: 0 }}
              whileInView={{ height: `${height}%` }}
              viewport={viewportOnce}
              transition={{ delay: index * 0.06, duration: 0.55, ease: landingEase }}
            />
            <span className="text-[10px]" style={{ color: 'rgba(26,32,44,0.45)' }}>
              {moodLabels[index]}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

export function FeaturesSection() {
  const reduce = useReducedMotion();

  return (
    <section id="tinh-nang" className="px-6 py-24 md:py-32 scroll-mt-24">
      <div className="max-w-7xl mx-auto">
        <LandingReveal className="text-center mb-6">
          <p className="text-sm font-semibold uppercase tracking-wider mb-3 m-0" style={{ color: '#0F766E' }}>
            Tính năng
          </p>
          <h2 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight m-0" style={{ color: '#1A202C' }}>
            Tất cả những gì bạn cần
          </h2>
          <p className="text-lg max-w-2xl mx-auto m-0" style={{ color: 'rgba(26,32,44,0.6)' }}>
            Một nền tảng duy nhất cho sức khoẻ thể chất, tinh thần và dinh dưỡng.
          </p>
        </LandingReveal>

        <motion.div
          className="grid md:grid-cols-12 gap-6 mt-14"
          variants={staggerContainer}
          initial={reduce ? false : 'hidden'}
          whileInView="visible"
          viewport={viewportOnce}
        >
          {features.map((f) => {
            const Icon = f.icon;
            const isGradient = f.variant === 'gradient';
            return (
              <motion.div key={f.title} variants={staggerItem} className={f.col}>
                <motion.div
                  variants={cardHover}
                  initial="rest"
                  whileHover={reduce ? 'rest' : 'hover'}
                  className="h-full"
                >
                  <div
                    className="p-8 md:p-10 rounded-3xl relative overflow-hidden h-full"
                    style={
                      isGradient
                        ? {
                            background:
                              'linear-gradient(135deg, rgba(45, 212, 191, 0.1) 0%, rgba(20, 184, 166, 0.05) 100%)',
                            border: '1px solid rgba(45, 212, 191, 0.2)',
                            boxShadow: '0 20px 60px -15px rgba(45, 212, 191, 0.15)',
                          }
                        : {
                            backgroundColor: 'white',
                            border: '1px solid rgba(26, 32, 44, 0.08)',
                            boxShadow: '0 20px 60px -15px rgba(26, 32, 44, 0.1)',
                          }
                    }
                  >
                    {isGradient && (
                      <motion.div
                        className="absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none"
                        style={{ backgroundColor: '#2DD4BF' }}
                        animate={reduce ? undefined : { scale: [1, 1.15, 1], opacity: [0.15, 0.25, 0.15] }}
                        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                      />
                    )}
                    <div className="relative z-10">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
                        style={
                          isGradient
                            ? { backgroundColor: '#2DD4BF' }
                            : { background: 'linear-gradient(135deg, #2DD4BF 0%, #14B8A6 100%)' }
                        }
                      >
                        <Icon size={26} style={{ color: 'white' }} />
                      </div>
                      <h3 className="text-2xl md:text-3xl font-bold m-0 mb-2" style={{ color: '#1A202C' }}>
                        {f.title}
                      </h3>
                      <p className="text-sm leading-relaxed m-0 mb-6" style={{ color: 'rgba(26,32,44,0.65)' }}>
                        {f.desc}
                      </p>
                      <FeaturePreview type={f.preview} />
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
