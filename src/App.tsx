import { useCallback, useEffect, useState } from 'react';
import { Gift, Inbox, Loader2, Wallet } from 'lucide-react';
import { ShowmeloveProvider, useShowmelove } from './context/ShowmeloveContext';
import { HomeScreen } from './components/HomeScreen';
import { ComposeAndCheckoutScreen } from './components/ComposeAndCheckoutScreen';
import { InboxAndWalletScreen } from './components/InboxAndWalletScreen';
import { WalletScreen } from './components/WalletScreen';
import { BalanceInfoScreen } from './components/BalanceInfoScreen';
import { BuyCoinsScreen } from './components/BuyCoinsScreen';
import { WithdrawScreen } from './components/WithdrawScreen';
import { AdminScreen } from './components/AdminScreen';
import { GiftRevealExperience } from './components/GiftRevealExperience';
import { DemoControlsPanel } from './components/DemoControlsPanel';
import { LoveCoinHeartSvg } from './components/GiftArtwork';
import { BUNDLED_SAMPLE_GIFT } from './services/seedData';
import { stopAllConfetti } from './utils/confettiEffects';

type AppRoute =
  | { page: 'home' }
  | { page: 'send'; giftCatalogId?: string }
  | { page: 'inbox' }
  | { page: 'wallet' }
  | { page: 'balance-info' }
  | { page: 'buy-coins' }
  | { page: 'withdraw' }
  | { page: 'admin' }
  | { page: 'reveal'; giftId: string };

function parseLocationRoute(): AppRoute {
  if (typeof window === 'undefined') return { page: 'home' };
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  const params = new URLSearchParams(window.location.search);

  if (path === '/sample' || path === '/gift/sample') {
    return { page: 'reveal', giftId: BUNDLED_SAMPLE_GIFT.id };
  }
  if (path.startsWith('/gift/')) {
    const giftId = decodeURIComponent(path.slice('/gift/'.length));
    if (giftId) return { page: 'reveal', giftId };
  }
  if (path === '/send') {
    return { page: 'send', giftCatalogId: params.get('gift') || undefined };
  }
  if (path === '/inbox') return { page: 'inbox' };
  if (path === '/wallet') return { page: 'wallet' };
  if (path === '/balance-info') return { page: 'balance-info' };
  if (path === '/buy-coins') return { page: 'buy-coins' };
  if (path === '/withdraw') return { page: 'withdraw' };
  if (path === '/admin') return { page: 'admin' };

  return { page: 'home' };
}

function routeToPath(route: AppRoute): string {
  switch (route.page) {
    case 'home':
      return '/';
    case 'send':
      return route.giftCatalogId
        ? `/send?gift=${encodeURIComponent(route.giftCatalogId)}`
        : '/send';
    case 'inbox':
      return '/inbox';
    case 'wallet':
      return '/wallet';
    case 'balance-info':
      return '/balance-info';
    case 'buy-coins':
      return '/buy-coins';
    case 'withdraw':
      return '/withdraw';
    case 'admin':
      return '/admin';
    case 'reveal':
      return `/gift/${encodeURIComponent(route.giftId)}`;
  }
}

function RevealRouteView({
  giftId,
  onExit,
  onGoToInbox,
}: {
  giftId: string;
  onExit: () => void;
  onGoToInbox: () => void;
}) {
  const { getGiftById, resolveGiftAsync } = useShowmelove();
  const syncGift = getGiftById(giftId);
  const [checkingRemote, setCheckingRemote] = useState(!syncGift);

  useEffect(() => {
    if (syncGift) {
      setCheckingRemote(false);
      return;
    }
    let cancelled = false;
    setCheckingRemote(true);
    void resolveGiftAsync(giftId).finally(() => {
      if (!cancelled) setCheckingRemote(false);
    });
    return () => {
      cancelled = true;
    };
  }, [giftId, syncGift, resolveGiftAsync]);

  if (checkingRemote && !syncGift) {
    return (
      <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] flex items-center justify-center px-4">
        <div className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-8 text-center space-y-3 shadow-sm">
          <Loader2 className="w-7 h-7 animate-spin text-[#DF0756] dark:text-[#FF176C] mx-auto" />
          <p className="text-sm font-medium text-[var(--text-secondary)]">
            Opening your gift link…
          </p>
        </div>
      </div>
    );
  }

  if (!syncGift) {
    return (
      <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-8 text-center space-y-4 shadow-sm">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Gift link not found
          </h1>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            This demo link wasn&apos;t found in this browser&apos;s storage. Without an optional Supabase sync backend, newly created demo links only open on the browser where they were created — or you can open the bundled sample reveal instead.
          </p>
          <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-2">
            <button
              type="button"
              onClick={() => {
                window.history.pushState({}, '', `/gift/${BUNDLED_SAMPLE_GIFT.id}`);
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              className="min-h-[44px] px-4 py-2 rounded-2xl bg-[#DF0756] hover:bg-[#C00549] dark:bg-[#FF176C] dark:hover:bg-[#E0105D] text-white text-sm font-semibold transition-colors"
            >
              Open sample reveal
            </button>
            <button
              type="button"
              onClick={onExit}
              className="min-h-[44px] px-4 py-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-raised)] text-sm font-semibold text-[var(--text-primary)] hover:opacity-90 transition-opacity"
            >
              Go home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <GiftRevealExperience
      gift={syncGift}
      onExit={onExit}
      onGoToInbox={onGoToInbox}
    />
  );
}

function ShowmeloveShell() {
  const [route, setRoute] = useState<AppRoute>(() => parseLocationRoute());

  const navigate = useCallback((next: AppRoute) => {
    if (next.page !== 'reveal') {
      stopAllConfetti();
    }
    const targetPath = routeToPath(next);
    if (
      typeof window !== 'undefined' &&
      window.location.pathname + window.location.search !== targetPath
    ) {
      window.history.pushState({}, '', targetPath);
    }
    setRoute(next);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  useEffect(() => {
    const onPopState = () => {
      const nextRoute = parseLocationRoute();
      if (nextRoute.page !== 'reveal') {
        stopAllConfetti();
      }
      setRoute(nextRoute);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  if (route.page === 'reveal') {
    return (
      <RevealRouteView
        giftId={route.giftId}
        onExit={() => navigate({ page: 'home' })}
        onGoToInbox={() => navigate({ page: 'inbox' })}
      />
    );
  }

  const isGiftsTab = route.page === 'home' || route.page === 'send';
  const isInboxTab = route.page === 'inbox';
  const isWalletTab =
    route.page === 'wallet' ||
    route.page === 'balance-info' ||
    route.page === 'buy-coins' ||
    route.page === 'withdraw';

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] flex flex-col transition-colors">
      {/* Compact Three-Zone Top Bar (56px height) */}
      <header className="sticky top-0 z-30 h-14 bg-[var(--bg-page)]/95 border-b border-[var(--border-subtle)]">
        <div className="max-w-6xl mx-auto h-full px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4">
          {/* Zone 1: Brand Wordmark */}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              navigate({ page: 'home' });
            }}
            className="inline-flex items-center gap-1.5 sm:gap-2 font-bold text-base sm:text-xl tracking-tight text-[var(--text-primary)] whitespace-nowrap shrink-0"
          >
            <LoveCoinHeartSvg className="w-6 h-6 sm:w-7 sm:h-7 shrink-0" />
            <span>Showmelove</span>
          </a>

          {/* Zone 2: Desktop Navigation */}
          <nav
            aria-label="Primary"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-[var(--text-secondary)]"
          >
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                navigate({ page: 'home' });
              }}
              className={`hover:text-[var(--text-primary)] transition-colors whitespace-nowrap shrink-0 ${
                route.page === 'home'
                  ? 'text-[var(--text-primary)] font-semibold underline underline-offset-4 decoration-[#DF0756] dark:decoration-[#FF176C]'
                  : ''
              }`}
            >
              Gifts
            </a>
            <a
              href="/inbox"
              onClick={(e) => {
                e.preventDefault();
                navigate({ page: 'inbox' });
              }}
              className={`hover:text-[var(--text-primary)] transition-colors whitespace-nowrap shrink-0 ${
                route.page === 'inbox'
                  ? 'text-[var(--text-primary)] font-semibold underline underline-offset-4 decoration-[#DF0756] dark:decoration-[#FF176C]'
                  : ''
              }`}
            >
              Inbox
            </a>
            <a
              href="/wallet"
              onClick={(e) => {
                e.preventDefault();
                navigate({ page: 'wallet' });
              }}
              className={`hover:text-[var(--text-primary)] transition-colors whitespace-nowrap shrink-0 ${
                isWalletTab
                  ? 'text-[var(--text-primary)] font-semibold underline underline-offset-4 decoration-[#DF0756] dark:decoration-[#FF176C]'
                  : ''
              }`}
            >
              Wallet
            </a>
            <a
              href="/gift/sample"
              onClick={(e) => {
                e.preventDefault();
                navigate({ page: 'reveal', giftId: BUNDLED_SAMPLE_GIFT.id });
              }}
              className="hover:text-[var(--text-primary)] transition-colors whitespace-nowrap shrink-0"
            >
              Sample Reveal
            </a>
          </nav>

          {/* Zone 3: Send CTA + Account/Theme Popover */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <DemoControlsPanel onNavigateAdmin={() => navigate({ page: 'admin' })} />
            <button
              type="button"
              onClick={() => navigate({ page: 'send' })}
              className="min-h-[38px] sm:min-h-[40px] px-2.5 sm:px-4 py-1.5 rounded-xl bg-[#DF0756] hover:bg-[#C00549] dark:bg-[#FF176C] dark:hover:bg-[#E0105D] text-white text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              Send a gift
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-5 sm:pt-7 pb-20 md:pb-10">
        {route.page === 'home' && (
          <HomeScreen
            onStartSend={(giftCatalogId) => navigate({ page: 'send', giftCatalogId })}
            onTrySampleReveal={() =>
              navigate({ page: 'reveal', giftId: BUNDLED_SAMPLE_GIFT.id })
            }
          />
        )}

        {route.page === 'send' && (
          <ComposeAndCheckoutScreen
            initialGiftCatalogId={route.giftCatalogId}
            onBackHome={() => navigate({ page: 'home' })}
            onOpenGiftLink={(giftId) => navigate({ page: 'reveal', giftId })}
            onGoToCoins={() => navigate({ page: 'buy-coins' })}
          />
        )}

        {route.page === 'inbox' && (
          <InboxAndWalletScreen
            onOpenGift={(giftId) => navigate({ page: 'reveal', giftId })}
            onGoToWallet={() => navigate({ page: 'wallet' })}
            onGoToWithdraw={() => navigate({ page: 'withdraw' })}
            onSendGift={() => navigate({ page: 'send' })}
            onTrySampleReveal={() =>
              navigate({ page: 'reveal', giftId: BUNDLED_SAMPLE_GIFT.id })
            }
          />
        )}

        {route.page === 'wallet' && (
          <WalletScreen
            onOpenBalanceInfo={() => navigate({ page: 'balance-info' })}
            onOpenBuyCoins={() => navigate({ page: 'buy-coins' })}
            onOpenWithdraw={() => navigate({ page: 'withdraw' })}
            onOpenSendGift={() => navigate({ page: 'send' })}
            onOpenInbox={() => navigate({ page: 'inbox' })}
          />
        )}

        {route.page === 'balance-info' && (
          <BalanceInfoScreen
            onBack={() => navigate({ page: 'wallet' })}
            onBuyCoins={() => navigate({ page: 'buy-coins' })}
            onWithdraw={() => navigate({ page: 'withdraw' })}
          />
        )}

        {route.page === 'buy-coins' && (
          <BuyCoinsScreen
            onBack={() => navigate({ page: 'wallet' })}
            onGoToSendGift={() => navigate({ page: 'send' })}
          />
        )}

        {route.page === 'withdraw' && (
          <WithdrawScreen
            onBack={() => navigate({ page: 'wallet' })}
            onSendGift={() => navigate({ page: 'send' })}
            onOpenInbox={() => navigate({ page: 'inbox' })}
          />
        )}

        {route.page === 'admin' && <AdminScreen />}
      </main>

      {/* Compact 3-Tab Mobile Bottom Navigation (56px height, total sticky chrome 112px <= 13.3% of 844px) */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 h-14 bg-[var(--bg-card)] border-t border-[var(--border-subtle)] grid grid-cols-3 items-center pb-safe"
      >
        <button
          type="button"
          onClick={() => navigate({ page: 'home' })}
          data-testid="mobile-nav-gifts"
          className={`h-full flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors ${
            isGiftsTab
              ? 'text-[#DF0756] dark:text-[#FF176C]'
              : 'text-[var(--text-secondary)]'
          }`}
        >
          <Gift className="w-4 h-4" />
          <span>Gifts</span>
        </button>

        <button
          type="button"
          onClick={() => navigate({ page: 'inbox' })}
          data-testid="mobile-nav-inbox"
          className={`h-full flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors ${
            isInboxTab
              ? 'text-[#DF0756] dark:text-[#FF176C]'
              : 'text-[var(--text-secondary)]'
          }`}
        >
          <Inbox className="w-4 h-4" />
          <span>Inbox</span>
        </button>

        <button
          type="button"
          onClick={() => navigate({ page: 'wallet' })}
          data-testid="mobile-nav-wallet"
          className={`h-full flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors ${
            isWalletTab
              ? 'text-[#DF0756] dark:text-[#FF176C]'
              : 'text-[var(--text-secondary)]'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Wallet</span>
        </button>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <ShowmeloveProvider>
      <ShowmeloveShell />
    </ShowmeloveProvider>
  );
}
