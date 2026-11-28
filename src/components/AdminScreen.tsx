import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, BarChart3, ChevronRight, Coins, CreditCard, Gift,
  LayoutDashboard, LogOut, Menu, RefreshCw, ShieldCheck, Users, Wallet, X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from './ui/DesignSystem';

interface AdminOverview {
  generatedAt: string;
  totals: {
    users: number;
    confirmedUsers: number;
    walletCoins: number;
    fundedNaira: number;
    platformFeeCoins: number;
    gifts: number;
  };
  recentUsers: Array<{ id: string; email: string; name: string; createdAt: string; confirmedAt: string | null }>;
  recentPayments: Array<{ reference: string; email: string; amountNaira: number; creditedCoins: number; feeCoins: number; settledAt: string | null }>;
}

interface AdminScreenProps {
  onLock?: () => void;
}

type AdminSection = 'overview' | 'accounts' | 'payments' | 'wallet';

const formatNumber = (value: number) => new Intl.NumberFormat('en-NG').format(value);
const formatNaira = (value: number) => `₦${formatNumber(value)}`;
const formatDate = (value: string | null) => value
  ? new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : 'Not confirmed';

export function AdminScreen({ onLock }: AdminScreenProps = {}) {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [section, setSection] = useState<AdminSection>('overview');
  const [menuOpen, setMenuOpen] = useState(false);

  const loadOverview = useCallback(async () => {
    setStatus('loading');
    setError('');
    try {
      const { data: sessionData } = await supabase?.auth.getSession() ?? { data: { session: null } };
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error('Your admin session has expired. Sign in again.');

      const response = await fetch('/api/admin/overview', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const payload = await response.json().catch(() => ({})) as AdminOverview & { error?: string };
      if (!response.ok) throw new Error(payload.error || 'Live admin data could not be loaded.');

      setData(payload);
      setStatus('ready');
    } catch (reason) {
      setData(null);
      setError(reason instanceof Error ? reason.message : 'Live admin data could not be loaded.');
      setStatus('error');
    }
  }, []);

  useEffect(() => { void loadOverview(); }, [loadOverview]);

  const navItems = useMemo(() => [
    { id: 'overview' as const, label: 'Overview', icon: LayoutDashboard },
    { id: 'accounts' as const, label: 'Accounts', icon: Users },
    { id: 'payments' as const, label: 'Funding', icon: CreditCard },
    { id: 'wallet' as const, label: 'Master Wallet', icon: Wallet },
  ], []);

  const selectSection = (next: AdminSection) => {
    setSection(next);
    setMenuOpen(false);
  };

  const metrics = data ? [
    { label: 'Registered users', value: formatNumber(data.totals.users), detail: `${formatNumber(data.totals.confirmedUsers)} confirmed`, icon: Users, tone: 'text-violet-500', panel: 'accounts' as const },
    { label: 'Wallet Love Coins', value: formatNumber(data.totals.walletCoins), detail: 'Held across active wallets', icon: Coins, tone: 'text-pink-500', panel: 'wallet' as const },
    { label: 'Completed funding', value: formatNaira(data.totals.fundedNaira), detail: 'Settled Paystack payments', icon: CreditCard, tone: 'text-sky-500', panel: 'payments' as const },
    { label: 'Platform fee profit', value: formatNumber(data.totals.platformFeeCoins), detail: 'Love Coins in master wallet', icon: Wallet, tone: 'text-emerald-500', panel: 'wallet' as const },
  ] : [];

  const renderNavigation = (mobile = false) => (
    <nav className={mobile ? 'space-y-1 p-3' : 'hidden lg:block lg:w-64 lg:shrink-0'}>
      {!mobile && <p className="mb-3 px-3 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[var(--text-secondary)]">Operations</p>}
      {navItems.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => selectSection(id)}
          className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-bold transition ${
            section === id
              ? 'bg-[#7C3AED] text-white shadow-lg shadow-violet-500/20'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-raised)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Icon className="h-5 w-5" />
          {label}
        </button>
      ))}
      {!mobile && <div className="mt-6 rounded-2xl border border-violet-500/20 bg-violet-500/10 p-4">
        <ShieldCheck className="h-5 w-5 text-violet-500" />
        <p className="mt-2 text-xs font-bold text-[var(--text-primary)]">Live workspace</p>
        <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">Only verified Supabase and payment records are shown.</p>
      </div>}
    </nav>
  );

  return (
    <main className="min-h-screen bg-[var(--bg-page)]">
      <header className="sticky top-0 z-30 border-b border-[var(--border-subtle)] bg-[var(--bg-page)]/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={() => setMenuOpen(true)} className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--border-subtle)] text-[var(--text-primary)] lg:hidden" aria-label="Open admin menu">
              <Menu className="h-5 w-5" />
            </button>
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-violet-500/15 text-violet-600 dark:text-violet-300">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-extrabold tracking-tight text-[var(--text-primary)]">Showmelove Admin</p>
              <p className="hidden text-xs text-[var(--text-secondary)] sm:block">Platform operations and live reporting</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => void loadOverview()} disabled={status === 'loading'} aria-label="Refresh live data">
              <RefreshCw className={`h-4 w-4 ${status === 'loading' ? 'animate-spin' : ''}`} />
              <span className="ml-1.5 hidden sm:inline">Refresh</span>
            </Button>
            <Button variant="secondary" size="sm" onClick={onLock} className="text-rose-500" aria-label="Sign out of admin">
              <LogOut className="h-4 w-4" />
              <span className="ml-1.5 hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin navigation">
          <button type="button" onClick={() => setMenuOpen(false)} className="absolute inset-0 bg-black/50" aria-label="Close admin menu" />
          <aside className="relative h-full w-[min(19rem,85vw)] border-r border-[var(--border-subtle)] bg-[var(--bg-page)] pt-4 shadow-2xl">
            <div className="flex items-center justify-between px-5 pb-4">
              <p className="font-extrabold text-[var(--text-primary)]">Admin menu</p>
              <button type="button" onClick={() => setMenuOpen(false)} className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--border-subtle)] text-[var(--text-primary)]" aria-label="Close menu"><X className="h-4 w-4" /></button>
            </div>
            {renderNavigation(true)}
          </aside>
        </div>
      )}

      <div className="mx-auto flex max-w-7xl gap-8 px-4 py-6 sm:px-6 lg:px-10">
        {renderNavigation()}
        <div className="min-w-0 flex-1 space-y-6">
          <section className="rounded-3xl bg-gradient-to-br from-violet-700 via-fuchsia-600 to-pink-500 p-6 text-white shadow-xl shadow-fuchsia-500/15 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/75">Restricted workspace</p>
                <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
                  {section === 'overview' ? 'Platform overview' : navItems.find((item) => item.id === section)?.label}
                </h1>
                <p className="mt-2 max-w-xl text-sm leading-6 text-white/85">Track actual account, funding, gift and fee activity. Nothing here is seeded or simulated.</p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-black/10 px-4 py-3 text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">Data status</p>
                <p className="mt-1 text-sm font-extrabold">{status === 'ready' ? 'Live and verified' : status === 'error' ? 'Needs attention' : 'Loading live data'}</p>
              </div>
            </div>
          </section>

          {status === 'error' && (
            <section className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-6 text-center">
              <AlertTriangle className="mx-auto h-7 w-7 text-amber-500" />
              <h2 className="mt-3 font-bold text-[var(--text-primary)]">Live data is unavailable</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm text-[var(--text-secondary)]">{error}</p>
              <p className="mt-2 text-xs text-[var(--text-secondary)]">No placeholder figures are displayed. Check the server-only Supabase variables in Vercel, then refresh.</p>
            </section>
          )}

          {status === 'loading' && !data && (
            <section className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-10 text-center text-sm text-[var(--text-secondary)]">Loading verified platform data…</section>
          )}

          {data && (
            <>
              {(section === 'overview' || section === 'wallet' || section === 'payments' || section === 'accounts') && section === 'overview' && (
                <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {metrics.map(({ label, value, detail, icon: Icon, tone, panel }) => (
                    <button key={label} type="button" onClick={() => selectSection(panel)} className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                      <Icon className={`h-5 w-5 ${tone}`} />
                      <p className="mt-5 text-2xl font-extrabold tabular-nums text-[var(--text-primary)]">{value}</p>
                      <p className="mt-1 text-sm font-bold text-[var(--text-primary)]">{label}</p>
                      <p className="mt-1 text-xs text-[var(--text-secondary)]">{detail}</p>
                    </button>
                  ))}
                </section>
              )}

              {(section === 'overview' || section === 'wallet') && (
                <section className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 shadow-sm sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.15em] text-violet-500">Master Wallet</p>
                      <h2 className="mt-1 text-xl font-extrabold text-[var(--text-primary)]">Platform fee profit</h2>
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">Fees recorded from completed platform activity.</p>
                    </div>
                    <Wallet className="h-6 w-6 text-emerald-500" />
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-[var(--bg-raised)] p-4"><p className="text-xs text-[var(--text-secondary)]">Fee balance</p><p className="mt-1 text-2xl font-extrabold tabular-nums text-emerald-500">{formatNumber(data.totals.platformFeeCoins)}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">Love Coins</p></div>
                    <div className="rounded-2xl bg-[var(--bg-raised)] p-4"><p className="text-xs text-[var(--text-secondary)]">Coins in user wallets</p><p className="mt-1 text-2xl font-extrabold tabular-nums text-[var(--text-primary)]">{formatNumber(data.totals.walletCoins)}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">Love Coins</p></div>
                    <div className="rounded-2xl bg-[var(--bg-raised)] p-4"><p className="text-xs text-[var(--text-secondary)]">Gifts created</p><p className="mt-1 text-2xl font-extrabold tabular-nums text-[var(--text-primary)]">{formatNumber(data.totals.gifts)}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">All-time live total</p></div>
                  </div>
                </section>
              )}

              {(section === 'overview' || section === 'accounts') && (
                <section className="overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-sm">
                  <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-4 sm:px-6">
                    <div><h2 className="font-extrabold text-[var(--text-primary)]">Newest accounts</h2><p className="mt-0.5 text-xs text-[var(--text-secondary)]">Latest registered Showmelove members</p></div>
                    <Users className="h-5 w-5 text-violet-500" />
                  </div>
                  {data.recentUsers.length === 0 ? <p className="p-6 text-sm text-[var(--text-secondary)]">No accounts yet.</p> : (
                    <div className="divide-y divide-[var(--border-subtle)]">
                      {data.recentUsers.map((user) => (
                        <div key={user.id} className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
                          <div className="min-w-0"><p className="truncate text-sm font-bold text-[var(--text-primary)]">{user.name || 'Unnamed member'}</p><p className="truncate text-xs text-[var(--text-secondary)]">{user.email}</p></div>
                          <div className="shrink-0 text-right"><p className={`text-xs font-bold ${user.confirmedAt ? 'text-emerald-500' : 'text-amber-500'}`}>{user.confirmedAt ? 'Verified' : 'Unverified'}</p><p className="mt-1 hidden text-xs text-[var(--text-secondary)] sm:block">{formatDate(user.createdAt)}</p></div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {(section === 'overview' || section === 'payments') && (
                <section className="overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-sm">
                  <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-4 sm:px-6">
                    <div><h2 className="font-extrabold text-[var(--text-primary)]">Completed funding</h2><p className="mt-0.5 text-xs text-[var(--text-secondary)]">Settled wallet purchases only</p></div>
                    <CreditCard className="h-5 w-5 text-sky-500" />
                  </div>
                  {data.recentPayments.length === 0 ? <p className="p-6 text-sm text-[var(--text-secondary)]">No completed funding payments yet.</p> : (
                    <div className="divide-y divide-[var(--border-subtle)]">
                      {data.recentPayments.map((payment) => (
                        <div key={payment.reference} className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
                          <div className="min-w-0"><p className="truncate text-sm font-bold text-[var(--text-primary)]">{payment.email || 'Unknown account'}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">{payment.reference}</p><p className="mt-1 text-xs text-emerald-500">+{formatNumber(payment.creditedCoins)} Love Coins{payment.feeCoins > 0 ? ` · ${formatNumber(payment.feeCoins)} fee coins` : ''}</p></div>
                          <div className="shrink-0 text-right"><p className="text-sm font-extrabold text-emerald-500">{formatNaira(payment.amountNaira)}</p><p className="mt-1 hidden text-xs text-[var(--text-secondary)] sm:block">{formatDate(payment.settledAt)}</p></div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              <p className="pb-4 text-center text-xs text-[var(--text-secondary)]">Last verified: {new Date(data.generatedAt).toLocaleString('en-NG')}</p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
