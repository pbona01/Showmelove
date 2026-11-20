import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Coins,
  Copy,
  ExternalLink,
  Eye,
  Lock,
  MessageCircle,
  Pause,
  Pencil,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  calculateCheckoutSummary,
  ECONOMY_CONFIG,
  formatCoinCount,
  formatCoins,
  formatNaira,
  validateGiftAmount,
} from '../config/economy';
import { getBundledSampleVoiceNoteUrl } from '../audio/sampleVoiceNote';
import { useShowmelove } from '../context/ShowmeloveContext';
import { audioStorage } from '../services/audioStorage';
import { getDefaultSenderName } from '../services/giftRules';
import { isSupabaseConfigured } from '../services/supabaseBridge';
import type { EmoteOption, PromiseCardStyle, SentGift } from '../types/showmelove';
import { GiftArtworkSvg, GoldLoveCoinSvg } from './GiftArtwork';
import { GiftRevealExperience } from './GiftRevealExperience';
import { VoiceNoteRecorder, type VoiceNoteValue } from './VoiceNoteRecorder';
import {
  Button,
  InputField,
  PROMISE_CARD_STYLES,
  PromisePaperCard,
  TactileGiftCard,
} from './ui/DesignSystem';

interface ComposeAndCheckoutScreenProps {
  initialGiftCatalogId?: string;
  onBackHome: () => void;
  onOpenGiftLink: (giftId: string) => void;
  onGoToCoins: () => void;
}

const PROMISE_IDEAS = [
  "Dinner's on me this weekend ✨",
  'Coffee & pastries on your break today.',
  'Weekend cinema tickets + popcorn on me!',
  'Spa treat so you can unwind properly.',
];

const PRESET_AMOUNTS = [
  { value: 100, label: '₦100' },
  { value: 500, label: '₦500' },
  { value: 1000, label: '₦1,000' },
  { value: 5000, label: '₦5,000' },
];

type ComposerStep = 'choose' | 'personalize' | 'review';
type CheckoutProcessingState = 'idle' | 'processing' | 'failed';

export function ComposeAndCheckoutScreen({
  initialGiftCatalogId,
  onBackHome,
  onOpenGiftLink,
  onGoToCoins,
}: ComposeAndCheckoutScreenProps) {
  const { state, currentWallet, submitCheckout } = useShowmelove();

  const availableGifts = state.catalog.filter((g) => g.available);
  const defaultGift =
    availableGifts.find((g) => g.id === initialGiftCatalogId) ??
    availableGifts[0] ??
    state.catalog[0];

  const [selectedCatalogId, setSelectedCatalogId] = useState(defaultGift.id);
  const selectedItem =
    state.catalog.find((g) => g.id === selectedCatalogId) ?? defaultGift;

  const [step, setStep] = useState<ComposerStep>('choose');
  // Never pre-fill senderName with a signed-in recipient's name
  const [senderName, setSenderName] = useState(() =>
    getDefaultSenderName(state.activeRole, state.signedInName),
  );
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [promiseText, setPromiseText] = useState("Dinner's on me this weekend ✨");
  const [promiseCardStyle, setPromiseCardStyle] =
    useState<PromiseCardStyle>('silk-crimson');
  const [messageText, setMessageText] = useState('');
  const [emote] = useState<EmoteOption>('party-confetti');
  const [amountInput, setAmountInput] = useState(String(defaultGift.defaultPriceNaira));
  const [showCustomAmount, setShowCustomAmount] = useState(
    !PRESET_AMOUNTS.some((p) => p.value === defaultGift.defaultPriceNaira),
  );
  const [voiceNote, setVoiceNote] = useState<VoiceNoteValue>({ source: 'none' });

  // Inline voice note playback on Step 3 (Checkout)
  const [checkoutVoicePlaying, setCheckoutVoicePlaying] = useState(false);
  const checkoutAudioRef = useRef<HTMLAudioElement | null>(null);
  const checkoutObjectUrlRef = useRef<string | null>(null);

  const [formError, setFormError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const stepSectionRef = useRef<HTMLElement | null>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const didMountRef = useRef(false);

  const [checkoutAttemptId, setCheckoutAttemptId] = useState(
    () => `chk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  );
  const [createdGift, setCreatedGift] = useState<SentGift | null>(null);
  const [paymentSource, setPaymentSource] = useState<'flutterwave' | 'coin_balance'>(
    'flutterwave',
  );
  const [fwStatus, setFwStatus] = useState<CheckoutProcessingState>('idle');
  const [fwError, setFwError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // If account switches to sender while senderName is blank, sync sender name; never sync from recipient
  useEffect(() => {
    if (state.activeRole === 'sender' && !senderName.trim() && state.signedInName) {
      setSenderName(state.signedInName);
    }
  }, [state.activeRole, state.signedInName, senderName]);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    checkoutAudioRef.current?.pause();
    setCheckoutVoicePlaying(false);
    const rafId = window.requestAnimationFrame(() => {
      stepSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      stepHeadingRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(rafId);
  }, [step, createdGift]);

  useEffect(() => {
    return () => {
      checkoutAudioRef.current?.pause();
      if (checkoutObjectUrlRef.current) {
        URL.revokeObjectURL(checkoutObjectUrlRef.current);
      }
    };
  }, []);

  const parsedAmount = Number(amountInput);
  const amountValidation = validateGiftAmount(parsedAmount);
  const summary = useMemo(
    () => calculateCheckoutSummary(amountValidation.valid ? amountValidation.normalized : 0),
    [amountValidation.valid, amountValidation.normalized],
  );

  const isSignedIn = state.activeRole !== 'guest' && Boolean(state.signedInEmail);
  const hasEnoughCoins =
    isSignedIn && currentWallet.loveCoinsBalance >= summary.loveCoinsNeeded;
  const coinShortfall = Math.max(
    0,
    summary.loveCoinsNeeded - currentWallet.loveCoinsBalance,
  );

  const handleSelectGift = (giftId: string) => {
    setSelectedCatalogId(giftId);
    const found = state.catalog.find((g) => g.id === giftId);
    if (found) {
      setAmountInput(String(found.defaultPriceNaira));
      setShowCustomAmount(!PRESET_AMOUNTS.some((p) => p.value === found.defaultPriceNaira));
    }
    setFormError(null);
  };

  const validateStepOne = (): boolean => {
    if (!selectedItem.available) {
      setFormError('This gift is currently paused. Please choose another gift.');
      return false;
    }
    if (!amountValidation.valid) {
      setFormError(amountValidation.error || 'Enter a gift amount between ₦100 and ₦100,000.');
      return false;
    }
    setFormError(null);
    return true;
  };

  const validateStepTwo = (): boolean => {
    if (!validateStepOne()) return false;
    if (!recipientName.trim()) {
      setFormError("Enter the recipient's name for the Promise Card.");
      return false;
    }
    const email = recipientEmail.trim().toLowerCase();
    if (!email || !email.includes('@') || !email.includes('.')) {
      setFormError('Enter a valid recipient email so they can claim their rewards.');
      return false;
    }
    if (!promiseText.trim()) {
      setFormError('Write a short Digital Promise Card message.');
      return false;
    }
    if (!senderName.trim()) {
      setFormError('Enter your sender name so the Promise Card is signed by you.');
      return false;
    }
    setFormError(null);
    return true;
  };

  const handleNextFromChoose = () => {
    if (!validateStepOne()) return;
    setStep('personalize');
  };

  const handleOpenPreview = () => {
    if (!validateStepTwo()) return;
    setPreviewOpen(true);
  };

  const handleContinueToReview = () => {
    if (!validateStepTwo()) return;
    setFwStatus('idle');
    setFwError(null);
    setPaymentSource('flutterwave');
    setStep('review');
  };

  const handleToggleCheckoutVoice = async () => {
    if (voiceNote.source === 'none') return;
    if (checkoutVoicePlaying && checkoutAudioRef.current) {
      checkoutAudioRef.current.pause();
      setCheckoutVoicePlaying(false);
      return;
    }

    let src: string | null = null;
    if (voiceNote.source === 'sample') {
      src = getBundledSampleVoiceNoteUrl();
    } else if (voiceNote.source === 'recorded' && voiceNote.blobKey) {
      if (checkoutObjectUrlRef.current) {
        src = checkoutObjectUrlRef.current;
      } else {
        const blob = await audioStorage.getVoiceNote(voiceNote.blobKey).catch(() => null);
        if (blob) {
          checkoutObjectUrlRef.current = URL.createObjectURL(blob);
          src = checkoutObjectUrlRef.current;
        } else {
          src = getBundledSampleVoiceNoteUrl();
        }
      }
    }
    if (!src) return;

    if (!checkoutAudioRef.current || checkoutAudioRef.current.src !== src) {
      checkoutAudioRef.current?.pause();
      checkoutAudioRef.current = new Audio(src);
    }
    const audio = checkoutAudioRef.current;
    audio.onended = () => setCheckoutVoicePlaying(false);
    audio.onerror = () => setCheckoutVoicePlaying(false);
    audio.currentTime = 0;
    audio
      .play()
      .then(() => setCheckoutVoicePlaying(true))
      .catch(() => setCheckoutVoicePlaying(false));
  };

  const finalizeGiftOrder = (
    mode: 'flutterwave_guest' | 'coin_balance' | 'flutterwave_signed_in',
  ) => {
    if (createdGift) return;

    const giftId = `sml_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const res = submitCheckout({
      checkoutAttemptId,
      giftId,
      createdAt: new Date().toISOString(),
      catalogItem: selectedItem,
      senderName: senderName.trim(),
      senderEmail: isSignedIn ? state.signedInEmail : undefined,
      recipientName: recipientName.trim(),
      recipientEmail: recipientEmail.trim().toLowerCase(),
      promiseText: promiseText.trim(),
      promiseCardStyle,
      messageText: messageText.trim() || undefined,
      emote,
      amountNaira: amountValidation.normalized,
      hasVoiceNote: voiceNote.source !== 'none',
      voiceNoteSource: voiceNote.source,
      voiceNoteBlobKey: voiceNote.blobKey,
      voiceNoteDurationSec: voiceNote.durationSec,
      paymentMode: mode,
    });

    if (!res.ok || !res.gift) {
      setFwStatus('failed');
      setFwError(res.error || 'Could not complete checkout.');
      return;
    }

    setCreatedGift(res.gift);
    setFwStatus('idle');
  };

  const handleSimulateSuccess = () => {
    if (fwStatus === 'processing') return;
    setFwError(null);
    setFwStatus('processing');

    window.setTimeout(() => {
      const mode =
        paymentSource === 'coin_balance' && isSignedIn
          ? 'coin_balance'
          : isSignedIn
            ? 'flutterwave_signed_in'
            : 'flutterwave_guest';
      finalizeGiftOrder(mode);
    }, 350);
  };

  const handleSimulateFailure = () => {
    if (fwStatus === 'processing') return;
    setFwStatus('processing');
    window.setTimeout(() => {
      setFwStatus('failed');
      setFwError(
        'Flutterwave demo authorization declined. No Love Coins were spent and no gift was created.',
      );
    }, 300);
  };

  const previewGift: SentGift = {
    id: 'preview_only',
    checkoutAttemptId: 'preview_only',
    createdAt: new Date().toISOString(),
    senderName: senderName.trim() || 'Bene',
    recipientName: recipientName.trim() || 'Adaeze',
    recipientEmail: recipientEmail.trim() || 'ada@showmelove.ng',
    promiseText: promiseText.trim() || "Dinner's on me this weekend ✨",
    promiseCardStyle,
    messageText: messageText.trim() || undefined,
    emote,
    amountNaira: amountValidation.valid
      ? amountValidation.normalized
      : selectedItem.defaultPriceNaira,
    coinsSpent: summary.loveCoinsNeeded,
    platformFeeNaira: summary.platformFeeNaira,
    recipientEarningsNaira: summary.recipientEarningsNaira,
    hasVoiceNote: voiceNote.source !== 'none',
    voiceNoteSource: voiceNote.source,
    voiceNoteBlobKey: voiceNote.blobKey,
    voiceNoteDurationSec: voiceNote.durationSec,
    snapshot: {
      catalogId: selectedItem.id,
      artworkId: selectedItem.artworkId,
      name: selectedItem.name,
      priceNaira: amountValidation.valid
        ? amountValidation.normalized
        : selectedItem.defaultPriceNaira,
      animationType: selectedItem.animationType,
      themeColor: selectedItem.themeColor,
      accentColor: selectedItem.accentColor,
    },
  };

  if (previewOpen) {
    return (
      <GiftRevealExperience
        gift={previewGift}
        isPreview
        onExit={() => setPreviewOpen(false)}
      />
    );
  }

  const shareUrl =
    createdGift && typeof window !== 'undefined'
      ? `${window.location.origin}/gift/${createdGift.id}`
      : '';

  const whatsappUrl = createdGift
    ? `https://wa.me/?text=${encodeURIComponent(
        `Hi ${createdGift.recipientName}, I sent you a ${createdGift.snapshot.name} on Showmelove! Open your gift here: ${shareUrl}`,
      )}`
    : '';

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2200);
    } catch {
      setCopiedLink(false);
    }
  };

  const handleSendAnother = () => {
    setCreatedGift(null);
    setCheckoutAttemptId(`chk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
    setStep('choose');
    setFwStatus('idle');
    setFwError(null);
  };

  const stepMeta: Array<{ id: ComposerStep; num: string; label: string }> = [
    { id: 'choose', num: '1', label: 'Gift' },
    { id: 'personalize', num: '2', label: 'Promise Card' },
    { id: 'review', num: '3', label: 'Checkout' },
  ];

  // Promise Card signature is ALWAYS the sender, never the recipient
  const displayPreviewRecipient = recipientName.trim() || 'Adaeze';
  const displayPreviewSender = senderName.trim() || 'Bene';

  return (
    <div className="max-w-xl mx-auto pb-10 space-y-5">
      {/* Top Bar: Back + Clean 3-Step Progress Indicator */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            if (createdGift) {
              onBackHome();
            } else if (step === 'review') {
              setStep('personalize');
            } else if (step === 'personalize') {
              setStep('choose');
            } else {
              onBackHome();
            }
          }}
          aria-label="Go back"
          className="min-h-[42px] px-3.5 py-2 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-sm font-semibold text-[var(--text-primary)] inline-flex items-center gap-1.5 hover:bg-[var(--bg-raised)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">
            {createdGift
              ? 'Home'
              : step === 'review'
                ? 'Promise Card'
                : step === 'personalize'
                  ? 'Gift'
                  : 'Back'}
          </span>
        </button>

        {/* Focused 3-Step Progress Bar */}
        <nav
          aria-label="Gift composer steps"
          className="flex-1 grid grid-cols-3 gap-1 p-1 rounded-2xl bg-[var(--bg-raised)] border border-[var(--border-subtle)]"
        >
          {stepMeta.map((s) => {
            const active = step === s.id;
            const canClick =
              !createdGift &&
              (s.id === 'choose' ||
                (s.id === 'personalize' && step !== 'choose') ||
                (s.id === 'review' && step === 'review'));
            return (
              <button
                key={s.id}
                type="button"
                disabled={!canClick}
                onClick={() => {
                  if (canClick) setStep(s.id);
                }}
                className={`min-h-[36px] px-2 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold transition-all whitespace-nowrap ${
                  active
                    ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm ring-1 ring-[#FF2385]/20 dark:ring-[#FF2385]/35'
                    : canClick
                      ? 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer'
                      : 'text-[var(--text-secondary)]/50 cursor-default'
                }`}
              >
                {s.num}. {s.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* STEP 1: Select Gift + Gift Value */}
      {step === 'choose' && (
        <motion.section
          key="step-choose"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          ref={stepSectionRef}
          className="scroll-mt-20 space-y-5"
          data-testid="send-step-1"
        >
          <div className="apple-card rounded-[28px] p-5 sm:p-6 space-y-5">
            <div>
              <h1
                ref={stepHeadingRef}
                tabIndex={-1}
                className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] focus:outline-none"
              >
                Choose a gift
              </h1>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
                Pick an animated gift and set its real Naira value.
              </p>
            </div>

            {/* 2x2 Glossy Transparent Asset Grid */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {state.catalog.map((item) => (
                <TactileGiftCard
                  key={item.id}
                  item={item}
                  compact
                  selected={item.id === selectedItem.id}
                  showCoins={true}
                  onSelect={() => handleSelectGift(item.id)}
                />
              ))}
            </div>

            {/* Gift Value Chips + Validated Custom Input */}
            <div className="space-y-3 pt-1">
              <div className="flex items-baseline justify-between gap-2">
                <label
                  htmlFor="custom-amount-input"
                  className="text-sm sm:text-base font-bold text-[var(--text-primary)]"
                >
                  Gift Value
                </label>
                <span className="text-xs text-[var(--text-secondary)] tabular-nums">
                  {formatNaira(ECONOMY_CONFIG.MIN_GIFT_NAIRA)} –{' '}
                  {formatNaira(ECONOMY_CONFIG.MAX_GIFT_NAIRA)}
                </span>
              </div>

              <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                {PRESET_AMOUNTS.map((preset) => {
                  const isActive =
                    !showCustomAmount && Number(amountInput) === preset.value;
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => {
                        setShowCustomAmount(false);
                        setAmountInput(String(preset.value));
                        setFormError(null);
                      }}
                      className={`min-h-[42px] px-1 py-2 rounded-full border text-[11px] sm:text-xs font-bold tabular-nums transition-all cursor-pointer ${
                        isActive
                          ? 'cta-pink-surface border-transparent text-white shadow-[0_8px_18px_-6px_rgba(255,35,133,0.6)]'
                          : 'bg-[var(--bg-raised)] border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[#7C3AED]/45'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setShowCustomAmount(true)}
                  data-testid="amount-custom-btn"
                  className={`min-h-[42px] px-1 py-2 rounded-full border text-[11px] sm:text-xs font-semibold transition-all cursor-pointer ${
                    showCustomAmount
                      ? 'cta-pink-surface border-transparent text-white shadow-[0_8px_18px_-6px_rgba(255,35,133,0.6)]'
                      : 'bg-[var(--bg-raised)] border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[#7C3AED]/45'
                  }`}
                >
                  Custom
                </button>
              </div>

              {showCustomAmount && (
                <InputField
                  id="custom-amount-input"
                  label="Custom amount (₦)"
                  type="number"
                  min={ECONOMY_CONFIG.MIN_GIFT_NAIRA}
                  max={ECONOMY_CONFIG.MAX_GIFT_NAIRA}
                  step={100}
                  value={amountInput}
                  onChange={(e) => {
                    setAmountInput(e.target.value);
                    setFormError(null);
                  }}
                  className="font-bold tabular-nums"
                  error={!amountValidation.valid ? amountValidation.error : undefined}
                />
              )}
            </div>

            {formError && (
              <div
                role="alert"
                className="rounded-2xl bg-[#FFEAF2] dark:bg-[#2F1426] border border-[#E61472]/30 dark:border-[#FF2385]/35 px-3.5 py-2.5 text-xs font-medium text-[var(--text-primary)] flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 text-[#E61472] dark:text-[#FF2385] shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}
          </div>

          {/* Compact Sticky Recipient Earnings Card + Primary CTA */}
          <div className="sticky bottom-[74px] md:bottom-4 z-20 apple-card rounded-[24px] p-4 space-y-3 backdrop-blur-xl">
            <div className="rewards-glow-surface rounded-2xl border border-[#7C3AED]/25 dark:border-[#A855F7]/30 px-3.5 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <GoldLoveCoinSvg className="w-9 h-9 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-[#5B21B6] dark:text-[#E9D5FF] tabular-nums">
                    {selectedItem.name} · {formatCoins(summary.loveCoinsNeeded)}
                  </p>
                  <p
                    className="text-sm sm:text-base font-bold tabular-nums text-[#1B1622] dark:text-white"
                    data-testid="step1-recipient-receives"
                  >
                    Recipient receives {formatNaira(summary.recipientEarningsNaira)}
                  </p>
                </div>
              </div>
              <Sparkles className="w-4 h-4 text-[#7C3AED] dark:text-[#C084FC] shrink-0" />
            </div>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleNextFromChoose}
              data-testid="compose-next-personalize-btn"
            >
              <Pencil className="w-4 h-4" />
              <span>Make it personal</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </motion.section>
      )}

      {/* STEP 2: Digital Promise Card + Voice Note */}
      {step === 'personalize' && (
        <motion.section
          key="step-personalize"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          ref={stepSectionRef}
          className="scroll-mt-20 apple-card rounded-[28px] p-5 sm:p-6 space-y-5"
          data-testid="send-step-2"
        >
          <div>
            <h1
              ref={stepHeadingRef}
              tabIndex={-1}
              className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] focus:outline-none"
            >
              Make it personal
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
              Design your Digital Promise Card and add an optional voice note.
            </p>
          </div>

          {/* Full-Width Live Promise Card Preview — Signature is ALWAYS Sender */}
          <PromisePaperCard
            promiseText={promiseText}
            messageText={messageText}
            senderName={displayPreviewSender}
            recipientName={displayPreviewRecipient}
            amountNaira={
              amountValidation.valid
                ? amountValidation.normalized
                : selectedItem.defaultPriceNaira
            }
            cardStyle={promiseCardStyle}
          />

          {/* 5 Selectable Card Style Swatches */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-[var(--text-primary)]">Card style</p>
              <span className="text-xs text-[var(--text-secondary)]">
                {PROMISE_CARD_STYLES.find((s) => s.id === promiseCardStyle)?.label}
              </span>
            </div>
            <div
              className="grid grid-cols-5 gap-2.5"
              role="radiogroup"
              aria-label="Promise card style"
            >
              {PROMISE_CARD_STYLES.map((style) => {
                const active = promiseCardStyle === style.id;
                return (
                  <button
                    key={style.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    aria-label={style.label}
                    data-testid={`card-style-${style.id}`}
                    onClick={() => setPromiseCardStyle(style.id)}
                    className={`h-13 sm:h-14 rounded-2xl ${style.swatchClass} transition-all cursor-pointer relative ${
                      active
                        ? 'ring-2 ring-[#E61472] dark:ring-[#FF2385] ring-offset-2 ring-offset-[var(--bg-card)] scale-[1.03]'
                        : 'border border-[var(--border-subtle)] opacity-85 hover:opacity-100'
                    }`}
                  >
                    {active && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="w-5 h-5 rounded-full bg-black/45 text-white flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recipient & Sender Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField
              id="recipient-name-input"
              label="Recipient name"
              type="text"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="e.g. Adaeze"
            />
            <InputField
              id="sender-name-input"
              label="From (Your name)"
              type="text"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="e.g. Bene"
            />
          </div>

          <InputField
            id="recipient-email-input"
            label="Recipient email (for claiming rewards)"
            type="email"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            placeholder="e.g. ada@showmelove.ng"
            hint="Used only to verify who claims the gift. Hidden from public links."
          />

          {/* Message Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="promise-input"
                className="text-sm font-semibold text-[var(--text-primary)]"
              >
                Promise message
              </label>
              <span className="text-xs text-[var(--text-secondary)] tabular-nums">
                {promiseText.length}/140
              </span>
            </div>
            <textarea
              id="promise-input"
              rows={2}
              maxLength={140}
              value={promiseText}
              onChange={(e) => setPromiseText(e.target.value)}
              placeholder="Dinner's on me this weekend ✨"
              className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-raised)] px-4 py-3 text-base font-semibold text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/65 focus:outline-none focus:ring-2 focus:ring-[#E61472]/30 dark:focus:ring-[#FF2385]/40 resize-none"
            />
            <div className="flex flex-wrap gap-1.5">
              {PROMISE_IDEAS.map((idea) => (
                <button
                  key={idea}
                  type="button"
                  onClick={() => setPromiseText(idea)}
                  className="px-2.5 py-1 rounded-xl bg-[var(--bg-raised)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] hover:border-[#7C3AED]/45 transition-colors text-left cursor-pointer"
                >
                  {idea}
                </button>
              ))}
            </div>
          </div>

          {/* Optional extra note */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="optional-message-input"
                className="block text-sm font-medium text-[var(--text-primary)]"
              >
                Personal note (optional)
              </label>
              <span className="text-[11px] tabular-nums text-[var(--text-secondary)]">
                {messageText.length}/160
              </span>
            </div>
            <textarea
              id="optional-message-input"
              rows={2}
              maxLength={160}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Add an extra line beneath your promise..."
              className="w-full px-3.5 py-2.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-raised)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#E61472]/30 dark:focus:ring-[#FF2385]/40 resize-none"
            />
          </div>

          {/* Voice Note Recorder / Player (max 30 seconds) */}
          <VoiceNoteRecorder value={voiceNote} onChange={setVoiceNote} />

          {formError && (
            <div
              role="alert"
              className="rounded-2xl bg-[#FFEAF2] dark:bg-[#2F1426] border border-[#E61472]/30 dark:border-[#FF2385]/35 px-3.5 py-2.5 text-xs font-medium text-[var(--text-primary)] flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 text-[#E61472] dark:text-[#FF2385] shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <Button
              variant="secondary"
              size="lg"
              onClick={handleOpenPreview}
              data-testid="compose-preview-btn"
            >
              <Eye className="w-4 h-4" />
              <span>Preview</span>
            </Button>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleContinueToReview}
              data-testid="compose-continue-checkout-btn"
            >
              <span>Review gift</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </motion.section>
      )}

      {/* STEP 3: Checkout */}
      {step === 'review' && !createdGift && (
        <motion.section
          key="step-review"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          ref={stepSectionRef}
          className="scroll-mt-20 apple-card rounded-[28px] p-5 sm:p-6 space-y-5"
          data-testid="send-step-3"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-[#E61472] dark:text-[#FF4F9A]">
                Simulated checkout · No real charge
              </p>
              <h1
                ref={stepHeadingRef}
                tabIndex={-1}
                className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mt-0.5 focus:outline-none"
              >
                Review &amp; pay
              </h1>
            </div>
            <ShieldCheck className="w-6 h-6 text-[#087F56] dark:text-[#24C888] shrink-0" />
          </div>

          {/* Gift & Fee Breakdown */}
          <div className="rounded-2xl bg-[var(--bg-raised)] border border-[var(--border-subtle)] p-4 space-y-3 text-sm">
            <div className="flex items-center gap-3 pb-3 border-b border-[var(--border-subtle)]">
              <GiftArtworkSvg
                artworkId={selectedItem.artworkId}
                className="w-14 h-14 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-[var(--text-primary)] truncate">
                  {selectedItem.name}
                </p>
                <p className="text-xs text-[var(--text-secondary)] truncate">
                  For {recipientName} · From {senderName}
                </p>
                <p className="text-[11px] text-[var(--text-secondary)] truncate">
                  {recipientEmail}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold tabular-nums text-[var(--text-primary)]">
                  {formatNaira(summary.amountPaidNaira)}
                </p>
                <p className="text-[11px] tabular-nums text-[var(--text-secondary)]">
                  {formatCoinCount(summary.loveCoinsNeeded)}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-[var(--text-secondary)]">Gift amount</span>
              <span className="font-semibold tabular-nums text-[var(--text-primary)]">
                {formatNaira(summary.amountPaidNaira)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[var(--text-secondary)]">
                Platform fee ({summary.platformFeePercent}%)
              </span>
              <span className="font-medium tabular-nums text-[var(--text-secondary)]">
                -{formatNaira(summary.platformFeeNaira)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--border-subtle)]">
              <span className="font-semibold text-[var(--text-primary)]">
                Recipient earnings ({summary.creatorSharePercent}%)
              </span>
              <span className="text-lg font-bold tabular-nums text-[#087F56] dark:text-[#24C888]">
                {formatNaira(summary.recipientEarningsNaira)}
              </span>
            </div>
          </div>

          {/* Promise Card Preview + Voice Note Playback */}
          <div className="space-y-3">
            <PromisePaperCard
              promiseText={promiseText}
              messageText={messageText}
              senderName={senderName.trim()}
              recipientName={recipientName.trim()}
              cardStyle={promiseCardStyle}
            />

            {voiceNote.source !== 'none' && (
              <div
                className="rounded-2xl bg-[var(--bg-raised)] border border-[var(--border-subtle)] px-3.5 py-3 flex items-center justify-between gap-3"
                data-testid="checkout-voice-player"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => void handleToggleCheckoutVoice()}
                    aria-label={
                      checkoutVoicePlaying ? 'Pause voice note' : 'Play voice note'
                    }
                    className="w-10 h-10 rounded-full cta-pink-surface text-white flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    {checkoutVoicePlaying ? (
                      <Pause className="w-4 h-4 fill-current" />
                    ) : (
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    )}
                  </button>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                      Voice note attached
                    </p>
                    <p className="text-[11px] tabular-nums text-[var(--text-secondary)]">
                      0:{String(voiceNote.durationSec ?? 5).padStart(2, '0')} · Tap to preview
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-[#7C3AED] dark:text-[#C084FC] shrink-0">
                  Included
                </span>
              </div>
            )}
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-2.5">
            <p className="text-sm font-bold text-[var(--text-primary)]">
              Payment method
            </p>

            {isSignedIn ? (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setPaymentSource('flutterwave')}
                  className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                    paymentSource === 'flutterwave'
                      ? 'border-[#E61472] dark:border-[#FF2385] bg-[#FFF0F6] dark:bg-[#2B1426]'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-raised)] hover:border-[#7C3AED]/45'
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      Flutterwave ({formatNaira(summary.amountPaidNaira)})
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Instant simulated card or bank payment
                    </p>
                  </div>
                  <Lock className="w-4 h-4 text-[var(--text-primary)] shrink-0" />
                </button>

                <button
                  type="button"
                  disabled={!hasEnoughCoins}
                  onClick={() => setPaymentSource('coin_balance')}
                  className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                    paymentSource === 'coin_balance'
                      ? 'border-[#E61472] dark:border-[#FF2385] bg-[#FFF0F6] dark:bg-[#2B1426]'
                      : hasEnoughCoins
                        ? 'border-[var(--border-subtle)] bg-[var(--bg-raised)] hover:border-[#7C3AED]/45'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-raised)] opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      Love Coins balance
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] tabular-nums">
                      Available: {formatCoins(currentWallet.loveCoinsBalance)}
                      {!hasEnoughCoins
                        ? ` · Need ${formatCoinCount(coinShortfall)} more`
                        : ''}
                    </p>
                  </div>
                  <Coins className="w-4 h-4 text-[#E61472] dark:text-[#FF4F9A] shrink-0" />
                </button>

                {!hasEnoughCoins && (
                  <button
                    type="button"
                    onClick={onGoToCoins}
                    className="text-xs font-semibold text-[#E61472] dark:text-[#FF4F9A] hover:underline cursor-pointer"
                  >
                    Buy more Love Coins →
                  </button>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-raised)] p-3.5 text-xs text-[var(--text-secondary)] leading-relaxed">
                <strong className="text-[var(--text-primary)]">
                  Guest Flutterwave Checkout:
                </strong>{' '}
                No account required. Generates your shareable reveal link immediately.
              </div>
            )}
          </div>

          {/* Payment Processing & Actions */}
          <div className="space-y-3 pt-1">
            {fwError && (
              <div
                role="alert"
                className="w-full rounded-2xl bg-[#FFEAF2] dark:bg-[#2F1426] border border-[#E61472]/35 dark:border-[#FF2385]/40 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
              >
                <p className="text-xs font-medium text-[var(--text-primary)]">{fwError}</p>
                <Button variant="dark" size="sm" onClick={handleSimulateSuccess}>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </Button>
              </div>
            )}

            <Button
              variant="primary"
              size="lg"
              fullWidth
              disabled={fwStatus === 'processing'}
              onClick={handleSimulateSuccess}
              data-testid="fw-demo-success-btn"
            >
              {fwStatus === 'processing'
                ? 'Processing payment…'
                : paymentSource === 'coin_balance' && isSignedIn
                  ? `Spend ${formatCoins(summary.loveCoinsNeeded)}`
                  : `Pay with Flutterwave · ${formatNaira(summary.amountPaidNaira)}`}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              fullWidth
              disabled={fwStatus === 'processing'}
              onClick={handleSimulateFailure}
              data-testid="fw-demo-fail-btn"
            >
              Simulate failed payment
            </Button>
          </div>
        </motion.section>
      )}

      {/* STEP 3 SUCCESS: Gift Link Ready */}
      {step === 'review' && createdGift && (
        <motion.section
          key="step-created"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          ref={stepSectionRef}
          className="scroll-mt-20 apple-card rounded-[28px] p-5 sm:p-7 space-y-6"
        >
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#E6F6EF] dark:bg-[#0D3326] border border-[#087F56]/25 dark:border-[#24C888]/30 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6 text-[#087F56] dark:text-[#24C888]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#087F56] dark:text-[#24C888]">
                Gift link created · Payment verified
              </p>
              <h1
                ref={stepHeadingRef}
                tabIndex={-1}
                className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mt-0.5 focus:outline-none"
              >
                Share with {createdGift.recipientName}
              </h1>
            </div>
          </div>

          <div className="rounded-2xl bg-[var(--bg-raised)] border border-[var(--border-subtle)] p-4 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-secondary)]">Gift</span>
              <span className="font-semibold text-[var(--text-primary)]">
                {createdGift.snapshot.name} · {formatNaira(createdGift.amountNaira)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-secondary)]">From</span>
              <span className="font-medium text-[var(--text-primary)]">
                {createdGift.senderName}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-secondary)]">Recipient rewards</span>
              <span className="tabular-nums font-bold text-[#087F56] dark:text-[#24C888]">
                {formatNaira(createdGift.recipientEarningsNaira)}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="public-share-link"
              className="block text-xs font-semibold text-[var(--text-secondary)]"
            >
              Shareable gift link (private email omitted)
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="public-share-link"
                type="text"
                readOnly
                value={shareUrl}
                data-testid="share-gift-url-input"
                className="flex-1 min-h-[44px] px-3.5 py-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-raised)] text-xs font-mono text-[var(--text-primary)]"
              />
              <Button
                variant="dark"
                size="md"
                onClick={handleCopyLink}
                data-testid="copy-gift-link-btn"
              >
                {copiedLink ? (
                  <Check className="w-4 h-4 text-[#24C888]" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                <span>{copiedLink ? 'Copied!' : 'Copy link'}</span>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              variant="primary"
              size="lg"
              onClick={() => onOpenGiftLink(createdGift.id)}
              data-testid="open-recipient-view-btn"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open gift reveal</span>
            </Button>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[52px] px-5 py-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-raised)] text-[var(--text-primary)] font-semibold text-sm inline-flex items-center justify-center gap-2 hover:border-[#24C888]/50 transition-colors whitespace-nowrap"
            >
              <MessageCircle className="w-4 h-4 text-[#087F56] dark:text-[#24C888]" />
              <span>Share on WhatsApp</span>
            </a>
          </div>

          <div className="rounded-2xl bg-[var(--bg-raised)] border border-[var(--border-subtle)] p-3.5 text-xs text-[var(--text-secondary)] leading-relaxed">
            <strong className="text-[var(--text-primary)]">
              {isSupabaseConfigured ? 'Cross-device sync:' : 'Local demo storage:'}
            </strong>{' '}
            {isSupabaseConfigured
              ? 'Gift metadata synced for cross-device link opening.'
              : 'Created links and voice notes are saved in this browser and tracked under Inbox → Sent.'}
          </div>

          <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={handleSendAnother}
              className="text-sm font-semibold text-[var(--text-primary)] hover:text-[#E61472] dark:hover:text-[#FF4F9A] transition-colors cursor-pointer"
            >
              Send another gift
            </button>
            <button
              type="button"
              onClick={onBackHome}
              className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              Back to Home
            </button>
          </div>
        </motion.section>
      )}
    </div>
  );
}
