import type { ReactNode } from 'react';
import { motion, useReducedMotion, type HTMLMotionProps } from 'motion/react';
import { fadeUp, viewportOnce } from '../../lib/landingMotion';

type LandingRevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: 'div' | 'section' | 'article' | 'li' | 'span' | 'h1' | 'h2' | 'p';
} & Omit<HTMLMotionProps<'div'>, 'children'>;

const tags = {
  div: motion.div,
  section: motion.section,
  article: motion.article,
  li: motion.li,
  span: motion.span,
  h1: motion.h1,
  h2: motion.h2,
  p: motion.p,
};

export function LandingReveal({
  children,
  className,
  delay = 0,
  as = 'div',
  ...rest
}: LandingRevealProps) {
  const reduce = useReducedMotion();
  const Tag = tags[as];

  if (reduce) {
    return (
      <div className={className} {...(rest as object)}>
        {children}
      </div>
    );
  }

  return (
    <Tag
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      variants={fadeUp}
      transition={{ delay }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
