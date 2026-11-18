import confetti from 'canvas-confetti';

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  );
}

const SHOWMELOVE_COLORS = ['#FF176C', '#A855F7', '#F59E0B', '#24C888', '#FFD6EA'];
const pendingTimers = new Set<number>();

/**
 * Immediately clears active confetti particles and cancels scheduled side bursts.
 * Called whenever exiting or unmounting the Reveal screen so confetti never
 * lingers over Inbox or Wallet.
 */
export function stopAllConfetti() {
  if (typeof window === 'undefined') return;
  pendingTimers.forEach((id) => window.clearTimeout(id));
  pendingTimers.clear();
  try {
    if (typeof confetti.reset === 'function') {
      confetti.reset();
    }
  } catch {
    // Ignore reset errors in non-canvas environments
  }
}

/**
 * TikTok Live-style burst confined to the gift reveal payoff.
 */
export function fireGiftPayoffBurst(themeColor?: string) {
  if (typeof window === 'undefined' || prefersReducedMotion()) return;
  const colors = themeColor
    ? [themeColor, '#FF176C', '#A855F7', '#F59E0B']
    : SHOWMELOVE_COLORS;

  void confetti({
    particleCount: 44,
    spread: 68,
    startVelocity: 38,
    scalar: 0.92,
    ticks: 115,
    origin: { x: 0.5, y: 0.38 },
    colors,
    zIndex: 45,
    disableForReducedMotion: true,
  });
}

/**
 * Confetti celebration triggered upon successful gift claim inside Reveal.
 */
export function fireClaimCelebrationExplosion() {
  if (typeof window === 'undefined' || prefersReducedMotion()) return;

  void confetti({
    particleCount: 72,
    spread: 92,
    startVelocity: 46,
    gravity: 0.98,
    scalar: 1.0,
    ticks: 160,
    origin: { x: 0.5, y: 0.56 },
    colors: SHOWMELOVE_COLORS,
    zIndex: 45,
    disableForReducedMotion: true,
  });

  const timerId = window.setTimeout(() => {
    pendingTimers.delete(timerId);
    void confetti({
      particleCount: 38,
      angle: 60,
      spread: 58,
      startVelocity: 42,
      ticks: 140,
      origin: { x: 0.12, y: 0.68 },
      colors: SHOWMELOVE_COLORS,
      zIndex: 45,
      disableForReducedMotion: true,
    });
    void confetti({
      particleCount: 38,
      angle: 120,
      spread: 58,
      startVelocity: 42,
      ticks: 140,
      origin: { x: 0.88, y: 0.68 },
      colors: SHOWMELOVE_COLORS,
      zIndex: 45,
      disableForReducedMotion: true,
    });
  }, 150);

  pendingTimers.add(timerId);
}
