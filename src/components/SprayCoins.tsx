import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { SprayLayoutId } from '../config/economy';
import { usePrefersReducedMotion } from '../lib/animation';

export interface SprayCoinsProps {
  isEnabled: boolean;
  coinBalance: number;
  minimumSpray?: number;
  sprayAmount?: number;
  layoutId?: SprayLayoutId;
  particleSrc?: string;
  particleCrop?: boolean;
  particleSymbol?: string;
  coinLabel?: string;
  onSpray: (count: number) => boolean;
}

interface PointerSample {
  x: number;
  y: number;
  time: number;
}

interface CoinParticle {
  id: string;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  rotation: number;
  rotationVelocity: number;
  scale: number;
}

const PARTICLE_LIFETIME_MS = 1200;
const GRAVITY_PX_PER_SECOND = 800;
const DRAG_PER_FRAME = 0.98;
const SPRAY_COOLDOWN_MS = 300;
const SWIPE_DISTANCE_PX = 44;
const HINT_STORAGE_KEY = 'showmelove_spray_coins_hint_seen';

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function getCoinThemeStyle(layoutId: SprayLayoutId = 'classic') {
  switch (layoutId) {
    case 'waso':
      return {
        wrapper: 'border-2 border-sky-100/90 bg-gradient-to-br from-[#66BBFF] via-[#0767D7] to-[#012D78] text-white shadow-[0_6px_16px_rgba(7,103,215,0.45)]',
        inner: 'border border-sky-200/50',
        text: 'font-black text-sm tracking-tight drop-shadow',
        symbol: '₦50',
      };
    case 'figo':
      return {
        wrapper: 'border-2 border-purple-200/90 bg-gradient-to-br from-[#EDB8FF] via-[#8B27DF] to-[#351060] text-white shadow-[0_6px_16px_rgba(139,39,223,0.45)]',
        inner: 'border border-purple-200/40',
        text: 'font-black text-xs tracking-tighter drop-shadow',
        symbol: '₦500',
      };
    case 'usd':
      return {
        wrapper: 'border-2 border-emerald-100/90 bg-gradient-to-br from-[#D4FFAE] via-[#2E9B4E] to-[#064528] text-white shadow-[0_6px_16px_rgba(46,155,78,0.45)]',
        inner: 'border border-emerald-200/50',
        text: 'font-black text-sm drop-shadow',
        symbol: '$',
      };
    case 'btc':
      return {
        wrapper: 'border-2 border-amber-200/90 bg-gradient-to-br from-[#FFD55A] via-[#F27E12] to-[#6A2705] text-amber-50 shadow-[0_6px_16px_rgba(242,126,18,0.5)]',
        inner: 'border border-amber-200/60',
        text: 'font-black text-sm drop-shadow',
        symbol: '₿',
      };
    case 'classic':
    default:
      return {
        wrapper: 'border-2 border-white/90 bg-gradient-to-br from-[#FF749F] via-[#FF176C] to-[#A30044] text-white shadow-[0_6px_16px_rgba(255,23,108,0.5)]',
        inner: 'border border-white/40',
        text: 'font-black text-sm drop-shadow',
        symbol: '♥',
      };
  }
}

function CoinParticleView({
  particle,
  layoutId = 'classic',
  particleSymbol,
  onComplete,
}: {
  particle: CoinParticle;
  layoutId?: SprayLayoutId;
  particleSymbol?: string;
  onComplete: (id: string) => void;
}) {
  const elementRef = useRef<HTMLSpanElement | null>(null);
  const theme = getCoinThemeStyle(layoutId);
  const symbol = particleSymbol || theme.symbol;

  useEffect(() => {
    let frameId = 0;
    let previousTime = performance.now();
    const startedAt = previousTime;
    let x = particle.x;
    let y = particle.y;
    let velocityX = particle.velocityX;
    let velocityY = particle.velocityY;
    let rotation = particle.rotation;

    const tick = (now: number) => {
      const age = now - startedAt;
      const deltaSeconds = Math.min(0.034, Math.max(0.001, (now - previousTime) / 1000));
      previousTime = now;

      const drag = DRAG_PER_FRAME ** (deltaSeconds * 60);
      velocityX *= drag;
      velocityY = (velocityY + GRAVITY_PX_PER_SECOND * deltaSeconds) * drag;
      x += velocityX * deltaSeconds;
      y += velocityY * deltaSeconds;
      rotation += particle.rotationVelocity * deltaSeconds;

      if (elementRef.current) {
        const progress = Math.min(1, age / PARTICLE_LIFETIME_MS);
        elementRef.current.style.opacity = String(1 - progress);
        elementRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${rotation}deg) scale(${particle.scale})`;
      }

      if (age < PARTICLE_LIFETIME_MS) {
        frameId = window.requestAnimationFrame(tick);
      } else {
        onComplete(particle.id);
      }
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [onComplete, particle]);

  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.08 }}
      className="absolute inset-0 pointer-events-none"
    >
      <span
        ref={elementRef}
        className={`absolute left-0 top-0 grid h-8 w-8 place-items-center rounded-full select-none ${theme.wrapper}`}
        style={{
          opacity: 0,
          transformOrigin: 'center',
          willChange: 'transform, opacity',
        }}
      >
        <span className={`absolute inset-0.5 rounded-full pointer-events-none ${theme.inner}`} />
        <span className={`relative leading-none select-none ${theme.text}`}>
          {symbol}
        </span>
      </span>
    </motion.span>
  );
}

function playWhoosh() {
  if (typeof window === 'undefined') return;
  const AudioContextClass =
    window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;

  try {
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(400, now);
    oscillator.frequency.exponentialRampToValueAtTime(200, now + 0.08);
    gain.gain.setValueAtTime(0.035, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.08);
    oscillator.addEventListener('ended', () => void context.close(), { once: true });
  } catch {
    // Audio is a progressive enhancement and can be blocked by browser policy.
  }
}

export function SprayCoins({
  isEnabled,
  coinBalance,
  minimumSpray = 12,
  sprayAmount,
  layoutId = 'classic',
  particleSymbol,
  coinLabel = 'Love Coins',
  onSpray,
}: SprayCoinsProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [particles, setParticles] = useState<CoinParticle[]>([]);
  const [showHint, setShowHint] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const activePointerRef = useRef<number | null>(null);
  const pointerHistoryRef = useRef<PointerSample[]>([]);
  const lastSprayAtRef = useRef(0);
  const balanceRef = useRef(coinBalance);
  balanceRef.current = coinBalance;

  useEffect(() => {
    if (!isEnabled || typeof window === 'undefined') return;
    try {
      if (!window.localStorage.getItem(HINT_STORAGE_KEY)) {
        setShowHint(true);
        window.localStorage.setItem(HINT_STORAGE_KEY, '1');
        const timer = window.setTimeout(() => setShowHint(false), 4800);
        return () => window.clearTimeout(timer);
      }
    } catch {
      setShowHint(true);
    }
  }, [isEnabled]);

  const removeParticle = useCallback((id: string) => {
    setParticles((current) => current.filter((particle) => particle.id !== id));
  }, []);

  const emitSpray = useCallback(
    (history: PointerSample[]) => {
      const now = performance.now();
      if (!isEnabled || now - lastSprayAtRef.current < SPRAY_COOLDOWN_MS) return;

      const desiredCount = Number.isFinite(sprayAmount) && sprayAmount! > 0
        ? Math.floor(sprayAmount!)
        : minimumSpray;

      // Allow spraying remaining balance down to 0
      const count = Math.min(desiredCount, balanceRef.current);
      if (count <= 0) return;

      const first = history[0];
      const last = history.at(-1);
      if (!first || !last) return;
      const elapsedSeconds = Math.max(0.016, (last.time - first.time) / 1000);
      const velocityX = Math.max(-1800, Math.min(1800, (last.x - first.x) / elapsedSeconds));
      const velocityY = Math.max(-900, Math.min(900, (last.y - first.y) / elapsedSeconds));

      lastSprayAtRef.current = now;
      if (!onSpray(count)) return;

      setAnnouncement(`${count} ${coinLabel} sprayed. ${Math.max(0, balanceRef.current - count)} remaining.`);
      setShowHint(false);

      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([10, 5, 10]);
        } catch {
          // Ignore vibration permission issues
        }
      }
      playWhoosh();

      if (reducedMotion) return;

      // Cap DOM particles around 20 visible coins for peak 60fps performance
      const visibleCount = Math.min(count, 20);
      const nextParticles = Array.from({ length: visibleCount }, (_, index): CoinParticle => {
        const pathIndex = visibleCount === 1 ? 0 : (index / (visibleCount - 1)) * (history.length - 1);
        const lowerIndex = Math.floor(pathIndex);
        const upperIndex = Math.min(history.length - 1, Math.ceil(pathIndex));
        const mix = pathIndex - lowerIndex;
        const lower = history[lowerIndex] ?? first;
        const upper = history[upperIndex] ?? last;

        return {
          id: `spray_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 6)}`,
          x: lower.x + (upper.x - lower.x) * mix + randomBetween(-9, 9),
          y: lower.y + (upper.y - lower.y) * mix + randomBetween(-7, 7),
          velocityX: velocityX * 0.24 + randomBetween(-145, 145),
          velocityY: velocityY * 0.18 - randomBetween(190, 390),
          rotation: randomBetween(-15, 15),
          rotationVelocity: randomBetween(-240, 240),
          scale: randomBetween(0.7, 1.05),
        };
      });

      setParticles((current) => [...current, ...nextParticles]);
    },
    [coinLabel, isEnabled, minimumSpray, onSpray, reducedMotion, sprayAmount],
  );

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (
      !isEnabled ||
      !event.isPrimary ||
      (event.pointerType === 'mouse' && event.button !== 0)
    ) return;
    activePointerRef.current = event.pointerId;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const rect = event.currentTarget.getBoundingClientRect();
    pointerHistoryRef.current = [{
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      time: performance.now(),
    }];
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerRef.current !== event.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    pointerHistoryRef.current.push({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      time: performance.now(),
    });
    pointerHistoryRef.current = pointerHistoryRef.current.slice(-8);
  };

  const finishPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerRef.current !== event.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const history = [
      ...pointerHistoryRef.current,
      {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        time: performance.now(),
      },
    ].slice(-8);
    activePointerRef.current = null;
    pointerHistoryRef.current = [];
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }

    const first = history[0];
    const last = history.at(-1);
    if (!first || !last) return;
    const deltaX = last.x - first.x;
    const deltaY = last.y - first.y;
    // Strict vertical swipe only: prevents horizontal gestures or diagonal noise
    if (Math.abs(deltaY) >= SWIPE_DISTANCE_PX && Math.abs(deltaY) > Math.abs(deltaX) * 1.25) {
      emitSpray(history);
    }
  };

  return (
    <div
      className={`absolute inset-0 z-20 overflow-hidden rounded-[28px] select-none ${
        isEnabled ? 'cursor-ns-resize' : 'pointer-events-none'
      }`}
      style={{ touchAction: 'none', overscrollBehavior: 'contain' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishPointer}
      onPointerCancel={(event) => {
        if (activePointerRef.current === event.pointerId) {
          activePointerRef.current = null;
          pointerHistoryRef.current = [];
        }
        if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
          event.currentTarget.releasePointerCapture?.(event.pointerId);
        }
      }}
      data-testid="spray-coins-overlay"
      aria-label={isEnabled ? 'Swipe vertically up or down to spray coins' : undefined}
    >
      <AnimatePresence>
        {particles.map((particle) => (
          <CoinParticleView
            key={particle.id}
            particle={particle}
            layoutId={layoutId}
            particleSymbol={particleSymbol}
            onComplete={removeParticle}
          />
        ))}
      </AnimatePresence>

      <AnimatePresence>
        {showHint && isEnabled && (
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 6 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: [0.72, 1, 0.72], y: 0 }}
            exit={{ opacity: 0 }}
            transition={reducedMotion ? { duration: 0 } : { duration: 1.6, repeat: Infinity }}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-[#20111D]/80 px-3.5 py-1.5 text-[11px] font-semibold text-white backdrop-blur-md whitespace-nowrap shadow-lg border border-white/10"
            data-testid="spray-coins-hint"
          >
            Swipe up or down to spray {coinLabel}
          </motion.div>
        )}
      </AnimatePresence>

      <span className="sr-only" role="status" aria-live="polite">
        {announcement}
      </span>
    </div>
  );
}
