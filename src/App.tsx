import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Bell, Home, Inbox, Loader2, Send, User } from 'lucide-react';
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
import { SprayCoinsScreen } from './components/SprayCoinsScreen';
import { LeaderboardScreen } from './components/LeaderboardScreen';
import { LoveCoinHeartSvg } from './components/GiftArtwork';
import { BUNDLED_SAMPLE_GIFT } from './services/seedData';
import { stopAllConfetti } from './utils/confettiEffects';
import {
  PageTransition,
  SharedLayout,
  StaggerContainer,
  StaggerItem,
} from './components/PageTransition';
import { springs, usePrefersReducedMotion } from './lib/animation';
import { Shimmer } from './components/ui/MotionPrimitives';

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
  | { page: 'spray-coins' }
  | { page: 'leaderboard' }
  | { page: 'reveal'; giftId: string };

function parseLocationRoute(): AppRoute {
  if (typeof window === 'undefined') return { page: 'home' };
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  const params = new URLSearchParams(window.location.search);

  if (params.get('admin') === '1') {
    try {
      window.localStorage.setItem('showmelove_demo_admin', '1');
    } catch {
      // Ignore storage errors
    }
  } else if (params.get('admin') === '0') {
    try {
      window.localStorage.removeItem('showmelove_demo_admin');
    } catch {
      // Ignore storage errors
    }
  }

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
  if (path === '/spray-coins') return { page: 'spray-coins' };
  if (path === '/leaderboard') return { page: 'leaderboard' };

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
    case 'spray-coins':
      return '/spray-coins';
    case 'leaderboard':
      return '/leaderboard';
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
      <div className="min-h-screen bg-[#09090D] text-[#FAF8FC] flex items-center justify-center px-4">
        <div className="rounded-[28px] bg-[#14131B] border border-white/10 p-8 text-center space-y-3">
          <Loader2 className="w-7 h-7 animate-spin text-[#FF2385] mx-auto" />
          <Shimmer className="h-2.5 w-36 rounded-full mx-auto" />
          <p className="text-sm font-medium text-[#ADA4BA]">
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
              className="min-h-[44px] px-4 py-2 rounded-2xl cta-pink-surface text-white text-sm font-semibold transition-all cursor-pointer"
            >
              Open sample reveal
            </button>
            <button
              type="button"
              onClick={onExit}
              className="min-h-[44px] px-4 py-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-raised)] text-sm font-semibold text-[var(--text-primary)] hover:opacity-90 transition-opacity cursor-pointer"
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

function getProfileInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function ShowmeloveShell() {
  const [route, setRoute] = useState<AppRoute>(() => parseLocationRoute());
  const { state } = useShowmelove();

  const reducedMotion = usePrefersReducedMotion();

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

  const signedInEmail = state.signedInEmail.toLowerCase();
  const isSignedIn = state.activeRole !== 'guest' && Boolean(signedInEmail);
  const unopenedCount = isSignedIn
    ? state.gifts.filter(
        (g) => g.recipientEmail.toLowerCase() === signedInEmail && !g.claimedAt,
      ).length
    : 0;
  const initials = isSignedIn ? getProfileInitials(state.signedInName) : '';

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] flex flex-col transition-colors">
      {/* Compact Apple-Level Top Bar: Wordmark + Desktop Nav + Notification Bell & Profile Avatar */}
      <header className="sticky top-0 z-30 h-14 bg-[var(--nav-glass)] backdrop-blur-xl border-b border-[var(--border-subtle)]">
        <div className="max-w-4xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-3">
          {/* Left: Brand Wordmark */}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              navigate({ page: 'home' });
            }}
            className="inline-flex items-center gap-2 font-bold text-[17px] sm:text-lg tracking-tight text-[var(--text-primary)] whitespace-nowrap shrink-0"
          >
            <SharedLayout id="showmelove-brand-mark" className="shrink-0">
              <LoveCoinHeartSvg className="w-7 h-7" priority />
            </SharedLayout>
            <span>
              Showme
              <span className="text-[#E61472] dark:text-[#FF2385]">love</span>
            </span>
          </a>

          {/* Center: Clean Desktop Navigation */}
          <nav
            aria-label="Primary"
            className="hidden md:flex items-center gap-1 p-1 rounded-2xl bg-[var(--bg-raised)]/85 border border-[var(--border-subtle)] text-sm font-semibold text-[var(--text-secondary)]"
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
                className={`relative px-3.5 py-1.5 rounded-xl whitespace-nowrap shrink-0 ${
                  item.active
                    ? 'text-[var(--text-primary)]'
                    : 'hover:text-[var(--text-primary)]'
                }`}
              >
                {item.active && (
                  <motion.span
                    layoutId={reducedMotion ? undefined : 'desktop-nav-active'}
                    className="absolute inset-0 rounded-xl bg-[var(--bg-card)] shadow-sm ring-1 ring-[#FF2385]/20 dark:ring-[#FF2385]/30"
                    transition={springs.springSnappy}
                  />
                )}
                <span className="relative z-10">{item.label}</span>
                {item.id === 'inbox' && unopenedCount > 0 && (
                  <span
                    aria-hidden="true"
                    className="inline-block w-1.5 h-1.5 rounded-full bg-[#FF2385] ml-1.5 align-middle"
                  />
                )}
              </a>
            ))}
          </nav>

          {/* Right: Notification Button + Profile Avatar (Clean on Mobile & Desktop) */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => navigate({ page: 'inbox' })}
              aria-label={
                unopenedCount > 0
                  ? `Notifications: ${unopenedCount} unopened gift${unopenedCount > 1 ? 's' : ''}`
                  : 'Notifications and Gift Inbox'
              }
              data-testid="topbar-notifications-btn"
              className={`relative w-10 h-10 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                isInboxTab
                  ? 'border-[#FF2385]/45 bg-[#FFE8F2] dark:bg-[#2A152C] text-[#E61472] dark:text-[#FF559F]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-raised)]'
              }`}
            >
              <Bell className="w-[18px] h-[18px]" />
              {unopenedCount > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#FF2385] ring-2 ring-[var(--bg-card)]"
                />
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate({ page: 'profile' })}
              aria-label="Open profile and settings"
              data-testid="topbar-profile-avatar-btn"
              className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
                isProfileTab
                  ? 'cta-pink-surface text-white shadow-[0_6px_18px_-4px_rgba(255,35,133,0.6)]'
                  : 'bg-gradient-to-br from-[#FF2385]/18 to-[#7C3AED]/22 dark:from-[#FF2385]/30 dark:to-[#7C3AED]/38 border border-[#FF2385]/25 dark:border-[#FF2385]/35 text-[var(--text-primary)] hover:brightness-105'
              }`}
            >
              {initials ? (
                <span>{initials}</span>
              ) : (
                <User className="w-[18px] h-[18px]" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Centered App Canvas with Smooth Framer Motion Page Transitions */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 pt-5 sm:pt-7 pb-24 md:pb-12">
        <AnimatePresence mode="wait" initial={false}>
          <PageTransition key={route.page} type="shared-axis">
            <StaggerContainer delay={0} stagger={0.12}>
              <StaggerItem>
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
                onOpenSpray={() => navigate({ page: 'spray-coins' })}
                onOpenLeaderboard={() => navigate({ page: 'leaderboard' })}
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

            {route.page === 'spray-coins' && (
              <SprayCoinsScreen onBack={() => navigate({ page: 'home' })} />
            )}

            {route.page === 'leaderboard' && (
              <LeaderboardScreen onBack={() => navigate({ page: 'home' })} />
            )}
              </StaggerItem>
            </StaggerContainer>
          </PageTransition>
        </AnimatePresence>
      </main>

      {/* Persistent Mobile Bottom Navigation with Soft Pink/Purple Active Glow */}
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
            icon: Inbox,
            active: isInboxTab,
            badge: unopenedCount > 0,
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
              className="h-full flex items-center justify-center cursor-pointer"
            >
              <motion.span
                layout
                transition={springs.springSnappy}
                className={`relative flex flex-col items-center justify-center gap-0.5 px-4 py-1.5 rounded-2xl text-[11px] font-semibold transition-all ${
                  tab.active
                    ? 'bg-gradient-to-br from-[#FF2385]/16 to-[#7C3AED]/20 dark:from-[#FF2385]/26 dark:to-[#7C3AED]/34 text-[#E61472] dark:text-[#FF62A9] ring-1 ring-[#FF2385]/30 dark:ring-[#FF2385]/40 shadow-[0_0_20px_-4px_rgba(255,35,133,0.45)]'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    aria-hidden="true"
                    className="absolute top-1 right-2.5 w-2 h-2 rounded-full bg-[#FF2385]"
                  />
                )}
              </motion.span>
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
