import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import {
  COIN_PACKAGES,
  calculateFundingCredit,
  ECONOMY_CONFIG,
  formatCoinCount,
  formatNaira,
} from '../config/economy';
import { useShowmelove } from '../context/ShowmeloveContext';
import { GoldLoveCoinSvg, PurpleGiftBoxSvg } from './GiftArtwork';
import { Button, InputField } from './ui/DesignSystem';
import { Counter, Pulse } from './ui/MotionPrimitives';
import { usePrefersReducedMotion } from '../lib/animation';
import { isSupabaseAuthConfigured, supabase } from '../lib/supabase';

interface BuyCoinsScreenProps {
  onBack: () => void;
  onGoToSendGift: () => void;
  onSignIn: () => void;
}

type CheckoutStatus = 'idle' | 'loading' | 'success' | 'error';

export function BuyCoinsScreen({ onBack, onGoToSendGift, onSignIn }: BuyCoinsScreenProps) {
  const { state, currentWallet, purchaseLoveCoins } = useShowmelove();
  const isSignedIn = state.activeRole !== 'guest' && Boolean(state.signedInEmail);

  const [selectedCoins, setSelectedCoins] = useState<number>(500);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customCoinsInput, setCustomCoinsInput] = useState('2500');
  const [status, setStatus] = useState<CheckoutStatus>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [coinTrailKey, setCoinTrailKey] = useState(0);

  const reducedMotion = usePrefersReducedMotion();

  const activeCoins = isCustomMode ? Math.round(Number(customCoinsInput) || 0) : selectedCoins;
  const activeCostNaira = Math.max(0, activeCoins * ECONOMY_CONFIG.NAIRA_PER_LOVE_COIN);
  const fundingCredit = calculateFundingCredit(activeCostNaira);
  const isValidCustom =
    activeCoins >= ECONOMY_CONFIG.MIN_COIN_PURCHASE &&
    activeCoins <= ECONOMY_CONFIG.MAX_COIN_PURCHASE;

  const handlePurchase = async (coins = activeCoins, simulateFailure = false) => {
    if (!isSignedIn) {
      setStatus('error');
      setStatusMessage('Sign in to securely fund your Love Coin balance.');
      return;
    }
    if (!isValidCustom) {
      setStatus('error');
      setStatusMessage(
        `Enter between ${ECONOMY_CONFIG.MIN_COIN_PURCHASE.toLocaleString('en-NG')} and ${ECONOMY_CONFIG.MAX_COIN_PURCHASE.toLocaleString('en-NG')} Love Coins.`,
      );
      return;
    }

    setStatus('loading');
    setStatusMessage(null);

    if (isSupabaseAuthConfigured && supabase) {
      const { data } = await supabase.auth.getSession();
      if (!data.session?.access_token) {
        setStatus('error');
        setStatusMessage('Sign in before starting a secure Paystack checkout.');
        return;
      }
      try {
        const response = await fetch('/api/paystack/initialize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` },
          body: JSON.stringify({ amountNaira: coins }),
        });
        const result = await response.json() as { authorizationUrl?: string; error?: string };
        if (!response.ok || !result.authorizationUrl) throw new Error(result.error || 'Could not start secure checkout.');
        window.location.assign(result.authorizationUrl);
        return;
      } catch (error) {
        setStatus('error');
        setStatusMessage(error instanceof Error ? error.message : 'Could not start secure checkout.');
        return;
      }
    }

    window.setTimeout(() => {
      if (simulateFailure) {
        setStatus('error');
        setStatusMessage(
          'Simulated payment declined. Your card was not charged and your coin balance is unchanged.',
        );
        return;
      }

      const res = purchaseLoveCoins(coins);
      if (!res.ok) {
        setStatus('error');
        setStatusMessage(res.error || 'Could not credit Love Coins.');
        return;
      }

      setStatus('success');
      setStatusMessage(
        `Added ${formatCoinCount(calculateFundingCredit(coins).creditedCoins)} to your wallet.`,
      );
      setCoinTrailKey((k) => k + 1);
    }, 360);
  };

  return (
    <div className="max-w-4xl mx-auto pb-12 space-y-6">
      {/* Header */}
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
            Buy Coins
          </h1>
        </div>

        {/* Live Balance Badge */}
        <div className="relative rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] px-3.5 py-2 flex items-center gap-2">
          <GoldLoveCoinSvg className="w-5 h-5 shrink-0" />
          <span
            className="text-sm font-bold tabular-nums text-[var(--text-primary)]"
            data-testid="buy-coins-live-balance"
          >
            {isSignedIn ? currentWallet.loveCoinsBalance.toLocaleString('en-NG') : '0'}
          </span>

          {/* Subtle coin trail animation on successful top-up */}
          <AnimatePresence>
            {coinTrailKey > 0 && !reducedMotion && (
              <motion.span
                key={coinTrailKey}
                initial={{ opacity: 0, y: 24, scale: 0.7 }}
                animate={{ opacity: [0, 1, 0], y: -14, scale: [0.85, 1.15, 0.9] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.75, ease: 'easeOut' }}
                className="pointer-events-none absolute -top-3 right-2 text-xs font-bold tabular-nums text-[#087F56] dark:text-[#24C888]"
              >
                +{activeCoins.toLocaleString('en-NG')}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Reference Pink-Purple Banner */}
      <section className="love-coin-surface rounded-[28px] border border-[#E10B5C]/20 dark:border-white/10 p-5 sm:p-6 flex items-center justify-between gap-4 overflow-hidden shadow-sm">
        <div className="flex items-center gap-4">
          <PurpleGiftBoxSvg className="w-16 h-16 sm:w-20 sm:h-20 shrink-0" />
          <div>
            <p className="text-base sm:text-lg font-bold text-[#1A1322] dark:text-[#FAF8FC] leading-snug">
              Get more Love Coin and spread more love
            </p>
            <p className="text-xs text-[#6B5F78] dark:text-[#DFC8DD] mt-0.5 tabular-nums">
              Fund at a clear 1:1 price; your wallet receives the post-settlement Coin amount.
            </p>
          </div>
        </div>
      </section>

      {!isSignedIn && (
        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
            Sign in to fund and keep your Love Coin balance across devices.
          </p>
          <Button variant="primary" size="sm" onClick={onSignIn}>
            Sign in
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Package List matching Reference Screen 3 */}
        <section className="lg:col-span-7 apple-card rounded-[28px] p-4 sm:p-5 space-y-2.5">
          {COIN_PACKAGES.map((pkg) => {
            const isSelected = !isCustomMode && selectedCoins === pkg.coins;
            return (
              <div key={pkg.id} className="relative pt-1">
                {pkg.popular && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 px-2.5 py-0.5 rounded-full bg-[#DF0756] dark:bg-[#FF176C] text-white text-[11px] font-bold shadow-sm whitespace-nowrap">
                    Most Popular
                  </span>
                )}
                <div
                  className={`rounded-2xl border px-3.5 py-3 flex items-center justify-between gap-3 transition-colors ${
                    isSelected
                      ? 'bg-[#FFEAF2] dark:bg-[#2B1726] border-[#DF0756] dark:border-[#FF176C]'
                      : 'bg-[var(--bg-raised)] border-[var(--border-subtle)] hover:border-[#8439D5]/40 dark:hover:border-[#A855F7]/45'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomMode(false);
                      setSelectedCoins(pkg.coins);
                      setStatus('idle');
                      setStatusMessage(null);
                    }}
                    className="flex items-center gap-3 min-w-0 flex-1 text-left"
                  >
                    <GoldLoveCoinSvg className="w-8 h-8 shrink-0" />
                    <span className="text-sm sm:text-base font-bold tabular-nums text-[var(--text-primary)] truncate">
                      Fund ₦{pkg.priceNaira.toLocaleString('en-NG')} · receive {formatCoinCount(calculateFundingCredit(pkg.priceNaira).creditedCoins)}
                    </span>
                  </button>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-semibold tabular-nums text-[var(--text-primary)]">
                      {formatNaira(pkg.priceNaira)}
                    </span>
                    <button
                      type="button"
                      disabled={status === 'loading'}
                      onClick={() => {
                        setIsCustomMode(false);
                        setSelectedCoins(pkg.coins);
                        setStatus('loading');
                        setStatusMessage(null);
                        void handlePurchase(pkg.coins);
                      }}
                      data-testid={`buy-package-${pkg.coins}-btn`}
                      className="min-h-[38px] px-4 py-1.5 rounded-xl bg-[#DF0756] hover:bg-[#C00549] dark:bg-[#FF176C] dark:hover:bg-[#E0105D] text-white text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap disabled:opacity-50"
                    >
                      Buy
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Custom Amount Option within bounds */}
          <div
            className={`rounded-2xl border p-3.5 space-y-3 transition-colors ${
              isCustomMode
                ? 'bg-[#FFEAF2] dark:bg-[#2B1726] border-[#DF0756] dark:border-[#FF176C]'
                : 'bg-[var(--bg-raised)] border-[var(--border-subtle)]'
            }`}
          >
            <button
              type="button"
              onClick={() => {
                setIsCustomMode(true);
                setStatus('idle');
                setStatusMessage(null);
              }}
              className="w-full flex items-center justify-between gap-2 text-left"
            >
              <span className="text-sm font-bold text-[var(--text-primary)]">
                Custom coin amount
              </span>
              <span className="text-xs tabular-nums text-[var(--text-secondary)]">
                {ECONOMY_CONFIG.MIN_COIN_PURCHASE.toLocaleString('en-NG')} –{' '}
                {ECONOMY_CONFIG.MAX_COIN_PURCHASE.toLocaleString('en-NG')}
              </span>
            </button>

            {isCustomMode && (
              <InputField
                id="custom-buy-coins-input"
                label="Enter coins to buy"
                type="number"
                min={ECONOMY_CONFIG.MIN_COIN_PURCHASE}
                max={ECONOMY_CONFIG.MAX_COIN_PURCHASE}
                step={100}
                value={customCoinsInput}
                onChange={(e) => {
                  setCustomCoinsInput(e.target.value);
                  setStatus('idle');
                }}
                className="font-bold tabular-nums bg-[var(--bg-card)]"
                error={
                  !isValidCustom
                    ? `Enter between ${ECONOMY_CONFIG.MIN_COIN_PURCHASE} and ${ECONOMY_CONFIG.MAX_COIN_PURCHASE.toLocaleString('en-NG')} Coins.`
                    : undefined
                }
              />
            )}
          </div>
        </section>

        {/* Payment Summary & Simulated Checkout Status */}
        <aside className="lg:col-span-5 apple-card rounded-[28px] p-5 sm:p-6 space-y-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-[#8439D5] dark:text-[#A855F7]">
              Simulated checkout · No real card charged
            </p>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              Order summary
            </h2>
          </div>

          <div className="rounded-2xl bg-[var(--bg-raised)] border border-[var(--border-subtle)] p-4 space-y-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[var(--text-secondary)]">Package</span>
              <span className="font-bold tabular-nums text-[var(--text-primary)]">
                <Counter value={Math.max(0, fundingCredit.creditedCoins)} formatter={formatCoinCount} />
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[var(--text-secondary)]">You receive</span>
              <span className="tabular-nums text-[var(--text-primary)]">
                Love Coins
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--border-subtle)]">
              <span className="font-semibold text-[var(--text-primary)]">Total</span>
              <span className="text-lg font-bold tabular-nums text-[#DF0756] dark:text-[#FF176C]">
                {formatNaira(activeCostNaira)}
              </span>
            </div>
          </div>

          {status === 'error' && statusMessage && (
            <div
              role="alert"
              className="rounded-2xl bg-[#FFEAF2] dark:bg-[#2F1426] border border-[#DF0756]/35 dark:border-[#FF176C]/40 p-3.5 space-y-2.5 text-xs text-[var(--text-primary)]"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-[#DF0756] dark:text-[#FF176C] shrink-0 mt-0.5" />
                <p className="font-medium">{statusMessage}</p>
              </div>
              <Button
                variant="dark"
                size="sm"
                onClick={() => void handlePurchase()}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{isSupabaseAuthConfigured ? 'Retry secure checkout' : 'Retry demo payment'}</span>
              </Button>
            </div>
          )}

          {status === 'success' && statusMessage && (
            <div
              role="status"
              className="rounded-2xl bg-[#E6F6EF] dark:bg-[#0D3326] border border-[#087F56]/25 dark:border-[#24C888]/30 p-3.5 space-y-2.5 text-xs text-[var(--text-primary)]"
            >
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#087F56] dark:text-[#24C888] shrink-0 mt-0.5" />
                <p className="font-medium">{statusMessage}</p>
              </div>
              <Button variant="primary" size="sm" fullWidth onClick={onGoToSendGift}>
                Send a gift with coins
              </Button>
            </div>
          )}

          <div className="space-y-2 pt-1">
            <Pulse className="w-full">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              disabled={status === 'loading' || !isValidCustom}
              onClick={() => void handlePurchase()}
              data-testid="buy-coins-confirm-btn"
            >
              {status === 'loading' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isSupabaseAuthConfigured ? 'Opening secure checkout…' : 'Processing demo checkout…'}</span>
                </>
              ) : (
                <span>
                  {isSupabaseAuthConfigured ? `Continue to Paystack · ${formatNaira(activeCostNaira)}` : `Pay ${formatNaira(activeCostNaira)} (Demo)`}
                </span>
              )}
            </Button>
            </Pulse>

            {!isSupabaseAuthConfigured && <Button
              variant="ghost"
              size="sm"
              fullWidth
              disabled={status === 'loading'}
              onClick={() => void handlePurchase(activeCoins, true)}
              data-testid="buy-coins-fail-btn"
            >
              Simulate declined card
            </Button>}
          </div>
        </aside>
      </div>
    </div>
  );
}

