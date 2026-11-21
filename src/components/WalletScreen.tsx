import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Gift as GiftIcon,
  Info,
  Play,
  Plus,
  Send,
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
import {
  GiftArtworkSvg,
  GoldLoveCoinSvg,
  LoveCoinHeartSvg,
  PurpleGiftBoxSvg,
} from './GiftArtwork';
import { Button, TransactionRow } from './ui/DesignSystem';
import { Counter, Floating, TiltCard } from './ui/MotionPrimitives';
import { SprayCoins } from './SprayCoins';

interface WalletScreenProps {
  onOpenBalanceInfo: () => void;
  onOpenBuyCoins: () => void;
  onOpenWithdraw: () => void;
  onOpenSendGift: (giftCatalogId?: string) => void;
  onOpenInbox: () => void;
  onOpenProfile?: () => void;
  onTrySampleReveal?: () => void;
}

export function WalletScreen({
  onOpenBalanceInfo,
  onOpenBuyCoins,
  onOpenWithdraw,
  onOpenSendGift,
  onOpenInbox,
  onOpenProfile,
  onTrySampleReveal,
}: WalletScreenProps) {
  const { state, currentWallet, switchRole, sprayLoveCoins } = useShowmelove();
  const isSignedIn = state.activeRole !== 'guest' && Boolean(state.signedInEmail);

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const coinsNairaEquivalent =
    currentWallet.loveCoinsBalance * ECONOMY_CONFIG.NAIRA_PER_LOVE_COIN;
  const canWithdrawNow =
    isSignedIn &&
    currentWallet.availableEarningsNaira >= ECONOMY_CONFIG.MIN_WITHDRAWAL_NAIRA;

  const availableCatalog = state.catalog.filter((item) => item.available);

  const combinedHistory = [
    ...currentWallet.coinTransactions.map((tx) => ({
      id: tx.id,
      createdAt: tx.createdAt,
      title: tx.description,
      kind: 'Love Coins' as const,
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
    <div className="max-w-5xl mx-auto pb-8 space-y-6">
      {/* Compact App Dashboard Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
            Wallet Home
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] truncate">
            {isSignedIn
              ? `${state.signedInName} · ${state.signedInEmail}`
              : 'Guest mode · Send gifts instantly or sign in for balances'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onTrySampleReveal && (
            <button
              type="button"
              onClick={onTrySampleReveal}
              data-testid="home-sample-reveal-btn"
              className="min-h-[42px] px-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] inline-flex items-center gap-1.5 hover:bg-[var(--bg-raised)] transition-colors whitespace-nowrap cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 text-[#E10B5C] dark:text-[#FF2A85] fill-current" />
              <span className="hidden sm:inline">Sample Reveal</span>
              <span className="sm:hidden">Reveal</span>
            </button>
          )}
          <button
            type="button"
            onClick={onOpenBalanceInfo}
            aria-label="Balance info and fee breakdown"
            data-testid="wallet-balance-info-btn"
            className="min-h-[42px] min-w-[42px] px-3 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] inline-flex items-center justify-center gap-1.5 hover:bg-[var(--bg-raised)] transition-colors cursor-pointer"
          >
            <Info className="w-4 h-4" />
            <span className="hidden sm:inline text-xs font-semibold">Balance Info</span>
          </button>
        </div>
      </div>

      {!isSignedIn ? (
        <section className="apple-card rounded-[28px] p-6 sm:p-7 space-y-5">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#FFEAF2] dark:bg-[#2F1426] flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5 text-[#E10B5C] dark:text-[#FF176C]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                Guest mode active
              </h2>
              <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                Send animated gifts without signing in, or pick a demo account to inspect Love Coins, Gifted Rewards, and Nigerian bank payouts.
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
            <Button
              variant="secondary"
              size="md"
              onClick={() => onOpenSendGift()}
              data-testid="home-send-gift-btn"
            >
              <Send className="w-4 h-4" />
              <span>Send as Guest</span>
            </Button>
          </div>
        </section>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Mockup 01 Core Wallet Stack */}
          <div className="lg:col-span-6 space-y-4">
            {/* 1. Love Coins Hero Card (Mascot PNG + Giant Balance) */}
            <section
              className="love-coin-surface rounded-[28px] border border-[#E10B5C]/25 dark:border-[#FF3888]/30 p-5 sm:p-6 flex items-center justify-between gap-4 shadow-[0_20px_44px_-20px_rgba(255,23,108,0.45)] overflow-hidden relative"
              aria-label="Love Coins balance"
              data-testid="love-coins-hero"
            >
              <SprayCoins
                isEnabled={isSignedIn && currentWallet.loveCoinsBalance > 0}
                coinBalance={currentWallet.loveCoinsBalance}
                onSpray={(count) => {
                  void sprayLoveCoins(count);
                }}
              />
              <Floating className="shrink-0">
                <LoveCoinHeartSvg className="w-24 h-24 sm:w-28 sm:h-28" priority />
              </Floating>

              <div className="flex-1 min-w-0 text-right sm:text-left sm:pl-2">
                <p className="text-sm font-semibold text-[#5E2846] dark:text-[#F8D6E8]">
                  Love Coins
                </p>
                <p
                  className="text-4xl sm:text-[46px] font-bold tabular-nums text-[#20111D] dark:text-white leading-none mt-1 tracking-tight"
                  data-testid="wallet-coins-balance"
                >
                  <Counter value={currentWallet.loveCoinsBalance} formatter={(value) => value.toLocaleString('en-NG')} />
                </p>
                <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[#5E2846] dark:text-[#EBC4DC]">
                  <GoldLoveCoinSvg className="w-4 h-4 shrink-0" />
                  <span>Spendable across every Showmelove gift</span>
                </div>
              </div>
            </section>

            {/* 2. Balance Equivalent Strip */}
            <div className="flex items-center justify-between gap-3 px-2 py-1">
              <div>
                <p className="text-xs font-medium text-[var(--text-secondary)]">Balance</p>
                <p
                  className="text-2xl sm:text-3xl font-bold tabular-nums text-[var(--text-primary)] leading-tight"
                  data-testid="wallet-naira-equivalent"
                >
                  {formatNaira(coinsNairaEquivalent)}
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenBalanceInfo}
                aria-label="Explain Love Coins and Gifted Rewards"
                className="min-h-[40px] min-w-[40px] rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors cursor-pointer"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>

            {/* 3. Side-by-Side Primary CTAs: + Buy Coins & Withdraw */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={onOpenBuyCoins}
                data-testid="wallet-buy-coins-btn"
              >
                <Plus className="w-4 h-4 stroke-[2.6]" />
                <span>Buy Coins</span>
              </Button>

              <Button
                variant="dark"
                size="lg"
                fullWidth
                onClick={onOpenWithdraw}
                data-testid="wallet-withdraw-btn"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Withdraw</span>
              </Button>
            </div>

            {!canWithdrawNow && (
              <div className="rounded-2xl bg-[var(--bg-raised)] border border-[var(--border-subtle)] px-4 py-2.5 flex items-start gap-2 text-xs text-[var(--text-secondary)]">
                <AlertCircle className="w-4 h-4 text-[#E10B5C] dark:text-[#FF2A85] shrink-0 mt-0.5" />
                <span>
                  Withdrawals require at least {formatNaira(ECONOMY_CONFIG.MIN_WITHDRAWAL_NAIRA)} in Gifted Rewards. Open{' '}
                  <button
                    type="button"
                    onClick={onOpenInbox}
                    className="font-semibold text-[var(--text-primary)] underline cursor-pointer"
                  >
                    Inbox
                  </button>{' '}
                  to claim received gifts.
                </span>
              </div>
            )}

            {/* 4. Purple-Lit Gifted Rewards Hero Card (Purple Box PNG) */}
            <button
              type="button"
              onClick={onOpenWithdraw}
              data-testid="wallet-gifted-rewards-card"
              className="w-full text-left rewards-glow-surface rounded-[28px] border border-[#8439D5]/30 dark:border-[#A855F7]/35 p-5 sm:p-6 flex items-center justify-between gap-4 hover:border-[#8439D5]/60 dark:hover:border-[#C084FC]/60 transition-all shadow-[0_20px_44px_-22px_rgba(168,85,247,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A855F7] cursor-pointer"
            >
              <div className="flex items-center gap-4 min-w-0">
                <Floating className="shrink-0">
                  <PurpleGiftBoxSvg className="w-20 h-20 sm:w-24 sm:h-24" />
                </Floating>
                <div className="space-y-1.5 min-w-0">
                  <p className="text-sm font-semibold text-[#5B21B6] dark:text-[#E9D5FF]">
                    Gifted Rewards
                  </p>
                  <p
                    className="text-3xl sm:text-4xl font-bold tabular-nums text-[#20111D] dark:text-white leading-none"
                    data-testid="wallet-available-earnings"
                  >
                    <Counter value={currentWallet.availableEarningsNaira} formatter={formatNaira} />
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/75 dark:bg-white/14 text-xs font-semibold text-[#087F56] dark:text-[#24C888]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>
                        {canWithdrawNow ? 'Can be redeemed' : 'Below 100 Love Coins minimum'}
                      </span>
                    </span>
                    {currentWallet.reservedEarningsNaira > 0 && (
                      <span className="text-xs tabular-nums font-medium text-[#5B21B6] dark:text-[#E9D5FF]">
                        Pending: {formatNaira(currentWallet.reservedEarningsNaira)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <ChevronRight className="w-5 h-5 text-[#5B21B6] dark:text-[#E9D5FF] shrink-0" />
            </button>
          </div>

          {/* Right Column: Quick Send Gift Launcher + Recent Activity */}
          <div className="lg:col-span-6 space-y-5">
            {/* Quick Send Gift Strip (4 real transparent gift PNGs) */}
            <section className="apple-card rounded-[28px] p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                    Send a gift
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Tap any animated gift to customize value &amp; promise card
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenSendGift()}
                  data-testid="home-send-gift-btn"
                  className="text-xs font-semibold text-[#E10B5C] dark:text-[#FF3888] inline-flex items-center gap-1 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>All gifts</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2 sm:gap-3">
                {availableCatalog.slice(0, 4).map((item) => (
                  <TiltCard key={item.id}>
                  <motion.button
                    key={item.id}
                    type="button"
                    onClick={() => onOpenSendGift(item.id)}
                    initial={reducedMotion ? false : { opacity: 0, scale: 0.88 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileTap={reducedMotion ? undefined : { scale: 0.96 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 24, delay: reducedMotion ? 0 : availableCatalog.findIndex((catalogItem) => catalogItem.id === item.id) * 0.06 }}
                    className="group w-full rounded-2xl bg-[var(--bg-raised)] border border-[var(--border-subtle)] hover:border-[#E10B5C]/50 dark:hover:border-[#FF2A85]/55 p-2.5 flex flex-col items-center text-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <GiftArtworkSvg
                      artworkId={item.artworkId}
                      className="w-12 h-12 sm:w-14 sm:h-14 group-hover:scale-105 transition-transform"
                    />
                    <span className="text-[11px] font-semibold text-[var(--text-primary)] whitespace-nowrap">
                      {item.artworkId === 'little-heart'
                        ? 'Heart'
                        : item.artworkId === 'rose'
                          ? 'Rose'
                          : item.artworkId === 'teddy-hug'
                            ? 'Teddy'
                            : 'Gift Box'}
                    </span>
                    <span className="text-[10px] font-medium tabular-nums text-[var(--text-secondary)]">
                      {formatNaira(item.defaultPriceNaira)}
                    </span>
                  </motion.button>
                  </TiltCard>
                ))}
              </div>
            </section>

            {/* Recent Activity matching Mockup 01 */}
            <section className="apple-card rounded-[28px] p-5 sm:p-6 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                  Recent activity
                </h2>
                {onOpenProfile ? (
                  <button
                    type="button"
                    onClick={onOpenProfile}
                    className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] inline-flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>See all</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <span className="text-xs text-[var(--text-secondary)] tabular-nums">
                    {formatCoins(currentWallet.loveCoinsBalance)}
                  </span>
                )}
              </div>

              {combinedHistory.length === 0 ? (
                <div className="rounded-2xl bg-[var(--bg-raised)] p-6 text-center space-y-3">
                  <p className="text-sm text-[var(--text-secondary)]">
                    No wallet activity yet.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button variant="primary" size="sm" onClick={onOpenBuyCoins}>
                      Buy Coins
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => onOpenSendGift()}>
                      Send a gift
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className="divide-y divide-[var(--border-subtle)]"
                  data-testid="wallet-transaction-history"
                >
                  <AnimatePresence initial={false} mode="popLayout">
                  {combinedHistory.slice(0, 5).map((item) => (
                    <motion.div key={item.id} layout exit={{ opacity: 0, x: -16 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }}>
                    <TransactionRow
                      icon={
                        <div className="w-10 h-10 rounded-xl bg-[var(--bg-raised)] border border-[var(--border-subtle)] flex items-center justify-center">
                          {item.kind === 'Love Coins' ? (
                            <GoldLoveCoinSvg className="w-6 h-6" />
                          ) : (
                            <GiftIcon className="w-4 h-4 text-[#E10B5C] dark:text-[#FF3888]" />
                          )}
                        </div>
                      }
                      title={item.title}
                      subtitle={`${item.kind} · ${new Date(item.createdAt).toLocaleDateString('en-NG', {
                        month: 'short',
                        day: 'numeric',
                      })}`}
                      amountLabel={item.amountLabel}
                      amountTone={item.tone}
                    />
                    </motion.div>
                  ))}
                  </AnimatePresence>
                </div>
              )}

              <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between gap-3 text-xs">
                <button
                  type="button"
                  onClick={onOpenInbox}
                  className="font-semibold text-[#8439D5] dark:text-[#C084FC] inline-flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <WalletIcon className="w-3.5 h-3.5" />
                  <span>Open Gift Inbox</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenBalanceInfo}
                  className="font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  Fees &amp; conversion
                </button>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
