import { useMemo, useState } from 'react';
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
  RefreshCw,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import {
  calculateCheckoutSummary,
  ECONOMY_CONFIG,
  formatCoins,
  formatNaira,
  validateGiftAmount,
} from '../config/economy';
import { EMOTE_LABELS } from '../assets/lottie/animations';
import { useShowmelove } from '../context/ShowmeloveContext';
import type { EmoteOption, SentGift } from '../types/showmelove';
import { GiftArtworkSvg } from './GiftArtwork';
import { GiftRevealExperience } from './GiftRevealExperience';
import { VoiceNoteRecorder, type VoiceNoteValue } from './VoiceNoteRecorder';
import {
  Button,
  InputField,
  PriceLabel,
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
  "Dinner's on me this weekend.",
  'Coffee & pastries on your break today.',
  'Weekend cinema tickets + popcorn on me!',
  'Spa treat so you can unwind properly.',
];

const PRESET_AMOUNTS = [1000, 2500, 5000, 10000];

type ComposerStep = 'choose' | 'personalize' | 'review';
type FlutterwaveStatus = 'idle' | 'processing' | 'failed';

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
  const [senderName, setSenderName] = useState(
    state.activeRole !== 'guest' && state.signedInName ? state.signedInName : '',
  );
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [promiseText, setPromiseText] = useState("Dinner's on me this weekend.");
  const [messageText, setMessageText] = useState('');
  const [emote, setEmote] = useState<EmoteOption>('party-confetti');
  const [amountInput, setAmountInput] = useState(String(defaultGift.defaultPriceNaira));
  const [voiceNote, setVoiceNote] = useState<VoiceNoteValue>({ source: 'none' });

  const [formError, setFormError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUnfoldKey, setPreviewUnfoldKey] = useState(0);

  // Stable attempt ID per compose->checkout session prevents duplicate paid gifts
  const [checkoutAttemptId, setCheckoutAttemptId] = useState(
    () => `chk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  );
  const [createdGift, setCreatedGift] = useState<SentGift | null>(null);
  const [paymentSource, setPaymentSource] = useState<'flutterwave' | 'coin_balance'>(
    'flutterwave',
  );
  const [fwStatus, setFwStatus] = useState<FlutterwaveStatus>('idle');
  const [fwError, setFwError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const parsedAmount = Number(amountInput);
  const amountValidation = validateGiftAmount(parsedAmount);
  const summary = useMemo(
    () => calculateCheckoutSummary(amountValidation.valid ? amountValidation.normalized : 0),
    [amountValidation.valid, amountValidation.normalized],
  );

  const isSignedIn = state.activeRole !== 'guest' && Boolean(state.signedInEmail);
  const hasEnoughCoins =
    isSignedIn && currentWallet.loveCoinsBalance >= summary.loveCoinsNeeded;

  const handleSelectGift = (giftId: string) => {
    setSelectedCatalogId(giftId);
    const found = state.catalog.find((g) => g.id === giftId);
    if (found) {
      setAmountInput(String(found.defaultPriceNaira));
    }
    setFormError(null);
  };

  const validateStepOne = (): boolean => {
    if (!selectedItem.available) {
      setFormError('This gift is currently unavailable. Please choose another gift.');
      return false;
    }
    if (!amountValidation.valid) {
      setFormError(amountValidation.error || 'Enter a valid gift amount.');
      return false;
    }
    setFormError(null);
    return true;
  };

  const validateStepTwo = (): boolean => {
    if (!validateStepOne()) return false;
    if (!senderName.trim()) {
      setFormError('Enter your display name so the recipient knows who sent the gift.');
      return false;
    }
    if (!recipientName.trim()) {
      setFormError("Enter the recipient's name for the sealed gift card.");
      return false;
    }
    const email = recipientEmail.trim().toLowerCase();
    if (!email || !email.includes('@') || !email.includes('.')) {
      setFormError('Enter a valid recipient email so they can claim their earnings.');
      return false;
    }
    if (!promiseText.trim()) {
      setFormError('Write a short Digital Promise Card message.');
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
    setPaymentSource(hasEnoughCoins ? 'coin_balance' : 'flutterwave');
    setStep('review');
  };

  const finalizeGiftOrder = (
    mode: 'flutterwave_guest' | 'coin_balance' | 'flutterwave_signed_in',
  ) => {
    if (createdGift) {
      return;
    }

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
        'Demo card authorization declined (simulated failure). No Love Coins were charged and no gift was created.',
      );
    }, 300);
  };

  const previewGift: SentGift = {
    id: 'preview_only',
    checkoutAttemptId: 'preview_only',
    createdAt: new Date().toISOString(),
    senderName: senderName.trim() || 'You',
    recipientName: recipientName.trim() || 'Your friend',
    recipientEmail: recipientEmail.trim() || 'friend@example.com',
    promiseText: promiseText.trim() || "Dinner's on me this weekend.",
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
    { id: 'choose', num: '1', label: 'Choose gift' },
    { id: 'personalize', num: '2', label: 'Make it personal' },
    { id: 'review', num: '3', label: 'Review' },
  ];

  return (
    <div className="max-w-5xl mx-auto pb-16 space-y-6">
      {/* Top Bar: Back + 3-Step Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
          className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white border border-[#171314]/10 text-sm font-medium text-[#171314] inline-flex items-center gap-2 hover:bg-[#FFF0F2] transition-colors whitespace-nowrap shrink-0 self-start"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>
            {createdGift
              ? 'Back to catalog'
              : step === 'review'
                ? 'Edit personal note'
                : step === 'personalize'
                  ? 'Change gift'
                  : 'Back to catalog'}
          </span>
        </button>

        {/* Explicit 3-Step Indicator */}
        <nav
          aria-label="Gift composer steps"
          className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-[#F6EDE4] border border-[#171314]/8 w-full sm:w-auto"
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
                className={`min-h-[38px] px-2.5 sm:px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-white text-[#171314] shadow-sm'
                    : canClick
                      ? 'text-[#5E5255] hover:text-[#171314]'
                      : 'text-[#5E5255]/60 cursor-default'
                }`}
              >
                {s.num}. {s.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main 2-Column Desktop / Single-Column Mobile Composer Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Active Step */}
        <div className="lg:col-span-7 space-y-5">
          {step === 'choose' && (
            <section className="rounded-3xl bg-white border border-[#171314]/8 p-5 sm:p-6 space-y-6 shadow-sm">
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#171314]">
                  Choose a gift
                </h1>
                <p className="text-sm text-[#5E5255] mt-1">
                  Pick a 3D animated gift and set the naira value they can claim.
                </p>
              </div>

              {/* 4-State Tactile Gift Grid */}
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

              {/* Preset Amount Buttons + Custom Input */}
              <div className="space-y-3 pt-2 border-t border-[#171314]/8">
                <div className="flex items-baseline justify-between gap-2">
                  <label
                    htmlFor="custom-amount-input"
                    className="font-display text-base font-semibold text-[#171314]"
                  >
                    Gift amount
                  </label>
                  <span className="text-xs text-[#5E5255] tabular-nums">
                    {formatNaira(ECONOMY_CONFIG.MIN_GIFT_NAIRA)} –{' '}
                    {formatNaira(ECONOMY_CONFIG.MAX_GIFT_NAIRA)}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {PRESET_AMOUNTS.map((preset) => {
                    const isActive = Number(amountInput) === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setAmountInput(String(preset));
                          setFormError(null);
                        }}
                        className={`min-h-[42px] px-2 py-2 rounded-xl border text-xs sm:text-sm font-semibold tabular-nums transition-colors ${
                          isActive
                            ? 'bg-[#FFF0F2] border-[#E62E45] text-[#E62E45]'
                            : 'bg-[#FDF8F3] border-[#171314]/12 text-[#171314] hover:bg-white'
                        }`}
                      >
                        {formatNaira(preset)}
                      </button>
                    );
                  })}
                </div>

                <InputField
                  id="custom-amount-input"
                  label="Or enter custom amount (₦)"
                  type="number"
                  min={ECONOMY_CONFIG.MIN_GIFT_NAIRA}
                  max={ECONOMY_CONFIG.MAX_GIFT_NAIRA}
                  step={100}
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  className="font-semibold tabular-nums"
                  error={!amountValidation.valid ? amountValidation.error : undefined}
                  hint={`Equals ${formatCoins(summary.loveCoinsNeeded)} · Recipient keeps ${formatNaira(summary.recipientEarningsNaira)}`}
                />
              </div>

              {formError && (
                <div
                  role="alert"
                  className="rounded-xl bg-[#FFF0F2] border border-[#E62E45]/25 px-3.5 py-2.5 text-xs font-medium text-[#171314] flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-[#E62E45] shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={handleNextFromChoose}
                data-testid="compose-next-personalize-btn"
              >
                <span>Next: Make it personal</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </section>
          )}

          {step === 'personalize' && (
            <section className="rounded-3xl bg-white border border-[#171314]/8 p-5 sm:p-6 space-y-5 shadow-sm">
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#171314]">
                  Make it personal
                </h1>
                <p className="text-sm text-[#5E5255] mt-1">
                  Write your Digital Promise Card and add a personal voice note.
                </p>
              </div>

              {/* Names & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField
                  id="sender-name-input"
                  label="Your display name"
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="e.g. Tunde"
                />
                <InputField
                  id="recipient-name-input"
                  label="Recipient's name"
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="e.g. Adaeze"
                />
              </div>

              <InputField
                id="recipient-email-input"
                label="Recipient's email (for claiming)"
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="e.g. ada@showmelove.ng"
                hint="Used only to verify the claimer. Never included in public gift links."
              />

              {/* Tactile Promise Card Editor */}
              <div className="promise-paper promise-paper-fold rounded-2xl border border-[#171314]/12 p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between gap-2 pr-6">
                  <label
                    htmlFor="promise-input"
                    className="font-display text-sm font-semibold text-[#171314]"
                  >
                    Digital Promise Card
                  </label>
                  <span className="text-[11px] text-[#5E5255] tabular-nums">
                    {promiseText.length}/140
                  </span>
                </div>

                <textarea
                  id="promise-input"
                  rows={2}
                  maxLength={140}
                  value={promiseText}
                  onChange={(e) => setPromiseText(e.target.value)}
                  placeholder="Dinner's on me this weekend."
                  className="w-full rounded-xl border border-[#171314]/12 bg-white/85 px-3.5 py-2.5 font-display text-base font-semibold text-[#171314] placeholder:text-[#5E5255]/60 focus:outline-none focus:ring-2 focus:ring-[#E62E45]/30 resize-none"
                />

                <div className="flex flex-wrap gap-1.5">
                  {PROMISE_IDEAS.map((idea) => (
                    <button
                      key={idea}
                      type="button"
                      onClick={() => setPromiseText(idea)}
                      className="px-2.5 py-1 rounded-lg bg-[#FFF0F2] text-xs font-medium text-[#171314] hover:bg-[#FFD6DD] transition-colors text-left"
                    >
                      {idea}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="optional-message-input"
                    className="block text-sm font-medium text-[#171314]"
                  >
                    Optional note
                  </label>
                  <textarea
                    id="optional-message-input"
                    rows={2}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Add a warm note (optional)"
                    className="w-full px-3.5 py-2 rounded-xl border border-[#171314]/15 bg-[#FDF8F3] text-sm text-[#171314] focus:outline-none focus:ring-2 focus:ring-[#E62E45]/30"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="emote-select"
                    className="block text-sm font-medium text-[#171314]"
                  >
                    Reveal emote burst
                  </label>
                  <select
                    id="emote-select"
                    value={emote}
                    onChange={(e) => setEmote(e.target.value as EmoteOption)}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[#171314]/15 bg-[#FDF8F3] text-sm text-[#171314] focus:outline-none focus:ring-2 focus:ring-[#E62E45]/30"
                  >
                    {(Object.keys(EMOTE_LABELS) as EmoteOption[]).map((key) => (
                      <option key={key} value={key}>
                        {EMOTE_LABELS[key]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <VoiceNoteRecorder value={voiceNote} onChange={setVoiceNote} />

              {formError && (
                <div
                  role="alert"
                  className="rounded-xl bg-[#FFF0F2] border border-[#E62E45]/25 px-3.5 py-2.5 text-xs font-medium text-[#171314] flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-[#E62E45] shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={handleContinueToReview}
                  data-testid="compose-continue-checkout-btn"
                >
                  <span>Next: Review &amp; pay</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={handleOpenPreview}
                  data-testid="compose-preview-btn"
                  className="lg:hidden"
                >
                  <Eye className="w-4 h-4" />
                  <span>Preview gift</span>
                </Button>
              </div>
            </section>
          )}

          {step === 'review' && !createdGift && (
            <section className="rounded-3xl bg-white border border-[#171314]/8 p-5 sm:p-7 space-y-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-[#E62E45]">
                    Demo checkout · No real payment collected
                  </p>
                  <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#171314] mt-1">
                    Review &amp; send gift
                  </h1>
                </div>
                <ShieldCheck className="w-6 h-6 text-[#171314] shrink-0" />
              </div>

              {/* Compact Order Summary */}
              <div className="rounded-2xl bg-[#FDF8F3] border border-[#171314]/8 p-4 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#5E5255]">Gift</span>
                  <span className="font-semibold text-[#171314] text-right">
                    {selectedItem.name} for {recipientName}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#5E5255]">Amount paid</span>
                  <span className="font-semibold tabular-nums text-[#171314]">
                    {formatNaira(summary.amountPaidNaira)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#5E5255]">Love Coins spent</span>
                  <span className="font-semibold tabular-nums text-[#171314]">
                    {formatCoins(summary.loveCoinsNeeded)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#171314]/8">
                  <span className="font-semibold text-[#171314]">
                    Recipient earnings ({summary.feePercentLabel})
                  </span>
                  <span className="font-display text-lg font-bold tabular-nums text-[#E62E45]">
                    {formatNaira(summary.recipientEarningsNaira)}
                  </span>
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-[#171314]">Payment option</p>

                {isSignedIn ? (
                  <div className="space-y-2.5">
                    <button
                      type="button"
                      disabled={!hasEnoughCoins}
                      onClick={() => setPaymentSource('coin_balance')}
                      className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between gap-3 transition-colors ${
                        paymentSource === 'coin_balance'
                          ? 'border-[#E62E45] bg-[#FFF0F2]'
                          : hasEnoughCoins
                            ? 'border-[#171314]/12 bg-white hover:bg-[#FDF8F3]'
                            : 'border-[#171314]/8 bg-[#F6EDE4]/50 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <div>
                        <p className="text-sm font-semibold text-[#171314]">
                          Spend from Love Coins balance
                        </p>
                        <p className="text-xs text-[#5E5255] tabular-nums">
                          Balance: {formatCoins(currentWallet.loveCoinsBalance)}
                          {!hasEnoughCoins ? ' (insufficient)' : ''}
                        </p>
                      </div>
                      <Coins className="w-5 h-5 text-[#E62E45] shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentSource('flutterwave')}
                      className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between gap-3 transition-colors ${
                        paymentSource === 'flutterwave'
                          ? 'border-[#E62E45] bg-[#FFF0F2]'
                          : 'border-[#171314]/12 bg-white hover:bg-[#FDF8F3]'
                      }`}
                    >
                      <div>
                        <p className="text-sm font-semibold text-[#171314]">
                          Buy &amp; spend exact Love Coins via Flutterwave demo
                        </p>
                        <p className="text-xs text-[#5E5255]">
                          Keeps your existing Love Coin balance untouched
                        </p>
                      </div>
                      <Lock className="w-5 h-5 text-[#171314] shrink-0" />
                    </button>

                    {!hasEnoughCoins && (
                      <button
                        type="button"
                        onClick={onGoToCoins}
                        className="text-xs font-semibold text-[#E62E45] hover:underline"
                      >
                        Need more coins? Top up Love Coins wallet →
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-[#171314]/10 bg-[#FFF0F2]/65 p-4 text-sm text-[#171314]">
                    <p className="font-semibold">Continue as guest</p>
                    <p className="text-xs text-[#5E5255] mt-1 leading-relaxed">
                      No account required. Guest checkout buys{' '}
                      <span className="font-semibold text-[#171314]">
                        {formatCoins(summary.loveCoinsNeeded)}
                      </span>{' '}
                      for {formatNaira(summary.amountPaidNaira)} and sends this gift in one step.
                    </p>
                  </div>
                )}
              </div>

              {/* Stable non-jumping Flutterwave demo checkout container */}
              <div className="rounded-2xl border border-[#171314]/10 bg-[#FDF8F3]/60 p-4 space-y-3 min-h-[176px] flex flex-col justify-between">
                <div className="min-h-[54px] flex items-center">
                  {fwError ? (
                    <div
                      role="alert"
                      className="w-full rounded-xl bg-[#FFF0F2] border border-[#E62E45]/30 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                    >
                      <p className="text-xs font-medium text-[#171314]">{fwError}</p>
                      <button
                        type="button"
                        onClick={handleSimulateSuccess}
                        className="min-h-[36px] px-3 py-1.5 rounded-lg bg-[#171314] text-white text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-[#2c2527] whitespace-nowrap shrink-0 self-start sm:self-center"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Retry</span>
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-[#5E5255]">
                      {fwStatus === 'processing'
                        ? 'Authorizing demo transaction…'
                        : 'Test either a confirmed payment or a simulated card failure without leaving this step.'}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    disabled={fwStatus === 'processing'}
                    onClick={handleSimulateSuccess}
                    data-testid="fw-demo-success-btn"
                  >
                    {fwStatus === 'processing'
                      ? 'Processing demo payment…'
                      : paymentSource === 'coin_balance' && isSignedIn
                        ? `Confirm & spend ${formatCoins(summary.loveCoinsNeeded)}`
                        : `Pay ${formatNaira(summary.amountPaidNaira)} (Flutterwave Demo)`}
                  </Button>

                  <Button
                    variant="ghost"
                    size="md"
                    fullWidth
                    disabled={fwStatus === 'processing'}
                    onClick={handleSimulateFailure}
                    data-testid="fw-demo-fail-btn"
                  >
                    Simulate failed payment
                  </Button>
                </div>
              </div>
            </section>
          )}

          {step === 'review' && createdGift && (
            <section className="rounded-3xl bg-white border border-[#171314]/8 p-5 sm:p-7 space-y-6 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-emerald-700" />
                </div>
                <div>
                  <p className="text-xs font-medium text-emerald-800">
                    Gift ready · Single order created
                  </p>
                  <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#171314] mt-0.5">
                    Share with {createdGift.recipientName}
                  </h1>
                </div>
              </div>

              <div className="rounded-2xl bg-[#FDF8F3] border border-[#171314]/8 p-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[#5E5255]">Gift</span>
                  <span className="font-semibold text-[#171314]">
                    {createdGift.snapshot.name} · {formatNaira(createdGift.amountNaira)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#5E5255]">Love Coins spent</span>
                  <span className="tabular-nums font-medium text-[#171314]">
                    {formatCoins(createdGift.coinsSpent)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#5E5255]">Recipient earnings</span>
                  <span className="tabular-nums font-bold text-[#E62E45]">
                    {formatNaira(createdGift.recipientEarningsNaira)}
                  </span>
                </div>
              </div>

              {/* Public Link Box */}
              <div className="space-y-2">
                <label
                  htmlFor="public-share-link"
                  className="block text-xs font-semibold text-[#5E5255]"
                >
                  Public gift link (no emails or private data)
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    id="public-share-link"
                    type="text"
                    readOnly
                    value={shareUrl}
                    data-testid="share-gift-url-input"
                    className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl border border-[#171314]/15 bg-[#FDF8F3] text-xs font-mono text-[#171314]"
                  />
                  <Button
                    variant="dark"
                    size="md"
                    onClick={handleCopyLink}
                    data-testid="copy-gift-link-btn"
                  >
                    {copiedLink ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    <span>{copiedLink ? 'Copied!' : 'Copy link'}</span>
                  </Button>
                </div>
              </div>

              {/* Share on WhatsApp & Open Recipient View */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => onOpenGiftLink(createdGift.id)}
                  data-testid="open-recipient-view-btn"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open recipient view</span>
                </Button>

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[50px] px-5 py-3 rounded-2xl border border-[#171314]/14 bg-white text-[#171314] font-semibold text-sm inline-flex items-center justify-center gap-2 hover:bg-[#FFF0F2] transition-colors whitespace-nowrap"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                  <span>Share on WhatsApp</span>
                </a>
              </div>

              <div className="rounded-2xl bg-[#FFF0F2] border border-[#E62E45]/15 p-3.5 text-xs text-[#5E5255] leading-relaxed">
                <strong className="text-[#171314]">Demo storage note:</strong> Newly created gift links and recordings live in this browser&apos;s storage. The sample link (<code>/gift/sample</code>) works everywhere.
              </div>

              <div className="pt-2 border-t border-[#171314]/8 flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={handleSendAnother}
                  className="text-sm font-semibold text-[#171314] hover:text-[#E62E45] transition-colors"
                >
                  Send another gift
                </button>
                <button
                  type="button"
                  onClick={onBackHome}
                  className="text-sm font-medium text-[#5E5255] hover:text-[#171314] transition-colors"
                >
                  Return to catalog
                </button>
              </div>
            </section>
          )}
        </div>

        {/* Right Column: Compact Live Preview (Always visible on desktop; subtle summary on mobile) */}
        <aside className="lg:col-span-5 space-y-4 lg:sticky lg:top-20">
          <div className="rounded-3xl bg-white border border-[#171314]/8 p-5 sm:p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 gift-gloss border border-[#171314]/8"
                  style={{ backgroundColor: selectedItem.accentColor || '#FFF0F2' }}
                >
                  <GiftArtworkSvg artworkId={selectedItem.artworkId} className="w-11 h-11" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-[#5E5255]">Live gift preview</p>
                  <h2 className="font-display text-lg font-bold text-[#171314] truncate">
                    {selectedItem.name}
                  </h2>
                </div>
              </div>

              <PriceLabel
                amountNaira={
                  amountValidation.valid
                    ? amountValidation.normalized
                    : selectedItem.defaultPriceNaira
                }
                showCoins
                size="sm"
                accent
              />
            </div>

            {/* Live Digital Promise Paper Card */}
            <div key={previewUnfoldKey}>
              <PromisePaperCard
                promiseText={promiseText || "Dinner's on me this weekend."}
                messageText={messageText || undefined}
                senderName={senderName || 'You'}
                recipientName={recipientName || 'Your friend'}
                amountNaira={
                  amountValidation.valid ? amountValidation.normalized : undefined
                }
                unfoldAnimation={previewUnfoldKey > 0}
              />
            </div>

            <div className="flex items-center justify-between gap-2 text-xs text-[#5E5255]">
              <span>
                {voiceNote.source === 'none'
                  ? 'No voice note attached yet'
                  : `Voice note attached (${voiceNote.durationSec ?? 5}s)`}
              </span>
              <button
                type="button"
                onClick={() => setPreviewUnfoldKey((k) => k + 1)}
                className="inline-flex items-center gap-1 font-semibold text-[#171314] hover:text-[#E62E45]"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Replay card</span>
              </button>
            </div>

            <div className="hidden lg:block pt-1">
              <Button
                variant="secondary"
                size="md"
                fullWidth
                onClick={handleOpenPreview}
                data-testid="desktop-preview-btn"
              >
                <Eye className="w-4 h-4" />
                <span>Preview 3D gift reveal</span>
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
