import { useState } from 'react';
import {
  ArrowRight,
  ExternalLink,
  Gift as GiftIcon,
  Inbox,
  Star,
  UserCheck,
} from 'lucide-react';
import { formatNaira } from '../config/economy';
import { useShowmelove } from '../context/ShowmeloveContext';
import { DEMO_USERS } from '../services/seedData';
import { GiftArtworkSvg, PurpleGiftBoxSvg } from './GiftArtwork';
import { Button, TransactionRow } from './ui/DesignSystem';

interface InboxScreenProps {
  onOpenGift: (giftId: string) => void;
  onGoToWallet: () => void;
  onGoToWithdraw: () => void;
  onSendGift: () => void;
  onTrySampleReveal?: () => void;
}

export function InboxAndWalletScreen({
  onOpenGift,
  onGoToWallet,
  onGoToWithdraw,
  onSendGift,
  onTrySampleReveal,
}: InboxScreenProps) {
  const { state, currentWallet, switchRole, signInDemoEmail } = useShowmelove();
  const [customEmailInput, setCustomEmailInput] = useState('');

  const isSignedIn = state.activeRole !== 'guest' && Boolean(state.signedInEmail);
  const normalizedUserEmail = state.signedInEmail.trim().toLowerCase();

  const receivedGifts = isSignedIn
    ? state.gifts.filter((g) => g.recipientEmail.toLowerCase() === normalizedUserEmail)
    : [];

  return (
    <div className="max-w-5xl mx-auto pb-12 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
            Gift Inbox
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Open animated gifts sent to you, claim rewards once, and withdraw from Wallet.
          </p>
        </div>
        {isSignedIn && (
          <p className="text-xs text-[var(--text-secondary)]">
            Signed in as <strong className="text-[var(--text-primary)]">{state.signedInEmail}</strong>
          </p>
        )}
      </div>

      {!isSignedIn ? (
        <section className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-6 sm:p-8 space-y-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#FFEAF2] dark:bg-[#2F1426] flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5 text-[#DF0756] dark:text-[#FF176C]" />
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
            <Button variant="dark" size="md" onClick={() => switchRole('sender')}>
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
              className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-raised)] text-sm text-[var(--text-primary)]"
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
        <>
          {/* Compact Rewards Summary Bar linking directly to Wallet & Withdraw */}
          <section className="rewards-glow-surface rounded-3xl border border-[#8439D5]/25 dark:border-[#A855F7]/30 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <PurpleGiftBoxSvg className="w-14 h-14 shrink-0" />
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#8439D5] dark:text-[#A855F7]">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>Gifted Rewards</span>
                </div>
                <p
                  className="text-2xl sm:text-3xl font-bold tabular-nums text-[var(--text-primary)]"
                  data-testid="inbox-available-earnings"
                >
                  {formatNaira(currentWallet.availableEarningsNaira)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <Button variant="secondary" size="md" onClick={onGoToWallet}>
                Open Wallet
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={onGoToWithdraw}
                data-testid="inbox-withdraw-btn"
              >
                <span>Withdraw</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </section>

          {/* Received Gifts List */}
          <section className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Inbox className="w-5 h-5 text-[#DF0756] dark:text-[#FF176C]" />
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  Received gifts ({receivedGifts.length})
                </h2>
              </div>
              <span className="text-xs text-[var(--text-secondary)]">
                Reopening a gift never changes balances
              </span>
            </div>

            {receivedGifts.length === 0 ? (
              <div className="rounded-2xl bg-[var(--bg-raised)] border border-[var(--border-subtle)] p-7 text-center space-y-3">
                <GiftIcon className="w-8 h-8 text-[#DF0756] dark:text-[#FF176C] mx-auto" />
                <div className="space-y-1">
                  <p className="text-base font-semibold text-[var(--text-primary)]">
                    No received gifts for {state.signedInEmail} yet
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
                    Send a gift addressed to {state.signedInEmail} or open our sample reveal.
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
              <div
                className="divide-y divide-[var(--border-subtle)]"
                data-testid="received-gifts-list"
              >
                {receivedGifts.map((gift) => (
                  <TransactionRow
                    key={gift.id}
                    icon={
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[#F4ECF8] dark:bg-[#241E30] border border-[var(--border-subtle)]">
                        <GiftArtworkSvg
                          artworkId={gift.snapshot.artworkId}
                          className="w-9 h-9"
                        />
                      </div>
                    }
                    title={`“${gift.promiseText}”`}
                    subtitle={`From ${gift.senderName} · ${gift.snapshot.name} · ${new Date(
                      gift.createdAt,
                    ).toLocaleDateString('en-NG', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}`}
                    amountLabel={formatNaira(gift.recipientEarningsNaira)}
                    amountTone={gift.claimedAt ? 'positive' : 'accent'}
                    statusLabel={gift.claimedAt ? 'Claimed' : 'Ready to claim'}
                    action={
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onOpenGift(gift.id)}
                      >
                        <span>{gift.claimedAt ? 'Replay' : 'Open & claim'}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    }
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
