import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, BarChart3, Banknote,
  BellRing, ClipboardList, Coins, CreditCard, Gift, LayoutDashboard, LifeBuoy,
  LogOut, MapPinned, Menu, RefreshCw, Settings, ShieldAlert, ShieldCheck,
  Users, Wallet, X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from './ui/DesignSystem';

interface AdminOverview {
  generatedAt: string;
  totals: { users: number; confirmedUsers: number; walletCoins: number; withdrawableGiftCoins: number; reservedGiftCoins: number; fundedNaira: number; creditedCoins: number; platformFeeCoins: number; gatewayFeeNaira: number; netProfitNaira: number; gifts: number; fundingCount: number; walletTransactions: number };
  feeBreakdown: Array<{ source: string; coins: number }>;
  recentUsers: Array<{ id: string; email: string; name: string; createdAt: string; confirmedAt: string | null; lastSignInAt: string | null }>;
  recentPayments: Array<{ reference: string; email: string; name: string; amountNaira: number; creditedCoins: number; feeCoins: number; gatewayFeeNaira: number; settledAt: string | null }>;
  recentFees: Array<{ id: string; source: string; category: string; reference: string; coins: number; gatewayFeeNaira: number; netProfitNaira: number; createdAt: string | null }>;
  recentWalletTransactions: Array<{ id: string; userName: string; email: string; kind: string; coinsDelta: number; reference: string; createdAt: string | null }>;
}
interface AdminScreenProps { onLock?: () => void; }
type AdminSection =
  | 'overview' | 'accounts' | 'wallets' | 'top_users'
  | 'funding' | 'withdrawals' | 'wallet' | 'activity'
  | 'gifts' | 'regions' | 'broadcasts'
  | 'security' | 'support' | 'roles' | 'audit' | 'system' | 'settings';

const formatNumber = (value: number) => new Intl.NumberFormat('en-NG').format(value);
const formatNaira = (value: number) => `₦${formatNumber(value)}`;
const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
const humanize = (value: string) => value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export function AdminScreen({ onLock }: AdminScreenProps = {}) {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [section, setSection] = useState<AdminSection>('overview');
  const [menuOpen, setMenuOpen] = useState(false);

  const loadOverview = useCallback(async () => {
    setStatus('loading'); setError('');
    try {
      const { data: sessionData } = await supabase?.auth.getSession() ?? { data: { session: null } };
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error('Your admin session has expired. Sign in again.');
      const response = await fetch('/api/admin/overview', { headers: { Authorization: `Bearer ${accessToken}` } });
      const payload = await response.json().catch(() => ({})) as AdminOverview & { error?: string };
      if (!response.ok) throw new Error(payload.error || 'Live admin data could not be loaded.');
      setData(payload); setStatus('ready');
    } catch (reason) {
      setData(null); setError(reason instanceof Error ? reason.message : 'Live admin data could not be loaded.'); setStatus('error');
    }
  }, []);

  useEffect(() => { void loadOverview(); }, [loadOverview]);

  const items = useMemo(() => [
    { id: 'overview' as const, label: 'Dashboard', group: 'Overview', icon: LayoutDashboard },
    { id: 'accounts' as const, label: 'All Users', group: 'Users & Wallets', icon: Users },
    { id: 'wallets' as const, label: 'Wallet Management', group: 'Users & Wallets', icon: Wallet },
    { id: 'top_users' as const, label: 'Top Users', group: 'Users & Wallets', icon: BarChart3 },
    { id: 'funding' as const, label: 'Transactions', group: 'Financial', icon: CreditCard },
    { id: 'withdrawals' as const, label: 'Withdrawals', group: 'Financial', icon: Banknote },
    { id: 'wallet' as const, label: 'Revenue & Fees', group: 'Financial', icon: Wallet },
    { id: 'activity' as const, label: 'Ledger Activity', group: 'Financial', icon: Activity },
    { id: 'gifts' as const, label: 'Gifts & Emoji Analytics', group: 'Engagement', icon: Gift },
    { id: 'regions' as const, label: 'Countries & Regions', group: 'Engagement', icon: MapPinned },
    { id: 'broadcasts' as const, label: 'Notifications & Broadcasts', group: 'Engagement', icon: BellRing },
    { id: 'security' as const, label: 'Fraud & Security', group: 'Management', icon: ShieldAlert },
    { id: 'support' as const, label: 'Support & Reports', group: 'Management', icon: LifeBuoy },
    { id: 'roles' as const, label: 'Admin Roles', group: 'Management', icon: ShieldCheck },
    { id: 'audit' as const, label: 'Activity Logs', group: 'Management', icon: ClipboardList },
    { id: 'system' as const, label: 'System Health', group: 'System', icon: Activity },
    { id: 'settings' as const, label: 'Platform Settings', group: 'System', icon: Settings },
  ], []);

  const select = (id: AdminSection) => { setSection(id); setMenuOpen(false); };
  const show = (...allowed: AdminSection[]) => allowed.includes(section);

  const navigation = (mobile = false) => (
    <nav className={mobile ? 'space-y-1 p-3' : 'hidden w-64 shrink-0 lg:block'}>
      {Array.from(new Set(items.map((item) => item.group))).map((group) => (
        <div key={group} className="mb-4">
          <p className="mb-1 mt-3 px-3 text-[10px] font-extrabold uppercase tracking-[.18em] text-[var(--text-secondary)]">{group}</p>
          {items.filter((item) => item.group === group).map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => select(id)} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-bold transition ${section === id ? 'bg-[#7C3AED] text-white shadow-lg shadow-violet-500/20' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-raised)] hover:text-[var(--text-primary)]'}`}><Icon className="h-4 w-4" />{label}</button>
          ))}
        </div>
      ))}
      {!mobile && <div className="mt-6 rounded-2xl border border-violet-500/20 bg-violet-500/10 p-4"><ShieldCheck className="h-5 w-5 text-violet-500" /><p className="mt-2 text-xs font-bold text-[var(--text-primary)]">Verified live data</p><p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">This dashboard has no sample customers, transactions or revenue.</p></div>}
    </nav>
  );

  const SectionTitle = ({ eyebrow, title, description, icon: Icon }: { eyebrow: string; title: string; description: string; icon: typeof BarChart3 }) => (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-5 py-4 sm:px-6"><div><p className="text-[11px] font-extrabold uppercase tracking-[.15em] text-violet-500">{eyebrow}</p><h2 className="mt-1 text-xl font-extrabold text-[var(--text-primary)]">{title}</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">{description}</p></div><Icon className="mt-1 h-6 w-6 shrink-0 text-violet-500" /></div>
  );

  return <main className="min-h-screen bg-[var(--bg-page)]">
    <header className="sticky top-0 z-30 border-b border-[var(--border-subtle)] bg-[var(--bg-page)]/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-10"><div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3"><button type="button" onClick={() => setMenuOpen(true)} className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--border-subtle)] text-[var(--text-primary)] lg:hidden" aria-label="Open admin menu"><Menu className="h-5 w-5" /></button><div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-violet-500/15 text-violet-600 dark:text-violet-300"><ShieldCheck className="h-5 w-5" /></div><div className="min-w-0"><p className="truncate text-base font-extrabold text-[var(--text-primary)]">Showmelove Admin</p><p className="hidden text-xs text-[var(--text-secondary)] sm:block">Live platform operations</p></div></div>
      <div className="flex gap-2"><Button variant="secondary" size="sm" onClick={() => void loadOverview()} disabled={status === 'loading'}><RefreshCw className={`h-4 w-4 ${status === 'loading' ? 'animate-spin' : ''}`} /><span className="ml-1.5 hidden sm:inline">Refresh</span></Button><Button variant="secondary" size="sm" onClick={onLock} className="text-rose-500"><LogOut className="h-4 w-4" /><span className="ml-1.5 hidden sm:inline">Sign out</span></Button></div>
    </div></header>
    {menuOpen && <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin navigation"><button type="button" onClick={() => setMenuOpen(false)} className="absolute inset-0 bg-black/50" aria-label="Close admin menu" /><aside className="relative h-full w-[min(19rem,85vw)] border-r border-[var(--border-subtle)] bg-[var(--bg-page)] pt-4 shadow-2xl"><div className="flex items-center justify-between px-5 pb-4"><p className="font-extrabold text-[var(--text-primary)]">Admin menu</p><button type="button" onClick={() => setMenuOpen(false)} className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--border-subtle)] text-[var(--text-primary)]"><X className="h-4 w-4" /></button></div>{navigation(true)}</aside></div>}
    <div className="mx-auto flex max-w-7xl gap-8 px-4 py-6 sm:px-6 lg:px-10">{navigation()}<div className="min-w-0 flex-1 space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-violet-700 via-fuchsia-600 to-pink-500 p-6 text-white shadow-xl shadow-fuchsia-500/15 sm:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-white/75">Restricted workspace</p><h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">{items.find((item) => item.id === section)?.label}</h1><p className="mt-2 max-w-xl text-sm leading-6 text-white/85">Operational reporting powered by verified Supabase and Paystack data.</p></div><div className="rounded-2xl border border-white/20 bg-black/10 px-4 py-3 text-right"><p className="text-[10px] font-bold uppercase tracking-widest text-white/70">Data status</p><p className="mt-1 text-sm font-extrabold">{status === 'ready' ? 'Live and verified' : status === 'error' ? 'Needs attention' : 'Loading'}</p></div></div></section>
      {status === 'error' && <section className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-6 text-center"><AlertTriangle className="mx-auto h-7 w-7 text-amber-500" /><h2 className="mt-3 font-bold text-[var(--text-primary)]">Live data is unavailable</h2><p className="mx-auto mt-2 max-w-xl text-sm text-[var(--text-secondary)]">{error}</p><p className="mt-2 text-xs text-[var(--text-secondary)]">No placeholder figures are displayed.</p></section>}
      {status === 'loading' && !data && <section className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-10 text-center text-sm text-[var(--text-secondary)]">Loading verified platform data…</section>}
      {data && <>{!['overview', 'accounts', 'funding', 'wallet', 'activity'].includes(section) && (
        <section className="overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-sm">
          <SectionTitle eyebrow="Super Admin workspace" title={items.find((item) => item.id === section)?.label || 'Administration'} description="This area is separated from customer flows and will only display verified operational records." icon={ShieldCheck} />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <article className="rounded-2xl bg-[var(--bg-raised)] p-5">
              <p className="text-sm font-extrabold text-[var(--text-primary)]">Live-data protection</p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">No sample users, balances, payouts, or revenue figures are displayed in this workspace. Actions appear only after their database ledger and server-side permission are enabled.</p>
            </article>
            <article className="rounded-2xl bg-violet-500/10 p-5">
              <p className="text-sm font-extrabold text-[var(--text-primary)]">Current platform snapshot</p>
              <div className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
                <p><strong className="text-[var(--text-primary)]">{formatNumber(data.totals.users)}</strong> registered users</p>
                <p><strong className="text-[var(--text-primary)]">{formatNumber(data.totals.walletCoins)} LC</strong> in gifting wallets</p>
                <p><strong className="text-[var(--text-primary)]">{formatNaira(data.totals.netProfitNaira)}</strong> net platform profit</p>
              </div>
            </article>
          </div>
        </section>
      )}
      {show('overview') && <><section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {[['Registered members',formatNumber(data.totals.users),`${formatNumber(data.totals.confirmedUsers)} verified`,Users,'text-violet-500'],['Wallet Love Coins',formatNumber(data.totals.walletCoins),'Current user balances',Coins,'text-pink-500'],['Funding settled',formatNaira(data.totals.fundedNaira),`${formatNumber(data.totals.fundingCount)} completed payments`,CreditCard,'text-sky-500'],['Coins credited',formatNumber(data.totals.creditedCoins),'After funding fees',ArrowDownRight,'text-emerald-500'],['Master wallet profit',formatNumber(data.totals.platformFeeCoins),'Fees in Love Coins',Wallet,'text-amber-500'],['Gifts created',formatNumber(data.totals.gifts),'All-time live total',Gift,'text-fuchsia-500']].map(([label,value,detail,Icon,tone]) => { const MetricIcon = Icon as typeof Users; return <article key={String(label)} className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 shadow-sm"><MetricIcon className={`h-5 w-5 ${tone}`} /><p className="mt-5 text-2xl font-extrabold tabular-nums text-[var(--text-primary)]">{String(value)}</p><p className="mt-1 text-sm font-bold text-[var(--text-primary)]">{String(label)}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">{String(detail)}</p></article>})}
      </section><section className="grid gap-6 xl:grid-cols-2"><div className="overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-sm"><SectionTitle eyebrow="Members" title="Newest accounts" description="Latest registered members" icon={Users} /><div className="divide-y divide-[var(--border-subtle)]">{data.recentUsers.slice(0,5).map((user) => <div key={user.id} className="flex items-center justify-between gap-3 px-5 py-3"><div className="min-w-0"><p className="truncate text-sm font-bold text-[var(--text-primary)]">{user.name || 'Unnamed member'}</p><p className="truncate text-xs text-[var(--text-secondary)]">{user.email}</p></div><p className={`shrink-0 text-xs font-bold ${user.confirmedAt ? 'text-emerald-500' : 'text-amber-500'}`}>{user.confirmedAt ? 'Verified' : 'Unverified'}</p></div>)}</div></div><div className="overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-sm"><SectionTitle eyebrow="Payments" title="Latest funding" description="Recent settled wallet purchases" icon={CreditCard} /><div className="divide-y divide-[var(--border-subtle)]">{data.recentPayments.slice(0,5).map((payment) => <div key={payment.reference} className="flex items-center justify-between gap-3 px-5 py-3"><div className="min-w-0"><p className="truncate text-sm font-bold text-[var(--text-primary)]">{payment.name || payment.email || 'Unknown account'}</p><p className="truncate text-xs text-emerald-500">+{formatNumber(payment.creditedCoins)} Love Coins</p></div><p className="shrink-0 text-sm font-extrabold text-emerald-500">{formatNaira(payment.amountNaira)}</p></div>)}</div></div></section></>}
      {show('accounts') && <section className="overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-sm"><SectionTitle eyebrow="Member directory" title="Recent accounts" description={`${formatNumber(data.totals.users)} registered · ${formatNumber(data.totals.confirmedUsers)} verified`} icon={Users} />{data.recentUsers.length === 0 ? <p className="p-6 text-sm text-[var(--text-secondary)]">No accounts yet.</p> : <div className="divide-y divide-[var(--border-subtle)]">{data.recentUsers.map((user) => <div key={user.id} className="grid gap-2 px-5 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:px-6"><div className="min-w-0"><p className="truncate font-bold text-[var(--text-primary)]">{user.name || 'Unnamed member'}</p><p className="truncate text-sm text-[var(--text-secondary)]">{user.email}</p></div><p className="text-xs text-[var(--text-secondary)]">Joined {formatDate(user.createdAt)}</p><span className={`w-fit rounded-full px-2.5 py-1 text-xs font-bold ${user.confirmedAt ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-600'}`}>{user.confirmedAt ? 'Verified' : 'Unverified'}</span></div>)}</div>}</section>}
      {show('funding') && <section className="overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-sm"><SectionTitle eyebrow="Paystack" title="Funding activity" description={`${formatNumber(data.totals.fundingCount)} successful payments · ${formatNaira(data.totals.fundedNaira)} settled`} icon={CreditCard} />{data.recentPayments.length === 0 ? <p className="p-6 text-sm text-[var(--text-secondary)]">No completed funding payments yet.</p> : <div className="divide-y divide-[var(--border-subtle)]">{data.recentPayments.map((payment) => <div key={payment.reference} className="grid gap-2 px-5 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:px-6"><div className="min-w-0"><p className="truncate font-bold text-[var(--text-primary)]">{payment.name || payment.email || 'Unknown account'}</p><p className="truncate text-xs text-[var(--text-secondary)]">{payment.reference}</p></div><div><p className="text-sm font-bold text-emerald-500">+{formatNumber(payment.creditedCoins)} Love Coins</p>{payment.feeCoins > 0 && <p className="mt-1 text-xs text-[var(--text-secondary)]">{formatNumber(payment.feeCoins)} fee coins</p>}</div><div className="sm:text-right"><p className="font-extrabold text-[var(--text-primary)]">{formatNaira(payment.amountNaira)}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">{formatDate(payment.settledAt)}</p></div></div>)}</div>}</section>}
      {show('wallet') && <><section className="overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-sm"><SectionTitle eyebrow="Master Wallet" title="Fee profit breakdown" description="Real fee settlements recorded by the platform" icon={Wallet} /><div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3"><div className="rounded-2xl bg-emerald-500/10 p-4"><p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Net profit</p><p className="mt-2 text-3xl font-extrabold text-emerald-500">{formatNaira(data.totals.netProfitNaira)}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">Gross fees less gateway charges</p></div><div className="rounded-2xl bg-[var(--bg-raised)] p-4"><p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Gross platform fees</p><p className="mt-2 text-2xl font-extrabold text-[var(--text-primary)]">{formatNumber(data.totals.platformFeeCoins)} LC</p><p className="mt-1 text-xs text-[var(--text-secondary)]">Before gateway costs</p></div><div className="rounded-2xl bg-[var(--bg-raised)] p-4"><p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Gateway charges</p><p className="mt-2 text-2xl font-extrabold text-rose-500">{formatNaira(data.totals.gatewayFeeNaira)}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">Actual Paystack fees</p></div><div className="rounded-2xl bg-[var(--bg-raised)] p-4"><p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Gifting coins</p><p className="mt-2 text-2xl font-extrabold text-[var(--text-primary)]">{formatNumber(data.totals.walletCoins)} LC</p><p className="mt-1 text-xs text-[var(--text-secondary)]">Spendable only; never withdrawable</p></div><div className="rounded-2xl bg-[var(--bg-raised)] p-4"><p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Withdrawable gift earnings</p><p className="mt-2 text-2xl font-extrabold text-[var(--text-primary)]">{formatNumber(data.totals.withdrawableGiftCoins)} LC</p><p className="mt-1 text-xs text-[var(--text-secondary)]">{formatNumber(data.totals.reservedGiftCoins)} LC reserved for payouts</p></div>{data.feeBreakdown.map((item) => <div key={item.source} className="rounded-2xl bg-[var(--bg-raised)] p-4"><p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">{humanize(item.source)}</p><p className="mt-2 text-2xl font-extrabold text-[var(--text-primary)]">{formatNumber(item.coins)}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">Love Coins collected</p></div>)}</div></section><section className="overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-sm"><SectionTitle eyebrow="Fee ledger" title="Latest platform earnings" description="Every row is a completed fee settlement" icon={Coins} />{data.recentFees.length === 0 ? <p className="p-6 text-sm text-[var(--text-secondary)]">No fee settlements recorded yet.</p> : <div className="divide-y divide-[var(--border-subtle)]">{data.recentFees.map((fee) => <div key={fee.id} className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6"><div className="min-w-0"><p className="font-bold text-[var(--text-primary)]">{humanize(fee.source)}</p><p className="truncate text-xs text-[var(--text-secondary)]">{fee.reference || 'No reference'} · {formatDate(fee.createdAt)}</p></div><p className="shrink-0 font-extrabold text-emerald-500">+{formatNumber(fee.coins)} LC</p></div>)}</div>}</section></>}
      {show('activity') && <section className="overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-sm"><SectionTitle eyebrow="Wallet ledger" title="Latest coin movement" description={`Most recent ${formatNumber(data.totals.walletTransactions)} transactions currently loaded`} icon={Activity} />{data.recentWalletTransactions.length === 0 ? <p className="p-6 text-sm text-[var(--text-secondary)]">No wallet activity recorded yet.</p> : <div className="divide-y divide-[var(--border-subtle)]">{data.recentWalletTransactions.map((transaction) => <div key={transaction.id} className="grid gap-2 px-5 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:px-6"><div className="min-w-0"><p className="truncate font-bold text-[var(--text-primary)]">{transaction.userName}</p><p className="truncate text-xs text-[var(--text-secondary)]">{humanize(transaction.kind)} · {transaction.reference || 'No reference'}</p></div><span className={`flex w-fit items-center gap-1 text-sm font-bold ${transaction.coinsDelta >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{transaction.coinsDelta >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}{transaction.coinsDelta >= 0 ? '+' : ''}{formatNumber(transaction.coinsDelta)} LC</span><p className="text-xs text-[var(--text-secondary)] sm:text-right">{formatDate(transaction.createdAt)}</p></div>)}</div>}</section>}
      <p className="pb-4 text-center text-xs text-[var(--text-secondary)]">Last verified: {new Date(data.generatedAt).toLocaleString('en-NG')}</p>
      </>}
    </div></div>
  </main>;
}
