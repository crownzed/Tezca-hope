import { Link } from 'react-router';
import { MessageCircle } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { ROUTES } from '../routes';
import { LandingAmbient } from './landing/LandingAmbient';
import { landingEase, landingSpring, staggerContainer, staggerItem } from '../lib/landingMotion';

const stats = ['100%', '24/7', 'Miễn phí'] as const;

const chatMessages = [
  { side: 'user' as const, text: 'Mình vừa ăn phở gà với trứng 🍜', delay: 0.9 },
  { side: 'ai' as const, rich: true, delay: 1.15 },
  { side: 'ai' as const, text: 'Hôm nay bạn cảm thấy thế nào? 🌸', delay: 1.45 },
];

export function HeroSection() {
  const reduce = useReducedMotion();

  return (
    <section id="hero" className="relative px-6 py-24 md:py-32 scroll-mt-24 overflow-hidden">
      <LandingAmbient />
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            className="space-y-8"
            variants={staggerContainer}
            initial={reduce ? false : 'hidden'}
            animate="visible"
          >
            <motion.h1
              variants={staggerItem}
              className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight"
              style={{ color: '#1A202C' }}
            >
              Sức khỏe của bạn.
              <br />
              Được thấu hiểu.
              <br />
              Được chăm sóc.
            </motion.h1>

            <motion.p
              variants={staggerItem}
              className="text-xl md:text-2xl leading-relaxed opacity-60"
              style={{ color: '#1A202C' }}
            >
              Trợ lý AI thấu cảm kết hợp chuyên gia y tế. Theo dõi dinh dưỡng, sức khỏe tinh thần và nhận tư vấn 24/7.
            </motion.p>

            <motion.div variants={staggerItem} className="flex flex-col sm:flex-row gap-4">
              <motion.div whileHover={reduce ? undefined : { scale: 1.04 }} whileTap={reduce ? undefined : { scale: 0.98 }}>
                <Link
                  to={ROUTES.app.chat}
                  className="px-8 py-4 rounded-full text-lg font-semibold flex items-center justify-center gap-3 shadow-lg shadow-teal-500/20"
                  style={{ backgroundColor: '#2DD4BF', color: '#1A202C' }}
                >
                  <MessageCircle size={24} />
                  Trò chuyện ẩn danh ngay
                </Link>
              </motion.div>

              <motion.div whileHover={reduce ? undefined : { scale: 1.02 }} whileTap={reduce ? undefined : { scale: 0.98 }}>
                <Link
                  to={ROUTES.app.dashboard}
                  className="px-8 py-4 rounded-full text-lg font-medium inline-flex items-center justify-center"
                  style={{
                    backgroundColor: 'transparent',
                    color: '#1A202C',
                    border: '2px solid rgba(26, 32, 44, 0.1)',
                  }}
                >
                  Vào ứng dụng
                </Link>
              </motion.div>
            </motion.div>

            <motion.div variants={staggerItem} className="flex gap-8 pt-8">
              {stats.map((value, i) => (
                <motion.div
                  key={value}
                  className="text-3xl font-bold"
                  style={{ color: '#1A202C' }}
                  initial={reduce ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.08, duration: 0.45, ease: landingEase }}
                >
                  {value}
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          <motion.div
            className="relative flex justify-center lg:justify-end"
            initial={reduce ? false : { opacity: 0, x: 40, rotateY: -8 }}
            animate={{ opacity: 1, x: 0, rotateY: -5 }}
            transition={{ ...landingSpring, delay: 0.2 }}
          >
            <div className="relative" style={{ perspective: '1000px' }}>
              <motion.div
                className="relative w-[320px]"
                style={{
                  transformStyle: 'preserve-3d',
                }}
                animate={
                  reduce
                    ? undefined
                    : {
                        y: [0, -10, 0],
                        rotateX: [2, 4, 2],
                      }
                }
                transition={
                  reduce
                    ? undefined
                    : {
                        y: { duration: 5.5, repeat: Infinity, ease: 'easeInOut' },
                        rotateX: { duration: 5.5, repeat: Infinity, ease: 'easeInOut' },
                      }
                }
                whileHover={reduce ? undefined : { scale: 1.02, rotateY: -2 }}
              >
                <div
                  className="rounded-[3rem] p-3 shadow-2xl relative border"
                  style={{
                    backgroundColor: '#ffffff',
                    borderColor: 'rgba(26, 32, 44, 0.1)',
                    boxShadow:
                      '0 50px 100px -20px rgba(26, 32, 44, 0.12), 0 30px 60px -30px rgba(45, 212, 191, 0.15)',
                    transform: 'rotateY(-5deg) rotateX(2deg)',
                  }}
                >
                  <div
                    className="absolute top-6 left-1/2 -translate-x-1/2 w-28 h-8 rounded-full z-20"
                    style={{ backgroundColor: 'rgba(26, 32, 44, 0.12)' }}
                  />

                  <div
                    className="rounded-[2.5rem] overflow-hidden relative"
                    style={{ aspectRatio: '9/19.5', backgroundColor: '#F9F9FB' }}
                  >
                    <div className="h-full flex flex-col pt-8">
                      <div
                        className="px-6 py-4 backdrop-blur-xl border-b"
                        style={{
                          backgroundColor: 'rgba(249, 249, 251, 0.8)',
                          borderColor: 'rgba(26, 32, 44, 0.1)',
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <motion.div
                            className="w-10 h-10 rounded-full flex items-center justify-center"
                            style={{
                              background: 'linear-gradient(135deg, #2DD4BF 0%, #14B8A6 100%)',
                            }}
                            animate={reduce ? undefined : { scale: [1, 1.06, 1] }}
                            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                          >
                            <span className="text-lg">✨</span>
                          </motion.div>
                          <div className="text-sm font-semibold" style={{ color: '#1A202C' }}>
                            Tezca AI
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 px-4 py-6 space-y-4 overflow-hidden">
                        {chatMessages.map((msg, idx) =>
                          msg.rich ? (
                            <motion.div
                              key="rich"
                              className="flex justify-start"
                              initial={reduce ? false : { opacity: 0, x: -16, scale: 0.96 }}
                              animate={{ opacity: 1, x: 0, scale: 1 }}
                              transition={{ delay: msg.delay, duration: 0.5, ease: landingEase }}
                            >
                              <div
                                className="p-4 rounded-3xl rounded-tl-lg max-w-[85%] backdrop-blur-xl border"
                                style={{
                                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                  borderColor: 'rgba(45, 212, 191, 0.2)',
                                  boxShadow: '0 8px 32px rgba(45, 212, 191, 0.1)',
                                }}
                              >
                                <p className="text-sm mb-3 font-medium m-0" style={{ color: '#1A202C' }}>
                                  Tuyệt vời! Đã ghi nhận 💚
                                </p>
                                <div
                                  className="p-3 rounded-2xl mb-3"
                                  style={{ backgroundColor: 'rgba(45, 212, 191, 0.1)' }}
                                >
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-semibold" style={{ color: '#1A202C' }}>
                                      Phở gà
                                    </span>
                                    <span className="text-xs font-bold" style={{ color: '#2DD4BF' }}>
                                      350 cal
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs font-semibold" style={{ color: '#1A202C' }}>
                                      Trứng luộc
                                    </span>
                                    <span className="text-xs font-bold" style={{ color: '#2DD4BF' }}>
                                      70 cal
                                    </span>
                                  </div>
                                </div>
                                <div
                                  className="flex justify-between items-center pt-2 border-t"
                                  style={{ borderColor: 'rgba(45, 212, 191, 0.2)' }}
                                >
                                  <span className="text-xs font-bold" style={{ color: '#1A202C' }}>
                                    Tổng cộng
                                  </span>
                                  <span className="text-sm font-bold" style={{ color: '#2DD4BF' }}>
                                    420 cal
                                  </span>
                                </div>
                              </div>
                            </motion.div>
                          ) : (
                            <motion.div
                              key={idx}
                              className={`flex ${msg.side === 'user' ? 'justify-end' : 'justify-start'}`}
                              initial={reduce ? false : { opacity: 0, y: 12, x: msg.side === 'user' ? 12 : -12 }}
                              animate={{ opacity: 1, y: 0, x: 0 }}
                              transition={{ delay: msg.delay, duration: 0.45, ease: landingEase }}
                            >
                              <div
                                className={`px-4 py-3 rounded-3xl max-w-[85%] ${
                                  msg.side === 'user' ? 'rounded-tr-lg' : 'rounded-tl-lg backdrop-blur-xl border'
                                }`}
                                style={
                                  msg.side === 'user'
                                    ? {
                                        background: 'linear-gradient(135deg, #2DD4BF 0%, #14B8A6 100%)',
                                        color: 'white',
                                      }
                                    : {
                                        backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                        borderColor: 'rgba(45, 212, 191, 0.2)',
                                        color: '#1A202C',
                                      }
                                }
                              >
                                <p className="text-sm m-0">{msg.text}</p>
                              </div>
                            </motion.div>
                          ),
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <motion.div
                  className="absolute inset-0 -z-10 blur-3xl rounded-[3rem]"
                  style={{ backgroundColor: '#2DD4BF' }}
                  animate={reduce ? undefined : { opacity: [0.25, 0.4, 0.25] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
