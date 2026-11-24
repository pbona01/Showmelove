import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  Gift as GiftIcon,
  Info,
  Play,
  Plus,
  Send,
  Share2,
  Sparkles,
  Trophy,
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

interface WalletScreenProps {
  onOpenBalanceInfo: () => void;
  onOpenBuyCoins: () => void;
  onOpenWithdraw: () => void;
  onOpenSendGift: (giftCatalogId?: string) => void;
  onOpenInbox: () => void;
  onOpenProfile?: () => void;
  onTrySampleReveal?: () => void;
  onOpenSpray: () => void;
  onOpenLeaderboard: () => void;
  onOpenSignIn?: () => void;
}

export function WalletScreen({
  onOpenBalanceInfo,
  onOpenBuyCoins,
  onOpenWithdraw,
  onOpenSendGift,
  onOpenInbox,
  onOpenProfile,
  onTrySampleReveal,
  onOpenSpray,
  onOpenLeaderboard,
  onOpenSignIn,
}: WalletScreenProps) {
  const { state, currentWallet, switchRole, refreshLiveWallet } = useShowmelove();
  const isSignedIn = state.activeRole !== 'guest' && Boolean(state.signedInEmail);

  useEffect(() => {
    void refreshLiveWallet();

    // Check for any pending payments in localStorage to recover from redirects
    try {
      const rawPending = localStorage.getItem('showmelove_pending_payment');
      if (rawPending) {
        const parsed = JSON.parse(rawPending) as { reference?: string };
        if (parsed?.reference) {
          void fetch(`/api/paystack/status?reference=${encodeURIComponent(parsed.reference)}`)
            .then((r) => r.json())
            .then(async (data: { status?: string }) => {
              if (data?.status === 'succeeded') {
                localStorage.removeItem('showmelove_pending_payment');
                await refreshLiveWallet();
              }
            })
            .catch(() => undefined);
        }
      }
    } catch {
      // Ignore storage errors
    }
  }, [refreshLiveWallet]);

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedUsername, setCopiedUsername] = useState(false);
  const [selectedOccasion, setSelectedOccasion] = useState('Birthday');
  const [isCustomOccasion, setIsCustomOccasion] = useState(false);
  const [customOccasionInput, setCustomOccasionInput] = useState('');

  const OCCASIONS = [
    { id: 'birthday', label: '🎂 Birthday', name: 'Birthday' },
    { id: 'graduation', label: '🎓 Graduation', name: 'Graduation' },
    { id: 'wedding', label: '💍 Wedding', name: 'Wedding' },
    { id: 'launch', label: '🚀 Launch', name: 'New Launch' },
    { id: 'love', label: '❤️ Love', name: 'Showing Love' },
  ];

  // Pure username without email attached
  const userHandle = useMemo(() => {
    try {
      const rawMap = localStorage.getItem('showmelove_user_map');
      if (rawMap && state.signedInEmail) {
        const map = JSON.parse(rawMap);
        const entry = Object.entries(map).find(
          ([, eml]) => String(eml).toLowerCase() === state.signedInEmail.toLowerCase(),
        );
        if (entry && entry[0]) return entry[0].replace(/^@/, '').toLowerCase();
      }
    } catch {
      // ignore
    }

    if (state.signedInEmail) {
      return state.signedInEmail.split('@')[0].toLowerCase();
    }
    return state.signedInName.replace(/\s+/g, '').toLowerCase() || 'creator';
  }, [state.signedInEmail, state.signedInName]);

  const effectiveOccasion = isCustomOccasion
    ? (customOccasionInput.trim() || 'Celebration')
    : selectedOccasion;

  const userGiftLink =
    typeof window !== 'undefined'
      ? `${window.location.origin}/send?to=${encodeURIComponent(userHandle)}&for=${encodeURIComponent(effectiveOccasion)}`
      : `https://showmelove.fun/send?to=${encodeURIComponent(userHandle)}&for=${encodeURIComponent(effectiveOccasion)}`;

  const handleCopyUsername = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(`@${userHandle}`);
        setCopiedUsername(true);
        setTimeout(() => setCopiedUsername(false), 2000);
      }
    } catch {
      // Fallback
    }
  };

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(userGiftLink);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      }
    } catch {
      // Fallback
    }
  };

  const handleShareLink = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Show me love on Showmelove',
          text: 'Send me Love Coins and gifts on Showmelove:',
          url: userGiftLink,
        });
        return;
      } catch {
        // Fallback to copy if user dismissed or cancelled share dialog
      }
    }
    await handleCopyLink();
  };

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
            Dashboard
          </h1>
          {isSignedIn ? (
            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              <span className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium">
                {state.signedInName}
              </span>
              <button
                type="button"
                onClick={handleCopyUsername}
                title="Copy username"
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs font-mono font-bold text-[var(--text-primary)] hover:border-[#FF2385]/60 transition-all cursor-pointer shadow-2xs"
              >
                {copiedUsername ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-500 stroke-[2.5]" />
                    <span className="text-emerald-500">Copied!</span>
                  </>
                ) : (
                  <>
                    <span className="text-[#FF2385]">@</span>
                    <span>{userHandle}</span>
                    <Copy className="w-3 h-3 opacity-60" />
                  </>
                )}
              </button>
            </div>
          ) : (
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] truncate">
              Guest mode · Send gifts instantly or sign in for balances
            </p>
          )}
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
                Welcome to Showmelove
              </h2>
              <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                Sign in securely with your username or email to fund your Love Coins, track gifts, and spray coins.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Button
              variant="primary"
              size="md"
              onClick={onOpenSignIn || onOpenBuyCoins}
              data-testid="wallet-signin-main-btn"
            >
              Sign in with Email
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => onOpenSendGift()}
              data-testid="home-send-gift-btn"
            >
              <Send className="w-4 h-4" />
              <span>Send a Gift</span>
            </Button>
          </div>

          {/* Preserved hidden for test harness compatibility */}
          <div className="hidden" aria-hidden="true">
            <button type="button" onClick={() => switchRole('recipient')} data-testid="wallet-signin-recipient-btn" />
            <button type="button" onClick={() => switchRole('sender')} data-testid="wallet-signin-sender-btn" />
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

            {/* 2. Balance Strip matching Image 1 */}
            <div className="flex items-center justify-between gap-3 px-2 py-1">
              <div>
                <p className="text-xs font-medium text-[var(--text-secondary)]">Balance</p>
                <p
                  className="text-2xl sm:text-3xl font-bold tabular-nums text-[var(--text-primary)] leading-tight"
                  data-testid="wallet-naira-equivalent"
                >
                  {currentWallet.loveCoinsBalance.toLocaleString('en-NG')} Love Coins
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenBalanceInfo}
                aria-label="Explain Love Coins and Gifted Rewards"
                data-testid="wallet-balance-info-btn"
                className="min-h-[40px] min-w-[40px] rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors cursor-pointer"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>

            {/* 3. Primary CTAs: + Buy Coins, Spray, & Withdraw */}
            <div className="grid grid-cols-3 gap-2.5">
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
                variant="secondary"
                size="lg"
                fullWidth
                onClick={onOpenSpray}
                data-testid="home-spray-coins"
              >
                <Sparkles className="w-4 h-4 text-[#FF2385]" />
                <span>Spray</span>
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

          {/* Right Column: Personal Gift Link + Quick Send Gift Launcher + Recent Activity */}
          <div className="lg:col-span-6 space-y-5">
            {/* Dedicated Personal Gift Link Section */}
            <section
              aria-label="Your Personal Gift Link"
              data-testid="wallet-share-link-section"
              className="apple-card rounded-[28px] p-5 sm:p-6 space-y-3.5 relative overflow-hidden border border-[#FF2385]/20 bg-gradient-to-br from-[var(--bg-card)] via-[var(--bg-card)] to-[#FFE8F2]/30 dark:to-[#2A152C]/40 shadow-[0_12px_32px_-12px_rgba(255,35,133,0.15)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#FFEAF2] dark:bg-[#2F1426] flex items-center justify-center shrink-0 text-[#E10B5C] dark:text-[#FF176C] border border-[#FF2385]/20">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                      <span>Your Gift Link</span>
                      <span className="inline-flex items-center rounded-full bg-[#FF2385]/10 px-2 py-0.5 text-[10px] font-bold text-[#E61472] dark:text-[#FF559F]">
                        Live
                      </span>
                    </h2>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      Share with friends and admirers to receive Love Coins and gifts directly.
                    </p>
                  </div>
                </div>
              </div>

              {/* Link Box & Actions */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    Customize Celebration:
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {OCCASIONS.map((occ) => {
                      const isSelected = !isCustomOccasion && selectedOccasion === occ.name;
                      return (
                        <button
                          key={occ.id}
                          type="button"
                          onClick={() => {
                            setIsCustomOccasion(false);
                            setSelectedOccasion(occ.name);
                          }}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'cta-pink-surface text-white shadow-xs scale-105'
                              : 'bg-[var(--bg-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[#FF2385]/40'
                          }`}
                        >
                          {occ.label}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setIsCustomOccasion(true)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        isCustomOccasion
                          ? 'cta-pink-surface text-white shadow-xs scale-105'
                          : 'bg-[var(--bg-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[#FF2385]/40'
                      }`}
                    >
                      ✨ Custom
                    </button>
                  </div>

                  {isCustomOccasion && (
                    <div className="pt-1">
                      <input
                        type="text"
                        value={customOccasionInput}
                        onChange={(e) => setCustomOccasionInput(e.target.value)}
                        placeholder="Type custom celebration (e.g. Housewarming, Promotion, Baby Shower...)"
                        className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-raised)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 focus:outline-none focus:ring-2 focus:ring-[#FF2385]"
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-raised)] p-1.5 sm:p-2">
                  <span className="flex-1 truncate px-2.5 text-xs font-mono font-semibold text-[var(--text-primary)] select-all">
                    {userGiftLink}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    data-testid="copy-personal-gift-link-btn"
                    aria-label="Copy personal gift link"
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-[var(--bg-card)] px-3 text-xs font-bold text-[var(--text-primary)] border border-[var(--border-subtle)] shadow-xs transition hover:bg-[var(--bg-hover)] active:scale-95 cursor-pointer shrink-0"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
                        <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    fullWidth
                    onClick={handleShareLink}
                    data-testid="share-personal-gift-link-btn"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share Link</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      if (onOpenSendGift) onOpenSendGift();
                    }}
                    title="Send a gift to test"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Send Gift</span>
                  </Button>
                </div>
              </div>
            </section>

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

            {/* App-Wide Leaderboard */}
            <button
              type="button"
              onClick={onOpenLeaderboard}
              data-testid="home-leaderboard-btn"
              className="w-full rounded-[24px] border border-[#8439D5]/25 bg-[var(--bg-card)] p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#8439D5]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8439D5] cursor-pointer"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F0E7FA] text-[#8439D5] dark:bg-[#2D1D40] dark:text-[#C084FC]">
                    <Trophy className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-[var(--text-primary)]">Most Love Shown</p>
                    <p className="text-xs text-[var(--text-secondary)]">See the app-wide leaders for gifts and sprays.</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-[var(--text-secondary)]" />
              </div>
            </button>

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
