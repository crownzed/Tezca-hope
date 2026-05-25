import { motion, useReducedMotion } from 'motion/react';

/** Soft drifting blobs behind hero / CTA sections. */
export function LandingAmbient({ className = '' }: { className?: string }) {
  const reduce = useReducedMotion();
  if (reduce) return null;

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      <motion.div
        className="absolute -top-32 -left-24 w-96 h-96 rounded-full blur-3xl opacity-30"
        style={{ backgroundColor: '#2DD4BF' }}
        animate={{ x: [0, 24, 0], y: [0, 16, 0], scale: [1, 1.08, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-1/3 -right-20 w-80 h-80 rounded-full blur-3xl opacity-20"
        style={{ backgroundColor: '#14B8A6' }}
        animate={{ x: [0, -20, 0], y: [0, 28, 0], scale: [1, 1.05, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />
    </div>
  );
}
