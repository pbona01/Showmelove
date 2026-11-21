import type { ReactNode } from 'react';
import { motion, type Variants } from 'motion/react';
import {
  durations,
  easings,
  pageTransition,
  springs,
  staggers,
  usePrefersReducedMotion,
} from '../lib/animation';

type PageTransitionType = 'shared-axis' | 'fade' | 'slide' | 'push';

const transitionVariants: Record<PageTransitionType, Variants> = {
  'shared-axis': pageTransition,
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  slide: {
    initial: { opacity: 0, x: 24 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -18 },
  },
  push: {
    initial: { opacity: 0, x: '8%', scale: 0.985 },
    animate: { opacity: 1, x: 0, scale: 1 },
    exit: { opacity: 0, x: '-5%', scale: 0.99 },
  },
};

export function PageTransition({
  children,
  type = 'shared-axis',
  className = '',
}: {
  children: ReactNode;
  type?: PageTransitionType;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  return (
    <motion.div
      variants={transitionVariants[type]}
      initial={reduced ? false : 'initial'}
      animate="animate"
      exit={reduced ? undefined : 'exit'}
      transition={reduced ? { duration: 0 } : { ...springs.springGentle, opacity: { duration: durations.slow, ease: easings.easeOutExpo } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function SharedLayout({
  id,
  children,
  className = '',
}: {
  id: string;
  children: ReactNode;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  return (
    <motion.div layoutId={reduced ? undefined : id} transition={springs.springGentle} className={className}>
      {children}
    </motion.div>
  );
}

export function StaggerContainer({
  children,
  className = '',
  delay = 0.04,
  stagger = staggers.normal,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  stagger?: number;
}) {
  const reduced = usePrefersReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : 'hidden'}
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { delayChildren: reduced ? 0 : delay, staggerChildren: reduced ? 0 : stagger } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className = '' }: { children: ReactNode; className?: string }) {
  const reduced = usePrefersReducedMotion();
  return (
    <motion.div
      variants={{
        hidden: reduced ? {} : { opacity: 0, y: 16, scale: 0.99 },
        show: { opacity: 1, y: 0, scale: 1 },
      }}
      transition={reduced ? { duration: 0 } : springs.springGentle}
      className={className}
    >
      {children}
    </motion.div>
  );
}
