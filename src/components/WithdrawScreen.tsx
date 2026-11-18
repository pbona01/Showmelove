import { useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  Info,
  XCircle,
} from 'lucide-react';
import {
  calculateWithdrawalSummary,
  ECONOMY_CONFIG,
  formatNaira,
} from '../config/economy';
import { useShowmelove } from '../context/ShowmeloveContext';
import { DEMO_BANK_PRESETS } from '../services/seedData';
import { PurpleGiftBoxSvg } from './GiftArtwork';
import { BottomSheet, Button, InputField } from './ui/DesignSystem';

interface WithdrawScreenProps {
  onBack: () => void;
  onSendGift?: () => void;
  onOpenInbox?: () => void;
}

export function WithdrawScreen({
  onBack,
  onSendGift,
  onOpenInbox,
}: WithdrawScreenProps) {
  const {
    state,
    currentWallet,
    submitWithdrawal,
    resolvePayout,
    switchRole,
    updateDefaultBankAccount,
  } = useShowmelove();

  const [amountInput, setAmountInput] = useState(
    currentWallet.availableEarningsNaira >= ECONOMY_CONFIG.MIN_WITHDRAWAL_NAIRA
      ? String(currentWallet.availableEarningsNaira)
      : String(ECONOMY_CONFIG.MIN_WITHDRAWAL_NAIRA),
  );
  const [bankSheetOpen, setBankSheetOpen] = useState(false);
  const [bankName, setBankName] = useState(state.defaultBankAccount.bankName);
  const [accountNumber, setAccountNumber] = useState(
    state.defaultBankAccount.accountNumber,
  );
  const [accountName, setAccountName] = useState(state.defaultBankAccount.accountName);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  const isSignedIn = state.activeRole !== 'guest' && Boolean(state.signedInEmail);
  const normalizedEmail = state.signedInEmail.trim().toLowerCase();
  const userPayouts = state.payoutRequests.filter(
    (p) => p.recipientEmail.toLowerCase() === normalizedEmail,
  );

  const parsedAmount = Number(amountInput);
  const canWithdraw =
    isSignedIn &&
    currentWallet.availableEarningsNaira >= ECONOMY_CONFIG.MIN_WITHDRAWAL_NAIRA;

  const summary = calculateWithdrawalSummary(
    Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : 0,
  );

  const handleOpenConfirmation = () => {
    setError(null);
    setStatusBanner(null);

    if (!isSignedIn) {
      setError('Sign in as a recipient first to withdraw Gifted Rewards.');
      return;
    }
    if (currentWallet.availableEarningsNaira < ECONOMY_CONFIG.MIN_WITHDRAWAL_NAIRA) {
      setError(
        `Available balance is below the ${formatNaira(ECONOMY_CONFIG.MIN_WITHDRAWAL_NAIRA)} minimum withdrawal.`,
      );
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount < ECONOMY_CONFIG.MIN_WITHDRAWAL_NAIRA) {
      setError(`Minimum withdrawal is ${formatNaira(ECONOMY_CONFIG.MIN_WITHDRAWAL_NAIRA)}.`);
      return;
    }
    if (parsedAmount > currentWallet.availableEarningsNaira) {
      setError(
        `Amount exceeds your Available to Withdraw balance (${formatNaira(currentWallet.availableEarningsNaira)}).`,
      );
      return;
    }
    if (!bankName.trim() || !accountNumber.trim() || !accountName.trim()) {
      setError('Link a complete Nigerian bank account before withdrawing.');
      setBankSheetOpen(true);
      return;
    }
    setConfirming(true);
  };

  const handleConfirmWithdrawal = () => {
    const res = submitWithdrawal(parsedAmount, {
      bankName: bankName.trim(),
      accountNumber: accountNumber.trim(),
      accountName: accountName.trim(),
    });
    if (!res.ok) {
      setError(res.error || 'Could not request withdrawal.');
      setConfirming(false);
      return;
    }
    setConfirming(false);
    setStatusBanner(
      `Withdrawal of ${formatNaira(parsedAmount)} requested (Pending) and reserved from Available to Withdraw.`,
    );
  };

  const handleSaveBankDetails = () => {
    if (!bankName.trim() || accountNumber.trim().length < 6 || !accountName.trim()) {
      setError('Enter a valid bank name, account number, and account name.');
      return;
    }
    updateDefaultBankAccount({
      bankName: bankName.trim(),
      accountNumber: accountNumber.trim(),
      accountName: accountName.trim(),
    });
    setError(null);
    setBankSheetOpen(false);
  };

  return (
    <div className="max-w-4xl mx-auto pb-12 space-y-6">
      {/* Header matching Reference Screen 4 */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to Wallet"
            className="min-h-[44px] min-w-[44px] rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] flex items-center justify-center hover:bg-[var(--bg-raised)] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
            Withdraw Rewards
          </h1>
        </div>

        <span className="text-xs font-medium text-[var(--text-secondary)] hidden sm:inline">
          Simulated bank transfer
        </span>
      </div>

      {!isSignedIn ? (
        <section className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            Sign in to withdraw Gifted Rewards
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Switch to the seeded demo recipient account to test bank linking, Pending, Paid, and Failed payouts.
          </p>
          <Button variant="primary" size="md" onClick={() => switchRole('recipient')}>
            Sign in as Adaeze (Recipient)
          </Button>
        </section>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Reference Withdraw Rewards Card + Form */}
          <div className="lg:col-span-6 space-y-5">
            {/* Reference Purple-Lit Available to Withdraw Card */}
            <section className="rewards-glow-surface rounded-3xl border border-[#8439D5]/25 dark:border-[#A855F7]/30 p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <PurpleGiftBoxSvg className="w-16 h-16 sm:w-20 sm:h-20 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-[var(--text-secondary)]">
                    Available to Withdraw
                  </p>
                  <p
                    className="text-3xl sm:text-4xl font-bold tabular-nums text-[var(--text-primary)] leading-tight mt-0.5"
                    data-testid="withdraw-available-balance"
                  >
                    {formatNaira(currentWallet.availableEarningsNaira)}
                  </p>
                  {currentWallet.reservedEarningsNaira > 0 && (
                    <p className="text-xs tabular-nums text-[var(--text-secondary)] mt-1">
                      Pending payout: {formatNaira(currentWallet.reservedEarningsNaira)}
                    </p>
                  )}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[var(--text-secondary)] shrink-0 hidden sm:block" />
            </section>

            {/* Withdrawal Method */}
            <section className="space-y-2.5">
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                Withdrawal Method
              </h2>
              <button
                type="button"
                onClick={() => setBankSheetOpen(true)}
                data-testid="withdraw-bank-method-btn"
                className="w-full text-left rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 flex items-center justify-between gap-3 hover:border-[#8439D5]/50 dark:hover:border-[#A855F7]/50 transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#E3F1FD] dark:bg-[#19283A] flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-[#1D74C6] dark:text-[#52A8FF]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[var(--text-primary)] truncate">
                      {bankName || 'Bank Account'}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] tabular-nums truncate">
                      {accountNumber
                        ? `${accountNumber} · ${accountName}`
                        : 'Link your Nigerian bank account'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-[var(--text-secondary)] shrink-0" />
              </button>
            </section>

            {/* Amount + Summary + Withdraw Now */}
            <section className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5 space-y-4">
              {statusBanner && (
                <div
                  role="status"
                  className="rounded-2xl bg-[#E6F6EF] dark:bg-[#0D3326] border border-[#087F56]/25 dark:border-[#24C888]/30 p-3.5 text-xs font-medium text-[var(--text-primary)]"
                >
                  {statusBanner}
                </div>
              )}

              {error && (
                <div
                  role="alert"
                  className="rounded-2xl bg-[#FFEAF2] dark:bg-[#2F1426] border border-[#DF0756]/30 dark:border-[#FF176C]/35 p-3.5 text-xs font-medium text-[var(--text-primary)] flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-[#DF0756] dark:text-[#FF176C] shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {!canWithdraw && (
                <div className="rounded-2xl bg-[var(--bg-raised)] border border-[var(--border-subtle)] p-3.5 text-xs text-[var(--text-secondary)] space-y-2">
                  <p className="font-semibold text-[var(--text-primary)]">
                    Withdrawal unavailable right now
                  </p>
                  <p>
                    You need at least {formatNaira(ECONOMY_CONFIG.MIN_WITHDRAWAL_NAIRA)} in claimable Gifted Rewards to request a payout.
                  </p>
                  {onOpenInbox && (
                    <button
                      type="button"
                      onClick={onOpenInbox}
                      className="font-semibold text-[#DF0756] dark:text-[#FF176C] hover:underline"
                    >
                      Check Inbox for unclaimed gifts →
                    </button>
                  )}
                </div>
              )}

              {!confirming ? (
                <>
                  <div className="space-y-2">
                    <InputField
                      id="withdraw-amount"
                      label="Withdrawal amount (₦)"
                      type="number"
                      min={ECONOMY_CONFIG.MIN_WITHDRAWAL_NAIRA}
                      max={Math.max(
                        ECONOMY_CONFIG.MIN_WITHDRAWAL_NAIRA,
                        currentWallet.availableEarningsNaira,
                      )}
                      step={100}
                      value={amountInput}
                      onChange={(e) => {
                        setAmountInput(e.target.value);
                        setError(null);
                      }}
                      className="font-bold tabular-nums"
                    />
                    {canWithdraw && (
                      <div className="flex items-center gap-2 text-xs">
                        {[
                          {
                            label: 'Half',
                            val: Math.max(
                              ECONOMY_CONFIG.MIN_WITHDRAWAL_NAIRA,
                              Math.round(currentWallet.availableEarningsNaira / 2),
                            ),
                          },
                          { label: 'Max', val: currentWallet.availableEarningsNaira },
                        ].map((chip) => (
                          <button
                            key={chip.label}
                            type="button"
                            onClick={() => setAmountInput(String(chip.val))}
                            className="px-2.5 py-1 rounded-lg bg-[var(--bg-raised)] border border-[var(--border-subtle)] font-semibold tabular-nums text-[var(--text-primary)] hover:border-[#8439D5]/45 dark:hover:border-[#A855F7]/45"
                          >
                            {chip.label} ({formatNaira(chip.val)})
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Payout Fee & Net Received Breakdown */}
                  <div className="rounded-2xl bg-[var(--bg-raised)] border border-[var(--border-subtle)] p-3.5 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Withdrawal amount</span>
                      <span className="font-semibold tabular-nums text-[var(--text-primary)]">
                        {formatNaira(summary.grossAmountNaira)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Payout fee</span>
                      <span className="font-semibold tabular-nums text-[var(--text-primary)]">
                        {summary.payoutFeeNaira === 0
                          ? 'Free (₦0)'
                          : formatNaira(summary.payoutFeeNaira)}
                      </span>
                    </div>
                    <div className="flex justify-between pt-1.5 border-t border-[var(--border-subtle)] text-sm">
                      <span className="font-bold text-[var(--text-primary)]">Net to bank</span>
                      <span className="font-bold tabular-nums text-[#087F56] dark:text-[#24C888]">
                        {formatNaira(summary.netReceivedNaira)}
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    disabled={!canWithdraw}
                    onClick={handleOpenConfirmation}
                    data-testid="withdraw-review-btn"
                  >
                    Withdraw Now
                  </Button>

                  <div className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
                    <Info className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>{ECONOMY_CONFIG.PAYOUT_PROCESSING_COPY}</p>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl bg-[var(--bg-raised)] border border-[#DF0756]/30 dark:border-[#FF176C]/35 p-4 space-y-4">
                  <h3 className="text-base font-bold text-[var(--text-primary)]">
                    Confirm withdrawal
                  </h3>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Net payout</span>
                      <span className="font-bold tabular-nums text-[var(--text-primary)]">
                        {formatNaira(summary.netReceivedNaira)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Bank account</span>
                      <span className="font-medium text-[var(--text-primary)]">
                        {bankName} · {accountNumber}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Account name</span>
                      <span className="font-medium text-[var(--text-primary)]">
                        {accountName}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2.5">
                    <Button
                      variant="primary"
                      size="md"
                      className="flex-1"
                      onClick={handleConfirmWithdrawal}
                      data-testid="withdraw-confirm-btn"
                    >
                      Confirm &amp; reserve
                    </Button>
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={() => setConfirming(false)}
                    >
                      Back
                    </Button>
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* Right Column: Payout History & Status Simulation */}
          <section className="lg:col-span-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5 sm:p-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                Payout history
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Track Pending, Paid, and Failed transfers. Failed payouts return reserved rewards back to Available to Withdraw.
              </p>
            </div>

            {userPayouts.length === 0 ? (
              <div className="rounded-2xl bg-[var(--bg-raised)] border border-[var(--border-subtle)] p-6 text-center space-y-3">
                <p className="text-xs text-[var(--text-secondary)]">
                  No withdrawal requests yet.
                </p>
                {onSendGift && (
                  <Button variant="secondary" size="sm" onClick={onSendGift}>
                    Send a gift
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3" data-testid="payout-history-list">
                {userPayouts.map((payout) => (
                  <div
                    key={payout.id}
                    className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-raised)] p-4 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-bold tabular-nums text-[var(--text-primary)]">
                          {formatNaira(payout.netAmountNaira)}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {payout.bankAccount.bankName} · {payout.bankAccount.accountNumber}
                        </p>
                      </div>

                      <span className="inline-flex items-center gap-1 text-xs font-semibold">
                        {payout.status === 'pending' && (
                          <>
                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                            <span className="text-[var(--text-primary)]">Pending</span>
                          </>
                        )}
                        {payout.status === 'completed' && (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#087F56] dark:text-[#24C888]" />
                            <span className="text-[#087F56] dark:text-[#24C888]">Paid</span>
                          </>
                        )}
                        {payout.status === 'failed' && (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-[#DF0756] dark:text-[#FF176C]" />
                            <span className="text-[#DF0756] dark:text-[#FF176C]">Failed</span>
                          </>
                        )}
                      </span>
                    </div>

                    {payout.failureReason && (
                      <p className="text-xs text-[#DF0756] dark:text-[#FF79A8]">
                        {payout.failureReason}
                      </p>
                    )}

                    {payout.status === 'pending' && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button
                          variant="dark"
                          size="sm"
                          onClick={() => resolvePayout(payout.id, 'completed')}
                        >
                          Mark as Paid
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            resolvePayout(
                              payout.id,
                              'failed',
                              'Simulated bank transfer declined — funds returned.',
                            )
                          }
                        >
                          Simulate Failed
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Bank Account Linking Sheet */}
      <BottomSheet
        open={bankSheetOpen}
        title="Link Nigerian bank account (Demo)"
        onClose={() => setBankSheetOpen(false)}
      >
        <p className="text-xs text-[var(--text-secondary)]">
          Demo payout details are stored locally in this browser. Do not enter real sensitive credentials.
        </p>

        <div className="flex flex-wrap gap-2">
          {DEMO_BANK_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                setBankName(preset.bankName);
                setAccountNumber(preset.accountNumber);
                setAccountName(preset.accountName);
              }}
              className="px-3 py-1.5 rounded-xl bg-[var(--bg-raised)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] hover:border-[#8439D5]/50"
            >
              {preset.bankName}
            </button>
          ))}
        </div>

        <InputField
          id="sheet-bank-name"
          label="Bank name"
          type="text"
          value={bankName}
          onChange={(e) => setBankName(e.target.value)}
        />
        <InputField
          id="sheet-acct-num"
          label="Account number (NUBAN)"
          type="text"
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value)}
          className="font-mono tabular-nums"
        />
        <InputField
          id="sheet-acct-name"
          label="Account name"
          type="text"
          value={accountName}
          onChange={(e) => setAccountName(e.target.value)}
        />

        <div className="flex gap-2.5 pt-2">
          <Button variant="primary" size="md" fullWidth onClick={handleSaveBankDetails}>
            Save bank account
          </Button>
          <Button variant="secondary" size="md" onClick={() => setBankSheetOpen(false)}>
            Cancel
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
