import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Coins,
  Gift as GiftIcon,
  Info,
  Star,
  UserCheck,
  Wallet as WalletIcon,
} from 'lucide-react';
import {
  ECONOMY_CONFIG,
  formatCoins,
  formatNaira,
} from '../config/economy';
import { useShowmelove } from '../context/ShowmeloveContext';
import { DEMO_USERS } from '../services/seedData';
import { LoveCoinHeartSvg, PurpleGiftBoxSvg } from './GiftArtwork';
import { Button, TransactionRow } from './ui/DesignSystem';

interface WalletScreenProps {
  onOpenBalanceInfo: () => void;
  onOpenBuyCoins: () => void;
  onOpenWithdraw: () => void;
  onOpenSendGift: () => void;
  onOpenInbox: () => void;
}

export function WalletScreen({
  onOpenBalanceInfo,
  onOpenBuyCoins,
  onOpenWithdraw,
  onOpenSendGift,
  onOpenInbox,
}: WalletScreenProps) {
  const { state, currentWallet, switchRole } = useShowmelove();
  const isSignedIn = state.activeRole !== 'guest' && Boolean(state.signedInEmail);

  const coinsNairaEquivalent =
    currentWallet.loveCoinsBalance * ECONOMY_CONFIG.NAIRA_PER_LOVE_COIN;
  const canWithdrawNow =
    isSignedIn &&
    currentWallet.availableEarningsNaira >= ECONOMY_CONFIG.MIN_WITHDRAWAL_NAIRA;

  // Combine coin & earnings transactions calmly, sorted newest first
  const combinedHistory = [
    ...currentWallet.coinTransactions.map((tx) => ({
      id: tx.id,
      createdAt: tx.createdAt,
      title: tx.description,
      kind: 'Love Coin' as const,
      amountLabel: `${tx.coinsDelta >= 0 ? `+${tx.coinsDelta.toLocaleString('en-NG')}` : tx.coinsDelta.toLocaleString('en-NG')} Coins`,
      tone: (tx.coinsDelta >= 0 ? 'positive' : 'neutral') as 'positive' | 'neutral' | 'accent',
    })),
    ...currentWallet.earningsTransactions.map((tx) => ({
      id: tx.id,
      createdAt: tx.createdAt,
      title: tx.description,
      kind: 'Gifted Rewards' as const,
      amountLabel:
        tx.amountNaira > 0
          ? `+${formatNaira(tx.amountNaira)}`
          : tx.amountNaira < 0
            ? `-${formatNaira(Math.abs(tx.amountNaira))}`
            : 'Paid',
      tone: (tx.amountNaira > 0 ? 'positive' : tx.amountNaira < 0 ? 'accent' : 'neutral') as
        | 'positive'
        | 'neutral'
        | 'accent',
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="max-w-5xl mx-auto pb-12 space-y-6">
      {/* Screen Header matching reference top bar */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
            Show Me Love
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
            {isSignedIn
              ? `${state.signedInName} · ${state.signedInEmail}`
              : 'Sign in to manage Love Coins & Gifted Rewards'}
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenBalanceInfo}
          aria-label="Balance info and fee breakdown"
          data-testid="wallet-balance-info-btn"
          className="min-h-[44px] min-w-[44px] px-3 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] inline-flex items-center justify-center gap-1.5 hover:bg-[var(--bg-raised)] transition-colors"
        >
          <Info className="w-5 h-5" />
          <span className="hidden sm:inline text-xs font-semibold">Balance Info</span>
        </button>
      </div>

      {!isSignedIn ? (
        <section className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-6 sm:p-8 space-y-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#FFEAF2] dark:bg-[#2F1426] flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5 text-[#DF0756] dark:text-[#FF176C]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                Guest mode active
              </h2>
              <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                Guests can send gifts directly with simulated checkout. Sign in as a demo recipient or sender to view balances, buy Love Coins, or withdraw rewards.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Button
              variant="primary"
              size="md"
              onClick={() => switchRole('recipient')}
              data-testid="wallet-signin-recipient-btn"
            >
              Sign in as Adaeze ({DEMO_USERS.recipient.email})
            </Button>
            <Button
              variant="dark"
              size="md"
              onClick={() => switchRole('sender')}
            >
              Sign in as Tunde ({DEMO_USERS.sender.email})
            </Button>
          </div>
        </section>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Reference Wallet Cards */}
          <div className="lg:col-span-6 space-y-4">
            {/* 1. Love Coin Hero Gradient Card */}
            <section
              className="love-coin-surface rounded-3xl border border-[#DF0756]/20 dark:border-white/10 p-5 sm:p-6 flex items-center justify-between gap-4 shadow-md"
              aria-label="Love Coin balance"
            >
              <div className="flex items-center gap-4 sm:gap-5">
                <div className="shrink-0 drop-shadow-md">
                  <LoveCoinHeartSvg className="w-16 h-16 sm:w-20 sm:h-20" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#6F6478] dark:text-[#EADCE8]">
                    Love Coin
                  </p>
                  <p
                    className="text-4xl sm:text-[42px] font-bold tabular-nums text-[#201727] dark:text-[#FAF8FC] leading-none mt-1"
                    data-testid="wallet-coins-balance"
                  >
                    {currentWallet.loveCoinsBalance.toLocaleString('en-NG')}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenSendGift}
                className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white/75 dark:bg-white/12 text-xs font-semibold text-[#201727] dark:text-[#FAF8FC] hover:bg-white dark:hover:bg-white/20 transition-colors whitespace-nowrap shrink-0"
              >
                Use to gift
              </button>
            </section>

            {/* 2. Raised Balance Equivalent Row */}
            <div className="rounded-2xl bg-[var(--bg-raised)] border border-[var(--border-subtle)] px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <WalletIcon className="w-5 h-5 text-[var(--text-primary)] shrink-0" />
                <span className="text-sm sm:text-base font-medium text-[var(--text-primary)]">
                  Balance
                </span>
              </div>
              <span
                className="text-xl sm:text-2xl font-bold tabular-nums text-[var(--text-primary)]"
                data-testid="wallet-naira-equivalent"
              >
                {formatNaira(coinsNairaEquivalent)}
              </span>
            </div>

            {/* 3. Side-by-Side Primary CTAs: Buy Coins & Withdraw */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={onOpenBuyCoins}
                data-testid="wallet-buy-coins-btn"
              >
                <GiftIcon className="w-4 h-4" />
                <span>Buy Coins</span>
              </Button>

              <Button
                variant="dark"
                size="lg"
                fullWidth
                onClick={onOpenWithdraw}
                data-testid="wallet-withdraw-btn"
              >
                <WalletIcon className="w-4 h-4" />
                <span>Withdraw</span>
              </Button>
            </div>

            {!canWithdrawNow && (
              <div className="rounded-2xl bg-[var(--bg-raised)] border border-[var(--border-subtle)] px-4 py-2.5 flex items-start gap-2 text-xs text-[var(--text-secondary)]">
                <AlertCircle className="w-4 h-4 text-[#DF0756] dark:text-[#FF176C] shrink-0 mt-0.5" />
                <span>
                  Withdrawals require at least {formatNaira(ECONOMY_CONFIG.MIN_WITHDRAWAL_NAIRA)} in Gifted Rewards. Claim received gifts in{' '}
                  <button
                    type="button"
                    onClick={onOpenInbox}
                    className="font-semibold text-[var(--text-primary)] underline"
                  >
                    Inbox
                  </button>{' '}
                  to build withdrawable rewards.
                </span>
              </div>
            )}

            {/* 4. Purple-Lit Gifted Rewards Card */}
            <button
              type="button"
              onClick={onOpenWithdraw}
              data-testid="wallet-gifted-rewards-card"
              className="w-full text-left rewards-glow-surface rounded-3xl border border-[#8439D5]/25 dark:border-[#A855F7]/30 p-5 flex items-center justify-between gap-3 hover:border-[#8439D5]/60 dark:hover:border-[#A855F7]/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A855F7]"
            >
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-[#8439D5] dark:text-[#A855F7] fill-current shrink-0" />
                  <span className="text-sm font-semibold text-[var(--text-primary)]">
                    Gifted Rewards
                  </span>
                </div>

                <p
                  className="text-3xl font-bold tabular-nums text-[var(--text-primary)] leading-tight"
                  data-testid="wallet-available-earnings"
                >
                  {formatNaira(currentWallet.availableEarningsNaira)}
                </p>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 font-medium text-[#087F56] dark:text-[#24C888]">
                    <span>
                      {canWithdrawNow ? 'Can be withdrawn' : 'Below ₦100 minimum'}
                    </span>
                    {canWithdrawNow && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </span>
                  {currentWallet.reservedEarningsNaira > 0 && (
                    <span className="tabular-nums font-medium text-[var(--text-secondary)]">
                      · Pending payout: {formatNaira(currentWallet.reservedEarningsNaira)}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <PurpleGiftBoxSvg className="w-16 h-16 sm:w-20 sm:h-20" />
                <ChevronRight className="w-5 h-5 text-[var(--text-secondary)]" />
              </div>
            </button>
          </div>

          {/* Right Column: Calm Transaction History */}
          <section className="lg:col-span-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  Transaction history
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  Love Coins ({formatCoins(currentWallet.loveCoinsBalance)}) stay separate from withdrawable Gifted Rewards ({formatNaira(currentWallet.availableEarningsNaira)}).
                </p>
              </div>
              <Coins className="w-5 h-5 text-[var(--text-secondary)] shrink-0" />
            </div>

            {combinedHistory.length === 0 ? (
              <div className="rounded-2xl bg-[var(--bg-raised)] p-6 text-center space-y-3">
                <p className="text-sm text-[var(--text-secondary)]">
                  No wallet transactions yet.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button variant="primary" size="sm" onClick={onOpenBuyCoins}>
                    Buy Coins
                  </Button>
                  <Button variant="secondary" size="sm" onClick={onOpenSendGift}>
                    Send a gift
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className="divide-y divide-[var(--border-subtle)]"
                data-testid="wallet-transaction-history"
              >
                {combinedHistory.slice(0, 8).map((item) => (
                  <TransactionRow
                    key={item.id}
                    title={item.title}
                    subtitle={`${item.kind} · ${new Date(item.createdAt).toLocaleDateString('en-NG', {
                      month: 'short',
                      day: 'numeric',
                    })}`}
                    amountLabel={item.amountLabel}
                    amountTone={item.tone}
                  />
                ))}
              </div>
            )}

            <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between gap-3 text-xs">
              <button
                type="button"
                onClick={onOpenBalanceInfo}
                className="font-semibold text-[#8439D5] dark:text-[#A855F7] inline-flex items-center gap-1 hover:underline"
              >
                <span>How conversion &amp; fees work</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onOpenInbox}
                className="font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Open Inbox
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
