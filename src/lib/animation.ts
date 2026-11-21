import { useRef, type RefObject } from 'react';
import {
  useReducedMotion,
  useScroll,
  useSpring,
  type MotionProps,
  type MotionValue,
  type Transition,
  type Variants,
} from 'motion/react';

export const springDefault = {
  type: 'spring',
  stiffness: 210,
  damping: 20,
  mass: 1,
} as const satisfies Transition;

export const easeOutExpo = [0.16, 1, 0.3, 1] as const;

export const duration = {
  normal: 0.25,
  slow: 0.35,
} as const;

export const stagger = {
  normal: 0.06,
  page: 0.12,
} as const;

export const springs = {
  springDefault,
  springSnappy: { type: 'spring', stiffness: 300, damping: 24 },
  springGentle: { type: 'spring', stiffness: 160, damping: 22 },
  springBouncy: { type: 'spring', stiffness: 280, damping: 18 },
  springStiff: { type: 'spring', stiffness: 500, damping: 35 },
} as const satisfies Record<string, Transition>;

export const easings = {
  easeOutExpo,
  easeOutCubic: [0.33, 1, 0.68, 1],
  easeInOutQuart: [0.76, 0, 0.24, 1],
} as const;

export const durations = {
  instant: 0.08,
  fast: 0.15,
  normal: 0.25,
  slow: 0.35,
  slower: 0.5,
  slowest: 0.7,
} as const;

export const staggers = {
  tight: 0.03,
  normal: 0.06,
  loose: 0.1,
  page: 0.12,
} as const;

export const pageTransition = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: duration.normal, ease: easeOutExpo },
} satisfies MotionProps;

export const modalTransition: Variants = {
  initial: { opacity: 0, y: 24, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 16, scale: 0.98 },
};

export const cardInteraction = {
  whileHover: { y: -4, scale: 1.01 },
  whileTap: { scale: 0.975 },
  transition: springs.springSnappy,
} satisfies MotionProps;

export const buttonPress = {
  whileHover: { scale: 1.012 },
  whileTap: { scale: 0.965 },
  transition: springs.springSnappy,
} satisfies MotionProps;

export const floatAnimation = {
  animate: { y: [0, -7, 0], rotate: [0, 1.25, 0, -1.25, 0] },
  transition: { duration: 4.2, repeat: Infinity, ease: 'easeInOut' },
} satisfies MotionProps;

export const pulseAnimation = {
  animate: { scale: [1, 1.025, 1], opacity: [1, 0.94, 1] },
  transition: { duration: 2.2, repeat: Infinity, ease: 'easeInOut' },
} satisfies MotionProps;

export const shimmerAnimation = {
  animate: { x: ['-110%', '210%'] },
  transition: { duration: 1.45, repeat: Infinity, ease: 'linear' },
} satisfies MotionProps;

export const burstAnimation: Variants = {
  initial: { opacity: 0, scale: 0.25 },
  animate: { opacity: [0, 1, 0], scale: [0.25, 1, 1.45] },
};

export const checkmarkDraw: Variants = {
  initial: { pathLength: 0, opacity: 0 },
  animate: { pathLength: 1, opacity: 1 },
};

export const waveformAnimation = (index = 0): MotionProps => ({
  animate: { scaleY: [0.35, 1, 0.55, 0.85, 0.35] },
  transition: {
    duration: 0.72 + (index % 4) * 0.08,
    delay: index * 0.025,
    repeat: Infinity,
    ease: 'easeInOut',
  },
});

export function smoothstep(edge0: number, edge1: number, value: number): number {
  const x = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0 || 1)));
  return x * x * (3 - 2 * x);
}

export function smootherstep(edge0: number, edge1: number, value: number): number {
  const x = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0 || 1)));
  return x * x * x * (x * (x * 6 - 15) + 10);
}

export function elasticOut(value: number): number {
  if (value === 0 || value === 1) return value;
  return 2 ** (-10 * value) * Math.sin(((value * 10 - 0.75) * 2 * Math.PI) / 3) + 1;
}

export function backOut(value: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (value - 1) ** 3 + c1 * (value - 1) ** 2;
}

export function springToEasing(stiffness = 210, damping = 20) {
  const dampingRatio = damping / (2 * Math.sqrt(stiffness));
  return (value: number): number => {
    const t = Math.min(1, Math.max(0, value));
    if (dampingRatio >= 1) return 1 - Math.exp(-6 * t);
    const frequency = Math.sqrt(Math.max(0.001, 1 - dampingRatio ** 2)) * 8;
    return 1 - Math.exp(-dampingRatio * 8 * t) * Math.cos(frequency * t);
  };
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' &&
    Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

export function getMotionConfig(reduced = prefersReducedMotion()) {
  return reduced
    ? { transition: { duration: 0 } satisfies Transition }
    : { transition: springs.springDefault };
}

export function createMotionProps(props: MotionProps, reduced = prefersReducedMotion()): MotionProps {
  if (!reduced) return props;
  return {
    ...props,
    initial: false,
    animate: typeof props.animate === 'string' ? props.animate : undefined,
    exit: undefined,
    whileHover: undefined,
    whileTap: undefined,
    transition: { duration: 0 },
  };
}

export function useScrollProgress(target?: RefObject<HTMLElement | null>): {
  ref: RefObject<HTMLDivElement | null>;
  progress: MotionValue<number>;
} {
  const fallbackRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: target ?? fallbackRef,
    offset: ['start end', 'end start'],
  });
  const progress = useSpring(scrollYProgress, { stiffness: 160, damping: 28, mass: 0.4 });
  return { ref: fallbackRef, progress };
}

export function calculateParallaxOffset(progress: number, distance = 32): number {
  return (Math.min(1, Math.max(0, progress)) - 0.5) * distance * 2;
}

export function generateStaggerDelays(count: number, interval = staggers.normal): number[] {
  return Array.from({ length: Math.max(0, count) }, (_, index) => index * interval);
}

export function createStaggerVariant(interval = staggers.normal, delayChildren = 0): Variants {
  return {
    hidden: {},
    show: { transition: { staggerChildren: interval, delayChildren } },
  };
}

export function createSequence<T>(steps: readonly T[]): Array<[T, { at: number }]> {
  return steps.map((step, index) => [step, { at: index === 0 ? 0 : index * staggers.normal }]);
}

export const giftRevealTimeline = {
  totalDuration: 2.6,
  sealedBox: { start: 0, duration: 0.6 },
  lidOpen: { start: 0.4, duration: 0.5 },
  giftRise: { start: 0.7, duration: 0.8 },
  particleBurst: { start: 1.1, duration: 0.6 },
  mascotReact: { start: 1.2, duration: 0.5 },
  promiseCard: { start: 1.5, duration: 0.7 },
  voiceNote: { start: 1.8, duration: 0.4 },
  claimButton: { start: 2.1, duration: 0.5 },
  idle: { start: 2.5 },
} as const;

export function usePrefersReducedMotion(): boolean {
  return useReducedMotion() ?? false;
}
