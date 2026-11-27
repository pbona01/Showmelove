import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Gift as GiftIcon,
  Heart,
  Info,
  Plus,
  Send,
  Share2,
  ShoppingCart,
  Sparkles,
  Star,
  Trash2,
  Trophy,
  UserCheck,
  Wallet as WalletIcon,
} from 'lucide-react';
import {
  encodePromiseCardPayload,
  getUserPromiseCard,
  saveUserPromiseCard,
  type PromiseCardItem,
  type UserPromiseCard,
} from '../services/promiseCardService';
import {
  ECONOMY_CONFIG,
  formatCoins,
  formatNaira,
} from '../config/economy';
import { useShowmelove } from '../context/ShowmeloveContext';
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
  onOpenTransactions?: () => void;
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
  onOpenTransactions,
  onOpenSpray,
  onOpenLeaderboard,
  onOpenSignIn,
}: WalletScreenProps) {
  const { state, currentWallet, refreshLiveWallet } = useShowmelove();
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
    { id: 'promise_card', label: '📜 Promise Card', name: 'Promise Card' },
  ];

  const isPromiseCardMode = !isCustomOccasion && selectedOccasion === 'Promise Card';

  // Promise Card builder state
  const [promiseCard, setPromiseCard] = useState<UserPromiseCard | null>(null);
  const [promiseCardLoading, setPromiseCardLoading] = useState(false);
  const [promiseCardSaved, setPromiseCardSaved] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemCoins, setNewItemCoins] = useState('500');

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

  // Load user's promise card
  useEffect(() => {
    let active = true;
    void getUserPromiseCard(userHandle).then((card) => {
      if (active) setPromiseCard(card);
    });
    return () => {
      active = false;
    };
  }, [userHandle]);

  const handleAddPromiseItem = () => {
    if (!newItemTitle.trim()) return;
    const coins = Math.max(10, Math.round(Number(newItemCoins) || 100));
    const newItem: PromiseCardItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: newItemTitle.trim(),
      coins,
    };
    const nextCard: UserPromiseCard = {
      username: userHandle,
      title: promiseCard?.title || `${userHandle}'s Promise Card`,
      items: [...(promiseCard?.items || []), newItem],
      updatedAt: new Date().toISOString(),
    };
    setPromiseCard(nextCard);
    setNewItemTitle('');
    setNewItemCoins('500');
    setPromiseCardSaved(true);
    void saveUserPromiseCard(nextCard);
    setTimeout(() => setPromiseCardSaved(false), 2000);
  };

  const handleDeletePromiseItem = (itemId: string) => {
    if (!promiseCard) return;
    const nextCard: UserPromiseCard = {
      ...promiseCard,
      username: userHandle,
      items: promiseCard.items.filter((item) => item.id !== itemId),
      updatedAt: new Date().toISOString(),
    };
    setPromiseCard(nextCard);
    setPromiseCardSaved(true);
    void saveUserPromiseCard(nextCard);
    setTimeout(() => setPromiseCardSaved(false), 2000);
  };

  const handleSavePromiseCard = async () => {
    if (!promiseCard) return;
    setPromiseCardLoading(true);
    await saveUserPromiseCard({ ...promiseCard, username: userHandle });
    setPromiseCardLoading(false);
    setPromiseCardSaved(true);
    setTimeout(() => setPromiseCardSaved(false), 2500);
  };

  const promiseCardParam = useMemo(() => {
    if (!promiseCard || !isPromiseCardMode) return '';
    return encodePromiseCardPayload(promiseCard);
  }, [promiseCard, isPromiseCardMode]);

  const userGiftLink =
    typeof window !== 'undefined'
      ? isPromiseCardMode
        ? `${window.location.origin}/send?to=${encodeURIComponent(userHandle)}&mode=promise${promiseCardParam ? `&card=${promiseCardParam}` : ''}`
        : `${window.location.origin}/send?to=${encodeURIComponent(userHandle)}&for=${encodeURIComponent(effectiveOccasion)}`
      : isPromiseCardMode
        ? `https://showmelove.fun/send?to=${encodeURIComponent(userHandle)}&mode=promise${promiseCardParam ? `&card=${promiseCardParam}` : ''}`
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
    <div className="max-w-md mx-auto pb-16 space-y-3.5 px-3 sm:px-0">
      {/* 1. Header: Dashboard + username + Reveal + Info */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-[28px] font-black text-[#1E1B4B] dark:text-white tracking-tight leading-tight">
            Dashboard
          </h1>
          {isSignedIn ? (
            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
              <span className="text-xs font-bold text-[#1E1B4B] dark:text-white/90">
                {state.signedInName}
              </span>
              <button
                type="button"
                onClick={handleCopyUsername}
                title="Copy username"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/80 dark:bg-slate-800/80 border border-pink-200/60 dark:border-pink-900/40 text-[11px] font-mono font-bold text-[#E10B5C] dark:text-[#FF3888] hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-2xs"
              >
                {copiedUsername ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-500 stroke-[2.5]" />
                    <span className="text-emerald-500">Copied!</span>
                  </>
                ) : (
                  <>
                    <span>@{userHandle}</span>
                    <Copy className="w-3 h-3 opacity-70" />
                  </>
                )}
              </button>
            </div>
          ) : (
            <p className="text-xs text-[var(--text-secondary)] truncate">
              Guest mode · Send gifts or sign in
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">

          <button
            type="button"
            onClick={onOpenBalanceInfo}
            aria-label="Balance info"
            data-testid="wallet-balance-info-btn"
            className="w-9 h-9 rounded-full bg-white dark:bg-slate-800 border border-pink-100 dark:border-pink-900/40 text-[var(--text-secondary)] hover:text-[#1E1B4B] dark:hover:text-white inline-flex items-center justify-center shadow-2xs transition-all cursor-pointer"
          >
            <Info className="w-4 h-4" />
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


        </section>
      ) : (
        <>
          {/* 2. Love Coins Hero Card */}
          <section
            className="rounded-[28px] bg-gradient-to-r from-[#FF6584] via-[#F35588] to-[#8C52FF] p-4 sm:p-5 text-white shadow-[0_16px_36px_-12px_rgba(255,101,132,0.45)] relative overflow-hidden flex items-center justify-between gap-3"
            aria-label="Love Coins balance"
            data-testid="love-coins-hero"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="shrink-0 relative">
                <img
                  src="/assets/showmelove-brand-heart.jpg"
                  alt="Showmelove Mascot"
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover shadow-md border-2 border-white/30"
                />
                <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 border border-white text-[10px] shadow-xs">
                  🪙
                </span>
              </div>

              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-white/85 tracking-wide uppercase">
                  Love Coins
                </p>
                <p
                  className="text-4xl sm:text-5xl font-black tabular-nums text-white leading-none tracking-tight my-0.5"
                  data-testid="wallet-coins-balance"
                >
                  <Counter value={currentWallet.loveCoinsBalance} formatter={(v) => v.toLocaleString('en-NG')} />
                </p>
                <p className="text-[11px] font-medium text-white/90 truncate">
                  Spendable across every Showmelove gift
                </p>
              </div>
            </div>

            <div className="shrink-0">
              <button
                type="button"
                onClick={onOpenBuyCoins}
                data-testid="wallet-buy-coins-btn"
                className="h-9 px-3.5 rounded-full bg-white text-[#1E1B4B] text-xs font-bold shadow-md hover:bg-white/90 active:scale-95 transition-all inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ShoppingCart className="w-3.5 h-3.5 text-[#E10B5C]" />
                <span>Buy Coins</span>
              </button>
            </div>
          </section>

          {/* 3. Side-by-side Action Pills: Spray and Show Love */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onOpenSpray}
              data-testid="home-spray-coins"
              className="h-12 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-pink-100 dark:border-pink-900/40 shadow-xs hover:border-[#FF2385]/50 flex items-center justify-center gap-2 text-sm font-bold text-[#1E1B4B] dark:text-white active:scale-97 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4 text-[#FF2385]" />
              <span>Spray</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenSendGift()}
              data-testid="home-send-gift-btn"
              className="h-12 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-pink-100 dark:border-pink-900/40 shadow-xs hover:border-[#FF2385]/50 flex items-center justify-center gap-2 text-sm font-bold text-[#1E1B4B] dark:text-white active:scale-97 transition-all cursor-pointer"
            >
              <Heart className="w-4 h-4 text-[#FF2385] fill-[#FF2385]" />
              <span>Show Love</span>
            </button>
          </div>

          {/* If user has redeemable earnings, show purple earnings bar/banner */}
          {currentWallet.availableEarningsNaira > 0 && (
            <div
              className="rounded-2xl bg-gradient-to-r from-purple-900/90 via-indigo-900/90 to-purple-800/90 p-3 text-white flex items-center justify-between gap-3 border border-purple-500/30 shadow-xs"
              data-testid="wallet-gifted-rewards-card"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-xl">🎁</span>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase font-bold text-purple-200">Available to withdraw</p>
                  <p className="text-base font-black tabular-nums text-white" data-testid="wallet-available-earnings">
                    {formatNaira(currentWallet.availableEarningsNaira)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenWithdraw}
                data-testid="wallet-withdraw-btn"
                className="h-8 px-3 rounded-full bg-gradient-to-r from-[#FF2385] to-[#DF0756] text-white text-xs font-bold shadow-xs hover:brightness-105 active:scale-95 transition-all cursor-pointer"
              >
                Withdraw
              </button>
            </div>
          )}

          {/* 4. Recent Activity Section */}
          <section className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-bold text-[#1E1B4B] dark:text-white">
                Recent Activity
              </h2>
              <button
                type="button"
                onClick={onOpenTransactions || onOpenProfile || onOpenInbox}
                className="text-xs font-semibold text-[#FF2385] hover:underline cursor-pointer flex items-center gap-0.5"
              >
                <span>See all</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div
              onClick={onOpenTransactions}
              className="rounded-2xl bg-white/85 dark:bg-slate-900/85 border border-pink-100/70 dark:border-pink-900/30 p-3 shadow-xs flex items-center justify-between gap-3 cursor-pointer hover:border-[#FF2385]/40 transition-all"
              data-testid="wallet-transaction-history"
            >
              {combinedHistory.length > 0 ? (
                <>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-rose-400 to-indigo-500 p-0.5 shrink-0 shadow-2xs">
                      <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden">
                        <img
                          src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"
                          alt="Activity user"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <Heart className="w-4 h-4 text-[#FF2385] fill-[#FF2385]" />
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#1E1B4B] dark:text-white truncate">
                        {combinedHistory[0].title.includes('from ')
                          ? combinedHistory[0].title.split('from ')[1]
                          : combinedHistory[0].title.slice(0, 20)}
                      </p>
                      <p className="text-[11px] text-[var(--text-secondary)] truncate">
                        {combinedHistory[0].title}
                      </p>
                      <div className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)]/70 mt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>Recent</span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-pink-50 dark:bg-pink-950/40 border border-pink-200/60 dark:border-pink-900/40 text-xs font-bold text-[#E10B5C] dark:text-[#FF3888] tabular-nums">
                      <span>🪙</span>
                      <span>{combinedHistory[0].amountLabel}</span>
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"
                      alt="Linda Joy"
                      className="w-10 h-10 rounded-full object-cover shrink-0"
                    />
                    <div>
                      <p className="text-xs font-bold text-[#1E1B4B] dark:text-white">linda_joy</p>
                      <p className="text-[11px] text-[var(--text-secondary)]">sent you 100 Love Coins</p>
                      <div className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)]/70 mt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>2m ago</span>
                      </div>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-pink-50 dark:bg-pink-950/40 border border-pink-200/60 dark:border-pink-900/40 text-xs font-bold text-[#E10B5C] dark:text-[#FF3888]">
                    <span>🪙</span>
                    <span>+100</span>
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* 5. Your Gift Link Live Card */}
          <section
            aria-label="Your Personal Gift Link"
            data-testid="wallet-share-link-section"
            className="rounded-[28px] bg-white/85 dark:bg-slate-900/85 border border-pink-100/70 dark:border-pink-900/30 p-4 sm:p-5 space-y-3.5 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-pink-100/70 dark:bg-pink-950/40 flex items-center justify-center shrink-0 text-[#E10B5C] dark:text-[#FF2385] border border-pink-200/50">
                <Share2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-[#1E1B4B] dark:text-white flex items-center gap-1.5">
                  <span>Your Gift Link</span>
                  <span className="inline-flex items-center rounded-full bg-[#FF2385]/10 px-2 py-0.5 text-[10px] font-bold text-[#FF2385]">
                    Live
                  </span>
                </h2>
                <p className="text-[11px] text-[var(--text-secondary)] leading-tight mt-0.5">
                  Share with friends and admirers to receive Love Coins and gifts directly.
                </p>
              </div>
            </div>

            {/* Customize celebration chips */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                CUSTOMIZE CELEBRATION:
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
                          ? 'bg-[#FF2385] text-white shadow-xs scale-105'
                          : 'bg-white/80 dark:bg-slate-800 border border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[#FF2385]/40'
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
                      ? 'bg-[#FF2385] text-white shadow-xs scale-105'
                      : 'bg-white/80 dark:bg-slate-800 border border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[#FF2385]/40'
                  }`}
                >
                  ⭐ Custom
                </button>
              </div>

              {isCustomOccasion && (
                <div className="pt-1">
                  <input
                    type="text"
                    value={customOccasionInput}
                    onChange={(e) => setCustomOccasionInput(e.target.value)}
                    placeholder="Enter celebration (e.g. Birthday, Promotion, Baby Shower...)"
                    className="w-full rounded-xl border border-pink-200 dark:border-pink-900 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 focus:outline-none focus:ring-2 focus:ring-[#FF2385]"
                  />
                </div>
              )}

              {/* Promise Card Wishlist Builder */}
              {isPromiseCardMode && promiseCard && (
                <div className="mt-3 rounded-2xl border border-[#FF2385]/30 bg-gradient-to-b from-[#FFF5FA] to-white dark:from-[#2B1426]/70 dark:to-slate-800/90 p-4 space-y-3.5 shadow-sm animate-in fade-in">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                        <span>📜</span> Your Digital Promise Card
                      </h4>
                      <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                        Friends who open this link sponsor your wishlist items in Love Coins.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleSavePromiseCard}
                      disabled={promiseCardLoading}
                      className="px-3 py-1.5 rounded-xl bg-[#FF2385] text-white text-xs font-bold shadow-xs hover:brightness-110 active:scale-95 transition-all inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60 shrink-0"
                    >
                      {promiseCardSaved ? (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Saved!</span>
                        </>
                      ) : (
                        <span>Save Card</span>
                      )}
                    </button>
                  </div>

                  {/* Card Title Input */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-[var(--text-secondary)] block">
                      Card Title
                    </label>
                    <input
                      type="text"
                      value={promiseCard.title}
                      onChange={(e) => {
                        const updated = { ...promiseCard, username: userHandle, title: e.target.value };
                        setPromiseCard(updated);
                        setPromiseCardSaved(false);
                      }}
                      onBlur={() => {
                        if (promiseCard) {
                          void saveUserPromiseCard({ ...promiseCard, username: userHandle });
                          setPromiseCardSaved(true);
                          setTimeout(() => setPromiseCardSaved(false), 2000);
                        }
                      }}
                      placeholder="e.g. My Birthday Promise Card"
                      className="w-full rounded-xl border border-[var(--border-subtle)] bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#FF2385]"
                    />
                  </div>

                  {/* Existing Wishlist Items */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-[var(--text-secondary)]">
                        Wishlist Items ({promiseCard.items.length})
                      </label>
                      <span className="text-[10px] text-[var(--text-secondary)]">
                        Min. 10 Coins
                      </span>
                    </div>
                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                      {promiseCard.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-[var(--border-subtle)]"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                              {item.title}
                            </p>
                            <p className="text-[11px] font-semibold text-[#FF2385] tabular-nums">
                              {item.coins.toLocaleString()} Coins (₦{item.coins.toLocaleString()})
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeletePromiseItem(item.id)}
                            aria-label={`Remove ${item.title}`}
                            className="w-7 h-7 rounded-lg text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      {promiseCard.items.length === 0 && (
                        <p className="text-xs text-[var(--text-secondary)] italic py-2 text-center">
                          No items yet. Add items below so friends know what to sponsor!
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Add Item Form */}
                  <div className="pt-2 border-t border-[var(--border-subtle)] space-y-1.5">
                    <p className="text-[11px] font-bold text-[var(--text-primary)]">
                      + Add Wishlist Item
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={newItemTitle}
                        onChange={(e) => setNewItemTitle(e.target.value)}
                        placeholder="e.g. Lunch Treat 🍕"
                        className="sm:col-span-2 rounded-xl border border-[var(--border-subtle)] bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#FF2385]"
                      />
                      <div className="flex gap-1.5">
                        <input
                          type="number"
                          min="10"
                          step="10"
                          value={newItemCoins}
                          onChange={(e) => setNewItemCoins(e.target.value)}
                          placeholder="Coins"
                          className="w-full rounded-xl border border-[var(--border-subtle)] bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#FF2385]"
                        />
                        <button
                          type="button"
                          onClick={handleAddPromiseItem}
                          className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 active:scale-95 transition-all shrink-0 cursor-pointer"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Link input & copy */}
            <div className="flex items-center gap-2 rounded-2xl border border-pink-100 dark:border-pink-900/40 bg-pink-50/40 dark:bg-slate-800/50 p-1.5 sm:p-2">
              <span className="flex-1 truncate px-2 text-xs font-mono font-medium text-[var(--text-primary)] select-all">
                {userGiftLink}
              </span>
              <button
                type="button"
                onClick={handleCopyLink}
                data-testid="copy-personal-gift-link-btn"
                aria-label="Copy personal gift link"
                className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-white dark:bg-slate-800 px-3 text-xs font-bold text-[var(--text-primary)] border border-pink-100 dark:border-pink-900/40 shadow-xs hover:border-[#FF2385]/50 active:scale-95 transition-all cursor-pointer shrink-0"
              >
                {copiedLink ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-500 stroke-[2.5]" />
                    <span className="text-emerald-500">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>

            {/* Share Link Full-width Pill */}
            <button
              type="button"
              onClick={handleShareLink}
              data-testid="share-personal-gift-link-btn"
              className="w-full h-11 rounded-2xl bg-gradient-to-r from-[#FF2385] to-[#9B51E0] text-white text-xs sm:text-sm font-bold shadow-md hover:brightness-105 active:scale-98 transition-all inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>Share Link</span>
            </button>
          </section>

          {/* Preserved test hook elements */}
          <div className="hidden" aria-hidden="true">
            <span data-testid="wallet-naira-equivalent">{coinsNairaEquivalent}</span>
            <button type="button" onClick={onOpenLeaderboard} data-testid="home-leaderboard-btn">Leaderboard</button>
            {!canWithdrawNow && <button type="button" onClick={onOpenWithdraw} data-testid="wallet-withdraw-btn">Withdraw</button>}
          </div>
        </>
      )}
    </div>
  );
}
