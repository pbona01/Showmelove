import confetti from 'canvas-confetti';

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  );
}

const SHOWMELOVE_COLORS = ['#E62E45', '#FF5F78', '#F59E0B', '#FFD6DD', '#10B981'];

/**
 * Snappy TikTok Live-style center burst when the gift lands and opens.
 */
export function fireGiftPayoffBurst(themeColor?: string) {
  if (typeof window === 'undefined' || prefersReducedMotion()) return;
  const colors = themeColor
    ? [themeColor, '#E62E45', '#F59E0B', '#FFD6DD']
    : SHOWMELOVE_COLORS;

  void confetti({
    particleCount: 42,
    spread: 68,
    startVelocity: 38,
    scalar: 0.9,
    ticks: 130,
    origin: { x: 0.5, y: 0.36 },
    colors,
    zIndex: 120,
    disableForReducedMotion: true,
  });
}

/**
 * Full multi-cannon confetti explosion triggered automatically upon successful gift claim.
 */
export function fireClaimCelebrationExplosion() {
  if (typeof window === 'undefined' || prefersReducedMotion()) return;

  // Immediate center explosion
  void confetti({
    particleCount: 85,
    spread: 95,
    startVelocity: 48,
    gravity: 0.95,
    scalar: 1.05,
    ticks: 210,
    origin: { x: 0.5, y: 0.58 },
    colors: SHOWMELOVE_COLORS,
    zIndex: 120,
    disableForReducedMotion: true,
  });

  // Left & right side cannons 140ms later for unmistakable celebration
  window.setTimeout(() => {
    void confetti({
      particleCount: 48,
      angle: 60,
      spread: 62,
      startVelocity: 44,
      origin: { x: 0.08, y: 0.68 },
      colors: SHOWMELOVE_COLORS,
      zIndex: 120,
      disableForReducedMotion: true,
    });
    void confetti({
      particleCount: 48,
      angle: 120,
      spread: 62,
      startVelocity: 44,
      origin: { x: 0.92, y: 0.68 },
      colors: SHOWMELOVE_COLORS,
      zIndex: 120,
      disableForReducedMotion: true,
    });
  }, 140);
}
