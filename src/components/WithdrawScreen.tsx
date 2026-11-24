import { useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  Coins,
  Lock,
  Receipt,
  Send,
  Wallet as WalletIcon,
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
import { Counter, ProgressRing } from './ui/MotionPrimitives';

interface WithdrawScreenProps {
  onBack: () => void;
  onSendGift?: () => void;
  onOpenInbox?: () => void;
}

function maskAccountNumber(accountNumber: string): string {
  const digits = accountNumber.trim();
  if (digits.length <= 4) return digits;
  return `•••• ${digits.slice(-4)}`;
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
  const [successReceipt, setSuccessReceipt] = useState<{
    amountNaira: number;
    netNaira: number;
    bankName: string;
    maskedAccount: string;
  } | null>(null);

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
    setSuccessReceipt(null);

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
        `Amount exceeds your Available to withdraw balance (${formatNaira(currentWallet.availableEarningsNaira)}).`,
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
    setSuccessReceipt({
      amountNaira: summary.grossAmountNaira,
      netNaira: summary.netReceivedNaira,
      bankName: bankName.trim(),
      maskedAccount: maskAccountNumber(accountNumber),
    });
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
      {/* Header matching Mockup 06 */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to Dashboard"
            className="min-h-[42px] min-w-[42px] rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] flex items-center justify-center hover:bg-[var(--bg-raised)] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
            Withdraw Gifted Rewards
          </h1>
        </div>

        <span className="text-xs font-medium text-[var(--text-secondary)] hidden sm:inline">
          Nigerian bank payout
        </span>
      </div>

      <div className="rounded-2xl border border-[#8439D5]/20 bg-[#F3E8FF]/30 dark:bg-[#2A1942]/30 p-3 text-xs text-[var(--text-secondary)] leading-relaxed flex items-center gap-2.5">
        <Receipt className="w-4 h-4 text-[#8439D5] dark:text-[#C084FC] shrink-0" />
        <span>
          <strong className="text-[var(--text-primary)]">Gifting Policy:</strong> Deposited coins are reserved exclusively for gifting and coin sprays. Only Gifted Rewards received from others can be withdrawn.
        </span>
      </div>

      {!isSignedIn ? (
        <section className="apple-card rounded-[28px] p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            Sign in to withdraw Gifted Rewards
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Switch to the seeded demo recipient account to test bank linking and Pending, Paid, and Failed payouts.
          </p>
          <Button variant="primary" size="md" onClick={() => switchRole('recipient')}>
            Sign in as Adaeze (Recipient)
          </Button>
        </section>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Mockup 06 Withdraw Rewards Flow */}
          <div className="lg:col-span-6 space-y-5">
            {/* Purple-Lit Available to Withdraw Hero Card matching Mockup 06 */}
            <section className="rewards-glow-surface rounded-[28px] border border-[#8439D5]/30 dark:border-[#A855F7]/35 p-5 sm:p-6 flex items-center justify-between gap-4 shadow-[0_20px_44px_-22px_rgba(168,85,247,0.42)]">
              <div className="space-y-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-[#5B21B6] dark:text-[#E9D5FF]">
                  Available to withdraw
                </p>
                <p
                  className="text-3xl sm:text-[40px] font-bold tabular-nums text-[#20111D] dark:text-white leading-none"
                  data-testid="withdraw-available-balance"
                >
                  {formatNaira(currentWallet.availableEarningsNaira)}
                </p>
                {currentWallet.reservedEarningsNaira > 0 && (
                  <p className="text-xs tabular-nums text-[#5B21B6] dark:text-[#E9D5FF] pt-1">
                    Pending payout: {formatNaira(currentWallet.reservedEarningsNaira)}
                  </p>
                )}
              </div>
              <PurpleGiftBoxSvg className="w-20 h-20 sm:w-24 sm:h-24 shrink-0" />
            </section>

            {/* Withdrawal Method Card matching Mockup 06 */}
            <section className="space-y-2">
              <h2 className="text-sm font-bold text-[var(--text-primary)] px-1">
                Withdrawal method
              </h2>
              <button
                type="button"
                onClick={() => setBankSheetOpen(true)}
                data-testid="withdraw-bank-method-btn"
                className="w-full text-left apple-card rounded-[22px] p-4 flex items-center justify-between gap-3 hover:border-[#8439D5]/50 dark:hover:border-[#A855F7]/55 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-[#F3E8FF] dark:bg-[#2A1942] border border-[#8439D5]/20 dark:border-[#A855F7]/25 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-[#8439D5] dark:text-[#C084FC]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm sm:text-base font-bold text-[var(--text-primary)] truncate">
                      {bankName || 'Link Bank Account'}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] tabular-nums truncate">
                      {accountNumber
                        ? `${maskAccountNumber(accountNumber)} · ${accountName}`
                        : 'Tap to add Nigerian bank account'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-[var(--text-secondary)] shrink-0" />
              </button>
            </section>

            {/* Amount Input with Inline Max Pill + Payout Breakdown */}
            <section className="apple-card rounded-[28px] p-5 space-y-4">
              {successReceipt && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  role="status"
                  data-testid="withdraw-success-state"
                  className="rounded-2xl bg-[#E6F6EF] dark:bg-[#0D3326] border border-[#087F56]/30 dark:border-[#24C888]/35 p-4 space-y-2"
                >
                  <div className="flex items-center gap-2 text-[#087F56] dark:text-[#24C888] font-bold text-sm">
                    <motion.span initial={{ scale: 0, rotate: -24 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 280, damping: 18 }}>
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    </motion.span>
                    <span>Withdrawal submitted (Pending)</span>
                  </div>
                  <p className="text-xs text-[var(--text-primary)] leading-relaxed">
                    {formatNaira(successReceipt.netNaira)} queued for{' '}
                    <strong>{successReceipt.bankName}</strong> ({successReceipt.maskedAccount}).
                    Reserved from Available to withdraw until marked Paid or Failed.
                  </p>
                </motion.div>
              )}

              {error && (
                <div
                  role="alert"
                  className="rounded-2xl bg-[#FFEAF2] dark:bg-[#2F1426] border border-[#E10B5C]/30 dark:border-[#FF176C]/35 p-3.5 text-xs font-medium text-[var(--text-primary)] flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-[#E10B5C] dark:text-[#FF176C] shrink-0 mt-0.5" />
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
                      className="font-semibold text-[#E10B5C] dark:text-[#FF3888] hover:underline cursor-pointer"
                    >
                      Check Inbox for unclaimed gifts →
                    </button>
                  )}
                </div>
              )}

              {!confirming ? (
                <>
                  <div className="space-y-2">
                    <label
                      htmlFor="withdraw-amount"
                      className="block text-sm font-bold text-[var(--text-primary)]"
                    >
                      Amount
                    </label>
                    <div className="flex items-center gap-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-raised)] px-4 py-2 focus-within:border-[#E10B5C] dark:focus-within:border-[#FF2A85] focus-within:ring-2 focus-within:ring-[#E10B5C]/25">
                      <span className="text-sm font-bold text-[var(--text-primary)]">LC</span>
                      <input
                        id="withdraw-amount"
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
                        className="w-full min-h-[38px] bg-transparent text-lg font-bold tabular-nums text-[var(--text-primary)] focus:outline-none"
                      />
                      {canWithdraw && (
                        <button
                          type="button"
                          onClick={() =>
                            setAmountInput(String(currentWallet.availableEarningsNaira))
                          }
                          data-testid="withdraw-max-btn"
                          className="min-h-[32px] px-3 py-1 rounded-full bg-[#FFEAF2] dark:bg-[#2F1426] border border-[#E10B5C]/30 dark:border-[#FF2A85]/40 text-xs font-bold text-[#E10B5C] dark:text-[#FF66A8] hover:opacity-90 transition-opacity shrink-0 cursor-pointer"
                        >
                          Max
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Payout Summary Card matching Mockup 06 */}
                  <div className="rounded-2xl bg-[var(--bg-raised)] border border-[var(--border-subtle)] p-4 space-y-2.5 text-xs sm:text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2 text-[var(--text-secondary)]">
                        <Coins className="w-4 h-4" />
                        <span>Withdrawal amount</span>
                      </span>
                      <span className="font-semibold tabular-nums text-[var(--text-primary)]">
                        <Counter value={summary.grossAmountNaira} formatter={formatNaira} />
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2 text-[var(--text-secondary)]">
                        <Receipt className="w-4 h-4" />
                        <span>Payout fee</span>
                      </span>
                      <span className="font-semibold tabular-nums text-[var(--text-primary)]">
                        {summary.payoutFeeNaira === 0
                          ? 'Free (0 Love Coins)'
                          : `-${formatNaira(summary.payoutFeeNaira)}`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-[var(--border-subtle)]">
                      <span className="inline-flex items-center gap-2 font-bold text-[var(--text-primary)]">
                        <WalletIcon className="w-4 h-4 text-[#E10B5C] dark:text-[#FF3888]" />
                        <span>You receive</span>
                      </span>
                      <span className="text-base sm:text-lg font-bold tabular-nums text-[#E10B5C] dark:text-[#FF3888]">
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
                    <Send className="w-4 h-4" />
                    <span>Withdraw now</span>
                  </Button>

                  <div className="flex items-center justify-center gap-1.5 text-xs text-[var(--text-secondary)]">
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                    <p>Secure payout to your bank account. {ECONOMY_CONFIG.PAYOUT_PROCESSING_COPY}</p>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl bg-[var(--bg-raised)] border border-[#E10B5C]/30 dark:border-[#FF176C]/35 p-4 space-y-4">
                  <h3 className="text-base font-bold text-[var(--text-primary)]">
                    Confirm withdrawal
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">You receive</span>
                      <span className="font-bold tabular-nums text-[#E10B5C] dark:text-[#FF3888]">
                        {formatNaira(summary.netReceivedNaira)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Bank account</span>
                      <span className="font-medium text-[var(--text-primary)]">
                        {bankName} · {maskAccountNumber(accountNumber)}
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

          {/* Right Column: Payout History & Status Resolution */}
          <section className="lg:col-span-6 apple-card rounded-[28px] p-5 sm:p-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                Payout history
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Track Pending, Paid, and Failed transfers. Failed payouts return funds back to Available to withdraw.
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
                          {payout.bankAccount.bankName} · {maskAccountNumber(payout.bankAccount.accountNumber)}
                        </p>
                      </div>

                      <span className="inline-flex items-center gap-1 text-xs font-semibold">
                        {payout.status === 'pending' && (
                          <>
                            <ProgressRing value={0.5} size={22} strokeWidth={3} label="Payout pending" />
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
                            <XCircle className="w-3.5 h-3.5 text-[#E10B5C] dark:text-[#FF3888]" />
                            <span className="text-[#E10B5C] dark:text-[#FF3888]">Failed</span>
                          </>
                        )}
                      </span>
                    </div>

                    {payout.failureReason && (
                      <p className="text-xs text-[#E10B5C] dark:text-[#FF79A8]">
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
          Demo payout details are stored locally in this browser.
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
              className="px-3 py-1.5 rounded-xl bg-[var(--bg-raised)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] hover:border-[#8439D5]/50 cursor-pointer"
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
