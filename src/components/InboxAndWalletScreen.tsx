import { useState } from 'react';
import {
  ArrowUpRight,
  Coins,
  ExternalLink,
  Gift as GiftIcon,
  Inbox,
  Plus,
  UserCheck,
  Wallet,
} from 'lucide-react';
import {
  ECONOMY_CONFIG,
  formatCoins,
  formatNaira,
} from '../config/economy';
import { useShowmelove } from '../context/ShowmeloveContext';
import { DEMO_USERS } from '../services/seedData';
import { GiftArtworkSvg } from './GiftArtwork';
import {
  BottomSheet,
  Button,
  InputField,
  PriceLabel,
  TransactionRow,
} from './ui/DesignSystem';

interface InboxAndWalletScreenProps {
  onOpenGift: (giftId: string) => void;
  onGoToWithdraw: () => void;
  onSendGift: () => void;
  onTrySampleReveal?: () => void;
}

export function InboxAndWalletScreen({
  onOpenGift,
  onGoToWithdraw,
  onSendGift,
  onTrySampleReveal,
}: InboxAndWalletScreenProps) {
  const { state, currentWallet, switchRole, signInDemoEmail, purchaseLoveCoins } =
    useShowmelove();
  const [buyCoinsOpen, setBuyCoinsOpen] = useState(false);
  const [coinsToBuy, setCoinsToBuy] = useState('5000');
  const [buyMessage, setBuyMessage] = useState<string | null>(null);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [customEmailInput, setCustomEmailInput] = useState('');

  const isSignedIn = state.activeRole !== 'guest' && Boolean(state.signedInEmail);
  const normalizedUserEmail = state.signedInEmail.trim().toLowerCase();

  const receivedGifts = isSignedIn
    ? state.gifts.filter((g) => g.recipientEmail.toLowerCase() === normalizedUserEmail)
    : [];

  const handleBuyCoins = () => {
    setBuyError(null);
    const amount = Number(coinsToBuy);
    const res = purchaseLoveCoins(amount);
    if (!res.ok) {
      setBuyError(res.error || 'Could not buy Love Coins.');
      return;
    }
    setBuyMessage(`Added ${formatCoins(amount)} to your Love Coins balance.`);
    setBuyCoinsOpen(false);
  };

  return (
    <div className="max-w-5xl mx-auto pb-16 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#171314]">
            Inbox &amp; Wallet
          </h1>
          <p className="text-sm text-[#5E5255] mt-1">
            Love Coins (for sending gifts) and Available to withdraw (claimed naira earnings) stay strictly separate.
          </p>
        </div>
        {isSignedIn && (
          <p className="text-xs text-[#5E5255]">
            Signed in as <strong className="text-[#171314]">{state.signedInEmail}</strong>
          </p>
        )}
      </div>

      {!isSignedIn ? (
        <section className="rounded-3xl bg-white border border-[#171314]/8 p-6 sm:p-8 space-y-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#FFF0F2] border border-[#E62E45]/15 flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5 text-[#E62E45]" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-[#171314]">
                Sign in to a demo account
              </h2>
              <p className="text-sm text-[#5E5255] mt-0.5">
                Pick a seeded account or enter the recipient email used when a gift was sent.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Button
              variant="primary"
              size="md"
              onClick={() => switchRole('recipient')}
              data-testid="inbox-signin-recipient-btn"
            >
              Sign in as Recipient ({DEMO_USERS.recipient.email})
            </Button>
            <Button
              variant="dark"
              size="md"
              onClick={() => switchRole('sender')}
            >
              Sign in as Sender ({DEMO_USERS.sender.email})
            </Button>
          </div>

          <div className="pt-3 border-t border-[#171314]/8 flex flex-col sm:flex-row gap-2 max-w-md">
            <label htmlFor="inbox-custom-email" className="sr-only">
              Demo email sign in
            </label>
            <input
              id="inbox-custom-email"
              type="email"
              value={customEmailInput}
              onChange={(e) => setCustomEmailInput(e.target.value)}
              placeholder="Or enter any recipient email…"
              className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl border border-[#171314]/15 bg-[#FDF8F3] text-sm"
            />
            <Button
              variant="secondary"
              size="md"
              onClick={() => {
                if (customEmailInput.trim().includes('@')) {
                  signInDemoEmail(customEmailInput.trim());
                }
              }}
            >
              Continue
            </Button>
          </div>
        </section>
      ) : (
        <>
          {/* Two Distinct Wallets: Love Coins vs Available to withdraw */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Love Coins Card */}
            <section className="rounded-3xl bg-white border border-[#171314]/8 p-6 space-y-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-[#5E5255]">
                    Sender balance · 1 Love Coin = {formatNaira(ECONOMY_CONFIG.NAIRA_PER_LOVE_COIN)}
                  </p>
                  <h2 className="font-display text-lg font-bold text-[#171314] mt-0.5">
                    Love Coins
                  </h2>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#FFF0F2] flex items-center justify-center shrink-0">
                  <Coins className="w-5 h-5 text-[#E62E45]" />
                </div>
              </div>

              <p
                className="font-display text-3xl font-bold tabular-nums text-[#171314]"
                data-testid="wallet-coins-balance"
              >
                {formatCoins(currentWallet.loveCoinsBalance)}
              </p>

              {buyMessage && (
                <p className="text-xs font-medium text-emerald-700">{buyMessage}</p>
              )}

              <div className="flex flex-wrap gap-2.5 pt-1">
                <Button
                  variant="dark"
                  size="md"
                  onClick={() => {
                    setBuyMessage(null);
                    setBuyError(null);
                    setBuyCoinsOpen(true);
                  }}
                  data-testid="buy-love-coins-btn"
                >
                  <Plus className="w-4 h-4" />
                  <span>Buy Love Coins</span>
                </Button>
                <Button variant="secondary" size="md" onClick={onSendGift}>
                  Send a gift
                </Button>
              </div>
            </section>

            {/* Available to Withdraw Card */}
            <section className="rounded-3xl bg-white border border-[#171314]/8 p-6 space-y-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-[#5E5255]">
                    Recipient earnings · {(ECONOMY_CONFIG.PLATFORM_FEE_BPS / 100).toFixed(0)}% demo fee
                  </p>
                  <h2 className="font-display text-lg font-bold text-[#171314] mt-0.5">
                    Available to withdraw
                  </h2>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                  <Wallet className="w-5 h-5 text-emerald-700" />
                </div>
              </div>

              <div className="flex items-baseline justify-between gap-4">
                <span data-testid="wallet-available-earnings">
                  <PriceLabel
                    amountNaira={currentWallet.availableEarningsNaira}
                    size="lg"
                    accent
                  />
                </span>
                {currentWallet.reservedEarningsNaira > 0 && (
                  <p className="text-xs font-medium tabular-nums text-[#5E5255]">
                    Pending payout: {formatNaira(currentWallet.reservedEarningsNaira)}
                  </p>
                )}
              </div>

              <div className="pt-1">
                <Button
                  variant="primary"
                  size="md"
                  onClick={onGoToWithdraw}
                  data-testid="inbox-withdraw-btn"
                >
                  <span>Withdraw to Nigerian bank (Demo)</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Button>
              </div>
            </section>
          </div>

          {/* Received Gifts Inbox */}
          <section className="rounded-3xl bg-white border border-[#171314]/8 p-5 sm:p-6 space-y-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Inbox className="w-5 h-5 text-[#E62E45]" />
                <h2 className="font-display text-xl font-bold text-[#171314]">
                  Received gifts ({receivedGifts.length})
                </h2>
              </div>
              <span className="text-xs text-[#5E5255]">
                Reopening a gift never changes balances
              </span>
            </div>

            {receivedGifts.length === 0 ? (
              <div className="rounded-2xl bg-[#FDF8F3] border border-[#171314]/8 p-7 text-center space-y-3">
                <GiftIcon className="w-8 h-8 text-[#E62E45] mx-auto" />
                <div className="space-y-1">
                  <p className="font-display text-base font-semibold text-[#171314]">
                    No received gifts for {state.signedInEmail} yet
                  </p>
                  <p className="text-xs text-[#5E5255] max-w-md mx-auto">
                    Send a gift addressed to {state.signedInEmail} or preview our bundled sample reveal.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 pt-1">
                  <Button variant="primary" size="sm" onClick={onSendGift}>
                    Send a gift
                  </Button>
                  {onTrySampleReveal && (
                    <Button variant="secondary" size="sm" onClick={onTrySampleReveal}>
                      Try a sample reveal
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="divide-y divide-[#171314]/8" data-testid="received-gifts-list">
                {receivedGifts.map((gift) => (
                  <TransactionRow
                    key={gift.id}
                    icon={
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center gift-gloss border border-[#171314]/8"
                        style={{ backgroundColor: gift.snapshot.accentColor || '#FFF0F2' }}
                      >
                        <GiftArtworkSvg
                          artworkId={gift.snapshot.artworkId}
                          className="w-9 h-9"
                        />
                      </div>
                    }
                    title={`“${gift.promiseText}”`}
                    subtitle={`From ${gift.senderName} · ${gift.snapshot.name} · ${new Date(
                      gift.createdAt,
                    ).toLocaleDateString('en-NG', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}`}
                    amountLabel={formatNaira(gift.recipientEarningsNaira)}
                    amountTone="accent"
                    statusLabel={gift.claimedAt ? 'Claimed' : 'Ready to claim'}
                    action={
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onOpenGift(gift.id)}
                      >
                        <span>Reopen</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    }
                  />
                ))}
              </div>
            )}
          </section>

          {/* Separate Transaction Histories */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <section className="rounded-3xl bg-white border border-[#171314]/8 p-5 sm:p-6 space-y-3">
              <h3 className="font-display text-base font-bold text-[#171314]">
                Love Coins history
              </h3>
              {currentWallet.coinTransactions.length === 0 ? (
                <div className="rounded-2xl bg-[#FDF8F3] p-5 text-center space-y-2.5">
                  <p className="text-xs text-[#5E5255]">No Love Coin activity yet.</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setBuyError(null);
                      setBuyCoinsOpen(true);
                    }}
                  >
                    Buy Love Coins
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-[#171314]/8">
                  {currentWallet.coinTransactions.slice(0, 8).map((tx) => (
                    <TransactionRow
                      key={tx.id}
                      title={tx.description}
                      subtitle={new Date(tx.createdAt).toLocaleDateString('en-NG', {
                        month: 'short',
                        day: 'numeric',
                      })}
                      amountLabel={`${tx.coinsDelta >= 0 ? `+${tx.coinsDelta}` : tx.coinsDelta} coins`}
                      amountTone={tx.coinsDelta >= 0 ? 'positive' : 'neutral'}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-3xl bg-white border border-[#171314]/8 p-5 sm:p-6 space-y-3">
              <h3 className="font-display text-base font-bold text-[#171314]">
                Earnings &amp; payout ledger (₦)
              </h3>
              {currentWallet.earningsTransactions.length === 0 ? (
                <div className="rounded-2xl bg-[#FDF8F3] p-5 text-center space-y-2.5">
                  <p className="text-xs text-[#5E5255]">No claimed earnings yet.</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={onTrySampleReveal ?? onSendGift}
                  >
                    {onTrySampleReveal ? 'Try a sample reveal' : 'Send a gift'}
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-[#171314]/8">
                  {currentWallet.earningsTransactions.slice(0, 8).map((tx) => (
                    <TransactionRow
                      key={tx.id}
                      title={tx.description}
                      subtitle={new Date(tx.createdAt).toLocaleDateString('en-NG', {
                        month: 'short',
                        day: 'numeric',
                      })}
                      amountLabel={
                        tx.amountNaira > 0
                          ? `+${formatNaira(tx.amountNaira)}`
                          : tx.amountNaira < 0
                            ? `-${formatNaira(Math.abs(tx.amountNaira))}`
                            : 'Settled'
                      }
                      amountTone={
                        tx.amountNaira > 0
                          ? 'positive'
                          : tx.amountNaira < 0
                            ? 'accent'
                            : 'neutral'
                      }
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}

      {/* Buy Love Coins BottomSheet */}
      <BottomSheet
        open={buyCoinsOpen}
        title="Buy Love Coins (Demo)"
        onClose={() => setBuyCoinsOpen(false)}
      >
        <p className="text-xs text-[#5E5255]">
          1 Love Coin = {formatNaira(ECONOMY_CONFIG.NAIRA_PER_LOVE_COIN)}. Demo top-up credits your Love Coins wallet immediately.
        </p>

        <div className="grid grid-cols-3 gap-2">
          {[2500, 5000, 10000].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                setCoinsToBuy(String(preset));
                setBuyError(null);
              }}
              className={`min-h-[42px] px-3 py-2 rounded-xl border text-xs font-semibold tabular-nums transition-colors ${
                Number(coinsToBuy) === preset
                  ? 'bg-[#FFF0F2] border-[#E62E45] text-[#E62E45]'
                  : 'bg-white border-[#171314]/12 text-[#171314]'
              }`}
            >
              {formatCoins(preset)}
            </button>
          ))}
        </div>

        <InputField
          id="buy-coins-input"
          label="Custom Love Coins amount"
          type="number"
          min={100}
          max={500000}
          step={500}
          value={coinsToBuy}
          onChange={(e) => setCoinsToBuy(e.target.value)}
          className="font-semibold tabular-nums"
          error={buyError || undefined}
          hint={`Total cost: ${formatNaira(Math.max(0, Number(coinsToBuy) || 0) * ECONOMY_CONFIG.NAIRA_PER_LOVE_COIN)}`}
        />

        <div className="flex gap-2.5 pt-1">
          <Button variant="primary" size="lg" fullWidth onClick={handleBuyCoins}>
            Buy {formatCoins(Math.max(0, Number(coinsToBuy) || 0))}
          </Button>
          <Button variant="secondary" size="lg" onClick={() => setBuyCoinsOpen(false)}>
            Cancel
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
