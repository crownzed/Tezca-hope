import { Link } from 'react-router';
import { Shield, Brain, Users } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { ROUTES } from '../routes';
import { landingEase, staggerContainer, staggerItem, viewportOnce } from '../lib/landingMotion';

export function SocialProofBar() {
  const reduce = useReducedMotion();
  const proofs = [
    { icon: Shield, text: 'Mã hóa đầu cuối 100%', to: ROUTES.product.security },
    { icon: Brain, text: 'Phân tích bởi AI', to: ROUTES.app.chat },
    { icon: Users, text: 'Hỗ trợ bởi Chuyên gia', to: ROUTES.product.experts },
  ] as const;

  return (
    <section className="px-6 py-8 border-y" style={{ borderColor: 'rgba(26, 32, 44, 0.08)' }}>
      <div className="max-w-5xl mx-auto">
        <motion.div
          className="flex flex-wrap justify-center items-center gap-x-12 gap-y-6"
          variants={staggerContainer}
          initial={reduce ? false : 'hidden'}
          whileInView="visible"
          viewport={viewportOnce}
        >
          {proofs.map((proof) => (
            <motion.div key={proof.to} variants={staggerItem}>
              <motion.div whileHover={reduce ? undefined : { y: -2 }} transition={{ duration: 0.25, ease: landingEase }}>
                <Link
                  to={proof.to}
                  className="flex items-center gap-3 opacity-70 hover:opacity-100 no-underline"
                  style={{ color: '#1A202C' }}
                >
                  <motion.span
                    className="inline-flex"
                    whileHover={reduce ? undefined : { rotate: [0, -8, 8, 0] }}
                    transition={{ duration: 0.4 }}
                  >
                    <proof.icon size={20} style={{ color: '#2DD4BF' }} />
                  </motion.span>
                  <span className="text-sm font-medium">{proof.text}</span>
                </Link>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
