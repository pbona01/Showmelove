import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  CheckCircle2,
  FastForward,
  Gift as GiftIcon,
  Lock,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
  Wallet,
} from 'lucide-react';
import type { SentGift } from '../types/showmelove';
import { formatNaira } from '../config/economy';
import { useTheme } from '../context/ThemeContext';
import { GiftArtworkSvg, ShowmeloveMascotSvg } from './GiftArtwork';
import { LottieEmote } from './LottieEmote';
import { RevealFallback2D } from './RevealFallback2D';
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

const LazyShowmeloveReveal3D = lazy(() =>
  import('./three/ShowmeloveReveal3D').then((m) => ({
    default: m.ShowmeloveReveal3D,
  })),
);

interface GiftRevealExperienceProps {
  gift: SentGift;
  isPreview?: boolean;
  onExit?: () => void;
  onGoToInbox?: () => void;
}

type RevealStage = 'sealed' | 'revealing' | 'revealed';

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
  const { state, claimGift, signInDemoEmail, getGiftById } = useShowmelove();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [stage, setStage] = useState<RevealStage>('sealed');
  const [sealedSpringing, setSealedSpringing] = useState(false);
  const [playKey, setPlayKey] = useState(0);
  const [skipped, setSkipped] = useState(false);
  const [payoffActive, setPayoffActive] = useState(false);
  const [claimBurstCount, setClaimBurstCount] = useState(0);
  const [muted, setMuted] = useState(false);

  // Voice note state (persists independently past visual animation settle)
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(
    gift.voiceNoteDurationSec || 12,
  );

  // Claim flow state
  const [claimPanelOpen, setClaimPanelOpen] = useState(false);
  const [verifyEmailInput, setVerifyEmailInput] = useState(state.signedInEmail || '');
  const [claimFeedback, setClaimFeedback] = useState<{
    type: 'success' | 'already' | 'wrong' | 'signin';
    message: string;
  } | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const openTimerRef = useRef<number | null>(null);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

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
    if (!reducedMotion) {
      void import('./three/ShowmeloveReveal3D');
    }
    return () => {
      if (openTimerRef.current) window.clearTimeout(openTimerRef.current);
      audioRef.current?.pause();
      stopAllConfetti();
    };
  }, [reducedMotion]);

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

  const handleOpenGift = () => {
    if (sealedSpringing) return;
    setSkipped(false);
    startVoiceNoteFromTap();

    if (reducedMotion) {
      setPayoffActive(false);
      setStage('revealing');
      setPlayKey((k) => k + 1);
      return;
    }

    setSealedSpringing(true);
    openTimerRef.current = window.setTimeout(() => {
      setSealedSpringing(false);
      setPayoffActive(false);
      setStage('revealing');
      setPlayKey((k) => k + 1);
    }, 140);
  };

  const handleReplay = () => {
    if (openTimerRef.current) window.clearTimeout(openTimerRef.current);
    stopAllConfetti();
    setSkipped(false);
    setSealedSpringing(false);
    setPayoffActive(false);
    setStage('revealing');
    setPlayKey((k) => k + 1);
    startVoiceNoteFromTap();
  };

  const handleSkip = () => {
    if (openTimerRef.current) window.clearTimeout(openTimerRef.current);
    setSkipped(true);
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

  const handleExitReveal = () => {
    audioRef.current?.pause();
    stopAllConfetti();
    onExit?.();
  };

  const handlePayoffStart = useCallback(() => {
    setPayoffActive(true);
    playSoftPayoffChime(mutedRef.current);
    fireGiftPayoffBurst(gift.snapshot.themeColor);
  }, [gift.snapshot.themeColor]);

  const handleRevealComplete = useCallback(() => {
    setStage('revealed');
  }, []);

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

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto text-[var(--text-primary)]"
      style={{
        backgroundColor: isDark ? 'rgba(9, 8, 13, 0.97)' : 'rgba(250, 247, 251, 0.97)',
        backgroundImage: isDark
          ? 'radial-gradient(circle at 50% 34%, rgba(168, 85, 247, 0.24), rgba(255, 23, 108, 0.14) 40%, rgba(9, 8, 13, 0) 72%)'
          : 'radial-gradient(circle at 50% 34%, rgba(132, 57, 213, 0.14), rgba(223, 7, 86, 0.08) 42%, rgba(250, 247, 251, 0) 74%)',
      }}
      data-testid="gift-reveal-stage"
      data-reveal-stage={stage}
      data-claim-confetti-count={claimBurstCount}
    >
      {/* Top minimal chrome — non-overlapping with canvas */}
      <header className="relative z-20 flex items-center justify-between px-4 sm:px-8 py-2.5 sm:py-3 shrink-0">
        <button
          type="button"
          onClick={handleExitReveal}
          data-testid="reveal-exit-btn"
          className="min-h-[42px] px-3 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-sm font-semibold text-[var(--text-primary)] inline-flex items-center gap-2 hover:bg-[var(--bg-raised)] transition-colors whitespace-nowrap shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{isPreview ? 'Back to editor' : 'Home'}</span>
        </button>

        <div className="flex items-center gap-2">
          {isPreview && (
            <span className="hidden sm:inline text-xs font-semibold text-[#DF0756] dark:text-[#FF176C]">
              Preview mode · No order created
            </span>
          )}
          {stage === 'revealing' && (
            <button
              type="button"
              onClick={handleSkip}
              data-testid="reveal-skip-btn"
              className="min-h-[42px] px-3.5 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-sm font-semibold text-[var(--text-primary)] inline-flex items-center gap-1.5 hover:bg-[var(--bg-raised)] transition-colors whitespace-nowrap shrink-0"
            >
              <FastForward className="w-4 h-4" />
              <span>Skip</span>
            </button>
          )}
          {stage !== 'sealed' && (
            <>
              <button
                type="button"
                onClick={handleToggleMute}
                aria-label={muted ? 'Unmute audio' : 'Mute audio'}
                data-testid="reveal-mute-btn"
                className="min-h-[42px] min-w-[42px] px-3 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-sm font-semibold text-[var(--text-primary)] inline-flex items-center justify-center gap-1.5 hover:bg-[var(--bg-raised)] transition-colors whitespace-nowrap shrink-0"
              >
                {muted ? (
                  <VolumeX className="w-4 h-4 text-[#DF0756] dark:text-[#FF176C]" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">{muted ? 'Unmute' : 'Mute'}</span>
              </button>
              <button
                type="button"
                onClick={handleReplay}
                data-testid="reveal-replay-btn"
                className="min-h-[42px] px-3.5 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-sm font-semibold text-[var(--text-primary)] inline-flex items-center gap-1.5 hover:bg-[var(--bg-raised)] transition-colors whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Replay</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Theatrical Stage */}
      <main className="relative flex-1 flex flex-col items-center justify-center px-4 pb-6">
        <AnimatePresence mode="wait">
          {stage === 'sealed' ? (
            <motion.section
              key="sealed-card"
              initial={reducedMotion ? false : { opacity: 0, y: 14, scale: 0.96 }}
              animate={
                sealedSpringing
                  ? { scale: 0.92, opacity: 0 }
                  : { opacity: 1, y: 0, scale: 1 }
              }
              exit={
                reducedMotion
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.92, transition: { duration: 0.1 } }
              }
              transition={
                sealedSpringing
                  ? { type: 'spring', stiffness: 720, damping: 28, mass: 0.55 }
                  : { type: 'spring', stiffness: 520, damping: 30, mass: 0.7 }
              }
              className="w-full max-w-md mx-auto glossy-card rounded-3xl border border-[var(--border-subtle)] p-7 sm:p-9 text-center space-y-6"
            >
              <div className="flex justify-center">
                <motion.div
                  animate={
                    sealedSpringing
                      ? { scale: 1.18, rotate: -6 }
                      : reducedMotion
                        ? undefined
                        : { y: [0, -5, 0] }
                  }
                  transition={
                    sealedSpringing
                      ? { type: 'spring', stiffness: 750, damping: 22, mass: 0.5 }
                      : { duration: 2.2, repeat: Infinity, ease: 'easeInOut' }
                  }
                  className="w-28 h-28 rounded-3xl love-coin-surface border border-[#DF0756]/20 dark:border-white/10 flex items-center justify-center shadow-lg"
                >
                  <ShowmeloveMascotSvg className="w-24 h-24" holdingGift />
                </motion.div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-[#8439D5] dark:text-[#A855F7]">
                  Animated gift for
                </p>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)]">
                  {gift.recipientName}
                </h1>
                <p className="text-sm text-[var(--text-secondary)]">
                  From{' '}
                  <span className="font-semibold text-[var(--text-primary)]">
                    {gift.senderName}
                  </span>
                  {gift.hasVoiceNote ? ' · Includes a voice note' : ''}
                </p>
              </div>

              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={handleOpenGift}
                data-testid="open-gift-btn"
              >
                <GiftIcon className="w-5 h-5" />
                <span>Open gift</span>
              </Button>
            </motion.section>
          ) : (
            <motion.section
              key="active-reveal"
              initial={reducedMotion ? false : { opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 580, damping: 32, mass: 0.65 }}
              className="w-full max-w-3xl mx-auto flex-1 flex flex-col items-center justify-start gap-3"
            >
              {/* Fixed-height 3D Stage — zero backdrop-blur over WebGL canvas */}
              <div
                className="relative w-full h-[300px] sm:h-[340px] lg:h-[360px] rounded-3xl overflow-hidden border border-[var(--border-subtle)] shrink-0"
                style={{
                  backgroundColor: isDark ? 'rgba(25, 22, 31, 0.72)' : 'rgba(255, 255, 255, 0.78)',
                  backgroundImage: isDark
                    ? 'radial-gradient(circle at 50% 45%, rgba(168, 85, 247, 0.32), rgba(255, 23, 108, 0.16) 48%, rgba(25, 22, 31, 0) 78%)'
                    : 'radial-gradient(circle at 50% 45%, rgba(132, 57, 213, 0.16), rgba(223, 7, 86, 0.09) 48%, rgba(255, 255, 255, 0) 78%)',
                }}
              >
                <Suspense
                  fallback={
                    <div className="w-full h-full flex items-center justify-center">
                      <ShowmeloveMascotSvg className="w-36 h-36" />
                    </div>
                  }
                >
                  {reducedMotion ? (
                    <RevealFallback2D
                      artworkId={gift.snapshot.artworkId}
                      animationType={gift.snapshot.animationType}
                      playKey={playKey}
                      reducedMotion={true}
                      onPayoffStart={handlePayoffStart}
                      onRevealComplete={handleRevealComplete}
                    />
                  ) : (
                    <LazyShowmeloveReveal3D
                      artworkId={gift.snapshot.artworkId}
                      animationType={gift.snapshot.animationType}
                      themeColor={gift.snapshot.themeColor}
                      accentColor={gift.snapshot.accentColor}
                      playKey={playKey}
                      skipped={skipped}
                      isDark={isDark}
                      onPayoffStart={handlePayoffStart}
                      onRevealComplete={handleRevealComplete}
                      fallback={
                        <RevealFallback2D
                          artworkId={gift.snapshot.artworkId}
                          animationType={gift.snapshot.animationType}
                          playKey={playKey}
                          reducedMotion={false}
                          onPayoffStart={handlePayoffStart}
                          onRevealComplete={handleRevealComplete}
                        />
                      }
                    />
                  )}
                </Suspense>

                {/* 60fps Lottie emote burst overlay */}
                <LottieEmote
                  emote={activeEmote}
                  playKey={playKey}
                  active={payoffActive}
                  className="absolute inset-0 w-full h-full"
                />

                {/* TikTok Live-style kinetic sender gift banner */}
                <motion.div
                  key={`banner-${playKey}`}
                  initial={reducedMotion ? false : { opacity: 0, x: -42, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 580, damping: 26, mass: 0.6 }}
                  className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none"
                >
                  <div className="inline-flex items-center gap-2 rounded-2xl bg-[var(--bg-card)]/92 border border-[var(--border-subtle)] px-3 py-1.5 shadow-sm max-w-[70%]">
                    <Sparkles className="w-3.5 h-3.5 text-[#DF0756] dark:text-[#FF176C] shrink-0" />
                    <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
                      {gift.senderName} sent {gift.snapshot.name}
                    </span>
                  </div>
                  <span className="rounded-xl bg-[var(--bg-card)]/92 border border-[var(--border-subtle)] px-2.5 py-1 text-[11px] tabular-nums font-bold text-[#DF0756] dark:text-[#FF176C] shrink-0">
                    {(gift.coinsSpent || gift.amountNaira).toLocaleString('en-NG')} Coins
                  </span>
                </motion.div>
              </div>

              {/* Dedicated Voice-Note Playback Bar (stays active past animation settle) */}
              {gift.hasVoiceNote && (
                <div
                  className="w-full max-w-xl mx-auto rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] px-4 py-3 flex items-center gap-3 shadow-sm"
                  data-testid="reveal-voice-note-bar"
                >
                  <button
                    type="button"
                    onClick={handleToggleVoicePlayback}
                    aria-label={audioPlaying ? 'Pause voice note' : 'Play voice note'}
                    data-testid="voice-note-toggle-btn"
                    className="w-10 h-10 rounded-xl bg-[#DF0756] hover:bg-[#C00549] dark:bg-[#FF176C] dark:hover:bg-[#E0105D] text-white flex items-center justify-center shrink-0 transition-colors"
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
                        Personal voice note from {gift.senderName}
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
                        className="h-full rounded-full bg-gradient-to-r from-[#FF176C] to-[#A855F7] transition-[width] duration-150"
                        style={{ width: `${audioProgressPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Revealed Unfolded Promise Card & Claim Actions */}
              <AnimatePresence>
                {stage === 'revealed' && (
                  <motion.div
                    key="promise-card-reveal"
                    initial={reducedMotion ? false : { opacity: 0, y: 18, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 520, damping: 28, mass: 0.7 }}
                    className="w-full max-w-xl mx-auto glossy-card rounded-3xl border border-[var(--border-subtle)] p-4 sm:p-5 space-y-3.5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-14 h-14 rounded-2xl bg-[var(--bg-raised)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
                          <GiftArtworkSvg
                            artworkId={gift.snapshot.artworkId}
                            className="w-11 h-11"
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
                          <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] leading-tight">
                            {gift.snapshot.name}
                          </h2>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[11px] text-[var(--text-secondary)]">Gift value</p>
                        <PriceLabel amountNaira={gift.amountNaira} size="lg" accent />
                      </div>
                    </div>

                    <PromisePaperCard
                      promiseText={gift.promiseText}
                      messageText={gift.messageText}
                      senderName={gift.senderName}
                      recipientName={gift.recipientName}
                      unfoldAnimation={true}
                    />

                    {claimFeedback && (
                      <div
                        role="status"
                        className={`rounded-2xl px-4 py-3 text-sm border ${
                          claimFeedback.type === 'wrong'
                            ? 'bg-[#FFEAF2] dark:bg-[#2F1426] border-[#DF0756]/35 dark:border-[#FF176C]/40 text-[var(--text-primary)]'
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
                            className="flex-1"
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
                                <span>Already claimed · Check status</span>
                              </>
                            ) : (
                              <>
                                <Wallet className="w-4 h-4" />
                                <span>
                                  Claim gift ({formatNaira(gift.recipientEarningsNaira)})
                                </span>
                              </>
                            )}
                          </Button>

                          {isClaimed && onGoToInbox && (
                            <Button
                              variant="dark"
                              size="lg"
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
                          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 space-y-3">
                            <div className="flex items-start gap-2.5">
                              <Lock className="w-4 h-4 text-[#DF0756] dark:text-[#FF176C] shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-semibold text-[var(--text-primary)]">
                                  Demo recipient verification
                                </p>
                                <p className="text-xs text-[var(--text-secondary)]">
                                  Simulated sign-in check: your demo email must match the email entered by the sender.
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
                                className="flex-1 min-h-[44px] px-3.5 py-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-raised)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[#A855F7]/40"
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
                                className="px-2.5 py-1 rounded-xl bg-[#FFEAF2] dark:bg-[#2B1726] text-[#DF0756] dark:text-[#FF7AA8] font-medium hover:opacity-90 transition-opacity"
                              >
                                Sign in as {DEMO_USERS.recipient.email}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setVerifyEmailInput('stranger@example.com');
                                  handleClaimAttempt('stranger@example.com');
                                }}
                                className="px-2.5 py-1 rounded-xl bg-[var(--bg-raised)] border border-[var(--border-subtle)] text-[var(--text-secondary)] font-medium hover:text-[var(--text-primary)] transition-colors"
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
