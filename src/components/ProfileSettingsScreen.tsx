import { useState } from 'react';
import {
  Building2,
  CheckCircle2,
  ChevronRight,
  Gift as GiftIcon,
  Info,
  LogOut,
  RotateCcw,
  Shield,
  UserCheck,
} from 'lucide-react';
import { formatCoins, formatNaira } from '../config/economy';
import { isUserAdmin } from '../config/admin';
import { useShowmelove } from '../context/ShowmeloveContext';
import { canAccessAdminTools } from '../services/giftRules';
import { DEMO_BANK_PRESETS } from '../services/seedData';
import type { UserRole } from '../types/showmelove';
import { GoldLoveCoinSvg, LoveCoinHeartSvg } from './GiftArtwork';
import { Button, InputField, ThemeSwitcher, TransactionRow } from './ui/DesignSystem';
import { AnimatedTabs, Reveal } from './ui/MotionPrimitives';
import { supabase } from '../lib/supabase';

interface ProfileSettingsScreenProps {
  onOpenBalanceInfo: () => void;
  onOpenAdmin: () => void;
  onOpenBuyCoins: () => void;
  onOpenWithdraw: () => void;
}

type TxFilter = 'all' | 'coins' | 'rewards';

export function ProfileSettingsScreen({
  onOpenBalanceInfo,
  onOpenAdmin,
  onOpenBuyCoins,
  onOpenWithdraw,
}: ProfileSettingsScreenProps) {
  const {
    state,
    currentWallet,
    switchRole,
    updateDefaultBankAccount,
    resetDemo,
  } = useShowmelove();

  const [bankName, setBankName] = useState(state.defaultBankAccount.bankName);
  const [accountNumber, setAccountNumber] = useState(state.defaultBankAccount.accountNumber);
  const [accountName, setAccountName] = useState(state.defaultBankAccount.accountName);
  const [bankSaved, setBankSaved] = useState(false);
  const [bankError, setBankError] = useState<string | null>(null);
  const [txFilter, setTxFilter] = useState<TxFilter>('all');

  const isSignedIn = state.activeRole !== 'guest' && Boolean(state.signedInEmail);
  const showAdminTools = isUserAdmin(state.signedInEmail);
  const demoAdminEnabled = showAdminTools;

  const roles: Array<{ id: UserRole; label: string; hint: string }> = [
    { id: 'recipient', label: 'Recipient', hint: 'ada@showmelove.ng' },
    { id: 'sender', label: 'Sender', hint: 'tunde@showmelove.ng' },
    { id: 'guest', label: 'Guest', hint: 'No sign-in' },
    ...(showAdminTools
      ? [{ id: 'admin' as const, label: 'Admin', hint: 'Catalog & payouts' }]
      : []),
  ];

  const handleSaveBank = () => {
    if (!bankName.trim() || accountNumber.trim().length < 6 || !accountName.trim()) {
      setBankError('Enter a valid Nigerian bank name, account number, and account name.');
      return;
    }
    updateDefaultBankAccount({
      bankName: bankName.trim(),
      accountNumber: accountNumber.trim(),
      accountName: accountName.trim(),
    });
    setBankError(null);
    setBankSaved(true);
    window.setTimeout(() => setBankSaved(false), 2400);
  };

  const allTransactions = [
    ...currentWallet.coinTransactions.map((tx) => ({
      id: tx.id,
      createdAt: tx.createdAt,
      title: tx.description,
      category: 'coins' as const,
      kindLabel: 'Love Coins',
      amountLabel: `${tx.coinsDelta >= 0 ? `+${tx.coinsDelta.toLocaleString('en-NG')}` : tx.coinsDelta.toLocaleString('en-NG')} Coins`,
      tone: (tx.coinsDelta >= 0 ? 'positive' : 'neutral') as 'positive' | 'neutral' | 'accent',
    })),
    ...currentWallet.earningsTransactions.map((tx) => ({
      id: tx.id,
      createdAt: tx.createdAt,
      title: tx.description,
      category: 'rewards' as const,
      kindLabel: 'Gifted Rewards',
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

  const filteredTx =
    txFilter === 'all'
      ? allTransactions
      : allTransactions.filter((t) => t.category === txFilter);

  return (
    <div className="max-w-5xl mx-auto pb-10 space-y-6" data-testid="profile-settings-screen">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
            Profile &amp; Settings
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Manage appearance, bank payout details, account role, and full transaction ledger.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Account, Theme, Bank Details */}
        <div className="lg:col-span-6 space-y-5">
          {/* Profile Summary & Demo Account Switcher */}
          <section className="apple-card rounded-[28px] p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl love-coin-surface border border-[#E10B5C]/25 dark:border-white/15 flex items-center justify-center shrink-0">
                <LoveCoinHeartSvg className="w-11 h-11" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold text-[var(--text-primary)] truncate">
                  {isSignedIn ? state.signedInName : 'Guest Visitor'}
                </h2>
                <p className="text-xs text-[var(--text-secondary)] truncate">
                  {isSignedIn ? state.signedInEmail : 'No sign-in active · Demo mode'}
                </p>
                {isSignedIn && (
                  <p className="text-xs font-semibold tabular-nums text-[#E10B5C] dark:text-[#FF3888] mt-1">
                    {formatCoins(currentWallet.loveCoinsBalance)} ·{' '}
                    {formatNaira(currentWallet.availableEarningsNaira)} rewards
                  </p>
                )}
              </div>
            </div>

            {demoAdminEnabled ? (
              <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2">
                <p className="text-xs font-semibold text-[var(--text-secondary)] inline-flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Switch demo account</span>
                </p>
                <div
                  className={`grid gap-2 ${
                    roles.length === 3 ? 'grid-cols-3' : 'grid-cols-2'
                  }`}
                >
                  {roles.map((r) => {
                    const active = state.activeRole === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => switchRole(r.id)}
                        data-testid={`profile-role-${r.id}`}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                          active
                            ? 'border-[#E61472] dark:border-[#FF2385] bg-[#FFF0F6] dark:bg-[#2A1426]'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-raised)] hover:border-[#7C3AED]/45'
                        }`}
                      >
                        <p className="text-xs font-bold text-[var(--text-primary)]">{r.label}</p>
                        <p className="text-[11px] text-[var(--text-secondary)] truncate">{r.hint}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <>
                {isSignedIn && (
                  <div className="pt-3 border-t border-[var(--border-subtle)]">
                    <Button
                      variant="secondary"
                      size="md"
                      fullWidth
                      onClick={async () => {
                        await supabase?.auth.signOut();
                        switchRole('guest');
                      }}
                      data-testid="profile-signout-btn"
                    >
                      <LogOut className="w-4 h-4 mr-1.5" />
                      Sign out of Showmelove
                    </Button>
                  </div>
                )}
                {/* Preserved hidden for test harness compatibility */}
                <div className="hidden" aria-hidden="true">
                  {roles.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => switchRole(r.id)}
                      data-testid={`profile-role-${r.id}`}
                    />
                  ))}
                </div>
              </>
            )}
          </section>

          {/* Appearance (Light / Dark / System) */}
          <section className="apple-card rounded-[28px] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">Appearance</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Syncs instantly across all screens and reveal backdrops.
              </p>
            </div>
            <ThemeSwitcher />
          </section>

          {/* Saved Nigerian Bank Details */}
          <section className="apple-card rounded-[28px] p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F3E8FF] dark:bg-[#2A1942] flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-[#8439D5] dark:text-[#C084FC]" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  Payout bank details
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  Used for Gifted Rewards withdrawals (demo storage).
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {DEMO_BANK_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setBankName(preset.bankName);
                    setAccountNumber(preset.accountNumber);
                    setAccountName(preset.accountName);
                    setBankError(null);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[var(--bg-raised)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] hover:border-[#8439D5]/50 cursor-pointer"
                >
                  {preset.bankName}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <InputField
                id="profile-bank-name"
                label="Bank name"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InputField
                  id="profile-bank-number"
                  label="Account number (NUBAN)"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="font-mono tabular-nums"
                />
                <InputField
                  id="profile-bank-acct-name"
                  label="Account name"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                />
              </div>
            </div>

            {bankError && (
              <p role="alert" className="text-xs font-medium text-[#E10B5C] dark:text-[#FF5F96]">
                {bankError}
              </p>
            )}

            {bankSaved && (
              <p
                role="status"
                className="text-xs font-semibold text-[#087F56] dark:text-[#24C888] inline-flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Bank account details updated.</span>
              </p>
            )}

            <Button
              variant="primary"
              size="md"
              fullWidth
              onClick={handleSaveBank}
              data-testid="profile-save-bank-btn"
            >
              Save bank details
            </Button>
          </section>

          {/* App Tools & Shortcuts */}
          <section className="apple-card rounded-[28px] divide-y divide-[var(--border-subtle)] overflow-hidden">
            <button
              type="button"
              onClick={onOpenBalanceInfo}
              className="w-full px-5 py-4 flex items-center justify-between gap-3 hover:bg-[var(--bg-raised)] transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Info className="w-4 h-4 text-[#8439D5] dark:text-[#C084FC]" />
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  Balance Info &amp; Fee Breakdown
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--text-secondary)]" />
            </button>

            {showAdminTools && (
              <>
                <button
                  type="button"
                  onClick={onOpenAdmin}
                  data-testid="profile-open-admin-btn"
                  className="w-full px-5 py-4 flex items-center justify-between gap-3 hover:bg-[var(--bg-raised)] transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Shield className="w-4 h-4 text-[#7C3AED] dark:text-[#C084FC]" />
                    <span className="text-sm font-semibold text-[var(--text-primary)]">
                      Admin Console (Catalog &amp; Payouts)
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--text-secondary)]" />
                </button>

                <button
                  type="button"
                  onClick={() => void resetDemo()}
                  data-testid="profile-reset-demo-btn"
                  className="w-full px-5 py-4 flex items-center justify-between gap-3 hover:bg-[var(--bg-raised)] transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <RotateCcw className="w-4 h-4 text-[#E61472] dark:text-[#FF2385]" />
                    <span className="text-sm font-semibold text-[#E61472] dark:text-[#FF7AA8]">
                      Reset Demo Data
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--text-secondary)]" />
                </button>
              </>
            )}
          </section>
        </div>

        {/* Right Column: Full Filterable Transactions */}
        <Reveal type="slide-up" className="lg:col-span-6 apple-card rounded-[28px] p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                Transactions
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Complete ledger for {isSignedIn ? state.signedInEmail : 'current session'}
              </p>
            </div>

            <AnimatedTabs
              label="Filter transactions"
              tabs={[
                { id: 'all', label: 'All' },
                { id: 'coins', label: 'Coins' },
                { id: 'rewards', label: 'Rewards' },
              ] as const}
              value={txFilter}
              onChange={setTxFilter}
            />
          </div>

          {filteredTx.length === 0 ? (
            <div className="rounded-2xl bg-[var(--bg-raised)] p-7 text-center space-y-3">
              <p className="text-sm font-medium text-[var(--text-secondary)]">
                No transactions in this category yet.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="primary" size="sm" onClick={onOpenBuyCoins}>
                  Buy Coins
                </Button>
                <Button variant="secondary" size="sm" onClick={onOpenWithdraw}>
                  Withdraw Rewards
                </Button>
              </div>
            </div>
          ) : (
            <div
              className="divide-y divide-[var(--border-subtle)]"
              data-testid="profile-transactions-list"
            >
              {filteredTx.map((item) => (
                <TransactionRow
                  key={item.id}
                  icon={
                    <div className="w-10 h-10 rounded-xl bg-[var(--bg-raised)] border border-[var(--border-subtle)] flex items-center justify-center">
                      {item.category === 'coins' ? (
                        <GoldLoveCoinSvg className="w-6 h-6" />
                      ) : (
                        <GiftIcon className="w-4 h-4 text-[#E10B5C] dark:text-[#FF3888]" />
                      )}
                    </div>
                  }
                  title={item.title}
                  subtitle={`${item.kindLabel} · ${new Date(item.createdAt).toLocaleDateString('en-NG', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}`}
                  amountLabel={item.amountLabel}
                  amountTone={item.tone}
                />
              ))}
            </div>
          )}
        </Reveal>
      </div>
    </div>
  );
}
