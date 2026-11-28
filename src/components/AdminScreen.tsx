import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Coins, CreditCard, LogOut, RefreshCw, ShieldCheck, Users } from 'lucide-react';
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

const formatNumber = (value: number) => new Intl.NumberFormat('en-NG').format(value);
const formatNaira = (value: number) => `₦${formatNumber(value)}`;

export function AdminScreen({ onLock }: AdminScreenProps = {}) {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');

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

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  return (
    <main className="min-h-screen bg-[var(--bg-page)] px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#7C3AED]/15 text-[#7C3AED] dark:text-[#C084FC]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7C3AED] dark:text-[#C084FC]">Restricted workspace</p>
              <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">Showmelove Admin</h1>
              <p className="text-sm text-[var(--text-secondary)]">Live Supabase and payment data only. No demo records.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => void loadOverview()} disabled={status === 'loading'}>
              <RefreshCw className={`mr-1.5 h-4 w-4 ${status === 'loading' ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="secondary" size="sm" onClick={onLock} className="text-rose-500">
              <LogOut className="mr-1.5 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </header>

        {status === 'error' && (
          <section className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-6 text-center">
            <AlertTriangle className="mx-auto h-7 w-7 text-amber-500" />
            <h2 className="mt-3 font-bold text-[var(--text-primary)]">Live data is unavailable</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-[var(--text-secondary)]">{error}</p>
            <p className="mt-2 text-xs text-[var(--text-secondary)]">No placeholder figures are displayed. Confirm the server-only Supabase variables are set in Vercel, then refresh.</p>
          </section>
        )}

        {status === 'loading' && !data && (
          <section className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-10 text-center text-sm text-[var(--text-secondary)]">
            Loading verified platform data…
          </section>
        )}

        {data && (
          <>
            <section className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              {[
                { label: 'Registered users', value: formatNumber(data.totals.users), icon: Users, tone: 'text-[#7C3AED]' },
                { label: 'Confirmed users', value: formatNumber(data.totals.confirmedUsers), icon: ShieldCheck, tone: 'text-emerald-500' },
                { label: 'Wallet Love Coins', value: formatNumber(data.totals.walletCoins), icon: Coins, tone: 'text-[#E61472]' },
                { label: 'Completed funding', value: formatNaira(data.totals.fundedNaira), icon: CreditCard, tone: 'text-sky-500' },
                { label: 'Platform fee coins', value: formatNumber(data.totals.platformFeeCoins), icon: Coins, tone: 'text-amber-500' },
                { label: 'Gifts created', value: formatNumber(data.totals.gifts), icon: Users, tone: 'text-fuchsia-500' },
              ].map(({ label, value, icon: Icon, tone }) => (
                <article key={label} className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
                  <Icon className={`h-5 w-5 ${tone}`} />
                  <p className="mt-4 text-2xl font-extrabold tabular-nums text-[var(--text-primary)]">{value}</p>
                  <p className="mt-1 text-xs font-semibold text-[var(--text-secondary)]">{label}</p>
                </article>
              ))}
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <article className="overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)]">
                <div className="border-b border-[var(--border-subtle)] px-5 py-4">
                  <h2 className="font-bold text-[var(--text-primary)]">Newest accounts</h2>
                </div>
                {data.recentUsers.length === 0 ? <p className="p-5 text-sm text-[var(--text-secondary)]">No accounts yet.</p> : (
                  <div className="divide-y divide-[var(--border-subtle)]">
                    {data.recentUsers.map((user) => (
                      <div key={user.id} className="px-5 py-3">
                        <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{user.name}</p>
                        <p className="truncate text-xs text-[var(--text-secondary)]">{user.email}</p>
                      </div>
                    ))}
                  </div>
                )}
              </article>

              <article className="overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)]">
                <div className="border-b border-[var(--border-subtle)] px-5 py-4">
                  <h2 className="font-bold text-[var(--text-primary)]">Latest completed funding</h2>
                </div>
                {data.recentPayments.length === 0 ? <p className="p-5 text-sm text-[var(--text-secondary)]">No completed funding payments yet.</p> : (
                  <div className="divide-y divide-[var(--border-subtle)]">
                    {data.recentPayments.map((payment) => (
                      <div key={payment.reference} className="flex items-center justify-between gap-3 px-5 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{payment.email || 'Unknown account'}</p>
                          <p className="text-xs text-[var(--text-secondary)]">+{formatNumber(payment.creditedCoins)} Love Coins</p>
                        </div>
                        <p className="shrink-0 text-sm font-bold text-emerald-500">{formatNaira(payment.amountNaira)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            </section>

            <p className="pb-4 text-center text-xs text-[var(--text-secondary)]">
              Last verified: {new Date(data.generatedAt).toLocaleString('en-NG')}
            </p>
          </>
        )}
      </div>
    </main>
  );
}
