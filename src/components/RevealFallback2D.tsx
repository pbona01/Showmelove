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
    const payoffTimer = window.setTimeout(onPayoffStart, 850);
    const doneTimer = window.setTimeout(onRevealComplete, 1600);
    return () => {
      window.clearTimeout(payoffTimer);
      window.clearTimeout(doneTimer);
    };
  }, [playKey, reducedMotion, onPayoffStart, onRevealComplete]);

  const giftHandoffAnimation = reducedMotion
    ? {}
    : animationType === 'pulse'
      ? { scale: 1.08, y: 0 }
      : animationType === 'wave'
        ? { scale: 1.05, rotate: [0, -8, 8, 0], y: 0 }
        : { scale: 1.06, y: 0 };

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-b from-[#FFF0F2] via-[#FDF8F3] to-[#F9ECE4]"
      data-testid="reveal-2d-fallback"
    >
      <motion.div
        key={`mascot-${playKey}`}
        initial={reducedMotion ? false : { opacity: 0, y: 36, scale: 0.62 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 580, damping: 24, mass: 0.65 }}
        className="flex flex-col items-center"
      >
        <ShowmeloveMascotSvg className="w-40 h-40 sm:w-48 sm:h-48" holdingGift={false} />
      </motion.div>

      <motion.div
        key={`gift-${playKey}`}
        initial={reducedMotion ? false : { opacity: 0, scale: 0.42, y: -32 }}
        animate={{ opacity: 1, ...giftHandoffAnimation }}
        transition={{
          type: 'spring',
          stiffness: 540,
          damping: 22,
          mass: 0.7,
          delay: reducedMotion ? 0 : 0.24,
        }}
        className="-mt-6 p-4 rounded-3xl bg-white/95 border border-[#171314]/8 shadow-xl"
      >
        <GiftArtworkSvg artworkId={artworkId} className="w-28 h-28 sm:w-32 sm:h-32" />
      </motion.div>
    </div>
  );
}
