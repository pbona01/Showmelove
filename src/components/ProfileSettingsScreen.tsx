import { useEffect, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  ChevronRight,
  Gift as GiftIcon,
  Info,
  LogOut,
} from 'lucide-react';
import { formatCoins, formatNaira } from '../config/economy';
import { useShowmelove } from '../context/ShowmeloveContext';
import { GoldLoveCoinSvg, LoveCoinHeartSvg } from './GiftArtwork';
import { Button, InputField, ThemeSwitcher, TransactionRow } from './ui/DesignSystem';
import { AnimatedTabs, Reveal } from './ui/MotionPrimitives';
import { supabase } from '../lib/supabase';

interface ProfileSettingsScreenProps {
  onOpenBalanceInfo: () => void;
  onOpenBuyCoins: () => void;
  onOpenWithdraw: () => void;
  onSignOut?: () => void;
  onSignIn?: () => void;
}

type TxFilter = 'all' | 'coins' | 'rewards';

export function ProfileSettingsScreen({
  onOpenBalanceInfo,
  onOpenBuyCoins,
  onOpenWithdraw,
  onSignOut,
  onSignIn,
}: ProfileSettingsScreenProps) {
  const {
    state,
    currentWallet,
    switchRole,
    updateDefaultBankAccount,
    updateUserProfile,
  } = useShowmelove();

  const [bankName, setBankName] = useState(state.defaultBankAccount.bankName);
  const [accountNumber, setAccountNumber] = useState(state.defaultBankAccount.accountNumber);
  const [accountName, setAccountName] = useState(state.defaultBankAccount.accountName);
  const [bankSaved, setBankSaved] = useState(false);
  const [bankError, setBankError] = useState<string | null>(null);
  const [txFilter, setTxFilter] = useState<TxFilter>('all');

  const [profileName, setProfileName] = useState(state.signedInName);
  const [profileUsername, setProfileUsername] = useState('');

  useEffect(() => {
    setProfileName(state.signedInName);
    if (!supabase) return;
    void supabase.auth.getUser().then(({ data }) => {
      const username = data.user?.user_metadata?.username;
      if (typeof username === 'string') {
        setProfileUsername(username);
      }
    });
  }, [state.signedInName]);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);

  const handleSaveProfile = async () => {
    const cleanUser = profileUsername.trim().replace(/^@/, '');
    if (!cleanUser || cleanUser.length < 3) {
      setProfileError('Username must be at least 3 characters.');
      return;
    }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(cleanUser)) {
      setProfileError('Username can only contain letters, numbers, and underscores.');
      return;
    }
    if (!profileName.trim()) {
      setProfileError('Display name is required.');
      return;
    }

    setProfileSaving(true);
    setProfileError(null);
    try {
      await updateUserProfile({
        displayName: profileName.trim(),
        username: cleanUser,
      });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    } catch {
      setProfileError('Failed to save profile changes.');
    } finally {
      setProfileSaving(false);
    }
  };

  const isSignedIn = state.activeRole !== 'guest' && Boolean(state.signedInEmail);

  const handleSignOut = async () => {
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch {
      // Ignore
    }
    switchRole('guest');
    if (onSignOut) {
      onSignOut();
    }
  };


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
            Manage appearance, bank payout details, and your transaction ledger.
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
                  {isSignedIn ? state.signedInEmail : 'No sign-in active'}
                </p>
                {isSignedIn && (
                  <p className="text-xs font-semibold tabular-nums text-[#E10B5C] dark:text-[#FF3888] mt-1">
                    {formatCoins(currentWallet.loveCoinsBalance)} ·{' '}
                    {formatNaira(currentWallet.availableEarningsNaira)} rewards
                  </p>
                )}
              </div>
            </div>

            {isSignedIn && (
              <div className="pt-3 border-t border-[var(--border-subtle)] space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    Edit Profile &amp; Username
                  </p>
                </div>
                <div className="space-y-2.5">
                  <InputField
                    id="profile-username"
                    label="Username (your @handle)"
                    type="text"
                    value={profileUsername}
                    onChange={(e) => setProfileUsername(e.target.value.replace(/[^a-zA-Z0-9_@]/g, ''))}
                    placeholder="e.g. pbona"
                    hint="Your public @username handle on Showmelove"
                  />
                  <InputField
                    id="profile-display-name"
                    label="Name"
                    type="text"
                    autoComplete="name"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="e.g. Peter Davvy"
                    hint="This is the name shown on your profile, gifts, and dashboard."
                  />
                </div>

                {profileError && (
                  <p className="text-xs font-semibold text-rose-500">{profileError}</p>
                )}
                {profileSaved && (
                  <p className="text-xs font-semibold text-emerald-500 inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Profile updated successfully!
                  </p>
                )}

                <Button
                  variant="secondary"
                  size="sm"
                  fullWidth
                  onClick={handleSaveProfile}
                  disabled={profileSaving}
                >
                  {profileSaving ? 'Saving…' : 'Save Changes'}
                </Button>
              </div>
            )}

            {isSignedIn && (
              <div className="pt-3 border-t border-[var(--border-subtle)]">
                <Button
                  variant="secondary"
                  size="md"
                  fullWidth
                  onClick={handleSignOut}
                  data-testid="profile-signout-btn"
                  className="text-red-500 hover:text-red-600 hover:bg-red-500/10 border-red-500/20"
                >
                  <LogOut className="w-4 h-4 mr-1.5" />
                  Log Out of Showmelove
                </Button>
              </div>
            )}

            {!isSignedIn && onSignIn && (
              <div className="pt-3 border-t border-[var(--border-subtle)]">
                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  onClick={onSignIn}
                >
                  Sign in to your account
                </Button>
              </div>
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
                  Used for Gifted Rewards withdrawals.
                </p>
              </div>
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



            {isSignedIn && (
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full px-5 py-4 flex items-center justify-between gap-3 hover:bg-red-500/5 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <LogOut className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                    Log Out
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--text-secondary)]" />
              </button>
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
