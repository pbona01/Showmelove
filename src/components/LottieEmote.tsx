import { useEffect, useRef } from 'react';
import lottie, { type AnimationItem } from 'lottie-web';
import type { EmoteOption } from '../types/showmelove';
import { LOTTIE_EMOTE_DATA } from '../assets/lottie/animations';

interface LottieEmoteProps {
  emote: EmoteOption;
  playKey: number;
  active: boolean;
  className?: string;
}

export function LottieEmote({ emote, playKey, active, className = '' }: LottieEmoteProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animRef = useRef<AnimationItem | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || emote === 'none' || !active) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    animRef.current?.destroy();
    const anim = lottie.loadAnimation({
      container: el,
      renderer: 'svg',
      loop: false,
      autoplay: true,
      animationData: structuredClone(LOTTIE_EMOTE_DATA[emote]),
    });
    animRef.current = anim;

    return () => {
      anim.destroy();
      animRef.current = null;
    };
  }, [emote, playKey, active]);

  if (emote === 'none') return null;

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={`pointer-events-none select-none ${className}`}
    />
  );
}
