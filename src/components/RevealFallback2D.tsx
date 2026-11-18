import { useEffect } from 'react';
import { motion } from 'motion/react';
import type { GiftAnimationType, GiftArtworkId } from '../types/showmelove';
import { GiftArtworkSvg, ShowmeloveMascotSvg } from './GiftArtwork';

interface RevealFallback2DProps {
  artworkId: GiftArtworkId;
  animationType: GiftAnimationType;
  playKey: number;
  reducedMotion: boolean;
  onPayoffStart: () => void;
  onRevealComplete: () => void;
}

export function RevealFallback2D({
  artworkId,
  animationType,
  playKey,
  reducedMotion,
  onPayoffStart,
  onRevealComplete,
}: RevealFallback2DProps) {
  useEffect(() => {
    if (reducedMotion) {
      onPayoffStart();
      onRevealComplete();
      return;
    }
    const payoffTimer = window.setTimeout(onPayoffStart, 2900);
    const doneTimer = window.setTimeout(onRevealComplete, 5300);
    return () => {
      window.clearTimeout(payoffTimer);
      window.clearTimeout(doneTimer);
    };
  }, [playKey, reducedMotion, onPayoffStart, onRevealComplete]);

  const giftHandoffAnimation = reducedMotion
    ? {}
    : animationType === 'pulse'
      ? { scale: [0.42, 1.0, 1.14, 1.05], y: [-24, 0, -4, 0] }
      : animationType === 'wave'
        ? { scale: [0.42, 1.04, 1.08], rotate: [0, -7, 7, 0], y: [-24, 0, 0] }
        : animationType === 'bloom'
          ? { scale: [0.42, 0.96, 1.1, 1.04], y: [-24, 0, -6, 0] }
          : { scale: [0.42, 1.06, 1.12, 1.05], y: [-24, 0, -6, 0] };

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden bg-transparent"
      data-testid="reveal-2d-fallback"
    >
      <motion.div
        key={`mascot-${playKey}`}
        initial={reducedMotion ? false : { opacity: 0, y: 42, scale: 0.55 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center"
      >
        <ShowmeloveMascotSvg className="w-40 h-40 sm:w-48 sm:h-48" holdingGift={false} />
      </motion.div>

      <motion.div
        key={`gift-${playKey}`}
        initial={reducedMotion ? false : { opacity: 0, scale: 0.42, y: -32 }}
        animate={{ opacity: 1, ...giftHandoffAnimation }}
        transition={{
          duration: reducedMotion ? 0 : 2.2,
          delay: reducedMotion ? 0 : 0.7,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="-mt-6 p-4 rounded-3xl bg-[var(--bg-card)]/95 border border-[var(--border-subtle)] shadow-xl"
      >
        <GiftArtworkSvg artworkId={artworkId} className="w-28 h-28 sm:w-32 sm:h-32" />
      </motion.div>
    </div>
  );
}
