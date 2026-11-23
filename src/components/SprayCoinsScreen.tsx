import { ArrowLeft, LockKeyhole, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { SPRAY_LAYOUTS, type SprayLayoutId } from '../config/economy';
import { useShowmelove } from '../context/ShowmeloveContext';
import { SprayCoins } from './SprayCoins';
import { Button } from './ui/DesignSystem';

interface SprayCoinsScreenProps {
  onBack: () => void;
  onSignIn: () => void;
}

export function SprayCoinsScreen({ onBack, onSignIn }: SprayCoinsScreenProps) {
  const { state, currentWallet, sprayLoveCoins } = useShowmelove();
  const isSignedIn = state.activeRole !== 'guest' && Boolean(state.signedInEmail);
  const [layoutId, setLayoutId] = useState<SprayLayoutId>('classic');
  const [sprayAmountInput, setSprayAmountInput] = useState('20');
  const [recipientEmail, setRecipientEmail] = useState('');

  const layout = SPRAY_LAYOUTS.find((item) => item.id === layoutId) ?? SPRAY_LAYOUTS[0];
  const parsedAmount = Math.floor(Number(sprayAmountInput)) || layout.minimumCoins;

  // Spraying can continue until the user's Love Coin balance reaches zero
  const userBalance = currentWallet.loveCoinsBalance;
  const hasBalance = userBalance > 0;
  const isRecipientValid = Boolean(recipientEmail.trim() && recipientEmail.includes('@'));
  const canSpray = isSignedIn && hasBalance && isRecipientValid;

  // The effective amount per swipe uses the user's chosen amount or whatever balance remains
  const effectiveSprayAmount = Math.min(parsedAmount, userBalance);

  return (
    <div className="mx-auto max-w-xl space-y-5 pb-10">
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl px-3 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF2385]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Wallet Home
      </button>

      {/* Main Interactive Spray Card */}
      <section
        className="relative min-h-[580px] sm:min-h-[620px] touch-none overscroll-contain overflow-hidden rounded-[32px] border border-white/20 bg-black/90 text-center shadow-[0_26px_64px_-24px_rgba(0,0,0,0.6)]"
      >
        {/* Real Themed Artwork Image */}
        <img
          key={layout.id}
          src={layout.artworkSrc}
          alt={layout.name}
          className="absolute inset-0 h-full w-full object-cover select-none pointer-events-none transition-opacity duration-300"
          loading="eager"
        />

        {/* Contrast vignette for text & controls */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/80 pointer-events-none" />

        {/* Swipe gesture overlay */}
        <SprayCoins
          isEnabled={canSpray}
          coinBalance={userBalance}
          minimumSpray={layout.minimumCoins}
          sprayAmount={effectiveSprayAmount}
          layoutId={layout.id}
          coinLabel={layout.coinLabel}
          onSpray={(count) =>
            sprayLoveCoins({
              coins: count,
              recipientEmail: recipientEmail.trim(),
              layoutId,
            }).ok
          }
        />

        {/* Foreground Content */}
        <div className="relative z-10 pointer-events-none flex min-h-[580px] sm:min-h-[620px] flex-col items-center justify-between p-6 sm:p-8">
          {/* Top layout badge */}
          <div className="inline-flex items-center gap-1.5 rounded-full bg-black/55 px-4 py-1.5 text-xs font-bold text-white shadow-lg backdrop-blur-md border border-white/20">
            <Sparkles className="h-3.5 w-3.5 text-white" />
            <span>{layout.badge.toUpperCase()} · {layout.coinLabel.toUpperCase()} SPRAY</span>
          </div>

          {/* Center: Open space to showcase the coin and artwork */}
          <div className="my-auto text-center px-4">
            <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
              {layout.name} Spray
            </h1>
            <p className="mt-1.5 max-w-xs text-xs sm:text-sm font-medium leading-relaxed text-white/90 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
              {layout.description}
            </p>
          </div>

          {/* Status & instructions */}
          <div className="w-full max-w-sm space-y-3">
            <div className="rounded-2xl bg-black/55 px-5 py-3 text-white backdrop-blur-md border border-white/20 shadow-xl">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/80">
                Love Coins Available
              </p>
              <p className="mt-0.5 text-3xl font-extrabold tabular-nums tracking-tight">
                {userBalance.toLocaleString('en-NG')}
              </p>
              {userBalance === 0 && (
                <p className="text-xs font-semibold text-rose-300 mt-1">
                  Balance empty. Top up your wallet to continue spraying!
                </p>
              )}
            </div>

            <p className="text-xs font-medium text-white/90 drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
              {canSpray
                ? `Swipe vertically up or down to launch ${effectiveSprayAmount.toLocaleString('en-NG')} ${layout.coinLabel}`
                : !isSignedIn
                  ? 'Sign in below to unlock Love Coin Spray'
                  : !isRecipientValid
                    ? 'Enter recipient email below to start spraying'
                    : 'Your balance is 0. Buy coins to continue spraying.'}
            </p>
          </div>
        </div>
      </section>

      {/* Controls & Configuration */}
      <section className="apple-card rounded-[28px] p-5 sm:p-6 space-y-4">
        <div>
          <h2 className="text-base font-bold text-[var(--text-primary)]">Choose your flex</h2>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
            Each layout has its own social-status theme and minimum entry.
          </p>
        </div>

        {/* 5 Theme Buttons with real image artwork thumbnails */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
          {SPRAY_LAYOUTS.map((item) => {
            const isSelected = layoutId === item.id;
            const isUnderMin = userBalance < item.minimumCoins;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setLayoutId(item.id);
                  setSprayAmountInput(String(item.minimumCoins));
                }}
                className={`group relative min-h-[135px] overflow-hidden rounded-2xl p-2.5 text-left text-white ring-2 transition-all cursor-pointer ${
                  isSelected ? 'ring-[#FF2385] shadow-xl scale-[1.03]' : 'ring-transparent opacity-80 hover:opacity-100 hover:scale-[1.01]'
                }`}
              >
                <img
                  src={item.artworkSrc}
                  alt={item.name}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />
                {isUnderMin && <LockKeyhole className="absolute right-2 top-2 h-3.5 w-3.5 text-white/90 drop-shadow" />}
                <div className="relative z-10 flex flex-col justify-between h-full">
                  <span className="text-xs font-black drop-shadow-md text-white">{item.name}</span>
                  <div className="mt-8">
                    <span className="block text-[11px] font-bold text-white drop-shadow">
                      {item.minimumCoins.toLocaleString('en-NG')} min
                    </span>
                    <span className="block text-[9px] font-semibold text-white/80 drop-shadow">{item.badge}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Recipient Email Input */}
        <div className="space-y-1">
          <label htmlFor="spray-recipient-email" className="block text-xs font-semibold text-[var(--text-secondary)]">
            Send spray to (recipient email)
          </label>
          <input
            id="spray-recipient-email"
            type="email"
            autoComplete="email"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            placeholder="friend@example.com"
            className="w-full min-h-[44px] rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-raised)] px-3.5 text-sm font-semibold text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#FF2385]"
          />
        </div>

        {/* Coins Per Spray Input */}
        <div className="space-y-1">
          <label htmlFor="spray-amount-input" className="block text-xs font-semibold text-[var(--text-secondary)]">
            {layout.coinLabel} per spray
          </label>
          <input
            id="spray-amount-input"
            type="number"
            min={1}
            max={userBalance || layout.minimumCoins}
            step={1}
            value={sprayAmountInput}
            onChange={(event) => setSprayAmountInput(event.target.value)}
            className="min-h-[44px] w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-raised)] px-3.5 text-base font-bold tabular-nums text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#FF2385]"
          />
          <p className="text-[11px] text-[var(--text-secondary)]">
            Layout minimum: {layout.minimumCoins.toLocaleString('en-NG')} Coins · You can spray remaining balance down to 0.
          </p>
        </div>

        <p className="text-xs text-[var(--text-secondary)] pt-1 border-t border-[var(--border-subtle)]">
          The receiver gets 97% of every spray; Showmelove settles 3% platform fee to the Admin Master Wallet.
        </p>
      </section>

      {!isSignedIn && (
        <Button variant="primary" size="lg" fullWidth onClick={onSignIn}>
          Sign in to start spraying
        </Button>
      )}
    </div>
  );
}
