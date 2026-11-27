import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  Coins,
  Loader2,
  Lock,
  Receipt,
  Search,
  Send,
  Wallet as WalletIcon,
  XCircle,
} from 'lucide-react';
import {
  calculateWithdrawalSummary,
  ECONOMY_CONFIG,
  formatNaira,
} from '../config/economy';
import { NIGERIAN_BANKS, findBankByName, findBankByCode } from '../config/banks';
import { useShowmelove } from '../context/ShowmeloveContext';
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
    updateDefaultBankAccount,
  } = useShowmelove();

  const [amountInput, setAmountInput] = useState(
    currentWallet.availableEarningsNaira >= ECONOMY_CONFIG.MIN_WITHDRAWAL_NAIRA
      ? String(currentWallet.availableEarningsNaira)
      : String(ECONOMY_CONFIG.MIN_WITHDRAWAL_NAIRA),
  );
  const [bankSheetOpen, setBankSheetOpen] = useState(false);
  const [bankName, setBankName] = useState(state.defaultBankAccount.bankName || 'Guaranty Trust Bank (GTBank)');
  const [bankCode, setBankCode] = useState(() => {
    return state.defaultBankAccount.bankCode || findBankByName(state.defaultBankAccount.bankName)?.code || '058';
  });
  const [bankSearch, setBankSearch] = useState('');
  const [accountNumber, setAccountNumber] = useState(
    state.defaultBankAccount.accountNumber,
  );
  const [accountName, setAccountName] = useState(state.defaultBankAccount.accountName);
  const [isResolvingAccount, setIsResolvingAccount] = useState(false);
  const [resolvedAccountName, setResolvedAccountName] = useState<string | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = useState(false);
  const [successReceipt, setSuccessReceipt] = useState<{
    amountNaira: number;
    netNaira: number;
    bankName: string;
    maskedAccount: string;
    isAutoProcessed: boolean;
  } | null>(null);

  // Live account name resolution via Paystack/NIBSS
  useEffect(() => {
    const cleanNum = accountNumber.trim().replace(/\D/g, '');
    if (cleanNum.length !== 10 || !bankCode) {
      setResolvedAccountName(null);
      setResolveError(null);
      return;
    }

    let isMounted = true;
    setIsResolvingAccount(true);
    setResolveError(null);

    fetch(`/api/paystack/resolve-account?account_number=${cleanNum}&bank_code=${encodeURIComponent(bankCode)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        setIsResolvingAccount(false);
        if (data.ok && data.account_name) {
          setResolvedAccountName(data.account_name);
          setAccountName(data.account_name);
          setResolveError(null);
        } else {
          setResolveError(data.error || 'Could not verify account name.');
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setIsResolvingAccount(false);
      });

    return () => {
      isMounted = false;
    };
  }, [accountNumber, bankCode]);

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

  const handleConfirmWithdrawal = async () => {
    setIsSubmittingWithdrawal(true);
    const res = submitWithdrawal(parsedAmount, {
      bankName: bankName.trim(),
      bankCode: bankCode,
      accountNumber: accountNumber.trim(),
      accountName: accountName.trim(),
    });
    if (!res.ok) {
      setError(res.error || 'Could not request withdrawal.');
      setConfirming(false);
      setIsSubmittingWithdrawal(false);
      return;
    }

    const isAbove2M = parsedAmount > ECONOMY_CONFIG.HIGH_VALUE_WITHDRAWAL_THRESHOLD_NAIRA;

    // For withdrawals <= 2M, execute automated instant transfer immediately (no admin approval needed)
    if (!isAbove2M && res.payoutId) {
      try {
        await fetch('/api/paystack/transfer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            payoutId: res.payoutId,
            amountNaira: summary.netReceivedNaira,
            accountNumber: accountNumber.trim(),
            bankCode: bankCode,
            accountName: accountName.trim(),
            recipientEmail: state.signedInEmail,
          }),
        });
      } catch {
        // Continue with local settlement
      }
      resolvePayout(res.payoutId, 'completed');
    }

    setConfirming(false);
    setIsSubmittingWithdrawal(false);
    setSuccessReceipt({
      amountNaira: summary.grossAmountNaira,
      netNaira: summary.netReceivedNaira,
      bankName: bankName.trim(),
      maskedAccount: maskAccountNumber(accountNumber),
      isAutoProcessed: !isAbove2M,
    });
  };

  const handleSaveBankDetails = () => {
    if (!bankName.trim() || accountNumber.trim().length !== 10 || !accountName.trim()) {
      setError('Enter a valid bank name, 10-digit NUBAN account number, and account name.');
      return;
    }
    updateDefaultBankAccount({
      bankName: bankName.trim(),
      bankCode: bankCode,
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
            Sign in to access your eligible Gifted Rewards and payout details.
          </p>
          <Button variant="primary" size="md" onClick={() => window.location.assign('/sign-in')}>
            Sign in
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
                    <span>
                      {successReceipt.isAutoProcessed
                        ? 'Withdrawal Dispatched (Instant Payout)'
                        : 'Withdrawal Submitted (Pending Review)'}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-primary)] leading-relaxed">
                    {successReceipt.isAutoProcessed ? (
                      <>
                        {formatNaira(successReceipt.netNaira)} sent to{' '}
                        <strong>{successReceipt.bankName}</strong> ({successReceipt.maskedAccount}). Funds have been automatically dispatched via Paystack.
                      </>
                    ) : (
                      <>
                        {formatNaira(successReceipt.netNaira)} queued for{' '}
                        <strong>{successReceipt.bankName}</strong> ({successReceipt.maskedAccount}).
                        Because this withdrawal exceeds ₦2,000,000, it is undergoing Super Admin security review before disbursement.
                      </>
                    )}
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
                      disabled={isSubmittingWithdrawal}
                      onClick={handleConfirmWithdrawal}
                      data-testid="withdraw-confirm-btn"
                    >
                      {isSubmittingWithdrawal
                        ? 'Processing Transfer…'
                        : parsedAmount > ECONOMY_CONFIG.HIGH_VALUE_WITHDRAWAL_THRESHOLD_NAIRA
                          ? 'Confirm & Request Review'
                          : 'Confirm & Withdraw Now'}
                    </Button>
                    <Button
                      variant="secondary"
                      size="md"
                      disabled={isSubmittingWithdrawal}
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
                      <p className="text-[11px] text-amber-500 font-semibold pt-1">
                        {payout.amountNaira > ECONOMY_CONFIG.HIGH_VALUE_WITHDRAWAL_THRESHOLD_NAIRA
                          ? 'Under Super Admin review (> ₦2,000,000)'
                          : 'Processing via Paystack automated transfer…'}
                      </p>
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
        title="Link Nigerian Bank Account"
        onClose={() => setBankSheetOpen(false)}
      >
        <p className="text-xs text-[var(--text-secondary)]">
          Select your Nigerian bank and enter your 10-digit NUBAN account number. Your account name will be verified automatically.
        </p>

        {/* Popular Bank Quick Select */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[var(--text-secondary)] block">
            Popular Banks
          </label>
          <div className="flex flex-wrap gap-1.5">
            {[
              { name: 'GTBank', code: '058' },
              { name: 'Access Bank', code: '044' },
              { name: 'Zenith Bank', code: '057' },
              { name: 'UBA', code: '033' },
              { name: 'First Bank', code: '011' },
              { name: 'Kuda Bank', code: '50211' },
              { name: 'OPay', code: '999992' },
              { name: 'Moniepoint', code: '50515' },
              { name: 'PalmPay', code: '999991' },
            ].map((b) => (
              <button
                key={b.code}
                type="button"
                onClick={() => {
                  setBankName(b.name);
                  setBankCode(b.code);
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  bankCode === b.code
                    ? 'border-[#8439D5] bg-[#8439D5]/10 text-[#8439D5] dark:text-[#C084FC]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-raised)] text-[var(--text-primary)] hover:border-[#8439D5]/40'
                }`}
              >
                {b.name}
              </button>
            ))}
          </div>
        </div>

        {/* Bank Selection Dropdown */}
        <div className="space-y-1.5">
          <label htmlFor="sheet-select-bank" className="block text-xs font-bold text-[var(--text-secondary)]">
            Select Bank
          </label>
          <select
            id="sheet-select-bank"
            value={bankCode}
            onChange={(e) => {
              const selected = NIGERIAN_BANKS.find((b) => b.code === e.target.value);
              if (selected) {
                setBankCode(selected.code);
                setBankName(selected.name);
              }
            }}
            className="w-full min-h-[46px] px-3.5 py-2.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-raised)] text-sm font-semibold text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#8439D5] cursor-pointer"
          >
            {NIGERIAN_BANKS.map((b) => (
              <option key={b.code} value={b.code}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* 10-digit NUBAN Account Number */}
        <div className="space-y-1.5">
          <label htmlFor="sheet-acct-num" className="block text-xs font-bold text-[var(--text-secondary)]">
            Account Number (10 digits)
          </label>
          <input
            id="sheet-acct-num"
            type="text"
            inputMode="numeric"
            maxLength={10}
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="0123456789"
            className="w-full min-h-[46px] px-3.5 py-2.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-raised)] text-sm font-mono tracking-wider tabular-nums font-bold text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#8439D5]"
          />
        </div>

        {/* Live Paystack Verification Status */}
        {isResolvingAccount && (
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs font-semibold text-purple-600 dark:text-purple-300">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            <span>Verifying account name via Paystack/NIBSS…</span>
          </div>
        )}

        {resolvedAccountName && !isResolvingAccount && (
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            <span>Verified: {resolvedAccountName}</span>
          </div>
        )}

        {resolveError && !isResolvingAccount && (
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs font-medium text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{resolveError}</span>
          </div>
        )}

        {/* Account Name */}
        <InputField
          id="sheet-acct-name"
          label="Account name"
          type="text"
          value={accountName}
          onChange={(e) => setAccountName(e.target.value)}
          placeholder="e.g. BONA PEDRO"
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
