import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Gift, Home, Loader2, Send, User } from 'lucide-react';
import { ShowmeloveProvider, useShowmelove } from './context/ShowmeloveContext';
import { ComposeAndCheckoutScreen } from './components/ComposeAndCheckoutScreen';
import { InboxAndWalletScreen } from './components/InboxAndWalletScreen';
import { WalletScreen } from './components/WalletScreen';
import { BalanceInfoScreen } from './components/BalanceInfoScreen';
import { BuyCoinsScreen } from './components/BuyCoinsScreen';
import { WithdrawScreen } from './components/WithdrawScreen';
import { ProfileSettingsScreen } from './components/ProfileSettingsScreen';
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
  | { page: 'profile' }
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
  if (path === '/profile' || path === '/settings') return { page: 'profile' };
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
    case 'profile':
      return '/profile';
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
        <div className="apple-card rounded-[28px] p-8 text-center space-y-3">
          <Loader2 className="w-7 h-7 animate-spin text-[#E10B5C] dark:text-[#FF2E7E] mx-auto" />
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
        <div className="max-w-md w-full apple-card rounded-[28px] p-8 text-center space-y-4">
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
              className="min-h-[44px] px-4 py-2 rounded-2xl cta-pink-surface text-white text-sm font-semibold transition-all"
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
  const { state } = useShowmelove();

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

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

  const isHomeTab =
    route.page === 'home' ||
    route.page === 'wallet' ||
    route.page === 'balance-info' ||
    route.page === 'buy-coins' ||
    route.page === 'withdraw';
  const isSendTab = route.page === 'send';
  const isInboxTab = route.page === 'inbox';
  const isProfileTab = route.page === 'profile' || route.page === 'admin';

  // Count unopened gifts for the signed-in user to show a subtle dot on Inbox
  const signedInEmail = state.signedInEmail.toLowerCase();
  const hasUnopenedInbox =
    state.activeRole !== 'guest' &&
    Boolean(signedInEmail) &&
    state.gifts.some(
      (g) =>
        g.recipientEmail.toLowerCase() === signedInEmail && !g.claimedAt,
    );

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] flex flex-col transition-colors">
      {/* Compact Three-Zone Top Bar (56px height) */}
      <header className="sticky top-0 z-30 h-14 bg-[var(--nav-glass)] backdrop-blur-xl border-b border-[var(--border-subtle)]">
        <div className="max-w-5xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-3">
          {/* Zone 1: Brand Wordmark */}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              navigate({ page: 'home' });
            }}
            className="inline-flex items-center gap-2 font-bold text-[17px] sm:text-xl tracking-tight text-[var(--text-primary)] whitespace-nowrap shrink-0"
          >
            <LoveCoinHeartSvg className="w-7 h-7 shrink-0" />
            <span>
              Showme
              <span className="text-[#E10B5C] dark:text-[#FF2E7E]">love</span>
            </span>
          </a>

          {/* Zone 2: Desktop Navigation */}
          <nav
            aria-label="Primary"
            className="hidden md:flex items-center gap-1 p-1 rounded-2xl bg-[var(--bg-raised)]/80 border border-[var(--border-subtle)] text-sm font-semibold text-[var(--text-secondary)]"
          >
            {[
              { id: 'home', label: 'Home', active: isHomeTab, href: '/', route: { page: 'home' as const } },
              { id: 'send', label: 'Send', active: isSendTab, href: '/send', route: { page: 'send' as const } },
              { id: 'inbox', label: 'Inbox', active: isInboxTab, href: '/inbox', route: { page: 'inbox' as const } },
              { id: 'profile', label: 'Profile', active: isProfileTab, href: '/profile', route: { page: 'profile' as const } },
            ].map((item) => (
              <a
                key={item.id}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(item.route);
                }}
                className={`relative px-3.5 py-1.5 rounded-xl transition-all whitespace-nowrap shrink-0 ${
                  item.active
                    ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                    : 'hover:text-[var(--text-primary)]'
                }`}
              >
                {item.label}
                {item.id === 'inbox' && hasUnopenedInbox && (
                  <span
                    aria-hidden="true"
                    className="inline-block w-1.5 h-1.5 rounded-full bg-[#E10B5C] dark:bg-[#FF2E7E] ml-1.5 align-middle"
                  />
                )}
              </a>
            ))}
          </nav>

          {/* Zone 3: Account Popover (sm+) + Single Primary CTA */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:block">
              <DemoControlsPanel onNavigateAdmin={() => navigate({ page: 'admin' })} />
            </div>
            <button
              type="button"
              onClick={() => navigate({ page: 'send' })}
              data-testid="topbar-send-gift-btn"
              className="min-h-[38px] sm:min-h-[40px] px-3.5 sm:px-4 py-1.5 rounded-xl cta-pink-surface text-white text-xs sm:text-sm font-semibold transition-all whitespace-nowrap shrink-0"
            >
              Send a gift
            </button>
          </div>
        </div>
      </header>

      {/* Main Content with Subtle Framer Motion Route Transitions */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 pt-5 sm:pt-7 pb-24 md:pb-12">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={route.page}
            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: reducedMotion ? 0 : 0.18, ease: 'easeOut' }}
          >
            {(route.page === 'home' || route.page === 'wallet') && (
              <WalletScreen
                onOpenBalanceInfo={() => navigate({ page: 'balance-info' })}
                onOpenBuyCoins={() => navigate({ page: 'buy-coins' })}
                onOpenWithdraw={() => navigate({ page: 'withdraw' })}
                onOpenSendGift={(giftCatalogId) =>
                  navigate({ page: 'send', giftCatalogId })
                }
                onOpenInbox={() => navigate({ page: 'inbox' })}
                onOpenProfile={() => navigate({ page: 'profile' })}
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
                onGoToWallet={() => navigate({ page: 'home' })}
                onGoToWithdraw={() => navigate({ page: 'withdraw' })}
                onSendGift={() => navigate({ page: 'send' })}
                onTrySampleReveal={() =>
                  navigate({ page: 'reveal', giftId: BUNDLED_SAMPLE_GIFT.id })
                }
              />
            )}

            {route.page === 'balance-info' && (
              <BalanceInfoScreen
                onBack={() => navigate({ page: 'home' })}
                onBuyCoins={() => navigate({ page: 'buy-coins' })}
                onWithdraw={() => navigate({ page: 'withdraw' })}
              />
            )}

            {route.page === 'buy-coins' && (
              <BuyCoinsScreen
                onBack={() => navigate({ page: 'home' })}
                onGoToSendGift={() => navigate({ page: 'send' })}
              />
            )}

            {route.page === 'withdraw' && (
              <WithdrawScreen
                onBack={() => navigate({ page: 'home' })}
                onSendGift={() => navigate({ page: 'send' })}
                onOpenInbox={() => navigate({ page: 'inbox' })}
              />
            )}

            {route.page === 'profile' && (
              <ProfileSettingsScreen
                onOpenBalanceInfo={() => navigate({ page: 'balance-info' })}
                onOpenAdmin={() => navigate({ page: 'admin' })}
                onOpenBuyCoins={() => navigate({ page: 'buy-coins' })}
                onOpenWithdraw={() => navigate({ page: 'withdraw' })}
              />
            )}

            {route.page === 'admin' && <AdminScreen />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Glassmorphic 4-Tab Mobile Bottom Bar matching Mockup 05 (Home / Send / Inbox / Profile) */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 h-16 bg-[var(--nav-glass)] backdrop-blur-xl border-t border-[var(--border-subtle)] grid grid-cols-4 items-center px-2 pb-safe"
      >
        {[
          {
            id: 'home',
            testId: 'mobile-nav-home',
            label: 'Home',
            icon: Home,
            active: isHomeTab,
            onClick: () => navigate({ page: 'home' }),
          },
          {
            id: 'send',
            testId: 'mobile-nav-send',
            label: 'Send',
            icon: Send,
            active: isSendTab,
            onClick: () => navigate({ page: 'send' }),
          },
          {
            id: 'inbox',
            testId: 'mobile-nav-inbox',
            label: 'Inbox',
            icon: Gift,
            active: isInboxTab,
            badge: hasUnopenedInbox,
            onClick: () => navigate({ page: 'inbox' }),
          },
          {
            id: 'profile',
            testId: 'mobile-nav-profile',
            label: 'Profile',
            icon: User,
            active: isProfileTab,
            onClick: () => navigate({ page: 'profile' }),
          },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={tab.onClick}
              data-testid={tab.testId}
              className="h-full flex items-center justify-center"
            >
              <span
                className={`relative flex flex-col items-center justify-center gap-0.5 px-3.5 py-1.5 rounded-2xl text-[11px] font-semibold transition-all ${
                  tab.active
                    ? 'bg-[#FFEAF2] dark:bg-[#2A183D] text-[#E10B5C] dark:text-[#FF5B9A] shadow-sm'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    aria-hidden="true"
                    className="absolute top-1 right-2.5 w-2 h-2 rounded-full bg-[#E10B5C] dark:bg-[#FF2E7E]"
                  />
                )}
              </span>
            </button>
          );
        })}
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
