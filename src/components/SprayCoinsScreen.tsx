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

      {/* Screen Title & Theme Description Outside Card */}
      <div className="text-center space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--text-primary)]">
          {layout.name} Spray
        </h1>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
          {layout.description}
        </p>
      </div>

      {/* Main Interactive Spray Theme Card - Exact 790:1024 Card Aspect Ratio */}
      <section
        className="relative w-full max-w-[340px] sm:max-w-[370px] mx-auto aspect-[790/1024] touch-none overscroll-contain overflow-hidden rounded-[32px] sm:rounded-[36px] border-2 border-white/20 bg-black/90 text-center shadow-[0_24px_50px_-12px_rgba(0,0,0,0.65)] select-none"
      >
        {/* Real Themed Artwork Image */}
        <img
          key={layout.id}
          src={layout.artworkSrc}
          alt={layout.name}
          className="absolute inset-0 h-full w-full object-contain select-none pointer-events-none transition-opacity duration-300"
          loading="eager"
        />

        {/* Subtle top & bottom edge protection vignette; center 60% remains 100% clean */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent via-55% to-black/65 pointer-events-none" />

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

        {/* Foreground Content - Positioned only at top and bottom so coin and artwork are completely visible */}
        <div className="relative z-10 pointer-events-none flex h-full flex-col items-center justify-between p-4 sm:p-5">
          {/* Top layout badge */}
          <div className="inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3.5 py-1 text-[11px] font-bold text-white shadow-lg backdrop-blur-md border border-white/20">
            <Sparkles className="h-3 w-3 text-white" />
            <span>{layout.badge.toUpperCase()} · {layout.coinLabel.toUpperCase()}</span>
          </div>

          {/* Center area left completely open so coin medallion and faces are completely unobstructed */}
          <div className="flex-1" aria-hidden="true" />

          {/* Bottom Docked Live Balance & Swipe Instructions */}
          <div className="w-full max-w-[290px] space-y-1.5 pb-1">
            <div className="rounded-2xl bg-black/70 px-4 py-2 text-white backdrop-blur-md border border-white/25 shadow-xl">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/80">
                Love Coins Available
              </p>
              <p className="mt-0.5 text-2xl font-black tabular-nums tracking-tight text-white leading-tight">
                {userBalance.toLocaleString('en-NG')}
              </p>
              {userBalance === 0 && (
                <p className="text-[11px] font-semibold text-rose-300 mt-0.5">
                  Balance empty. Top up to spray!
                </p>
              )}
            </div>

            <p className="text-[11px] font-semibold text-white/95 text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
              {canSpray
                ? `Swipe vertically to launch ${effectiveSprayAmount.toLocaleString('en-NG')} ${layout.coinLabel}`
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
