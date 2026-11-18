import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  CheckCircle2,
  Gift as GiftIcon,
  Lock,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
  Wallet,
} from 'lucide-react';
import type { SentGift } from '../types/showmelove';
import { formatNaira } from '../config/economy';
import { GiftArtworkSvg, ShowmeloveMascotSvg } from './GiftArtwork';
import { LottieEmote } from './LottieEmote';
import { RevealFallback2D } from './RevealFallback2D';
import { getBundledSampleVoiceNoteUrl, playSoftPayoffChime } from '../audio/sampleVoiceNote';
import { audioStorage } from '../services/audioStorage';
import { useShowmelove } from '../context/ShowmeloveContext';
import { DEMO_USERS } from '../services/seedData';
import { Button, PriceLabel, PromisePaperCard } from './ui/DesignSystem';
import {
  fireClaimCelebrationExplosion,
  fireGiftPayoffBurst,
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

export function GiftRevealExperience({
  gift,
  isPreview = false,
  onExit,
  onGoToInbox,
}: GiftRevealExperienceProps) {
  const { state, claimGift, signInDemoEmail, getGiftById } = useShowmelove();
  const [stage, setStage] = useState<RevealStage>('sealed');
  const [sealedSpringing, setSealedSpringing] = useState(false);
  const [playKey, setPlayKey] = useState(0);
  const [payoffActive, setPayoffActive] = useState(false);
  const [claimBurstCount, setClaimBurstCount] = useState(0);
  const [muted, setMuted] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);

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
    };
  }, [reducedMotion]);

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
    audio.currentTime = 0;
    audio.muted = mutedRef.current;
    audio.onended = () => setAudioPlaying(false);
    audio.onerror = () => setAudioPlaying(false);

    audio
      .play()
      .then(() => setAudioPlaying(true))
      .catch(() => setAudioPlaying(false));
  }, [audioUrl, gift.hasVoiceNote, gift.voiceNoteSource]);

  const handleOpenGift = () => {
    if (sealedSpringing) return;
    startVoiceNoteFromTap();

    if (reducedMotion) {
      setPayoffActive(false);
      setStage('revealing');
      setPlayKey((k) => k + 1);
      return;
    }

    // Snappy 140ms sealed anticipation pop before launching 3D TikTok Live reveal
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
    setSealedSpringing(false);
    setPayoffActive(false);
    setStage('revealing');
    setPlayKey((k) => k + 1);
    startVoiceNoteFromTap();
  };

  const handleToggleMute = () => {
    const next = !muted;
    setMuted(next);
    if (audioRef.current) {
      audioRef.current.muted = next;
    }
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
      // Automatic canvas-confetti explosion upon successful claim
      fireClaimCelebrationExplosion();
      setClaimBurstCount((c) => c + 1);
      setClaimFeedback({
        type: 'success',
        message: `${formatNaira(gift.recipientEarningsNaira)} added to your available earnings.`,
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

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[#FDF8F3] text-[#171314] overflow-y-auto"
      data-testid="gift-reveal-stage"
      data-reveal-stage={stage}
      data-claim-confetti-count={claimBurstCount}
    >
      {/* Top minimal chrome — non-overlapping with canvas */}
      <header className="relative z-20 flex items-center justify-between px-4 sm:px-8 py-2.5 sm:py-3 shrink-0">
        <button
          type="button"
          onClick={() => {
            audioRef.current?.pause();
            onExit?.();
          }}
          className="min-h-[44px] px-3 py-2 rounded-xl bg-white border border-[#171314]/10 text-sm font-medium text-[#171314] inline-flex items-center gap-2 hover:bg-[#FFF0F2] transition-colors whitespace-nowrap shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{isPreview ? 'Back to editor' : 'Home'}</span>
        </button>

        <div className="flex items-center gap-2">
          {isPreview && (
            <span className="hidden sm:inline text-xs font-medium text-[#E62E45]">
              Preview mode · No order created
            </span>
          )}
          {stage !== 'sealed' && (
            <>
              <button
                type="button"
                onClick={handleToggleMute}
                aria-label={muted ? 'Unmute audio' : 'Mute audio'}
                className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl bg-white border border-[#171314]/10 text-sm font-medium text-[#171314] inline-flex items-center justify-center gap-1.5 hover:bg-[#FFF0F2] transition-colors whitespace-nowrap shrink-0"
              >
                {muted ? (
                  <VolumeX className="w-4 h-4 text-[#E62E45]" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">{muted ? 'Unmute' : 'Mute'}</span>
              </button>
              <button
                type="button"
                onClick={handleReplay}
                className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white border border-[#171314]/10 text-sm font-medium text-[#171314] inline-flex items-center gap-1.5 hover:bg-[#FFF0F2] transition-colors whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Replay</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Theatrical Stage */}
      <main className="relative flex-1 flex flex-col items-center justify-center px-4 pb-5">
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
              className="w-full max-w-md mx-auto glossy-card rounded-3xl border border-[#171314]/8 p-7 sm:p-9 text-center space-y-6"
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
                  className="w-28 h-28 rounded-3xl bg-[#FFF0F2] border border-[#E62E45]/12 flex items-center justify-center gift-gloss"
                >
                  <ShowmeloveMascotSvg className="w-24 h-24" holdingGift />
                </motion.div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-[#5E5255]">A gift for</p>
                <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#171314]">
                  {gift.recipientName}
                </h1>
                <p className="text-sm text-[#5E5255]">
                  From <span className="font-semibold text-[#171314]">{gift.senderName}</span>
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
              {/* Fixed-height 3D Stage prevents WebGL drawing buffer reallocation choppiness */}
              <div className="relative w-full h-[300px] sm:h-[330px] lg:h-[340px] rounded-3xl overflow-hidden border border-[#171314]/8 bg-[#FDF8F3] shrink-0">
                <Suspense
                  fallback={
                    <div className="w-full h-full flex items-center justify-center bg-[#FFF0F2]">
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

                {/* High-framerate 60fps Lottie emote burst overlay */}
                <LottieEmote
                  emote={activeEmote}
                  playKey={playKey}
                  active={payoffActive}
                  className="absolute inset-0 w-full h-full"
                />

                {/* TikTok Live-style kinetic sender gift banner at top of stage */}
                <motion.div
                  key={`banner-${playKey}`}
                  initial={reducedMotion ? false : { opacity: 0, x: -48, scale: 0.88 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 620, damping: 26, mass: 0.6 }}
                  className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none"
                >
                  <div className="inline-flex items-center gap-2 rounded-2xl bg-white/90 border border-[#171314]/10 px-3 py-1.5 shadow-sm max-w-[64%]">
                    <Sparkles className="w-3.5 h-3.5 text-[#E62E45] shrink-0" />
                    <span className="text-xs font-semibold text-[#171314] truncate">
                      {gift.senderName} sent {gift.snapshot.name}
                    </span>
                  </div>
                  {gift.hasVoiceNote && (
                    <span className="rounded-xl bg-white/90 border border-[#171314]/10 px-2.5 py-1 text-[11px] tabular-nums font-medium text-[#171314] shrink-0">
                      {audioPlaying ? 'Playing note' : 'Voice note'}
                    </span>
                  )}
                </motion.div>
              </div>

              {/* Revealed Unfolded Promise Card & Claim Actions */}
              <AnimatePresence>
                {stage === 'revealed' && (
                  <motion.div
                    key="promise-card-reveal"
                    initial={reducedMotion ? false : { opacity: 0, y: 18, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 580, damping: 28, mass: 0.7 }}
                    className="w-full max-w-xl mx-auto glossy-card rounded-3xl border border-[#171314]/8 p-4 sm:p-5 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-14 h-14 rounded-2xl border border-[#E62E45]/10 flex items-center justify-center shrink-0"
                          style={{ backgroundColor: gift.snapshot.accentColor || '#FFF0F2' }}
                        >
                          <GiftArtworkSvg
                            artworkId={gift.snapshot.artworkId}
                            className="w-11 h-11"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-[#5E5255]">
                            From <span className="font-semibold text-[#171314]">{gift.senderName}</span> to{' '}
                            <span className="font-semibold text-[#171314]">{gift.recipientName}</span>
                          </p>
                          <h2 className="font-display text-lg sm:text-xl font-bold text-[#171314] leading-tight">
                            {gift.snapshot.name}
                          </h2>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[11px] text-[#5E5255]">Gift value</p>
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
                            ? 'bg-[#FFF0F2] border-[#E62E45]/30 text-[#171314]'
                            : claimFeedback.type === 'success'
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                              : 'bg-[#FDF8F3] border-[#171314]/10 text-[#171314]'
                        }`}
                      >
                        <p className="font-medium">{claimFeedback.message}</p>
                      </div>
                    )}

                    {isPreview ? (
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        <span className="text-xs text-[#5E5255]">
                          Preview only · Recipient claims {formatNaira(gift.recipientEarningsNaira)} after checkout
                        </span>
                        <Button variant="dark" size="md" onClick={onExit}>
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
                                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                                <span>Already claimed · Check status</span>
                              </>
                            ) : (
                              <>
                                <Wallet className="w-4 h-4" />
                                <span>Claim gift ({formatNaira(gift.recipientEarningsNaira)})</span>
                              </>
                            )}
                          </Button>

                          {isClaimed && onGoToInbox && (
                            <Button variant="dark" size="lg" onClick={onGoToInbox}>
                              Open Inbox
                            </Button>
                          )}
                        </div>

                        {(claimPanelOpen || (!state.signedInEmail && !isClaimed)) && (
                          <div className="rounded-2xl border border-[#171314]/10 bg-white p-4 space-y-3">
                            <div className="flex items-start gap-2.5">
                              <Lock className="w-4 h-4 text-[#E62E45] shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-semibold text-[#171314]">
                                  Demo recipient verification
                                </p>
                                <p className="text-xs text-[#5E5255]">
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
                                className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl border border-[#171314]/15 bg-[#FDF8F3] text-sm text-[#171314] focus:outline-none focus:ring-2 focus:ring-[#E62E45]/30"
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
                              <span className="text-[#5E5255]">Quick test sign-in:</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setVerifyEmailInput(DEMO_USERS.recipient.email);
                                  handleClaimAttempt(DEMO_USERS.recipient.email);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-[#FFF0F2] text-[#E62E45] font-medium hover:bg-[#FFD6DD] transition-colors"
                              >
                                Sign in as {DEMO_USERS.recipient.email}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setVerifyEmailInput('stranger@example.com');
                                  handleClaimAttempt('stranger@example.com');
                                }}
                                className="px-2.5 py-1 rounded-lg bg-[#FDF8F3] border border-[#171314]/10 text-[#5E5255] font-medium hover:text-[#171314] transition-colors"
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
