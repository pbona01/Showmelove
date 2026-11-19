import { useCallback, useEffect, useRef, useState } from 'react';
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
import { useTheme } from '../context/ThemeContext';
import { GiftArtworkSvg, LoveCoinHeartSvg } from './GiftArtwork';
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

interface GiftRevealExperienceProps {
  gift: SentGift;
  isPreview?: boolean;
  onExit?: () => void;
  onGoToInbox?: () => void;
}

type RevealStage = 'sealed' | 'revealing' | 'revealed';

const FLOATING_PARTICLES = [
  { id: 'h1', left: '14%', top: '26%', delay: 0, size: 18, kind: 'heart' as const },
  { id: 's1', left: '82%', top: '20%', delay: 0.25, size: 16, kind: 'sparkle' as const },
  { id: 'h2', left: '78%', top: '66%', delay: 0.5, size: 15, kind: 'heart' as const },
  { id: 's2', left: '18%', top: '68%', delay: 0.15, size: 14, kind: 'sparkle' as const },
  { id: 'h3', left: '66%', top: '14%', delay: 0.35, size: 14, kind: 'heart' as const },
  { id: 's3', left: '30%', top: '16%', delay: 0.6, size: 13, kind: 'sparkle' as const },
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
  const { state, claimGift, markGiftRevealed, signInDemoEmail, getGiftById } =
    useShowmelove();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [stage, setStage] = useState<RevealStage>('sealed');
  const [playKey, setPlayKey] = useState(0);
  const [payoffActive, setPayoffActive] = useState(false);
  const [claimBurstCount, setClaimBurstCount] = useState(0);
  const [muted, setMuted] = useState(false);
  const [sharedCopied, setSharedCopied] = useState(false);

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
  mutedRef.current = muted;

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

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

  // Snappy TikTok Live-inspired choreography (fast 0.55s payoff burst, 1.55s card settle)
  const triggerRevealChoreography = useCallback(() => {
    clearRevealTimers();
    setPayoffActive(false);
    setStage('revealing');
    setPlayKey((k) => k + 1);

    if (reducedMotion) {
      setPayoffActive(true);
      setStage('revealed');
      return;
    }

    payoffTimerRef.current = window.setTimeout(() => {
      setPayoffActive(true);
      playSoftPayoffChime(mutedRef.current);
      fireGiftPayoffBurst(gift.snapshot.themeColor);
    }, 520);

    settleTimerRef.current = window.setTimeout(() => {
      setStage('revealed');
    }, 1550);
  }, [clearRevealTimers, gift.snapshot.themeColor, reducedMotion]);

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
    if (!payoffActive) {
      setPayoffActive(true);
      fireGiftPayoffBurst(gift.snapshot.themeColor);
    }
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
    window.setTimeout(() => setSharedCopied(false), 2000);
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
      fireClaimCelebrationExplosion();
      setClaimBurstCount((c) => c + 1);
      setClaimFeedback({
        type: 'success',
        message: `${formatNaira(gift.recipientEarningsNaira)} added to your Gifted Rewards.`,
      });
      setClaimPanelOpen(false);
    } else if (res.status === 'already_claimed') {
      setClaimFeedback({
        type: 'already',
        message: 'This gift has already been claimed. Your earnings balance remains unchanged.',
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

  const latestGift = getGiftById(gift.id) ?? gift;
  const isClaimed = Boolean(latestGift.claimedAt);
  const audioProgressPct =
    audioDuration > 0 ? Math.min(100, (audioCurrentTime / audioDuration) * 100) : 0;

  // Signature per-gift payoff choreography
  const giftChoreography = reducedMotion
    ? { scale: 1, y: 0, rotate: 0 }
    : gift.snapshot.animationType === 'pulse'
      ? { scale: [0.35, 1.18, 0.98, 1.08, 1.02], y: [24, -10, 0, -4, 0] }
      : gift.snapshot.animationType === 'bloom'
        ? { scale: [0.3, 1.14, 1.04], rotate: [-14, 6, 0], y: [28, -8, 0] }
        : gift.snapshot.animationType === 'wave'
          ? { scale: [0.35, 1.12, 1.02], rotate: [0, -8, 8, -4, 0], y: [24, -8, 0] }
          : { scale: [0.32, 1.2, 0.96, 1.06], y: [28, -14, 0, -4] };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto text-[var(--text-primary)]"
      style={{
        backgroundColor: isDark ? '#08060E' : '#FAF6FC',
        backgroundImage: isDark
          ? 'radial-gradient(ellipse 68% 46% at 50% 0%, rgba(255, 23, 108, 0.34), transparent 72%), radial-gradient(circle at 50% 42%, rgba(168, 85, 247, 0.28), rgba(255, 23, 108, 0.14) 38%, rgba(8, 6, 14, 0) 70%)'
          : 'radial-gradient(ellipse 68% 46% at 50% 0%, rgba(225, 11, 92, 0.16), transparent 72%), radial-gradient(circle at 50% 42%, rgba(132, 57, 213, 0.14), rgba(225, 11, 92, 0.08) 40%, rgba(250, 246, 252, 0) 72%)',
      }}
      data-testid="gift-reveal-stage"
      data-reveal-stage={stage}
      data-claim-confetti-count={claimBurstCount}
    >
      {/* Top Bar matching Mockup 04 */}
      <header className="relative z-20 flex items-center justify-between px-4 sm:px-8 py-3 shrink-0">
        <button
          type="button"
          onClick={handleExitReveal}
          aria-label={isPreview ? 'Close preview' : 'Close gift reveal'}
          data-testid="reveal-exit-btn"
          className="min-h-[42px] min-w-[42px] px-3 rounded-full bg-[var(--bg-card)]/90 border border-[var(--border-subtle)] text-sm font-semibold text-[var(--text-primary)] inline-flex items-center justify-center gap-1.5 hover:bg-[var(--bg-raised)] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
          <span className="hidden sm:inline">{isPreview ? 'Editor' : 'Close'}</span>
        </button>

        <span className="text-base sm:text-lg font-bold tracking-tight text-[var(--text-primary)] select-none">
          Showme<span className="text-[#E10B5C] dark:text-[#FF2A85]">love</span>
        </span>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {stage === 'revealing' && (
            <button
              type="button"
              onClick={handleSkip}
              data-testid="reveal-skip-btn"
              className="min-h-[40px] px-3 rounded-full bg-[var(--bg-card)]/90 border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] inline-flex items-center gap-1 hover:bg-[var(--bg-raised)] cursor-pointer"
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
            className="min-h-[40px] min-w-[40px] rounded-full bg-[var(--bg-card)]/90 border border-[var(--border-subtle)] text-[var(--text-primary)] flex items-center justify-center hover:bg-[var(--bg-raised)] cursor-pointer"
          >
            {muted ? (
              <VolumeX className="w-4 h-4 text-[#E10B5C] dark:text-[#FF3888]" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <button
            type="button"
            onClick={handleShareLink}
            aria-label="Share gift link"
            data-testid="reveal-share-btn"
            className="min-h-[40px] min-w-[40px] px-2.5 rounded-full bg-[var(--bg-card)]/90 border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] inline-flex items-center justify-center gap-1 hover:bg-[var(--bg-raised)] cursor-pointer"
          >
            {sharedCopied ? (
              <Check className="w-4 h-4 text-[#087F56] dark:text-[#24C888]" />
            ) : (
              <Share2 className="w-4 h-4" />
            )}
            {sharedCopied && <span className="hidden sm:inline">Copied</span>}
          </button>
          {stage === 'revealed' && (
            <button
              type="button"
              onClick={handleReplay}
              aria-label="Replay reveal"
              data-testid="reveal-replay-btn"
              className="min-h-[40px] min-w-[40px] rounded-full bg-[var(--bg-card)]/90 border border-[var(--border-subtle)] text-[var(--text-primary)] flex items-center justify-center hover:bg-[var(--bg-raised)] cursor-pointer"
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
              initial={reducedMotion ? false : { opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={
                reducedMotion
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.92, transition: { duration: 0.14 } }
              }
              transition={{ type: 'spring', stiffness: 460, damping: 28 }}
              className="w-full max-w-md mx-auto flex flex-col items-center text-center space-y-5"
            >
              {/* Title matching Mockup 04: "A gift for Adaeze" */}
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)]">
                A gift for{' '}
                <span className="text-[#E10B5C] dark:text-[#FF5FA2]">
                  {gift.recipientName}
                </span>
              </h1>

              {/* Luminous Mascot + Gift Teaser Stage */}
              <div className="relative w-full max-w-[320px] h-[250px] sm:h-[280px] flex items-center justify-center">
                {/* Ambient stage floor glow */}
                <div
                  aria-hidden="true"
                  className="absolute bottom-3 w-56 h-10 rounded-full blur-2xl opacity-75"
                  style={{
                    background:
                      'radial-gradient(circle, rgba(255, 23, 108, 0.72) 0%, rgba(168, 85, 247, 0.35) 60%, transparent 100%)',
                  }}
                />

                {/* Orbiting sparkle & heart particles */}
                {!reducedMotion &&
                  FLOATING_PARTICLES.map((p) => (
                    <motion.span
                      key={p.id}
                      aria-hidden="true"
                      style={{ left: p.left, top: p.top }}
                      animate={{
                        y: [0, -10, 0],
                        opacity: [0.45, 1, 0.45],
                        scale: [0.85, 1.12, 0.85],
                      }}
                      transition={{
                        duration: 2.6,
                        delay: p.delay,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                      className="absolute pointer-events-none"
                    >
                      {p.kind === 'heart' ? (
                        <Heart
                          style={{ width: p.size, height: p.size }}
                          className="text-[#FF3888] fill-[#FF3888]/70"
                        />
                      ) : (
                        <Sparkles
                          style={{ width: p.size, height: p.size }}
                          className="text-[#FBBF24]"
                        />
                      )}
                    </motion.span>
                  ))}

                {/* Mascot + Gift composite */}
                <motion.div
                  animate={reducedMotion ? undefined : { y: [0, -8, 0] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                  className="relative z-10 flex items-end justify-center"
                >
                  <LoveCoinHeartSvg className="w-40 h-40 sm:w-44 sm:h-44" />
                  <motion.div
                    animate={reducedMotion ? undefined : { rotate: [-4, 4, -4] }}
                    transition={{ duration: 3.1, repeat: Infinity, ease: 'easeInOut' }}
                    className="-ml-10 mb-1"
                  >
                    <GiftArtworkSvg
                      artworkId={gift.snapshot.artworkId}
                      className="w-24 h-24 sm:w-28 sm:h-28"
                    />
                  </motion.div>
                </motion.div>
              </div>

              {/* From Sender + Teaser Promise Pill matching Mockup 04 */}
              <div className="space-y-3 w-full">
                <p className="text-lg font-bold text-[var(--text-primary)]">
                  From{' '}
                  <span className="text-[#E10B5C] dark:text-[#FF5FA2]">
                    {gift.senderName}
                  </span>
                </p>

                <div className="rounded-2xl bg-[var(--bg-card)]/85 border border-[var(--border-subtle)] px-4 py-3 text-sm font-medium text-[var(--text-primary)] inline-flex items-center justify-center gap-2 max-w-full">
                  <Sparkles className="w-4 h-4 text-[#FBBF24] shrink-0" />
                  <span className="truncate">{gift.promiseText}</span>
                </div>

                {gift.hasVoiceNote && (
                  <p className="text-xs text-[var(--text-secondary)]">
                    Includes a personal voice note · Tap below with sound on
                  </p>
                )}
              </div>

              {/* Radiant Hot-Pink CTA matching Mockup 04 */}
              <div className="w-full space-y-3 pt-1">
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={handleOpenGift}
                  data-testid="open-gift-btn"
                  className="rounded-full min-h-[54px] text-base"
                >
                  <GiftIcon className="w-5 h-5" />
                  <span>Open your gift</span>
                </Button>

                {isPreview && (
                  <p className="text-xs text-[var(--text-secondary)]">
                    Preview mode · No order created
                  </p>
                )}
              </div>
            </motion.section>
          ) : (
            <motion.section
              key="active-reveal-stage"
              initial={reducedMotion ? false : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 520, damping: 30 }}
              className="w-full max-w-xl mx-auto flex flex-col items-center gap-3 sm:gap-4"
            >
              {/* TikTok Live-Inspired Animated Reveal Stage */}
              <div
                className="relative w-full h-[224px] sm:h-[296px] rounded-[28px] overflow-hidden border border-[var(--border-subtle)] flex items-center justify-center"
                style={{
                  backgroundColor: isDark ? 'rgba(21, 18, 27, 0.82)' : 'rgba(255, 255, 255, 0.88)',
                  backgroundImage: isDark
                    ? 'radial-gradient(circle at 50% 45%, rgba(255, 23, 108, 0.34), rgba(168, 85, 247, 0.24) 44%, rgba(21, 18, 27, 0) 76%)'
                    : 'radial-gradient(circle at 50% 45%, rgba(225, 11, 92, 0.16), rgba(132, 57, 213, 0.12) 44%, rgba(255, 255, 255, 0) 76%)',
                }}
              >
                {/* Kinetic Sender Gift Banner */}
                <motion.div
                  key={`banner-${playKey}`}
                  initial={reducedMotion ? false : { opacity: 0, x: -36, scale: 0.92 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 560, damping: 26 }}
                  className="absolute top-3.5 left-3.5 right-3.5 z-20 flex items-center justify-between gap-2 pointer-events-none"
                >
                  <div className="inline-flex items-center gap-2 rounded-full bg-[var(--bg-card)]/92 border border-[var(--border-subtle)] px-3.5 py-1.5 shadow-sm max-w-[72%]">
                    <Sparkles className="w-3.5 h-3.5 text-[#E10B5C] dark:text-[#FF3888] shrink-0" />
                    <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
                      {gift.senderName} sent {gift.snapshot.name}
                    </span>
                  </div>
                  <span className="rounded-full bg-[var(--bg-card)]/92 border border-[var(--border-subtle)] px-3 py-1 text-xs tabular-nums font-bold text-[#E10B5C] dark:text-[#FF3888] shrink-0">
                    {(gift.coinsSpent || gift.amountNaira).toLocaleString('en-NG')} Coins
                  </span>
                </motion.div>

                {/* Expanding Radiant Shockwave Ring on Payoff */}
                {payoffActive && !reducedMotion && (
                  <motion.div
                    key={`ring-${playKey}`}
                    aria-hidden="true"
                    initial={{ scale: 0.35, opacity: 0.85 }}
                    animate={{ scale: 2.3, opacity: 0 }}
                    transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute w-36 h-36 rounded-full border-2 border-[#FF3888]/70 pointer-events-none"
                  />
                )}

                {/* Floating Hearts & Golden Sparkles */}
                {!reducedMotion &&
                  FLOATING_PARTICLES.map((p) => (
                    <motion.span
                      key={`act-${p.id}-${playKey}`}
                      aria-hidden="true"
                      style={{ left: p.left, top: p.top }}
                      initial={{ opacity: 0, scale: 0.4, y: 18 }}
                      animate={{
                        opacity: [0, 1, 0.7],
                        scale: [0.6, 1.15, 0.95],
                        y: [18, -12, -4],
                      }}
                      transition={{
                        duration: 1.4,
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
                          className="text-[#FF3888] fill-[#FF3888]/75"
                        />
                      ) : (
                        <Sparkles
                          style={{ width: p.size, height: p.size }}
                          className="text-[#FBBF24]"
                        />
                      )}
                    </motion.span>
                  ))}

                {/* Mascot Leaping In & Handing Over Transparent 3D Gift */}
                <div className="relative z-10 flex items-center justify-center pt-5">
                  <motion.div
                    key={`mascot-${playKey}`}
                    initial={
                      reducedMotion
                        ? false
                        : { opacity: 0, x: -72, y: 28, scale: 0.65, rotate: -10 }
                    }
                    animate={{
                      opacity: 1,
                      x: -10,
                      y: reducedMotion ? 0 : [0, -6, 0],
                      scale: 1,
                      rotate: 0,
                    }}
                    transition={
                      reducedMotion
                        ? { duration: 0 }
                        : {
                            x: { type: 'spring', stiffness: 420, damping: 24 },
                            scale: { type: 'spring', stiffness: 440, damping: 24 },
                            opacity: { duration: 0.25 },
                            y: { duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: 0.5 },
                          }
                    }
                  >
                    <LoveCoinHeartSvg className="w-36 h-36 sm:w-44 sm:h-44" />
                  </motion.div>

                  <motion.div
                    key={`gift-${playKey}`}
                    initial={
                      reducedMotion ? false : { opacity: 0, scale: 0.3, y: 24 }
                    }
                    animate={{ opacity: 1, ...giftChoreography }}
                    transition={
                      reducedMotion
                        ? { duration: 0 }
                        : {
                            duration: 0.9,
                            delay: 0.28,
                            ease: [0.16, 1, 0.3, 1],
                          }
                    }
                    className="-ml-8 mt-4"
                  >
                    <GiftArtworkSvg
                      artworkId={gift.snapshot.artworkId}
                      className="w-32 h-32 sm:w-38 sm:h-38"
                    />
                  </motion.div>
                </div>

                {/* 60fps Lottie Emote Burst Overlay */}
                <LottieEmote
                  emote={activeEmote}
                  playKey={playKey}
                  active={payoffActive}
                  className="absolute inset-0 w-full h-full pointer-events-none z-20"
                />
              </div>

              {/* Voice Note Playback Bar */}
              {gift.hasVoiceNote && (
                <div
                  className="w-full apple-card rounded-[22px] px-4 py-3 flex items-center gap-3.5"
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
                      <span className="font-semibold text-[var(--text-primary)] truncate">
                        Voice note from {gift.senderName}
                      </span>
                      <span
                        className="tabular-nums text-[var(--text-secondary)] shrink-0"
                        data-testid="voice-note-duration"
                      >
                        {formatAudioClock(audioCurrentTime)} /{' '}
                        {formatAudioClock(audioDuration)}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[var(--bg-raised)] overflow-hidden">
                      <div
                        className="h-full rounded-full cta-pink-surface transition-[width] duration-150"
                        style={{ width: `${audioProgressPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Settled Promise Card + Claim Flow */}
              <AnimatePresence>
                {stage === 'revealed' && (
                  <motion.div
                    key="promise-reveal-card"
                    initial={reducedMotion ? false : { opacity: 0, y: 16, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 520, damping: 30 }}
                    className="w-full apple-card rounded-[28px] p-4 sm:p-5 space-y-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-13 h-13 rounded-2xl bg-[var(--bg-raised)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
                          <GiftArtworkSvg
                            artworkId={gift.snapshot.artworkId}
                            className="w-10 h-10"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-[var(--text-secondary)]">
                            From{' '}
                            <span className="font-semibold text-[var(--text-primary)]">
                              {gift.senderName}
                            </span>{' '}
                            to{' '}
                            <span className="font-semibold text-[var(--text-primary)]">
                              {gift.recipientName}
                            </span>
                          </p>
                          <h2 className="text-lg font-bold text-[var(--text-primary)] leading-tight truncate">
                            {gift.snapshot.name}
                          </h2>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[11px] text-[var(--text-secondary)]">Gift value</p>
                        <PriceLabel amountNaira={gift.amountNaira} size="md" accent />
                      </div>
                    </div>

                    <PromisePaperCard
                      promiseText={gift.promiseText}
                      messageText={gift.messageText}
                      senderName={gift.senderName}
                      recipientName={gift.recipientName}
                      cardStyle={gift.promiseCardStyle ?? 'silk-crimson'}
                      unfoldAnimation={true}
                    />

                    {claimFeedback && (
                      <div
                        role="status"
                        className={`rounded-2xl px-4 py-3 text-sm border ${
                          claimFeedback.type === 'wrong'
                            ? 'bg-[#FFEAF2] dark:bg-[#2F1426] border-[#E10B5C]/35 dark:border-[#FF176C]/40 text-[var(--text-primary)]'
                            : claimFeedback.type === 'success'
                              ? 'bg-[#E6F6EF] dark:bg-[#0D3326] border-[#087F56]/25 dark:border-[#24C888]/35 text-[var(--text-primary)]'
                              : 'bg-[var(--bg-raised)] border-[var(--border-subtle)] text-[var(--text-primary)]'
                        }`}
                      >
                        <p className="font-medium">{claimFeedback.message}</p>
                      </div>
                    )}

                    {isPreview ? (
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        <span className="text-xs text-[var(--text-secondary)]">
                          Preview only · Recipient claims{' '}
                          {formatNaira(gift.recipientEarningsNaira)} after checkout
                        </span>
                        <Button variant="dark" size="md" onClick={handleExitReveal}>
                          Back to editor
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <Button
                            variant={isClaimed ? 'secondary' : 'primary'}
                            size="lg"
                            className="flex-1 rounded-full"
                            onClick={() => {
                              if (!state.signedInEmail) {
                                setClaimPanelOpen(true);
                                return;
                              }
                              handleClaimAttempt();
                            }}
                            data-testid="claim-gift-btn"
                          >
                            {isClaimed ? (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-[#087F56] dark:text-[#24C888]" />
                                <span>Claimed · Check status</span>
                              </>
                            ) : (
                              <>
                                <Wallet className="w-4 h-4" />
                                <span>
                                  Claim {formatNaira(gift.recipientEarningsNaira)}
                                </span>
                              </>
                            )}
                          </Button>

                          {isClaimed && onGoToInbox && (
                            <Button
                              variant="dark"
                              size="lg"
                              className="rounded-full"
                              onClick={() => {
                                stopAllConfetti();
                                onGoToInbox();
                              }}
                              data-testid="reveal-open-inbox-btn"
                            >
                              Open Inbox
                            </Button>
                          )}
                        </div>

                        {(claimPanelOpen || (!state.signedInEmail && !isClaimed)) && (
                          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-raised)] p-4 space-y-3">
                            <div className="flex items-start gap-2.5">
                              <Lock className="w-4 h-4 text-[#E10B5C] dark:text-[#FF3888] shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-semibold text-[var(--text-primary)]">
                                  Demo recipient verification
                                </p>
                                <p className="text-xs text-[var(--text-secondary)]">
                                  Verify your demo email matches the email entered by the sender.
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
                                placeholder="Enter recipient email (e.g. ada@showmelove.ng)"
                                className="flex-1 min-h-[44px] px-3.5 py-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] text-sm text-[var(--text-primary)]"
                              />
                              <Button
                                variant="dark"
                                size="md"
                                onClick={() => handleClaimAttempt(verifyEmailInput)}
                              >
                                Verify &amp; Claim
                              </Button>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="text-[var(--text-secondary)]">
                                Quick test sign-in:
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setVerifyEmailInput(DEMO_USERS.recipient.email);
                                  handleClaimAttempt(DEMO_USERS.recipient.email);
                                }}
                                className="px-2.5 py-1 rounded-xl bg-[#FFEAF2] dark:bg-[#2B1726] text-[#E10B5C] dark:text-[#FF7AA8] font-medium cursor-pointer"
                              >
                                Sign in as {DEMO_USERS.recipient.email}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setVerifyEmailInput('stranger@example.com');
                                  handleClaimAttempt('stranger@example.com');
                                }}
                                className="px-2.5 py-1 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-secondary)] font-medium cursor-pointer"
                              >
                                Test wrong recipient
                              </button>
                            </div>
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
