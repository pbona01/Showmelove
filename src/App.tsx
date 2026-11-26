import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Bell, Home, Inbox, Loader2, Send, ShieldAlert, Trophy, User } from 'lucide-react';
import { isAdminSessionUnlocked, isUserAdmin, lockAdminSession } from './config/admin';
import { ShowmeloveProvider, useShowmelove } from './context/ShowmeloveContext';
import { ComposeAndCheckoutScreen } from './components/ComposeAndCheckoutScreen';
import { InboxAndWalletScreen } from './components/InboxAndWalletScreen';
import { WalletScreen } from './components/WalletScreen';
import { BalanceInfoScreen } from './components/BalanceInfoScreen';
import { BuyCoinsScreen } from './components/BuyCoinsScreen';
import { WithdrawScreen } from './components/WithdrawScreen';
import { ProfileSettingsScreen } from './components/ProfileSettingsScreen';
import { AdminScreen } from './components/AdminScreen';
import { AdminSecurityGate } from './components/AdminSecurityGate';
import { GiftRevealExperience } from './components/GiftRevealExperience';
import { SprayCoinsScreen } from './components/SprayCoinsScreen';
import { LeaderboardScreen } from './components/LeaderboardScreen';
import { TransactionHistoryScreen } from './components/TransactionHistoryScreen';
import { AuthScreen } from './components/AuthScreen';
import { PaymentVerificationScreen } from './components/PaymentVerificationScreen';
import { PromiseCardGivingScreen } from './components/PromiseCardGivingScreen';
import { LoveCoinHeartSvg, ShowmeloveBrandIcon } from './components/GiftArtwork';
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
import { isSupabaseAuthConfigured, supabase } from './lib/supabase';

type AppRoute =
  | { page: 'home' }
  | {
      page: 'send';
      giftCatalogId?: string;
      recipientEmail?: string;
      recipientName?: string;
      occasion?: string;
    }
  | { page: 'inbox' }
  | { page: 'wallet' }
  | { page: 'balance-info' }
  | { page: 'buy-coins' }
  | { page: 'withdraw' }
  | { page: 'profile' }
  | { page: 'admin' }
  | { page: 'spray-coins' }
  | { page: 'leaderboard' }
  | { page: 'transactions' }
  | { page: 'sign-in' }
  | { page: 'payment-verify' }
  | { page: 'promise-card'; recipientHandle: string }
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
  if (path.startsWith('/promise/')) {
    const handle = decodeURIComponent(path.slice('/promise/'.length)).trim().replace(/^@/, '');
    if (handle) {
      return { page: 'promise-card', recipientHandle: handle };
    }
  }
  if (path === '/send') {
    const rawTo = params.get('to') || params.get('email') || params.get('recipient') || undefined;
    const cleanTo = rawTo ? rawTo.replace(/^@/, '') : undefined;
    if (params.get('mode') === 'promise' && cleanTo) {
      return { page: 'promise-card', recipientHandle: cleanTo };
    }
    return {
      page: 'send',
      giftCatalogId: params.get('gift') || undefined,
      recipientEmail: cleanTo,
      recipientName: cleanTo ? `@${cleanTo}` : (params.get('name') || undefined),
      occasion: params.get('for') || params.get('occasion') || undefined,
    };
  }
  if (path.startsWith('/@')) {
    const handle = decodeURIComponent(path.slice(2)).trim().replace(/^@/, '');
    if (handle) {
      return {
        page: 'send',
        recipientEmail: handle,
        recipientName: `@${handle}`,
        occasion: params.get('for') || params.get('occasion') || undefined,
      };
    }
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
  if (path === '/transactions') return { page: 'transactions' };
  if (path === '/sign-in') return { page: 'sign-in' };
  if (path === '/payments/verify') return { page: 'payment-verify' };

  return { page: 'home' };
}

function routeToPath(route: AppRoute): string {
  switch (route.page) {
    case 'home':
      return '/';
    case 'send': {
      const q = new URLSearchParams();
      if (route.giftCatalogId) q.set('gift', route.giftCatalogId);
      if (route.recipientEmail) q.set('to', route.recipientEmail);
      if (route.recipientName) q.set('name', route.recipientName);
      if (route.occasion) q.set('for', route.occasion);
      const queryStr = q.toString();
      return queryStr ? `/send?${queryStr}` : '/send';
    }
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
    case 'transactions':
      return '/transactions';
    case 'sign-in':
      return '/sign-in';
    case 'payment-verify':
      return '/payments/verify';
    case 'promise-card':
      return `/send?to=${encodeURIComponent(route.recipientHandle)}&mode=promise`;
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
  const { state, signInDemoEmail } = useShowmelove();
  const [authChecked, setAuthChecked] = useState(!isSupabaseAuthConfigured);
  const [hasLiveSession, setHasLiveSession] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(() => isAdminSessionUnlocked());

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

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }: { data: any }) => {
      setHasLiveSession(Boolean(data.session));
      setAuthChecked(true);
      if (data.session && typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    });
    const { data } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setHasLiveSession(Boolean(session));
      setAuthChecked(true);
      if (session && typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (!authChecked) {
    return <div className="min-h-screen bg-[var(--bg-page)] flex items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-[#FF2385]" /></div>;
  }

  // Recipients must be able to view their gift reveal without being forced to sign in upfront
  if (route.page === 'reveal') {
    return (
      <RevealRouteView
        giftId={route.giftId}
        onExit={() => navigate({ page: 'home' })}
        onGoToInbox={() => navigate({ page: 'inbox' })}
      />
    );
  }

  // Payment callback route
  if (route.page === 'payment-verify') {
    return <PaymentVerificationScreen onDone={() => navigate({ page: 'wallet' })} />;
  }

  // Protected routes: unauthenticated users cannot access private account actions (withdrawing, profile settings, personal inbox)
  // Public routes (sending gifts via gift links, revealing gifts, home exploration) are open to all visitors without requiring an account!
  const isProtectedRoute =
    route.page === 'withdraw' ||
    route.page === 'profile' ||
    route.page === 'inbox';

  if ((isSupabaseAuthConfigured && !hasLiveSession && isProtectedRoute) || route.page === 'sign-in') {
    return (
      <AuthScreen
        onBack={() => navigate({ page: 'home' })}
        onAdminRoute={(adminEmail?: string) => {
          if (adminEmail) {
            signInDemoEmail(adminEmail, adminEmail.split('@')[0]);
          }
          setAdminUnlocked(true);
          navigate({ page: 'admin' });
        }}
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
  const isLeaderboardTab = route.page === 'leaderboard';
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
            <ShowmeloveBrandIcon className="w-8 h-8 min-w-[32px] min-h-[32px] rounded-full border border-[var(--border-subtle)] shadow-xs" />
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
              { id: 'leaderboard', label: 'Leaderboard', active: isLeaderboardTab, href: '/leaderboard', route: { page: 'leaderboard' as const } },
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
                onOpenTransactions={() => navigate({ page: 'transactions' })}
                onTrySampleReveal={() =>
                  navigate({ page: 'reveal', giftId: BUNDLED_SAMPLE_GIFT.id })
                }
                onOpenSpray={() => navigate({ page: 'spray-coins' })}
                onOpenLeaderboard={() => navigate({ page: 'leaderboard' })}
                onOpenSignIn={() => navigate({ page: 'sign-in' })}
              />
            )}

            {route.page === 'send' && (
              <ComposeAndCheckoutScreen
                initialGiftCatalogId={route.giftCatalogId}
                initialRecipientEmail={route.recipientEmail}
                initialRecipientName={route.recipientName}
                initialOccasion={route.occasion}
                onBackHome={() => navigate({ page: 'home' })}
                onOpenGiftLink={(giftId) => navigate({ page: 'reveal', giftId })}
                onGoToCoins={() => navigate({ page: 'buy-coins' })}
              />
            )}

            {route.page === 'promise-card' && (
              <PromiseCardGivingScreen
                recipientHandle={route.recipientHandle}
                onBack={() => navigate({ page: 'home' })}
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
                onSignIn={() => navigate({ page: 'sign-in' })}
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
                onSignIn={() => navigate({ page: 'sign-in' })}
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
                onOpenBuyCoins={() => navigate({ page: 'buy-coins' })}
                onOpenWithdraw={() => navigate({ page: 'withdraw' })}
                onSignOut={() => navigate({ page: 'sign-in' })}
                onSignIn={() => navigate({ page: 'sign-in' })}
              />
            )}

            {route.page === 'admin' && (
              (adminUnlocked || isUserAdmin(state.signedInEmail)) ? (
                <AdminScreen
                  onLock={() => {
                    lockAdminSession();
                    setAdminUnlocked(false);
                    navigate({ page: 'home' });
                  }}
                />
              ) : (
                <AdminSecurityGate
                  onUnlock={() => setAdminUnlocked(true)}
                  onCancel={() => navigate({ page: 'home' })}
                />
              )
            )}

            {route.page === 'spray-coins' && (
              <SprayCoinsScreen onBack={() => navigate({ page: 'home' })} onSignIn={() => navigate({ page: 'sign-in' })} />
            )}

            {route.page === 'leaderboard' && (
              <LeaderboardScreen onBack={() => navigate({ page: 'home' })} />
            )}

            {route.page === 'transactions' && (
              <TransactionHistoryScreen
                onBack={() => navigate({ page: 'home' })}
                onOpenBuyCoins={() => navigate({ page: 'buy-coins' })}
                onOpenSendGift={() => navigate({ page: 'send' })}
              />
            )}
              </StaggerItem>
            </StaggerContainer>
          </PageTransition>
        </AnimatePresence>
      </main>

      {/* Persistent Mobile Bottom Navigation with Soft Pink/Purple Active Glow */}
      {/* Mobile Bottom Navigation matching Image 1: Home, Top Leaderboard, Floating Center Send, Inbox, Profile */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 h-16 bg-[var(--nav-glass)] backdrop-blur-xl border-t border-[var(--border-subtle)] grid grid-cols-5 items-center px-1 pb-safe"
      >
        <button
          type="button"
          onClick={() => navigate({ page: 'home' })}
          data-testid="mobile-nav-home"
          className="h-full flex items-center justify-center cursor-pointer"
        >
          <span className={`relative flex flex-col items-center justify-center gap-0.5 px-1.5 py-1 text-[10px] font-bold transition-all ${
            isHomeTab ? 'text-[#E61472] dark:text-[#FF62A9]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}>
            <Home className="w-5 h-5" />
            <span>Home</span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => navigate({ page: 'leaderboard' })}
          data-testid="mobile-nav-leaderboard"
          className="h-full flex items-center justify-center cursor-pointer"
        >
          <span className={`relative flex flex-col items-center justify-center gap-0.5 px-1 py-1 text-[10px] font-bold transition-all ${
            isLeaderboardTab ? 'text-[#E61472] dark:text-[#FF62A9]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}>
            <Trophy className="w-5 h-5" />
            <span className="truncate max-w-[68px]">Top Leaderboard</span>
          </span>
        </button>

        {/* Elevated Glowing Middle Send Button (triggers same Send action as Show Love button) */}
        <button
          type="button"
          onClick={() => navigate({ page: 'send' })}
          data-testid="mobile-nav-send"
          className="h-full flex flex-col items-center justify-center -mt-5 cursor-pointer group"
          aria-label="Send Love"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#FF2385] to-[#FF559F] text-white shadow-[0_8px_22px_-2px_rgba(255,35,133,0.65)] flex items-center justify-center transition-transform group-active:scale-95 group-hover:scale-105">
            <Send className="w-5 h-5 ml-0.5" />
          </div>
          <span className="text-[10px] font-bold text-[#E61472] dark:text-[#FF62A9] mt-0.5">
            Send
          </span>
        </button>

        <button
          type="button"
          onClick={() => navigate({ page: 'inbox' })}
          data-testid="mobile-nav-inbox"
          className="h-full flex items-center justify-center cursor-pointer"
        >
          <span className={`relative flex flex-col items-center justify-center gap-0.5 px-1.5 py-1 text-[10px] font-bold transition-all ${
            isInboxTab ? 'text-[#E61472] dark:text-[#FF62A9]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}>
            <Inbox className="w-5 h-5" />
            <span>Inbox</span>
            {unopenedCount > 0 && (
              <span aria-hidden="true" className="absolute top-1 right-2.5 w-2 h-2 rounded-full bg-[#FF2385]" />
            )}
          </span>
        </button>

        <button
          type="button"
          onClick={() => navigate({ page: 'profile' })}
          data-testid="mobile-nav-profile"
          className="h-full flex items-center justify-center cursor-pointer"
        >
          <span className={`relative flex flex-col items-center justify-center gap-0.5 px-1.5 py-1 text-[10px] font-bold transition-all ${
            isProfileTab ? 'text-[#E61472] dark:text-[#FF62A9]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}>
            <User className="w-5 h-5" />
            <span>Profile</span>
          </span>
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

