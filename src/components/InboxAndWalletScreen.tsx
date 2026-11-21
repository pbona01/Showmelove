import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  ExternalLink,
  Gift as GiftIcon,
  Send,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { formatNaira } from '../config/economy';
import { useShowmelove } from '../context/ShowmeloveContext';
import {
  getSentGiftsForViewer,
  getSentGiftStatus,
  type SentGiftLinkStatus,
} from '../services/giftRules';
import { DEMO_USERS } from '../services/seedData';
import { GiftArtworkSvg, PurpleGiftBoxSvg } from './GiftArtwork';
import { Button, TransactionRow } from './ui/DesignSystem';
import { springs, usePrefersReducedMotion } from '../lib/animation';

interface InboxScreenProps {
  onOpenGift: (giftId: string) => void;
  onGoToWallet: () => void;
  onGoToWithdraw: () => void;
  onSendGift: () => void;
  onTrySampleReveal?: () => void;
}

type InboxTab = 'all' | 'unopened' | 'claimed' | 'sent';

const STATUS_BADGE_CLASSES: Record<SentGiftLinkStatus, string> = {
  Unclaimed:
    'bg-[#FFEAF2] dark:bg-[#2B1426] text-[#E10B5C] dark:text-[#FF7AA8] border-[#E10B5C]/25 dark:border-[#FF176C]/35',
  Revealed:
    'bg-[#F3E8FF] dark:bg-[#2A1942] text-[#8439D5] dark:text-[#C084FC] border-[#8439D5]/25 dark:border-[#A855F7]/35',
  Claimed:
    'bg-[#E6F6EF] dark:bg-[#0D3326] text-[#087F56] dark:text-[#24C888] border-[#087F56]/25 dark:border-[#24C888]/35',
};

export function InboxAndWalletScreen({
  onOpenGift,
  onGoToWallet,
  onGoToWithdraw,
  onSendGift,
  onTrySampleReveal,
}: InboxScreenProps) {
  const { state, currentWallet, switchRole, signInDemoEmail } = useShowmelove();
  const [customEmailInput, setCustomEmailInput] = useState('');
  const [copiedGiftId, setCopiedGiftId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<InboxTab>('all');
  const reducedMotion = usePrefersReducedMotion();

  const isSignedIn = state.activeRole !== 'guest' && Boolean(state.signedInEmail);
  const normalizedUserEmail = state.signedInEmail.trim().toLowerCase();

  const receivedGifts = isSignedIn
    ? state.gifts.filter((g) => g.recipientEmail.toLowerCase() === normalizedUserEmail)
    : [];

  const filteredReceived =
    activeTab === 'unopened'
      ? receivedGifts.filter((g) => !g.claimedAt)
      : activeTab === 'claimed'
        ? receivedGifts.filter((g) => Boolean(g.claimedAt))
        : receivedGifts;

  const sentGifts = getSentGiftsForViewer(
    state.gifts,
    state.activeRole,
    state.signedInEmail,
  );

  const handleCopyGiftLink = (giftId: string) => {
    if (typeof window === 'undefined') return;
    const shareUrl = `${window.location.origin}/gift/${encodeURIComponent(giftId)}`;
    void navigator.clipboard?.writeText(shareUrl).catch(() => undefined);
    setCopiedGiftId(giftId);
    window.setTimeout(() => {
      setCopiedGiftId((prev) => (prev === giftId ? null : prev));
    }, 1800);
  };

  const tabs: Array<{ id: InboxTab; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'unopened', label: 'Unopened' },
    { id: 'claimed', label: 'Claimed' },
    { id: 'sent', label: `Sent (${sentGifts.length})` },
  ];

  const showReceivedSection = isSignedIn && activeTab !== 'sent';
  const showSentSection = activeTab === 'all' || activeTab === 'sent';

  return (
    <div className="max-w-5xl mx-auto pb-10 space-y-5">
      {/* Header matching Mockup 05 ("Your Gifts") */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
            Your Gifts
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
            Open animated gifts, claim Love Coin rewards, and track sent gift links.
          </p>
        </div>
        {isSignedIn && (
          <p className="text-xs text-[var(--text-secondary)]">
            Signed in as{' '}
            <strong className="text-[var(--text-primary)]">{state.signedInEmail}</strong>
          </p>
        )}
      </div>

      {/* Interactive Segmented Filter Bar matching Mockup 05 */}
      <div
        role="tablist"
        aria-label="Filter gifts"
        className="grid grid-cols-4 gap-1 p-1 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] max-w-md"
      >
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              data-testid={`inbox-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`relative min-h-[38px] px-2 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer ${
                active
                  ? 'text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {active && (
                <motion.span
                  layoutId={reducedMotion ? undefined : 'inbox-active-tab'}
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-[#8439D5] to-[#A855F7] shadow-sm"
                  transition={springs.springSnappy}
                />
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {!isSignedIn ? (
        <section className="apple-card rounded-[28px] p-6 sm:p-8 space-y-5">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#FFEAF2] dark:bg-[#2F1426] flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5 text-[#E10B5C] dark:text-[#FF176C]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                Sign in to view your received gifts
              </h2>
              <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                Pick a seeded demo account or enter the recipient email used when a gift was sent.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Button
              variant="primary"
              size="md"
              onClick={() => switchRole('recipient')}
              data-testid="inbox-signin-recipient-btn"
            >
              Sign in as Adaeze ({DEMO_USERS.recipient.email})
            </Button>
            <Button
              variant="dark"
              size="md"
              onClick={() => switchRole('sender')}
              data-testid="inbox-signin-sender-btn"
            >
              Sign in as Tunde ({DEMO_USERS.sender.email})
            </Button>
          </div>

          <div className="pt-3 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row gap-2 max-w-md">
            <label htmlFor="inbox-custom-email" className="sr-only">
              Demo email sign in
            </label>
            <input
              id="inbox-custom-email"
              type="email"
              value={customEmailInput}
              onChange={(e) => setCustomEmailInput(e.target.value)}
              placeholder="Or enter any recipient email…"
              className="flex-1 min-h-[44px] px-4 py-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-raised)] text-sm text-[var(--text-primary)]"
            />
            <Button
              variant="secondary"
              size="md"
              onClick={() => {
                if (customEmailInput.trim().includes('@')) {
                  signInDemoEmail(customEmailInput.trim());
                }
              }}
            >
              Continue
            </Button>
          </div>
        </section>
      ) : (
        /* Luminous Purple Available-to-Withdraw Banner matching Mockup 05 */
        <section className="rewards-glow-surface rounded-[28px] border border-[#8439D5]/30 dark:border-[#A855F7]/35 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_20px_44px_-22px_rgba(168,85,247,0.42)]">
          <div className="flex items-center gap-4 sm:gap-5">
            <PurpleGiftBoxSvg className="w-20 h-20 sm:w-24 sm:h-24 shrink-0" />
            <div className="space-y-1">
              <p className="text-xs sm:text-sm font-medium text-[#5B21B6] dark:text-[#E9D5FF]">
                Available to withdraw
              </p>
              <p
                className="text-3xl sm:text-4xl font-bold tabular-nums text-[#20111D] dark:text-white leading-none"
                data-testid="inbox-available-earnings"
              >
                {formatNaira(currentWallet.availableEarningsNaira)}
              </p>
              {currentWallet.reservedEarningsNaira > 0 && (
                <p className="text-xs tabular-nums text-[#5B21B6] dark:text-[#E9D5FF]">
                  Pending payout: {formatNaira(currentWallet.reservedEarningsNaira)}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="primary"
              size="md"
              onClick={onGoToWithdraw}
              data-testid="inbox-withdraw-btn"
              className="rounded-full px-6"
            >
              Withdraw
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={onGoToWallet}
              className="rounded-full"
            >
              Wallet
            </Button>
          </div>
        </section>
      )}

      {/* Received Gifts List matching Mockup 05 */}
      {showReceivedSection && (
        <section className="space-y-3" aria-labelledby="received-gifts-heading">
          <div className="flex items-center justify-between gap-3 px-1">
            <h2
              id="received-gifts-heading"
              className="text-lg sm:text-xl font-bold text-[var(--text-primary)]"
            >
              Recent gifts ({filteredReceived.length})
            </h2>
            <span className="text-xs text-[var(--text-secondary)]">
              Tap any gift to open or replay
            </span>
          </div>

          {filteredReceived.length === 0 ? (
            <div className="apple-card rounded-[26px] p-7 text-center space-y-3">
              <GiftIcon className="w-8 h-8 text-[#E10B5C] dark:text-[#FF3888] mx-auto" />
              <div className="space-y-1">
                <p className="text-base font-semibold text-[var(--text-primary)]">
                  {activeTab === 'unopened'
                    ? 'No unopened gifts waiting right now'
                    : activeTab === 'claimed'
                      ? 'No claimed gifts yet'
                      : `No received gifts for ${state.signedInEmail} yet`}
                </p>
                <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
                  Send a gift addressed to {state.signedInEmail} or try the sample reveal.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 pt-1">
                <Button variant="primary" size="sm" onClick={onSendGift}>
                  Send a gift
                </Button>
                {onTrySampleReveal && (
                  <Button variant="secondary" size="sm" onClick={onTrySampleReveal}>
                    Try a sample reveal
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3" data-testid="received-gifts-list">
              {filteredReceived.map((gift) => (
                <button
                  key={gift.id}
                  type="button"
                  onClick={() => onOpenGift(gift.id)}
                  className="w-full text-left apple-card rounded-[24px] p-3.5 sm:p-4 flex items-center justify-between gap-3.5 hover:border-[#8439D5]/45 dark:hover:border-[#A855F7]/50 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div
                      className="w-15 h-15 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shrink-0 border border-[var(--border-subtle)] overflow-hidden"
                      style={{
                        background: `radial-gradient(circle at 50% 50%, ${gift.snapshot.themeColor || '#A855F7'}35 0%, var(--bg-raised) 80%)`,
                      }}
                    >
                      <GiftArtworkSvg
                        artworkId={gift.snapshot.artworkId}
                        className="w-12 h-12 sm:w-13 sm:h-13 group-hover:scale-105 transition-transform"
                      />
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <p className="text-sm sm:text-base font-bold text-[var(--text-primary)] truncate">
                        {gift.senderName} sent you a {gift.snapshot.name}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)] truncate">
                        “{gift.promiseText}”
                      </p>
                      <p className="inline-flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)]">
                        <Calendar className="w-3 h-3 shrink-0" />
                        <span>
                          {new Date(gift.createdAt).toLocaleDateString('en-NG', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="text-right space-y-1">
                      <p className="text-base sm:text-lg font-bold tabular-nums text-[var(--text-primary)]">
                        {formatNaira(gift.recipientEarningsNaira)}
                      </p>
                      {gift.claimedAt ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E6F6EF] dark:bg-[#0D3326] text-[#087F56] dark:text-[#24C888] text-[11px] font-semibold">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Claimed</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FFEAF2] dark:bg-[#2B1426] text-[#E10B5C] dark:text-[#FF7AA8] text-[11px] font-semibold">
                          <Sparkles className="w-3 h-3" />
                          <span>Open &amp; claim</span>
                        </span>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-[var(--text-secondary)] group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Sent Gifts Section — Preserved with Unclaimed / Revealed / Claimed live link tracking */}
      {showSentSection && (
        <section
          className="apple-card rounded-[28px] p-5 sm:p-6 space-y-4"
          aria-labelledby="sent-gifts-heading"
          data-testid="sent-gifts-section"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Send className="w-5 h-5 text-[#8439D5] dark:text-[#C084FC]" />
              <h2
                id="sent-gifts-heading"
                className="text-lg font-bold text-[var(--text-primary)]"
              >
                Sent Gifts ({sentGifts.length})
              </h2>
            </div>
            <span className="text-xs text-[var(--text-secondary)]">
              Live link status · Unclaimed, Revealed, or Claimed
            </span>
          </div>

          {sentGifts.length === 0 ? (
            <div className="rounded-2xl bg-[var(--bg-raised)] border border-[var(--border-subtle)] p-6 text-center space-y-3">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {isSignedIn
                  ? `No sent gifts from ${state.signedInEmail} yet`
                  : 'No guest gift links created in this browser yet'}
              </p>
              <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
                Send a gift to generate a shareable link and track when your recipient reveals or claims it.
              </p>
              <div className="flex justify-center pt-1">
                <Button variant="primary" size="sm" onClick={onSendGift}>
                  Send a gift
                </Button>
              </div>
            </div>
          ) : (
            <div
              className="divide-y divide-[var(--border-subtle)]"
              data-testid="sent-gifts-list"
            >
              {sentGifts.map((gift) => {
                const status = getSentGiftStatus(gift);
                const isCopied = copiedGiftId === gift.id;
                return (
                  <TransactionRow
                    key={`sent_${gift.id}`}
                    icon={
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[var(--bg-raised)] border border-[var(--border-subtle)]">
                        <GiftArtworkSvg
                          artworkId={gift.snapshot.artworkId}
                          className="w-10 h-10"
                        />
                      </div>
                    }
                    title={`To ${gift.recipientName} · ${gift.snapshot.name}`}
                    subtitle={`${gift.recipientEmail} · /gift/${gift.id} · ${new Date(
                      gift.createdAt,
                    ).toLocaleDateString('en-NG', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}`}
                    amountLabel={formatNaira(gift.amountNaira)}
                    amountTone={
                      status === 'Claimed'
                        ? 'positive'
                        : status === 'Revealed'
                          ? 'accent'
                          : 'neutral'
                    }
                    action={
                      <div className="flex flex-wrap items-center justify-end gap-1.5 max-w-full">
                        <span
                          data-testid={`sent-gift-status-${gift.id}`}
                          className={`px-2.5 py-1 rounded-full border text-xs font-semibold whitespace-nowrap ${STATUS_BADGE_CLASSES[status]}`}
                        >
                          {status}
                        </span>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleCopyGiftLink(gift.id)}
                          data-testid={`copy-sent-link-${gift.id}`}
                          aria-label={`Copy gift link for ${gift.recipientName}`}
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-[#087F56] dark:text-[#24C888]" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </Button>
                        <Button
                          variant="dark"
                          size="sm"
                          onClick={() => onOpenGift(gift.id)}
                          data-testid={`open-sent-link-${gift.id}`}
                          aria-label={`Open gift link for ${gift.recipientName}`}
                        >
                          <span>Open</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    }
                  />
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
