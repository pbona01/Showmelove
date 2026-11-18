import { useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react';
import { formatNaira } from '../config/economy';
import { useShowmelove } from '../context/ShowmeloveContext';
import { Button, InputField, PriceLabel } from './ui/DesignSystem';

interface WithdrawScreenProps {
  onBackToInbox: () => void;
  onSendGift?: () => void;
}

export function WithdrawScreen({ onBackToInbox, onSendGift }: WithdrawScreenProps) {
  const { state, currentWallet, submitWithdrawal, resolvePayout, switchRole } =
    useShowmelove();

  const [amountInput, setAmountInput] = useState(
    currentWallet.availableEarningsNaira > 0
      ? String(Math.min(2000, currentWallet.availableEarningsNaira))
      : '1000',
  );
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

  const handleOpenConfirmation = () => {
    setError(null);
    setStatusBanner(null);

    if (!isSignedIn) {
      setError('Sign in as a recipient first to request a demo withdrawal.');
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount < 100) {
      setError('Minimum demo withdrawal is ₦100.');
      return;
    }
    if (parsedAmount > currentWallet.availableEarningsNaira) {
      setError(
        `Amount exceeds your available to withdraw balance (${formatNaira(currentWallet.availableEarningsNaira)}).`,
      );
      return;
    }
    if (!bankName.trim() || !accountNumber.trim() || !accountName.trim()) {
      setError('Fill in the demo bank account fields.');
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
      `Demo withdrawal of ${formatNaira(parsedAmount)} requested (Pending) and reserved from Available to withdraw.`,
    );
  };

  return (
    <div className="max-w-4xl mx-auto pb-16 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBackToInbox}
          className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white border border-[#171314]/10 text-sm font-medium text-[#171314] inline-flex items-center gap-2 hover:bg-[#FFF0F2] transition-colors whitespace-nowrap shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Inbox</span>
        </button>
        <p className="text-xs font-semibold text-[#E62E45]">
          Demo payout flow · Collects no real bank details
        </p>
      </div>

      {!isSignedIn ? (
        <section className="rounded-3xl bg-white border border-[#171314]/8 p-6 sm:p-8 space-y-4">
          <h1 className="font-display text-2xl font-bold text-[#171314]">
            Sign in to withdraw demo earnings
          </h1>
          <p className="text-sm text-[#5E5255]">
            Switch to the seeded demo recipient account to test Pending, Paid, and Failed bank payouts.
          </p>
          <Button
            variant="primary"
            size="md"
            onClick={() => switchRole('recipient')}
          >
            Sign in as Adaeze (Recipient)
          </Button>
        </section>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Request Form / Confirmation */}
          <section className="lg:col-span-6 rounded-3xl bg-white border border-[#171314]/8 p-6 space-y-5 shadow-sm">
            <div>
              <h1 className="font-display text-2xl font-bold text-[#171314]">
                Withdraw earnings (Demo)
              </h1>
              <p className="text-xs text-[#5E5255] mt-1">
                Simulated Nigerian bank payout. Love Coins cannot be withdrawn here—only claimed naira earnings.
              </p>
            </div>

            <div className="rounded-2xl bg-[#FDF8F3] border border-[#171314]/8 p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-[#5E5255]">Available to withdraw</p>
                <PriceLabel
                  amountNaira={currentWallet.availableEarningsNaira}
                  size="lg"
                  accent
                />
              </div>
              <div className="text-right">
                <p className="text-xs text-[#5E5255]">Reserved (Pending)</p>
                <p className="font-display text-lg font-bold tabular-nums text-[#171314]">
                  {formatNaira(currentWallet.reservedEarningsNaira)}
                </p>
              </div>
            </div>

            {statusBanner && (
              <div
                role="status"
                className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs font-medium text-emerald-950"
              >
                {statusBanner}
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="rounded-2xl bg-[#FFF0F2] border border-[#E62E45]/25 p-3.5 text-xs font-medium text-[#171314] flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 text-[#E62E45] shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {!confirming ? (
              <div className="space-y-4">
                <InputField
                  id="withdraw-amount"
                  label="Withdrawal amount (₦)"
                  type="number"
                  min={100}
                  max={currentWallet.availableEarningsNaira}
                  step={100}
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  className="font-semibold tabular-nums"
                />

                <div className="rounded-2xl border border-[#171314]/10 p-4 space-y-3 bg-[#FDF8F3]/60">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#171314]">
                    <Building2 className="w-4 h-4 text-[#E62E45]" />
                    <span>Prefilled demo Nigerian bank account</span>
                  </div>

                  <InputField
                    id="demo-bank-name"
                    label="Bank name (Demo)"
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="bg-white"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <InputField
                      id="demo-acct-num"
                      label="Demo NUBAN"
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="bg-white font-mono tabular-nums"
                    />
                    <InputField
                      id="demo-acct-name"
                      label="Account name"
                      type="text"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      className="bg-white"
                    />
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={handleOpenConfirmation}
                  data-testid="withdraw-review-btn"
                >
                  Review demo withdrawal
                </Button>
              </div>
            ) : (
              <div className="rounded-2xl bg-[#FFF0F2] border border-[#E62E45]/20 p-5 space-y-4">
                <h2 className="font-display text-lg font-bold text-[#171314]">
                  Confirm demo withdrawal
                </h2>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#5E5255]">Amount to reserve</span>
                    <span className="font-bold tabular-nums text-[#171314]">
                      {formatNaira(parsedAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#5E5255]">Destination (Demo)</span>
                    <span className="font-medium text-[#171314]">
                      {bankName} · {accountNumber}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#5E5255]">Account name</span>
                    <span className="font-medium text-[#171314]">{accountName}</span>
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
                    Confirm &amp; reserve funds
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

          {/* Payout History & Simulation Controls */}
          <section className="lg:col-span-6 rounded-3xl bg-white border border-[#171314]/8 p-6 space-y-4 shadow-sm">
            <div>
              <h2 className="font-display text-xl font-bold text-[#171314]">
                Demo payout history
              </h2>
              <p className="text-xs text-[#5E5255] mt-0.5">
                Track Pending, Paid, and Failed payouts. Failed payouts automatically refund reserved funds back to Available to withdraw.
              </p>
            </div>

            {userPayouts.length === 0 ? (
              <div className="rounded-2xl bg-[#FDF8F3] border border-[#171314]/8 p-6 text-center space-y-3">
                <p className="text-xs text-[#5E5255]">
                  No withdrawal requests yet.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button variant="secondary" size="sm" onClick={onBackToInbox}>
                    Open Inbox
                  </Button>
                  {onSendGift && (
                    <Button variant="ghost" size="sm" onClick={onSendGift}>
                      Send a gift
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3" data-testid="payout-history-list">
                {userPayouts.map((payout) => (
                  <div
                    key={payout.id}
                    className="rounded-2xl border border-[#171314]/10 bg-[#FDF8F3] p-4 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-display text-lg font-bold tabular-nums text-[#171314]">
                          {formatNaira(payout.amountNaira)}
                        </p>
                        <p className="text-xs text-[#5E5255]">
                          {payout.bankAccount.bankName} · {payout.bankAccount.accountNumber}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#171314]">
                        {payout.status === 'pending' && (
                          <>
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>Pending</span>
                          </>
                        )}
                        {payout.status === 'completed' && (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                            <span className="text-emerald-800">Paid</span>
                          </>
                        )}
                        {payout.status === 'failed' && (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-[#E62E45]" />
                            <span className="text-[#E62E45]">Failed</span>
                          </>
                        )}
                      </span>
                    </div>

                    {payout.failureReason && (
                      <p className="text-xs text-[#E62E45]">{payout.failureReason}</p>
                    )}

                    {payout.status === 'pending' && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => resolvePayout(payout.id, 'completed')}
                          className="min-h-[36px] px-3 py-1.5 rounded-lg bg-[#171314] text-white text-xs font-medium hover:bg-[#2c2527]"
                        >
                          Mark as Paid
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            resolvePayout(
                              payout.id,
                              'failed',
                              'Simulated bank transfer failure — funds returned.',
                            )
                          }
                          className="min-h-[36px] px-3 py-1.5 rounded-lg border border-[#E62E45]/30 bg-white text-[#E62E45] text-xs font-medium hover:bg-[#FFF0F2]"
                        >
                          Simulate Failed
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
