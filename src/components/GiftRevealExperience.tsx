import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Check,
  CheckCircle2,
  FastForward,
  Gift as GiftIcon,
  Heart,
  Lock,
  Pause,
  Play,
  RotateCcw,
  Share2,
  Sparkles,
  Volume2,
  VolumeX,
  Wallet,
  X,
} from 'lucide-react';
import type { SentGift } from '../types/showmelove';
import { formatNaira } from '../config/economy';
import { GiftArtworkSvg, GoldLoveCoinSvg, LoveCoinHeartSvg } from './GiftArtwork';
import { LottieEmote } from './LottieEmote';
import {
  getBundledSampleVoiceNoteUrl,
  playSoftPayoffChime,
} from '../audio/sampleVoiceNote';
import { audioStorage } from '../services/audioStorage';
import { useShowmelove } from '../context/ShowmeloveContext';
import { DEMO_USERS } from '../services/seedData';
import { Button, PriceLabel, PromisePaperCard } from './ui/DesignSystem';
import {
  fireClaimCelebrationExplosion,
  fireGiftPayoffBurst,
  stopAllConfetti,
} from '../utils/confettiEffects';
import { RevealFallback2D } from './RevealFallback2D';
import { giftRevealTimeline, usePrefersReducedMotion } from '../lib/animation';

const LazyShowmeloveReveal3D = lazy(() =>
  import('./three/ShowmeloveReveal3D').then((module) => ({ default: module.ShowmeloveReveal3D })),
);

interface GiftRevealExperienceProps {
  gift: SentGift;
  isPreview?: boolean;
  onExit?: () => void;
  onGoToInbox?: () => void;
}

type RevealStage = 'sealed' | 'revealing' | 'revealed';

const FLOATING_PARTICLES = [
  { id: 'h1', left: '14%', top: '26%', delay: 0, size: 17, kind: 'heart' as const },
  { id: 's1', left: '82%', top: '22%', delay: 0.25, size: 15, kind: 'sparkle' as const },
  { id: 'h2', left: '78%', top: '68%', delay: 0.5, size: 14, kind: 'heart' as const },
  { id: 's2', left: '18%', top: '68%', delay: 0.15, size: 13, kind: 'sparkle' as const },
  { id: 'h3', left: '66%', top: '14%', delay: 0.35, size: 13, kind: 'heart' as const },
  { id: 's3', left: '30%', top: '16%', delay: 0.6, size: 12, kind: 'sparkle' as const },
];

function formatAudioClock(sec: number): string {
  const safe = Math.max(0, Math.floor(sec));
  const mins = Math.floor(safe / 60);
  const rem = safe % 60;
  return `${mins}:${rem.toString().padStart(2, '0')}`;
}

export function GiftRevealExperience({
  gift,
  isPreview = false,
  onExit,
  onGoToInbox,
}: GiftRevealExperienceProps) {
  const {
    state,
    currentWallet,
    claimGift,
    markGiftRevealed,
    signInDemoEmail,
    getGiftById,
  } = useShowmelove();

  const [stage, setStage] = useState<RevealStage>('sealed');
  const [playKey, setPlayKey] = useState(0);
  const [payoffActive, setPayoffActive] = useState(false);
  const [rewardFlyActive, setRewardFlyActive] = useState(false);
  const [claimBurstCount, setClaimBurstCount] = useState(0);
  const [muted, setMuted] = useState(false);
  const [sharedCopied, setSharedCopied] = useState(false);

  // Animated recipient balance counter
  const targetBalance = currentWallet.availableEarningsNaira;
  const [displayedBalance, setDisplayedBalance] = useState(targetBalance);
  const displayedBalanceRef = useRef(targetBalance);

  // Voice note state
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(
    gift.voiceNoteDurationSec || 5,
  );

  // Claim flow state
  const [claimPanelOpen, setClaimPanelOpen] = useState(false);
  const [verifyEmailInput, setVerifyEmailInput] = useState(state.signedInEmail || '');
  const [claimFeedback, setClaimFeedback] = useState<{
    type: 'success' | 'already' | 'wrong' | 'signin';
    message: string;
  } | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const payoffTimerRef = useRef<number | null>(null);
  const settleTimerRef = useRef<number | null>(null);
  const mutedRef = useRef(muted);
  const payoffHandledRef = useRef(false);
  mutedRef.current = muted;

  const reducedMotion = usePrefersReducedMotion();

  const latestGift = getGiftById(gift.id) ?? gift;
  const isClaimed = Boolean(latestGift.claimedAt);
  const isIntendedRecipientSignedIn =
    !isPreview &&
    state.activeRole !== 'guest' &&
    Boolean(state.signedInEmail) &&
    state.signedInEmail.trim().toLowerCase() === gift.recipientEmail.trim().toLowerCase();

  // Animate balance count-up smoothly whenever rewards balance increases
  useEffect(() => {
    const startVal = displayedBalanceRef.current;
    if (startVal === targetBalance) return;
    if (reducedMotion) {
      displayedBalanceRef.current = targetBalance;
      setDisplayedBalance(targetBalance);
      return;
    }

    const durationMs = 700;
    const startTime = performance.now();
    let raf = 0;

    const step = (now: number) => {
      const t = Math.min(1, (now - startTime) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const val = Math.round(startVal + (targetBalance - startVal) * eased);
      displayedBalanceRef.current = val;
      setDisplayedBalance(val);
      if (t < 1) {
        raf = window.requestAnimationFrame(step);
      }
    };

    raf = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(raf);
  }, [targetBalance, reducedMotion]);

  const clearRevealTimers = useCallback(() => {
    if (payoffTimerRef.current) window.clearTimeout(payoffTimerRef.current);
    if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current);
    payoffTimerRef.current = null;
    settleTimerRef.current = null;
  }, []);

  useEffect(() => {
    let active = true;
    let objectUrlToRevoke: string | null = null;

    if (!gift.hasVoiceNote || gift.voiceNoteSource === 'none') {
      setAudioUrl(null);
      return;
    }

    if (gift.voiceNoteSource === 'sample') {
      setAudioUrl(getBundledSampleVoiceNoteUrl());
      return;
    }

    if (gift.voiceNoteSource === 'recorded' && gift.voiceNoteBlobKey) {
      audioStorage
        .getVoiceNote(gift.voiceNoteBlobKey)
        .then((blob) => {
          if (!active) return;
          if (blob) {
            objectUrlToRevoke = URL.createObjectURL(blob);
            setAudioUrl(objectUrlToRevoke);
          } else {
            setAudioUrl(getBundledSampleVoiceNoteUrl());
          }
        })
        .catch(() => {
          if (active) setAudioUrl(getBundledSampleVoiceNoteUrl());
        });
    }

    return () => {
      active = false;
      if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
    };
  }, [gift.hasVoiceNote, gift.voiceNoteSource, gift.voiceNoteBlobKey]);

  useEffect(() => {
    if (state.signedInEmail) {
      setVerifyEmailInput(state.signedInEmail);
    }
  }, [state.signedInEmail]);

  useEffect(() => {
    if (stage === 'revealed' && !isPreview) {
      markGiftRevealed(gift.id);
    }
  }, [stage, isPreview, gift.id, markGiftRevealed]);

  useEffect(() => {
    return () => {
      clearRevealTimers();
      audioRef.current?.pause();
      stopAllConfetti();
    };
  }, [clearRevealTimers]);

  const attachAudioListeners = useCallback((audio: HTMLAudioElement) => {
    audio.onloadedmetadata = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setAudioDuration(audio.duration);
      }
    };
    audio.ontimeupdate = () => {
      setAudioCurrentTime(audio.currentTime);
    };
    audio.onended = () => {
      setAudioPlaying(false);
      setAudioCurrentTime(audio.duration || 0);
    };
    audio.onerror = () => setAudioPlaying(false);
  }, []);

  const startVoiceNoteFromTap = useCallback(() => {
    if (!gift.hasVoiceNote) return;
    const src =
      audioUrl ||
      (gift.voiceNoteSource === 'sample' ? getBundledSampleVoiceNoteUrl() : null);
    if (!src) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(src);
    } else if (audioRef.current.src !== src) {
      audioRef.current.pause();
      audioRef.current = new Audio(src);
    }

    const audio = audioRef.current;
    attachAudioListeners(audio);
    audio.currentTime = 0;
    setAudioCurrentTime(0);
    audio.muted = mutedRef.current;

    audio
      .play()
      .then(() => setAudioPlaying(true))
      .catch(() => setAudioPlaying(false));
  }, [attachAudioListeners, audioUrl, gift.hasVoiceNote, gift.voiceNoteSource]);

  const handleToggleVoicePlayback = () => {
    if (!gift.hasVoiceNote) return;
    const audio = audioRef.current;
    if (!audio) {
      startVoiceNoteFromTap();
      return;
    }
    if (audioPlaying) {
      audio.pause();
      setAudioPlaying(false);
    } else {
      if (audio.ended || (audio.duration && audio.currentTime >= audio.duration - 0.1)) {
        audio.currentTime = 0;
        setAudioCurrentTime(0);
      }
      audio.muted = mutedRef.current;
      audio
        .play()
        .then(() => setAudioPlaying(true))
        .catch(() => setAudioPlaying(false));
    }
  };

  // Auto-credit idempotently on open if signed in as intended recipient & unclaimed
  const autoClaimOnOpenIfEligible = useCallback(() => {
    if (isPreview || !isIntendedRecipientSignedIn || isClaimed) return;
    const res = claimGift(gift.id, state.signedInEmail);
    if (res.status === 'claimed_now') {
      if (!reducedMotion) {
        fireClaimCelebrationExplosion();
      }
      setClaimBurstCount((c) => c + 1);
      setClaimFeedback({
        type: 'success',
        message: `${formatNaira(gift.recipientEarningsNaira)} added to your rewards balance.`,
      });
      setClaimPanelOpen(false);
    }
  }, [
    claimGift,
    gift.id,
    gift.recipientEarningsNaira,
    isClaimed,
    isIntendedRecipientSignedIn,
    isPreview,
    reducedMotion,
    state.signedInEmail,
  ]);

  const activatePayoff = useCallback(() => {
    if (payoffHandledRef.current) return;
    payoffHandledRef.current = true;
    setPayoffActive(true);
    setRewardFlyActive(true);
    if (!reducedMotion) {
      playSoftPayoffChime(mutedRef.current);
      fireGiftPayoffBurst(gift.snapshot.themeColor);
    }
    autoClaimOnOpenIfEligible();
  }, [autoClaimOnOpenIfEligible, gift.snapshot.themeColor, reducedMotion]);

  const triggerRevealChoreography = useCallback(() => {
    clearRevealTimers();
    payoffHandledRef.current = false;
    setPayoffActive(false);
    setRewardFlyActive(false);
    setStage('revealing');
    setPlayKey((k) => k + 1);

    if (reducedMotion) {
      activatePayoff();
      setStage('revealed');
      return;
    }

    payoffTimerRef.current = window.setTimeout(
      activatePayoff,
      giftRevealTimeline.particleBurst.start * 1000,
    );

    settleTimerRef.current = window.setTimeout(() => {
      setStage('revealed');
    }, (giftRevealTimeline.promiseCard.start + giftRevealTimeline.promiseCard.duration) * 1000);
  }, [
    activatePayoff,
    clearRevealTimers,
    reducedMotion,
  ]);

  const handleOpenGift = () => {
    startVoiceNoteFromTap();
    triggerRevealChoreography();
  };

  const handleReplay = () => {
    stopAllConfetti();
    startVoiceNoteFromTap();
    triggerRevealChoreography();
  };

  const handleSkip = () => {
    clearRevealTimers();
    activatePayoff();
    setStage('revealed');
  };

  const handleToggleMute = () => {
    const next = !muted;
    setMuted(next);
    if (audioRef.current) {
      audioRef.current.muted = next;
    }
  };

  const handleShareLink = () => {
    if (typeof window === 'undefined') return;
    const url = isPreview
      ? window.location.href
      : `${window.location.origin}/gift/${encodeURIComponent(gift.id)}`;
    void navigator.clipboard?.writeText(url).catch(() => undefined);
    setSharedCopied(true);
    window.setTimeout(() => setSharedCopied(false), 2200);
  };

  const handleExitReveal = () => {
    clearRevealTimers();
    audioRef.current?.pause();
    stopAllConfetti();
    onExit?.();
  };

  const handleClaimAttempt = (emailOverride?: string) => {
    if (isPreview) return;
    const emailToUse = emailOverride ?? verifyEmailInput;
    if (!emailToUse.trim()) {
      setClaimFeedback({
        type: 'signin',
        message: 'Enter the recipient email address to verify and claim.',
      });
      setClaimPanelOpen(true);
      return;
    }

    if (emailToUse.trim().toLowerCase() !== state.signedInEmail.toLowerCase()) {
      signInDemoEmail(emailToUse.trim());
    }

    const res = claimGift(gift.id, emailToUse.trim());
    if (res.status === 'claimed_now') {
      if (!reducedMotion) {
        fireClaimCelebrationExplosion();
      }
      setRewardFlyActive(true);
      setClaimBurstCount((c) => c + 1);
      setClaimFeedback({
        type: 'success',
        message: `${formatNaira(gift.recipientEarningsNaira)} added to your rewards balance.`,
      });
      setClaimPanelOpen(false);
    } else if (res.status === 'already_claimed') {
      setClaimFeedback({
        type: 'already',
        message: 'This gift has already been claimed. Your rewards balance remains unchanged.',
      });
    } else if (res.status === 'wrong_recipient') {
      setClaimFeedback({
        type: 'wrong',
        message: res.error || 'Signed-in email does not match the intended recipient.',
      });
      setClaimPanelOpen(true);
    } else {
      setClaimFeedback({
        type: 'signin',
        message: res.error || 'Sign in as the intended recipient to claim.',
      });
      setClaimPanelOpen(true);
    }
  };

  const activeEmote =
    gift.emote !== 'none'
      ? gift.emote
      : gift.snapshot.animationType === 'confetti-open'
        ? 'party-confetti'
        : gift.snapshot.animationType === 'bloom'
          ? 'rose-petals'
          : gift.snapshot.animationType === 'wave'
            ? 'sparkle-hug'
            : 'heart-burst';

  const audioProgressPct =
    audioDuration > 0 ? Math.min(100, (audioCurrentTime / audioDuration) * 100) : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto text-[#FAF8FC]"
      style={{
        backgroundColor: '#09090D',
        backgroundImage:
          'radial-gradient(ellipse 68% 44% at 50% 0%, rgba(255, 35, 133, 0.34), transparent 72%), radial-gradient(circle at 50% 42%, rgba(124, 58, 237, 0.28), rgba(255, 35, 133, 0.14) 38%, rgba(9, 9, 13, 0) 72%)',
      }}
      data-testid="gift-reveal-stage"
      data-reveal-stage={stage}
      data-claim-confetti-count={claimBurstCount}
    >
      {/* Cinematic Top Bar with Live Recipient Balance HUD */}
      <header className="relative z-20 flex items-center justify-between gap-2 px-4 sm:px-8 py-3 shrink-0">
        <button
          type="button"
          onClick={handleExitReveal}
          aria-label={isPreview ? 'Close preview' : 'Close gift reveal'}
          data-testid="reveal-exit-btn"
          className="min-h-[40px] min-w-[40px] px-3 rounded-full bg-white/8 border border-white/12 text-sm font-semibold text-white inline-flex items-center justify-center gap-1.5 hover:bg-white/14 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
          <span className="hidden sm:inline">{isPreview ? 'Editor' : 'Close'}</span>
        </button>

        {/* Live Animated Balance Pill */}
        {!isPreview && state.activeRole !== 'guest' ? (
          <motion.div
            key={`bal-${claimBurstCount}`}
            animate={
              claimBurstCount > 0 && !reducedMotion
                ? { scale: [1, 1.12, 1] }
                : { scale: 1 }
            }
            transition={{ duration: 0.45 }}
            data-testid="reveal-balance-pill"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/8 border border-white/14 backdrop-blur-md"
          >
            <GoldLoveCoinSvg className="w-5 h-5 shrink-0" />
            <span className="text-[11px] font-medium text-[#C8BED6] hidden sm:inline">
              Balance
            </span>
            <span className="text-xs sm:text-sm font-bold tabular-nums text-white">
              {formatNaira(displayedBalance)}
            </span>
          </motion.div>
        ) : (
          <span className="text-base sm:text-lg font-bold tracking-tight text-white select-none">
            Showme<span className="text-[#FF2385]">love</span>
          </span>
        )}

        <div className="flex items-center gap-1.5">
          {stage === 'revealing' && (
            <button
              type="button"
              onClick={handleSkip}
              data-testid="reveal-skip-btn"
              className="min-h-[40px] px-3 rounded-full bg-white/8 border border-white/12 text-xs font-semibold text-white inline-flex items-center gap-1 hover:bg-white/14 cursor-pointer"
            >
              <FastForward className="w-3.5 h-3.5" />
              <span>Skip</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleToggleMute}
            aria-label={muted ? 'Unmute audio' : 'Mute audio'}
            data-testid="reveal-mute-btn"
            className="min-h-[40px] min-w-[40px] rounded-full bg-white/8 border border-white/12 text-white flex items-center justify-center hover:bg-white/14 cursor-pointer"
          >
            {muted ? (
              <VolumeX className="w-4 h-4 text-[#FF4F9A]" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          {stage === 'revealed' && (
            <button
              type="button"
              onClick={handleReplay}
              aria-label="Replay reveal"
              data-testid="reveal-replay-btn"
              className="min-h-[40px] min-w-[40px] rounded-full bg-white/8 border border-white/12 text-white flex items-center justify-center hover:bg-white/14 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main Theatrical Stage */}
      <main className="relative flex-1 flex flex-col items-center justify-center px-4 pb-8 pt-2">
        <AnimatePresence mode="wait">
          {stage === 'sealed' ? (
            <motion.section
              key="sealed-stage"
              initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={
                reducedMotion
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.94, transition: { duration: 0.16 } }
              }
              transition={
                reducedMotion
                  ? { duration: 0.25 }
                  : { type: 'spring', stiffness: 420, damping: 28 }
              }
              className="w-full max-w-md mx-auto flex flex-col items-center text-center space-y-5"
            >
              {/* 4. "A gift for Adaeze" + "From Bene" */}
              <div className="space-y-1.5">
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                  A gift for{' '}
                  <span className="text-[#FF4F9A]">{gift.recipientName}</span>
                </h1>
                <p className="text-base sm:text-lg font-medium text-[#C8BED6]">
                  From <span className="font-bold text-white">{gift.senderName}</span>
                </p>
              </div>

              {/* 2 & 3. Pink Heart Mascot Holding the Selected Gift with Spotlight & Sparkles */}
              <div className="relative w-full max-w-[320px] h-[240px] sm:h-[268px] flex items-center justify-center">
                {/* Soft spotlight floor */}
                <div
                  aria-hidden="true"
                  className="absolute bottom-2 w-60 h-12 rounded-full blur-2xl opacity-80"
                  style={{
                    background:
                      'radial-gradient(circle, rgba(255, 35, 133, 0.72) 0%, rgba(124, 58, 237, 0.42) 60%, transparent 100%)',
                  }}
                />

                {/* Orbiting hearts & sparkles */}
                {!reducedMotion &&
                  FLOATING_PARTICLES.map((p) => (
                    <motion.span
                      key={p.id}
                      aria-hidden="true"
                      style={{ left: p.left, top: p.top }}
                      animate={{
                        y: [0, -10, 0],
                        opacity: [0.4, 1, 0.4],
                        scale: [0.85, 1.12, 0.85],
                      }}
                      transition={{
                        duration: 2.8,
                        delay: p.delay,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                      className="absolute pointer-events-none"
                    >
                      {p.kind === 'heart' ? (
                        <Heart
                          style={{ width: p.size, height: p.size }}
                          className="text-[#FF4F9A] fill-[#FF4F9A]/75"
                        />
                      ) : (
                        <Sparkles
                          style={{ width: p.size, height: p.size }}
                          className="text-[#FBBF24]"
                        />
                      )}
                    </motion.span>
                  ))}

                {/* Mascot entering & gently floating while holding the selected gift */}
                <motion.div
                  initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.88 }}
                  animate={
                    reducedMotion
                      ? { opacity: 1 }
                      : { opacity: 1, y: [0, -8, 0], scale: 1 }
                  }
                  transition={
                    reducedMotion
                      ? { duration: 0.3 }
                      : {
                          opacity: { duration: 0.4 },
                          scale: { type: 'spring', stiffness: 360, damping: 24 },
                          y: { duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: 0.2 },
                        }
                  }
                  className="relative flex items-center justify-center"
                >
                  <LoveCoinHeartSvg className="w-44 h-44 sm:w-48 sm:h-48" />
                  <motion.div
                    animate={
                      reducedMotion
                        ? undefined
                        : { y: [0, -4, 0], rotate: [-2, 2, -2] }
                    }
                    transition={{
                      duration: 2.8,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                    className="-ml-12 mt-8"
                  >
                    <GiftArtworkSvg
                      artworkId={gift.snapshot.artworkId}
                      className="w-28 h-28 sm:w-32 sm:h-32"
                    />
                  </motion.div>
                </motion.div>
              </div>

              {/* 5. Promise Card Message Preview */}
              <div className="w-full max-w-sm rounded-2xl bg-white/[0.06] border border-white/12 px-5 py-3.5 backdrop-blur-md">
                <p className="font-serif-card text-base sm:text-lg text-white leading-snug">
                  &ldquo;{gift.promiseText}&rdquo;
                </p>
                {gift.hasVoiceNote && (
                  <p className="text-[11px] font-medium text-[#FF6EB0] mt-1.5 inline-flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Includes a personal voice note</span>
                  </p>
                )}
              </div>

              {/* 6. Large CTA: "Open your gift" */}
              <div className="w-full max-w-sm pt-1 space-y-2.5">
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={handleOpenGift}
                  data-testid="open-gift-cta"
                  className="rounded-full min-h-[54px] text-base"
                >
                  <GiftIcon className="w-5 h-5" />
                  <span>Open your gift</span>
                </Button>

                {isPreview && (
                  <p className="text-xs text-[#ADA4BA]">
                    Preview mode · No order created
                  </p>
                )}
              </div>
            </motion.section>
          ) : (
            <motion.section
              key="active-reveal-stage"
              initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={
                reducedMotion
                  ? { duration: 0.28 }
                  : { type: 'spring', stiffness: 480, damping: 30 }
              }
              className="w-full max-w-lg mx-auto flex flex-col items-center gap-3.5"
            >
              {/* Spotlight Reveal Stage */}
              <div
                className="relative w-full h-[220px] sm:h-[272px] rounded-[28px] overflow-hidden border border-white/10 flex items-center justify-center"
                style={{
                  backgroundColor: 'rgba(20, 19, 27, 0.86)',
                  backgroundImage:
                    'radial-gradient(circle at 50% 45%, rgba(255, 35, 133, 0.34), rgba(124, 58, 237, 0.26) 44%, rgba(20, 19, 27, 0) 76%)',
                }}
              >
                {/* Sender Banner */}
                <motion.div
                  key={`banner-${playKey}`}
                  initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: -30, scale: 0.94 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  transition={
                    reducedMotion
                      ? { duration: 0.25 }
                      : { type: 'spring', stiffness: 520, damping: 28 }
                  }
                  className="absolute top-3.5 left-3.5 right-3.5 z-20 flex items-center justify-between gap-2 pointer-events-none"
                >
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#14131B]/90 border border-white/12 px-3 py-1.5 max-w-[68%]">
                    <Sparkles className="w-3.5 h-3.5 text-[#FF4F9A] shrink-0" />
                    <span className="text-xs font-semibold text-white truncate">
                      From {gift.senderName}
                    </span>
                  </div>
                  <span className="rounded-full bg-[#14131B]/90 border border-white/12 px-3 py-1 text-xs tabular-nums font-bold text-[#FF62A9] shrink-0">
                    {formatNaira(gift.amountNaira)}
                  </span>
                </motion.div>

                {/* 7. Animated Reward Flying Up Into Recipient Balance */}
                <AnimatePresence>
                  {rewardFlyActive && (
                    <motion.div
                      key={`reward-fly-${playKey}-${claimBurstCount}`}
                      initial={
                        reducedMotion
                          ? { opacity: 0, scale: 0.92 }
                          : { opacity: 0, y: 36, scale: 0.65 }
                      }
                      animate={
                        reducedMotion
                          ? { opacity: 1, scale: 1 }
                          : { opacity: [0, 1, 1, 0], y: [36, -18, -68, -110], scale: [0.7, 1.12, 1, 0.82] }
                      }
                      transition={{ duration: reducedMotion ? 0.35 : 1.35, ease: [0.16, 1, 0.3, 1] }}
                      data-testid="reveal-reward-fly-badge"
                      className="pointer-events-none absolute z-30 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#0D3326]/95 border border-[#24C888]/45 text-[#24C888] text-sm font-bold tabular-nums shadow-[0_8px_24px_rgba(36,200,136,0.35)]"
                    >
                      <GoldLoveCoinSvg className="w-5 h-5 shrink-0" />
                      <span>+{formatNaira(gift.recipientEarningsNaira)}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Soft expanding ring */}
                {payoffActive && !reducedMotion && (
                  <motion.div
                    key={`ring-${playKey}`}
                    aria-hidden="true"
                    initial={{ scale: 0.35, opacity: 0.8 }}
                    animate={{ scale: 2.2, opacity: 0 }}
                    transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute w-36 h-36 rounded-full border-2 border-[#FF4F9A]/70 pointer-events-none"
                  />
                )}

                {/* Orbiting hearts & sparkles */}
                {!reducedMotion &&
                  FLOATING_PARTICLES.map((p) => (
                    <motion.span
                      key={`act-${p.id}-${playKey}`}
                      aria-hidden="true"
                      style={{ left: p.left, top: p.top }}
                      initial={{ opacity: 0, scale: 0.4, y: 16 }}
                      animate={{
                        opacity: [0, 0.95, 0.65],
                        scale: [0.6, 1.12, 0.95],
                        y: [16, -10, -4],
                      }}
                      transition={{
                        duration: 1.5,
                        delay: p.delay,
                        repeat: Infinity,
                        repeatType: 'reverse',
                        ease: 'easeInOut',
                      }}
                      className="absolute pointer-events-none z-10"
                    >
                      {p.kind === 'heart' ? (
                        <Heart
                          style={{ width: p.size, height: p.size }}
                          className="text-[#FF4F9A] fill-[#FF4F9A]/75"
                        />
                      ) : (
                        <Sparkles
                          style={{ width: p.size, height: p.size }}
                          className="text-[#FBBF24]"
                        />
                      )}
                    </motion.span>
                  ))}

                {/* Lazy WebGL choreography with a timing-identical accessible fallback. */}
                <div className="absolute inset-0 z-10 pt-7">
                  <Suspense
                    fallback={
                      <RevealFallback2D
                        artworkId={gift.snapshot.artworkId}
                        animationType={gift.snapshot.animationType}
                        playKey={playKey}
                        reducedMotion={reducedMotion}
                        onPayoffStart={activatePayoff}
                        onRevealComplete={() => setStage('revealed')}
                      />
                    }
                  >
                    <LazyShowmeloveReveal3D
                      artworkId={gift.snapshot.artworkId}
                      animationType={gift.snapshot.animationType}
                      themeColor={gift.snapshot.themeColor}
                      accentColor={gift.snapshot.accentColor}
                      playKey={playKey}
                      skipped={stage === 'revealed'}
                      isDark
                      onPayoffStart={activatePayoff}
                      onRevealComplete={() => setStage('revealed')}
                      fallback={
                        <RevealFallback2D
                          artworkId={gift.snapshot.artworkId}
                          animationType={gift.snapshot.animationType}
                          playKey={playKey}
                          reducedMotion={reducedMotion}
                          onPayoffStart={activatePayoff}
                          onRevealComplete={() => setStage('revealed')}
                        />
                      }
                    />
                  </Suspense>
                </div>

                {/* Lottie Emote Overlay (skipped in reduced motion) */}
                {!reducedMotion && (
                  <LottieEmote
                    emote={activeEmote}
                    playKey={playKey}
                    active={payoffActive}
                    className="absolute inset-0 w-full h-full pointer-events-none z-20"
                  />
                )}
              </div>

              {/* 8. Voice Note Player (prominent after reveal) */}
              {gift.hasVoiceNote && (
                <div
                  className="w-full rounded-[22px] bg-[#14131B] border border-white/10 px-4 py-3 flex items-center gap-3.5"
                  data-testid="reveal-voice-note-bar"
                >
                  <button
                    type="button"
                    onClick={handleToggleVoicePlayback}
                    aria-label={audioPlaying ? 'Pause voice note' : 'Play voice note'}
                    data-testid="voice-note-toggle-btn"
                    className="w-11 h-11 rounded-full cta-pink-surface text-white flex items-center justify-center shrink-0 shadow-md cursor-pointer"
                  >
                    {audioPlaying ? (
                      <Pause className="w-4 h-4 fill-current" />
                    ) : (
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-white truncate">
                        Voice note from {gift.senderName}
                      </span>
                      <span
                        className="tabular-nums text-[#ADA4BA] shrink-0"
                        data-testid="voice-note-duration"
                      >
                        {formatAudioClock(audioCurrentTime)} /{' '}
                        {formatAudioClock(audioDuration)}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full cta-pink-surface transition-[width] duration-150"
                        style={{ width: `${audioProgressPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Settled Promise Card + Reward Status + Share This Gift */}
              <AnimatePresence>
                {stage === 'revealed' && (
                  <motion.div
                    key="promise-reveal-card"
                    initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={
                      reducedMotion
                        ? { duration: 0.25 }
                        : { type: 'spring', stiffness: 480, damping: 30 }
                    }
                    className="w-full rounded-[28px] bg-[#14131B] border border-white/10 p-4 sm:p-5 space-y-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-[#1D1B26] border border-white/10 flex items-center justify-center shrink-0">
                          <GiftArtworkSvg
                            artworkId={gift.snapshot.artworkId}
                            className="w-10 h-10"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-[#ADA4BA]">
                            For{' '}
                            <span className="font-semibold text-white">
                              {gift.recipientName}
                            </span>{' '}
                            · From{' '}
                            <span className="font-semibold text-white">
                              {gift.senderName}
                            </span>
                          </p>
                          <h2 className="text-lg font-bold text-white leading-tight truncate">
                            {gift.snapshot.name}
                          </h2>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[11px] text-[#ADA4BA]">Reward</p>
                        <PriceLabel
                          amountNaira={gift.recipientEarningsNaira}
                          size="md"
                          accent
                        />
                      </div>
                    </div>

                    <PromisePaperCard
                      promiseText={gift.promiseText}
                      messageText={gift.messageText}
                      senderName={gift.senderName}
                      recipientName={gift.recipientName}
                      cardStyle={gift.promiseCardStyle ?? 'silk-crimson'}
                      unfoldAnimation={!reducedMotion}
                    />

                    {/* Reward Credited / Claim Feedback */}
                    {claimFeedback && (
                      <div
                        role="status"
                        className={`rounded-2xl px-4 py-3 text-sm border flex items-center gap-2.5 ${
                          claimFeedback.type === 'wrong'
                            ? 'bg-[#2F1426] border-[#FF2385]/40 text-white'
                            : claimFeedback.type === 'success'
                              ? 'bg-[#0D3326] border-[#24C888]/35 text-white'
                              : 'bg-[#1D1B26] border-white/10 text-white'
                        }`}
                      >
                        {claimFeedback.type === 'success' && (
                          <CheckCircle2 className="w-4 h-4 text-[#24C888] shrink-0" />
                        )}
                        <p className="font-medium">{claimFeedback.message}</p>
                      </div>
                    )}

                    {isPreview ? (
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        <span className="text-xs text-[#ADA4BA]">
                          Preview only · Recipient receives{' '}
                          {formatNaira(gift.recipientEarningsNaira)}
                        </span>
                        <Button variant="secondary" size="md" onClick={handleExitReveal}>
                          Back to editor
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Primary Claim / Claimed Status + Share This Gift CTA */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {isClaimed ? (
                            <Button
                              variant="primary"
                              size="lg"
                              fullWidth
                              className="rounded-full"
                              onClick={() => {
                                stopAllConfetti();
                                onGoToInbox?.();
                              }}
                              data-testid="reveal-open-inbox-btn"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Claimed · View Inbox</span>
                            </Button>
                          ) : (
                            <Button
                              variant="primary"
                              size="lg"
                              fullWidth
                              className="rounded-full"
                              onClick={() => {
                                if (!state.signedInEmail) {
                                  setClaimPanelOpen(true);
                                  return;
                                }
                                handleClaimAttempt();
                              }}
                              data-testid="claim-gift-btn"
                            >
                              <Wallet className="w-4 h-4" />
                              <span>
                                Claim {formatNaira(gift.recipientEarningsNaira)}
                              </span>
                            </Button>
                          )}

                          <button
                            type="button"
                            onClick={handleShareLink}
                            data-testid="reveal-share-btn"
                            className="min-h-[50px] px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/16 border border-white/14 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                          >
                            {sharedCopied ? (
                              <>
                                <Check className="w-4 h-4 text-[#24C888]" />
                                <span>Link copied!</span>
                              </>
                            ) : (
                              <>
                                <Share2 className="w-4 h-4" />
                                <span>Share this gift</span>
                              </>
                            )}
                          </button>
                        </div>

                        {(claimPanelOpen || (!state.signedInEmail && !isClaimed)) && (
                          <div className="rounded-2xl border border-white/12 bg-[#1D1B26] p-4 space-y-3">
                            <div className="flex items-start gap-2.5">
                              <Lock className="w-4 h-4 text-[#FF4F9A] shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-semibold text-white">
                                  Verify recipient to claim
                                </p>
                                <p className="text-xs text-[#ADA4BA]">
                                  Enter the recipient email used when this gift was sent.
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2">
                              <label className="sr-only" htmlFor="claim-verify-email">
                                Recipient verification email
                              </label>
                              <input
                                id="claim-verify-email"
                                type="email"
                                value={verifyEmailInput}
                                onChange={(e) => setVerifyEmailInput(e.target.value)}
                                placeholder="e.g. you@example.com"
                                className="flex-1 min-h-[44px] px-3.5 py-2 rounded-2xl border border-white/12 bg-[#14131B] text-sm text-white placeholder:text-[#ADA4BA]/60"
                              />
                              <Button
                                variant="primary"
                                size="md"
                                onClick={() => handleClaimAttempt(verifyEmailInput)}
                              >
                                Verify &amp; Claim
                              </Button>
                            </div>

                            {(gift.isBundledSample || gift.id === 'sample') && (
                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                <span className="text-[#ADA4BA]">Sample reveal sign-in:</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setVerifyEmailInput(DEMO_USERS.recipient.email);
                                    handleClaimAttempt(DEMO_USERS.recipient.email);
                                  }}
                                  className="px-2.5 py-1 rounded-xl bg-[#2B1726] text-[#FF7AA8] font-medium cursor-pointer"
                                >
                                  {DEMO_USERS.recipient.email}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setVerifyEmailInput('stranger@example.com');
                                    handleClaimAttempt('stranger@example.com');
                                  }}
                                  className="px-2.5 py-1 rounded-xl bg-[#14131B] border border-white/12 text-[#ADA4BA] font-medium cursor-pointer"
                                >
                                  Test wrong email
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
