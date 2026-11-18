import { useCallback, useEffect, useState } from 'react';
import { Gift, Home, Inbox, Wallet } from 'lucide-react';
import { ShowmeloveProvider, useShowmelove } from './context/ShowmeloveContext';
import { HomeScreen } from './components/HomeScreen';
import { ComposeAndCheckoutScreen } from './components/ComposeAndCheckoutScreen';
import { InboxAndWalletScreen } from './components/InboxAndWalletScreen';
import { WithdrawScreen } from './components/WithdrawScreen';
import { AdminScreen } from './components/AdminScreen';
import { GiftRevealExperience } from './components/GiftRevealExperience';
import { DemoControlsPanel } from './components/DemoControlsPanel';
import { BUNDLED_SAMPLE_GIFT } from './services/seedData';

type AppRoute =
  | { page: 'home' }
  | { page: 'send'; giftCatalogId?: string }
  | { page: 'inbox' }
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
    case 'withdraw':
      return '/withdraw';
    case 'admin':
      return '/admin';
    case 'reveal':
      return `/gift/${encodeURIComponent(route.giftId)}`;
  }
}

function ShowmeloveShell() {
  const { getGiftById } = useShowmelove();
  const [route, setRoute] = useState<AppRoute>(() => parseLocationRoute());

  const navigate = useCallback((next: AppRoute) => {
    const targetPath = routeToPath(next);
    if (typeof window !== 'undefined' && window.location.pathname + window.location.search !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
    setRoute(next);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  useEffect(() => {
    const onPopState = () => setRoute(parseLocationRoute());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  if (route.page === 'reveal') {
    const gift = getGiftById(route.giftId);
    if (!gift) {
      return (
        <div className="min-h-screen bg-[#FDF8F3] flex items-center justify-center px-4">
          <div className="max-w-md w-full rounded-3xl bg-white border border-[#171314]/8 p-8 text-center space-y-4 shadow-sm">
            <h1 className="font-display text-2xl font-bold text-[#171314]">
              Gift link not found
            </h1>
            <p className="text-sm text-[#5E5255] leading-relaxed">
              This demo link wasn&apos;t found in this browser&apos;s storage. Newly created demo links require the same browser where they were created, or you can open the bundled sample reveal instead.
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-2">
              <button
                type="button"
                onClick={() => navigate({ page: 'reveal', giftId: BUNDLED_SAMPLE_GIFT.id })}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#E62E45] text-white text-sm font-semibold hover:bg-[#CC2238]"
              >
                Open sample reveal
              </button>
              <button
                type="button"
                onClick={() => navigate({ page: 'home' })}
                className="min-h-[44px] px-4 py-2 rounded-xl border border-[#171314]/15 bg-white text-sm font-semibold text-[#171314]"
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
        gift={gift}
        onExit={() => navigate({ page: 'home' })}
        onGoToInbox={() => navigate({ page: 'inbox' })}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FDF8F3] text-[#171314] flex flex-col">
      {/* Three-Zone Top Bar */}
      <header className="sticky top-0 z-30 h-14 bg-[#FDF8F3] border-b border-[#171314]/8">
        <div className="max-w-6xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Wordmark */}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              navigate({ page: 'home' });
            }}
            className="font-display text-xl font-bold tracking-tight text-[#E62E45] whitespace-nowrap shrink-0"
          >
            Showmelove
          </a>

          {/* Zone 2: Concise Navigation Links */}
          <nav
            aria-label="Primary"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-[#5E5255]"
          >
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                navigate({ page: 'home' });
              }}
              className={`hover:text-[#171314] transition-colors whitespace-nowrap shrink-0 ${
                route.page === 'home' ? 'text-[#171314] underline underline-offset-4 decoration-[#E62E45]' : ''
              }`}
            >
              Catalog
            </a>
            <a
              href="/gift/sample"
              onClick={(e) => {
                e.preventDefault();
                navigate({ page: 'reveal', giftId: BUNDLED_SAMPLE_GIFT.id });
              }}
              className="hover:text-[#171314] transition-colors whitespace-nowrap shrink-0"
            >
              Sample Reveal
            </a>
            <a
              href="/inbox"
              onClick={(e) => {
                e.preventDefault();
                navigate({ page: 'inbox' });
              }}
              className={`hover:text-[#171314] transition-colors whitespace-nowrap shrink-0 ${
                route.page === 'inbox' ? 'text-[#171314] underline underline-offset-4 decoration-[#E62E45]' : ''
              }`}
            >
              Inbox
            </a>
            <a
              href="/withdraw"
              onClick={(e) => {
                e.preventDefault();
                navigate({ page: 'withdraw' });
              }}
              className={`hover:text-[#171314] transition-colors whitespace-nowrap shrink-0 ${
                route.page === 'withdraw' ? 'text-[#171314] underline underline-offset-4 decoration-[#E62E45]' : ''
              }`}
            >
              Withdraw
            </a>
            <a
              href="/admin"
              onClick={(e) => {
                e.preventDefault();
                navigate({ page: 'admin' });
              }}
              className={`hover:text-[#171314] transition-colors whitespace-nowrap shrink-0 ${
                route.page === 'admin' ? 'text-[#171314] underline underline-offset-4 decoration-[#E62E45]' : ''
              }`}
            >
              Admin
            </a>
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => navigate({ page: 'send' })}
              className="min-h-[38px] px-4 py-2 rounded-xl bg-[#E62E45] text-white text-xs sm:text-sm font-semibold hover:bg-[#CC2238] transition-colors whitespace-nowrap shrink-0"
            >
              Send a gift
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-20 md:pb-10">
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
            onGoToCoins={() => navigate({ page: 'inbox' })}
          />
        )}

        {route.page === 'inbox' && (
          <InboxAndWalletScreen
            onOpenGift={(giftId) => navigate({ page: 'reveal', giftId })}
            onGoToWithdraw={() => navigate({ page: 'withdraw' })}
            onSendGift={() => navigate({ page: 'send' })}
            onTrySampleReveal={() =>
              navigate({ page: 'reveal', giftId: BUNDLED_SAMPLE_GIFT.id })
            }
          />
        )}

        {route.page === 'withdraw' && (
          <WithdrawScreen
            onBackToInbox={() => navigate({ page: 'inbox' })}
            onSendGift={() => navigate({ page: 'send' })}
          />
        )}

        {route.page === 'admin' && <AdminScreen />}
      </main>

      {/* Compact Mobile Bottom Navigation (56px height, total sticky <= 13.2% of 844px) */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 h-14 bg-white border-t border-[#171314]/10 grid grid-cols-4 items-center"
      >
        <button
          type="button"
          onClick={() => navigate({ page: 'home' })}
          className={`h-full flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
            route.page === 'home' ? 'text-[#E62E45]' : 'text-[#5E5255]'
          }`}
        >
          <Home className="w-4 h-4" />
          <span>Home</span>
        </button>
        <button
          type="button"
          onClick={() => navigate({ page: 'send' })}
          className={`h-full flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
            route.page === 'send' ? 'text-[#E62E45]' : 'text-[#5E5255]'
          }`}
        >
          <Gift className="w-4 h-4" />
          <span>Send</span>
        </button>
        <button
          type="button"
          onClick={() => navigate({ page: 'inbox' })}
          className={`h-full flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
            route.page === 'inbox' ? 'text-[#E62E45]' : 'text-[#5E5255]'
          }`}
        >
          <Inbox className="w-4 h-4" />
          <span>Inbox</span>
        </button>
        <button
          type="button"
          onClick={() => navigate({ page: 'withdraw' })}
          className={`h-full flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
            route.page === 'withdraw' ? 'text-[#E62E45]' : 'text-[#5E5255]'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Withdraw</span>
        </button>
      </nav>

      <DemoControlsPanel onNavigateAdmin={() => navigate({ page: 'admin' })} />
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
