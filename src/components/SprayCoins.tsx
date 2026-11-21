import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { usePrefersReducedMotion } from '../lib/animation';

export interface SprayCoinsProps {
  isEnabled: boolean;
  coinBalance: number;
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

const COIN_ASSET =
  '/assets/aistudio/Glossy_gold_love_coin_with_pink_heart-3_216af72c.webp';
const PARTICLE_LIFETIME_MS = 1200;
const GRAVITY_PX_PER_SECOND = 800;
const DRAG_PER_FRAME = 0.98;
const SPRAY_COOLDOWN_MS = 300;
const MAX_COINS_PER_MINUTE = 50;
const SWIPE_DISTANCE_PX = 48;
const HINT_STORAGE_KEY = 'showmelove_spray_coins_hint_seen';

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function CoinParticleView({
  particle,
  onComplete,
}: {
  particle: CoinParticle;
  onComplete: (id: string) => void;
}) {
  const imageRef = useRef<HTMLImageElement | null>(null);

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

      if (imageRef.current) {
        const progress = Math.min(1, age / PARTICLE_LIFETIME_MS);
        imageRef.current.style.opacity = String(1 - progress);
        imageRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${rotation}deg) scale(${particle.scale})`;
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
      <img
        ref={imageRef}
        src={COIN_ASSET}
        alt=""
        width={36}
        height={36}
        loading="eager"
        decoding="async"
        draggable={false}
        className="absolute left-0 top-0 h-8 w-8 sm:h-9 sm:w-9 object-contain mix-blend-screen select-none"
        style={{
          opacity: 0,
          transformOrigin: 'center',
          willChange: 'transform, opacity',
        }}
      />
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

export function SprayCoins({ isEnabled, coinBalance, onSpray }: SprayCoinsProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [particles, setParticles] = useState<CoinParticle[]>([]);
  const [showHint, setShowHint] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const activePointerRef = useRef<number | null>(null);
  const pointerHistoryRef = useRef<PointerSample[]>([]);
  const lastSprayAtRef = useRef(0);
  const emittedAtRef = useRef<number[]>([]);
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

      emittedAtRef.current = emittedAtRef.current.filter((time) => now - time < 60_000);
      const minuteAllowance = MAX_COINS_PER_MINUTE - emittedAtRef.current.length;
      const desiredCount = Math.floor(randomBetween(12, 21));
      const count = Math.min(desiredCount, minuteAllowance, balanceRef.current);
      if (count <= 0) return;

      const first = history[0];
      const last = history.at(-1);
      if (!first || !last) return;
      const elapsedSeconds = Math.max(0.016, (last.time - first.time) / 1000);
      const velocityX = Math.max(-1800, Math.min(1800, (last.x - first.x) / elapsedSeconds));
      const velocityY = Math.max(-900, Math.min(900, (last.y - first.y) / elapsedSeconds));

      lastSprayAtRef.current = now;
      emittedAtRef.current.push(...Array.from({ length: count }, () => now));
      if (!onSpray(count)) return;
      setAnnouncement(`${count} Love Coins sprayed. ${Math.max(0, balanceRef.current - count)} remaining.`);
      setShowHint(false);

      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([10, 5, 10]);
      }
      playWhoosh();

      if (reducedMotion) return;

      const nextParticles = Array.from({ length: count }, (_, index): CoinParticle => {
        const pathIndex = count === 1 ? 0 : (index / (count - 1)) * (history.length - 1);
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
          scale: randomBetween(0.6, 1),
        };
      });
      setParticles((current) => [...current, ...nextParticles]);
    },
    [isEnabled, onSpray, reducedMotion],
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
    if (Math.abs(deltaX) >= SWIPE_DISTANCE_PX && Math.abs(deltaX) > Math.abs(deltaY) * 1.25) {
      emitSpray(history);
    }
  };

  return (
    <div
      className={`absolute inset-0 z-20 overflow-hidden rounded-[28px] select-none ${
        isEnabled ? 'cursor-ew-resize' : 'pointer-events-none'
      }`}
      style={{ touchAction: 'pan-y pinch-zoom' }}
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
      aria-label={isEnabled ? 'Swipe horizontally to spray Love Coins' : undefined}
    >
      <AnimatePresence>
        {particles.map((particle) => (
          <CoinParticleView key={particle.id} particle={particle} onComplete={removeParticle} />
        ))}
      </AnimatePresence>

      <AnimatePresence>
        {showHint && isEnabled && (
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 6 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: [0.72, 1, 0.72], y: 0 }}
            exit={{ opacity: 0 }}
            transition={reducedMotion ? { duration: 0 } : { duration: 1.6, repeat: Infinity }}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-[#20111D]/72 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur-md whitespace-nowrap shadow-lg"
            data-testid="spray-coins-hint"
          >
            Swipe sideways to spray Love Coins
          </motion.div>
        )}
      </AnimatePresence>

      <span className="sr-only" role="status" aria-live="polite">
        {announcement}
      </span>
    </div>
  );
}
