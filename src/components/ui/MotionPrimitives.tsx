import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  animate,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type HTMLMotionProps,
  type MotionProps,
} from 'motion/react';
import {
  durations,
  easings,
  floatAnimation,
  pulseAnimation,
  shimmerAnimation,
  springs,
  usePrefersReducedMotion,
} from '../../lib/animation';

export function createPressableProps(reduced = false): MotionProps {
  return reduced
    ? { transition: { duration: 0 } }
    : { whileHover: { y: -1, scale: 1.01 }, whileTap: { scale: 0.965 }, transition: springs.springSnappy };
}

export interface PressableProps extends HTMLMotionProps<'button'> {
  children: ReactNode;
}

export function Pressable({ children, className = '', disabled, ...props }: PressableProps) {
  const reduced = usePrefersReducedMotion();
  return (
    <motion.button
      {...createPressableProps(reduced || disabled)}
      {...props}
      disabled={disabled}
      className={`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)] disabled:pointer-events-none ${className}`}
    >
      {children}
    </motion.button>
  );
}

export function Magnetic({
  children,
  className = '',
  strength = 0.16,
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
}) {
  const reduced = usePrefersReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 260, damping: 24, mass: 0.45 });
  const springY = useSpring(y, { stiffness: 260, damping: 24, mass: 0.45 });

  return (
    <motion.div
      style={reduced ? undefined : { x: springX, y: springY }}
      onPointerMove={(event) => {
        if (reduced || event.pointerType === 'touch') return;
        const rect = event.currentTarget.getBoundingClientRect();
        x.set((event.clientX - rect.left - rect.width / 2) * strength);
        y.set((event.clientY - rect.top - rect.height / 2) * strength);
      }}
      onPointerLeave={() => { x.set(0); y.set(0); }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export type RevealType = 'fade' | 'slide-up' | 'slide-right' | 'scale' | 'blur';

export function createRevealProps(type: RevealType = 'slide-up', reduced = false): MotionProps {
  const initialByType: Record<RevealType, MotionProps['initial']> = {
    fade: { opacity: 0 },
    'slide-up': { opacity: 0, y: 18 },
    'slide-right': { opacity: 0, x: -18 },
    scale: { opacity: 0, scale: 0.94 },
    blur: { opacity: 0, filter: 'blur(10px)' },
  };
  if (reduced) return { initial: false, transition: { duration: 0 } };
  return {
    initial: initialByType[type],
    whileInView: { opacity: 1, x: 0, y: 0, scale: 1, filter: 'blur(0px)' },
    viewport: { once: true, amount: 0.15 },
    transition: { ...springs.springGentle, opacity: { duration: durations.slow, ease: easings.easeOutExpo } },
  };
}

export function Reveal({ children, type = 'slide-up', className = '' }: { children: ReactNode; type?: RevealType; className?: string }) {
  const reduced = usePrefersReducedMotion();
  return <motion.div {...createRevealProps(type, reduced)} className={className}>{children}</motion.div>;
}

export function createFloatingProps(reduced = false): MotionProps {
  return reduced ? {} : floatAnimation;
}

export function Floating({ children, className = '' }: { children: ReactNode; className?: string }) {
  const reduced = usePrefersReducedMotion();
  return <motion.div {...createFloatingProps(reduced)} className={className}>{children}</motion.div>;
}

export function createPulseProps(reduced = false): MotionProps {
  return reduced ? {} : pulseAnimation;
}

export function Pulse({ children, className = '' }: { children: ReactNode; className?: string }) {
  const reduced = usePrefersReducedMotion();
  return <motion.div {...createPulseProps(reduced)} className={className}>{children}</motion.div>;
}

export function createShimmerProps(reduced = false): MotionProps {
  return reduced ? {} : shimmerAnimation;
}

export function Shimmer({ className = '' }: { className?: string }) {
  const reduced = usePrefersReducedMotion();
  return (
    <div aria-hidden="true" className={`relative overflow-hidden bg-[var(--bg-raised)] ${className}`}>
      <motion.span
        {...createShimmerProps(reduced)}
        className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/45 dark:via-white/10 to-transparent skew-x-[-18deg]"
      />
    </div>
  );
}

export function useCounterAnimation(value: number, duration = durations.slower): number {
  const reduced = usePrefersReducedMotion();
  const motionValue = useMotionValue(value);
  const rounded = useTransform(motionValue, (latest) => Math.round(latest));
  const [display, setDisplay] = useState(value);
  useEffect(() => rounded.on('change', setDisplay), [rounded]);
  useEffect(() => {
    if (reduced) { motionValue.set(value); return; }
    const controls = animate(motionValue, value, { duration, ease: easings.easeOutExpo });
    return () => controls.stop();
  }, [duration, motionValue, reduced, value]);
  return display;
}

export function Counter({ value, formatter = (number) => number.toLocaleString() }: { value: number; formatter?: (value: number) => string }) {
  return <span className="tabular-nums">{formatter(useCounterAnimation(value))}</span>;
}

export interface AnimatedTab<T extends string> { id: T; label: string; }

export function AnimatedTabs<T extends string>({
  tabs,
  value,
  onChange,
  label = 'View',
  className = '',
}: {
  tabs: readonly AnimatedTab<T>[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
  className?: string;
}) {
  const layoutId = useId();
  const reduced = usePrefersReducedMotion();
  return (
    <div role="tablist" aria-label={label} className={`inline-flex rounded-2xl bg-[var(--bg-raised)] border border-[var(--border-subtle)] p-1 ${className}`}>
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button key={tab.id} role="tab" aria-selected={active} type="button" onClick={() => onChange(tab.id)} className="relative min-h-9 px-4 rounded-xl text-xs font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]">
            {active && <motion.span layoutId={reduced ? undefined : layoutId} className="absolute inset-0 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-sm" transition={springs.springSnappy} />}
            <span className={`relative z-10 ${active ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Switch({ checked, onChange, label, disabled = false }: { checked: boolean; onChange: (checked: boolean) => void; label: string; disabled?: boolean }) {
  const reduced = usePrefersReducedMotion();
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)} className={`relative h-8 w-[52px] rounded-full p-1 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] disabled:opacity-50 ${checked ? 'bg-[var(--accent-primary)]' : 'bg-[var(--border-strong)]'}`}>
      <motion.span aria-hidden="true" className="block size-6 rounded-full bg-white shadow-md" animate={{ x: checked ? 20 : 0 }} transition={reduced ? { duration: 0 } : springs.springSnappy} />
    </button>
  );
}

export function ProgressRing({ value, size = 48, strokeWidth = 4, label }: { value: number; size?: number; strokeWidth?: number; label?: string }) {
  const reduced = usePrefersReducedMotion();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const normalized = Math.min(1, Math.max(0, value));
  return (
    <span role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(normalized * 100)} className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border-subtle)" strokeWidth={strokeWidth} />
        <motion.circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--accent-primary)" strokeLinecap="round" strokeWidth={strokeWidth} strokeDasharray={circumference} initial={reduced ? false : { strokeDashoffset: circumference }} animate={{ strokeDashoffset: circumference * (1 - normalized) }} transition={reduced ? { duration: 0 } : springs.springGentle} />
      </svg>
      <span className="absolute text-[10px] font-bold tabular-nums">{Math.round(normalized * 100)}%</span>
    </span>
  );
}

export function TiltCard({ children, className = '', maxTilt = 5, ...props }: { children: ReactNode; className?: string; maxTilt?: number } & HTMLMotionProps<'div'>) {
  const reduced = usePrefersReducedMotion();
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springX = useSpring(rotateX, springs.springGentle);
  const springY = useSpring(rotateY, springs.springGentle);
  return (
    <motion.div
      {...props}
      style={reduced ? undefined : { rotateX: springX, rotateY: springY, transformPerspective: 800 }}
      onPointerMove={(event) => {
        props.onPointerMove?.(event);
        if (reduced || event.pointerType === 'touch') return;
        const rect = event.currentTarget.getBoundingClientRect();
        rotateY.set(((event.clientX - rect.left) / rect.width - 0.5) * maxTilt * 2);
        rotateX.set(-((event.clientY - rect.top) / rect.height - 0.5) * maxTilt * 2);
      }}
      onPointerLeave={(event) => { props.onPointerLeave?.(event); rotateX.set(0); rotateY.set(0); }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
