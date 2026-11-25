import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Heart, Sparkles, RefreshCw, Send, AlertCircle, Plus, Check } from 'lucide-react';
import { useShowmelove } from '../context/ShowmeloveContext';
import { ShowmeloveBrandIcon } from './GiftArtwork';
import { VoiceNoteRecorder, type VoiceNoteValue } from './VoiceNoteRecorder';
import { Button } from './ui/DesignSystem';
import { formatCoins, formatNaira } from '../config/economy';
import { getUserPromiseCard, type PromiseCardItem, type UserPromiseCard } from '../services/promiseCardService';
import { lookupVerifiedUser } from '../services/userService';

interface PromiseCardGivingScreenProps {
  recipientHandle: string;
  onBack: () => void;
  onGoToCoins: () => void;
}

export function PromiseCardGivingScreen({
  recipientHandle,
  onBack,
  onGoToCoins,
}: PromiseCardGivingScreenProps) {
  const { state, currentWallet, submitCheckout } = useShowmelove();
  const isSignedIn = state.activeRole !== 'guest' && Boolean(state.signedInEmail);

  const cleanHandle = recipientHandle.replace(/^@/, '').toLowerCase().trim();
  const [promiseCard, setPromiseCard] = useState<UserPromiseCard | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [senderName, setSenderName] = useState(() => (isSignedIn ? state.signedInName : ''));
  const [guestEmail, setGuestEmail] = useState('');
  const [voiceNote, setVoiceNote] = useState<VoiceNoteValue>({ source: 'none' });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fulfilledItem, setFulfilledItem] = useState<PromiseCardItem | null>(null);

  // Load the recipient's Promise Card
  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    const searchParams =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search)
        : null;
    const cardParam =
      searchParams?.get('card') ||
      searchParams?.get('items') ||
      undefined;

    void getUserPromiseCard(cleanHandle, cardParam).then((card) => {
      if (!isCancelled) {
        setPromiseCard(card);
        if (card.items.length > 0) {
          setSelectedItemId(card.items[0].id);
        }
        setIsLoading(false);
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [cleanHandle]);

  const selectedItem = promiseCard?.items.find((item) => item.id === selectedItemId);
  const selectedCoins = selectedItem?.coins ?? 1000;
  const hasEnoughCoins = isSignedIn && currentWallet.loveCoinsBalance >= selectedCoins;

  const handleFulfillPromise = async () => {
    if (!selectedItem || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);

    const verified = lookupVerifiedUser(cleanHandle);
    const effectiveRecipientEmail = verified?.email || `${cleanHandle}@showmelove.fun`;

    const giftId = `sml_promise_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const checkoutAttemptId = `chk_prom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    // 1. If signed in, spend Love Coins balance
    if (isSignedIn) {
      if (!hasEnoughCoins) {
        setIsSubmitting(false);
        setSubmitError(`You need ${selectedCoins.toLocaleString()} Love Coins to sponsor this promise.`);
        return;
      }

      const res = submitCheckout({
        checkoutAttemptId,
        giftId,
        createdAt: new Date().toISOString(),
        catalogItem: {
          id: 'gift_promise_fulfillment',
          artworkId: 'little-heart',
          name: selectedItem.title,
          tagline: `Promise fulfilled for @${cleanHandle}`,
          collectionId: 'evergreen',
          defaultPriceNaira: selectedCoins,
          animationType: 'bloom',
          themeColor: '#FF2D78',
          accentColor: '#3C1630',
          available: true,
        },
        senderName: senderName.trim() || 'A Friend',
        senderEmail: state.signedInEmail,
        recipientName: `@${cleanHandle}`,
        recipientEmail: effectiveRecipientEmail,
        promiseText: selectedItem.title,
        messageText: messageText.trim() || undefined,
        emote: 'party-confetti',
        amountNaira: selectedCoins,
        hasVoiceNote: voiceNote.source !== 'none',
        voiceNoteSource: voiceNote.source,
        voiceNoteBlobKey: voiceNote.blobKey,
        voiceNoteDurationSec: voiceNote.durationSec,
        paymentMode: 'coin_balance',
      });

      if (!res.ok) {
        setIsSubmitting(false);
        setSubmitError(res.error || 'Could not fulfill promise with coins.');
        return;
      }

      setFulfilledItem(selectedItem);
      setIsSubmitting(false);
      return;
    }

    // 2. If guest, pay via Paystack checkout
    const giftPayload = {
      giftId,
      checkoutAttemptId,
      recipientUsername: cleanHandle,
      recipientEmail: effectiveRecipientEmail,
      recipientName: `@${cleanHandle}`,
      senderName: senderName.trim() || 'A Friend',
      senderEmail: guestEmail.trim() || undefined,
      promiseText: selectedItem.title,
      messageText: messageText.trim() || undefined,
      emote: 'party-confetti',
      amountNaira: selectedCoins,
      hasVoiceNote: voiceNote.source !== 'none',
      voiceNoteSource: voiceNote.source,
      voiceNoteBlobKey: voiceNote.blobKey,
      voiceNoteDurationSec: voiceNote.durationSec,
      snapshot: {
        id: 'gift_promise_fulfillment',
        catalogId: 'gift_promise_fulfillment',
        artworkId: 'little-heart',
        name: selectedItem.title,
        priceNaira: selectedCoins,
        animationType: 'bloom',
        themeColor: '#FF2D78',
        accentColor: '#3C1630',
      },
    };

    try {
      const response = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentType: 'direct_gift',
          amountNaira: selectedCoins,
          email: guestEmail.trim() || `${cleanHandle}.fan@showmelove.fun`,
          giftData: giftPayload,
        }),
      });

      const raw = await response.text();
      let result: { authorizationUrl?: string; reference?: string; error?: string } = {};
      try {
        result = JSON.parse(raw);
      } catch {
        throw new Error(`Paystack service unavailable (${response.status}).`);
      }

      if (!response.ok || !result.authorizationUrl) {
        throw new Error(result.error || 'Could not initialize Paystack checkout.');
      }

      try {
        localStorage.setItem(
          'showmelove_pending_gift',
          JSON.stringify({ reference: result.reference, giftId, gift: giftPayload, time: Date.now() }),
        );
      } catch {
        // Ignore
      }

      window.location.assign(result.authorizationUrl);
    } catch (err) {
      setIsSubmitting(false);
      setSubmitError(err instanceof Error ? err.message : 'Could not initialize Paystack checkout.');
    }
  };

  // SUCCESS STATE (WITHOUT 3D ANIMATION)
  if (fulfilledItem) {
    return (
      <div className="max-w-md mx-auto py-12 px-4 text-center">
        <section className="apple-card rounded-[28px] p-6 sm:p-8 space-y-6 border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-xl">
          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-tr from-[#FF2385] to-[#8C52FF] p-1 shadow-lg">
            <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-[#087F56] dark:text-[#24C888]" />
            </div>
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-100 dark:bg-pink-950/40 text-xs font-bold text-[#E10B5C] dark:text-[#FF3888]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Promise Delivered</span>
            </span>
            <h1 className="text-2xl font-black text-[var(--text-primary)]">
              Promise Fulfilled! 💖
            </h1>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              You sponsored <strong className="text-[var(--text-primary)]">"{fulfilledItem.title}"</strong> for{' '}
              <strong className="text-[#FF2385]">@{cleanHandle}</strong> with{' '}
              <strong>{formatCoins(fulfilledItem.coins)}</strong>.
            </p>
          </div>

          <div className="pt-2 space-y-2.5">
            <button
              type="button"
              onClick={() => {
                setFulfilledItem(null);
                setMessageText('');
                setVoiceNote({ source: 'none' });
              }}
              className="min-h-[44px] w-full rounded-2xl bg-gradient-to-r from-[#FF2385] to-[#8C52FF] text-white font-bold text-sm shadow-md hover:brightness-105 active:scale-98 transition-all cursor-pointer"
            >
              Fulfill Another Promise
            </button>
            <button
              type="button"
              onClick={onBack}
              className="min-h-[42px] w-full rounded-xl bg-[var(--bg-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-semibold text-xs hover:border-[var(--border-strong)] transition-all cursor-pointer"
            >
              Back to Home
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto pb-12 px-4 space-y-5">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Go back"
          className="min-h-[42px] px-3.5 py-2 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-sm font-semibold text-[var(--text-primary)] inline-flex items-center gap-1.5 hover:bg-[var(--bg-raised)] transition-colors shrink-0 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Home</span>
        </button>

        <div className="flex items-center gap-2">
          <ShowmeloveBrandIcon className="w-8 h-8 rounded-full border border-[var(--border-subtle)]" />
          <span className="font-bold text-base text-[var(--text-primary)]">
            Showme<span className="text-[#E61472] dark:text-[#FF2385]">love</span>
          </span>
        </div>
      </div>

      {/* Promise Card Banner */}
      <section className="rounded-[28px] bg-gradient-to-br from-[#FFE8F0] via-[#FFF3F8] to-[#F1E8FF] dark:from-[#2B1425] dark:via-[#1F142A] dark:to-[#171328] border border-pink-200/70 dark:border-pink-900/40 p-5 sm:p-6 space-y-2 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold text-[#E10B5C] dark:text-[#FF3888] uppercase tracking-wider">
          <span>📜 Digital Promise Card</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-[#1E1B4B] dark:text-white tracking-tight">
          {promiseCard?.title || `${cleanHandle ? cleanHandle.charAt(0).toUpperCase() + cleanHandle.slice(1) : 'Celebrant'}'s Promise Card`}
        </h1>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
          Select an item from the wishlist below to promise and sponsor for{' '}
          <strong className="text-[var(--text-primary)]">@{cleanHandle}</strong>.
        </p>
      </section>

      {/* Items List */}
      <section className="apple-card rounded-[28px] p-5 sm:p-6 space-y-4 border border-[var(--border-subtle)] bg-[var(--bg-card)]">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
            Choose an item to promise
          </h2>
          <span className="text-xs text-[var(--text-secondary)]">
            {promiseCard?.items.length ?? 0} {promiseCard?.items.length === 1 ? 'wish' : 'wishes'}
          </span>
        </div>

        {isLoading ? (
          <div className="py-10 text-center text-xs text-[var(--text-secondary)]">
            Loading Promise Card...
          </div>
        ) : !promiseCard || promiseCard.items.length === 0 ? (
          <div className="py-8 text-center text-xs text-[var(--text-secondary)]">
            No items added to this Promise Card yet.
          </div>
        ) : (
          <div className="space-y-2.5">
            {promiseCard.items.map((item) => {
              const isSelected = selectedItemId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedItemId(item.id);
                    setSubmitError(null);
                  }}
                  className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'border-[#FF2385] bg-[#FFEAF2] dark:bg-[#34162B] ring-2 ring-[#FF2385]/20'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-raised)] hover:border-[#FF2385]/40 hover:bg-[var(--bg-card)]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border ${
                        isSelected
                          ? 'border-[#FF2385] bg-[#FF2385] text-white'
                          : 'border-[var(--border-strong)] bg-white dark:bg-slate-800'
                      }`}
                    >
                      {isSelected ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : null}
                    </div>
                    <span className="text-sm font-bold text-[var(--text-primary)] truncate">
                      {item.title}
                    </span>
                  </div>

                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-white dark:bg-slate-800 border border-[var(--border-subtle)] text-[#E10B5C] dark:text-[#FF3888] tabular-nums shrink-0">
                    {formatCoins(item.coins)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Personalization Section (Optional Note + Voice Note) */}
      {selectedItem && (
        <section className="apple-card rounded-[28px] p-5 sm:p-6 space-y-4 border border-[var(--border-subtle)] bg-[var(--bg-card)]">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              Personalize your promise
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Add a personal message or voice note alongside your gift.
            </p>
          </div>

          {/* Note Input */}
          <div className="space-y-1.5">
            <label htmlFor="promise-note-input" className="block text-xs font-semibold text-[var(--text-secondary)]">
              Your message / note (optional)
            </label>
            <textarea
              id="promise-note-input"
              rows={2}
              maxLength={140}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="e.g. Wishing you a blessed celebration! Enjoy this treat ✨"
              className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-raised)] px-3.5 py-2.5 text-sm font-semibold text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 focus:outline-none focus:ring-2 focus:ring-[#FF2385] resize-none"
            />
          </div>

          {/* Voice Note Recorder */}
          <VoiceNoteRecorder value={voiceNote} onChange={setVoiceNote} />

          {/* Sender Signature */}
          <div className="space-y-1.5 pt-1">
            <label htmlFor="promise-sender-name" className="block text-xs font-semibold text-[var(--text-secondary)]">
              From (Your name)
            </label>
            <input
              id="promise-sender-name"
              type="text"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="e.g. Uncle David, Chioma, Bene"
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-raised)] px-3.5 py-2 text-sm font-semibold text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 focus:outline-none focus:ring-1 focus:ring-[#FF2385]"
            />
          </div>

          {!isSignedIn && (
            <div className="space-y-1.5 pt-1">
              <label htmlFor="promise-guest-email" className="block text-xs font-semibold text-[var(--text-secondary)]">
                Your email for payment receipt (optional)
              </label>
              <input
                id="promise-guest-email"
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="e.g. you@example.com"
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-raised)] px-3.5 py-2 text-sm font-semibold text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 focus:outline-none focus:ring-1 focus:ring-[#FF2385]"
              />
            </div>
          )}

          {submitError && (
            <div
              role="alert"
              className="rounded-2xl bg-[#FFEAF2] dark:bg-[#2F1426] border border-[#E61472]/35 dark:border-[#FF2385]/40 p-3.5 text-xs text-[var(--text-primary)] flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 text-[#E61472] dark:text-[#FF2385] shrink-0 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Action Button */}
          <div className="pt-2">
            {isSignedIn && !hasEnoughCoins ? (
              <div className="space-y-2">
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-[var(--text-secondary)] flex items-center justify-between gap-2">
                  <span>Balance: {formatCoins(currentWallet.loveCoinsBalance)}</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    Need {(selectedCoins - currentWallet.loveCoinsBalance).toLocaleString()} more
                  </span>
                </div>
                <Button variant="primary" size="lg" fullWidth onClick={onGoToCoins}>
                  <Plus className="w-4 h-4" />
                  <span>+ Fund Coin Balance</span>
                </Button>
              </div>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleFulfillPromise}
                className="min-h-[48px] w-full rounded-2xl bg-gradient-to-r from-[#FF2385] to-[#8C52FF] text-white font-bold text-sm sm:text-base shadow-md hover:brightness-105 active:scale-98 transition-all inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Heart className="w-4 h-4 fill-current" />
                    <span>
                      {isSignedIn
                        ? `Fulfill Promise · Spend ${formatCoins(selectedCoins)}`
                        : `Fulfill Promise · Pay ${formatNaira(selectedCoins)}`}
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
