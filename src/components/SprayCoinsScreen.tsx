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

function ThemedHeroCoin({ layoutId, large = false }: { layoutId: SprayLayoutId; large?: boolean }) {
  switch (layoutId) {
    case 'waso':
      return (
        <span
          className={`relative grid place-items-center rounded-full border-4 border-sky-100/90 bg-gradient-to-br from-[#66BBFF] via-[#0767D7] to-[#012D78] ${
            large ? 'h-28 w-28 text-4xl' : 'h-10 w-10 text-base'
          } font-black text-white shadow-[0_16px_36px_rgba(7,103,215,0.45)]`}
        >
          <span className="absolute inset-2 rounded-full border border-sky-200/40" />
          <span className="relative drop-shadow">₦50</span>
        </span>
      );
    case 'figo':
      return (
        <span
          className={`relative grid place-items-center rounded-full border-4 border-purple-200/90 bg-gradient-to-br from-[#EDB8FF] via-[#8B27DF] to-[#351060] ${
            large ? 'h-28 w-28 text-3xl' : 'h-10 w-10 text-sm'
          } font-black text-white shadow-[0_16px_36px_rgba(139,39,223,0.45)]`}
        >
          <span className="absolute inset-2 rounded-full border border-purple-200/40" />
          <span className="relative drop-shadow">₦500</span>
        </span>
      );
    case 'usd':
      return (
        <span
          className={`relative grid place-items-center rounded-full border-4 border-emerald-100/90 bg-gradient-to-br from-[#D4FFAE] via-[#2E9B4E] to-[#064528] ${
            large ? 'h-28 w-28 text-4xl' : 'h-10 w-10 text-base'
          } font-black text-white shadow-[0_16px_36px_rgba(46,155,78,0.45)]`}
        >
          <span className="absolute inset-2 rounded-full border border-emerald-200/40" />
          <span className="relative drop-shadow">$</span>
        </span>
      );
    case 'btc':
      return (
        <span
          className={`relative grid place-items-center rounded-full border-4 border-amber-200/95 bg-gradient-to-br from-[#FFD55A] via-[#F27E12] to-[#6A2705] ${
            large ? 'h-28 w-28 text-4xl' : 'h-10 w-10 text-base'
          } font-black text-amber-50 shadow-[0_16px_36px_rgba(242,126,18,0.5)]`}
        >
          <span className="absolute inset-2 rounded-full border border-amber-200/50" />
          <span className="relative drop-shadow">₿</span>
        </span>
      );
    case 'classic':
    default:
      return (
        <span
          className={`relative grid place-items-center rounded-full border-4 border-white/90 bg-gradient-to-br from-[#FF749F] via-[#FF176C] to-[#A30044] ${
            large ? 'h-28 w-28 text-4xl' : 'h-10 w-10 text-base'
          } font-black text-white shadow-[0_16px_36px_rgba(255,23,108,0.45)]`}
        >
          <span className="absolute inset-2 rounded-full border border-white/40" />
          <span className="relative drop-shadow">♥</span>
        </span>
      );
  }
}

function CardArtworkBackground({ layoutId }: { layoutId: SprayLayoutId }) {
  switch (layoutId) {
    case 'waso':
      return (
        <>
          <div className="absolute -left-20 -top-20 h-80 w-[140%] rotate-[-14deg] rounded-full border border-sky-300/30 bg-sky-400/10" />
          <div className="absolute -right-24 bottom-0 h-72 w-[140%] rotate-[14deg] rounded-full border border-sky-200/25 bg-blue-950/25" />
          <div className="absolute inset-x-0 top-1/3 h-12 bg-gradient-to-r from-transparent via-sky-200/15 to-transparent border-y border-sky-200/20" />
          <div className="absolute inset-0 opacity-15 [background-image:radial-gradient(#bae6fd_1px,transparent_1px)] [background-size:18px_18px]" />
          <div className="absolute top-4 right-5 text-[10px] font-black uppercase tracking-[0.28em] text-sky-200/40 select-none">
            ₦50 ENERGY · LAGOS BLUE NOTE
          </div>
        </>
      );
    case 'figo':
      return (
        <>
          <div className="absolute -left-20 -top-20 h-80 w-[140%] rotate-[-16deg] rounded-full border border-purple-300/30 bg-purple-400/10" />
          <div className="absolute -right-24 bottom-0 h-72 w-[140%] rotate-[16deg] rounded-full border border-purple-200/25 bg-[#25073c]/35" />
          <div className="absolute inset-4 rounded-[26px] border border-purple-200/20 pointer-events-none" />
          <div className="absolute inset-0 opacity-15 [background-image:radial-gradient(#f5d0fe_1px,transparent_1px)] [background-size:20px_20px]" />
          <div className="absolute top-4 right-5 text-[10px] font-black uppercase tracking-[0.28em] text-purple-200/40 select-none">
            ₦500 FLEX · HIGH VALUE RESERVE
          </div>
        </>
      );
    case 'usd':
      return (
        <>
          <div className="absolute -left-20 -top-20 h-80 w-[140%] rotate-[-12deg] rounded-full border border-emerald-300/30 bg-emerald-400/10" />
          <div className="absolute -right-24 bottom-0 h-72 w-[140%] rotate-[12deg] rounded-full border border-emerald-200/25 bg-[#032314]/35" />
          <div className="absolute inset-3 rounded-[26px] border-2 border-dashed border-emerald-200/20 pointer-events-none" />
          <div className="absolute inset-0 opacity-15 [background-image:radial-gradient(#a7f3d0_1px,transparent_1px)] [background-size:18px_18px]" />
          <div className="absolute top-4 right-5 text-[10px] font-black uppercase tracking-[0.28em] text-emerald-200/40 select-none">
            USD RESERVE · GREENBACK FLEX
          </div>
        </>
      );
    case 'btc':
      return (
        <>
          <div className="absolute -left-20 -top-20 h-80 w-[140%] rotate-[-15deg] rounded-full border border-amber-300/30 bg-amber-400/10" />
          <div className="absolute -right-24 bottom-0 h-72 w-[140%] rotate-[15deg] rounded-full border border-amber-200/25 bg-[#381203]/40" />
          <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(to_right,#fef08a_1px,transparent_1px),linear-gradient(to_bottom,#fef08a_1px,transparent_1px)] [background-size:24px_24px]" />
          <div className="absolute top-4 right-5 text-[10px] font-black uppercase tracking-[0.28em] text-amber-200/40 select-none">
            PROOF-OF-LOVE · BLOCK 840,000
          </div>
        </>
      );
    case 'classic':
    default:
      return (
        <>
          <div className="absolute -left-24 -top-20 h-80 w-[130%] rotate-[-18deg] rounded-full border border-white/35 bg-white/15" />
          <div className="absolute -right-28 bottom-0 h-72 w-[130%] rotate-[18deg] rounded-full border border-white/25 bg-black/15" />
          <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(255,255,255,.9)_1px,transparent_1px)] [background-size:16px_16px]" />
          <div className="absolute top-4 right-5 text-[10px] font-black uppercase tracking-[0.28em] text-white/40 select-none">
            SHOWMELOVE ORIGINAL · LOVE COIN
          </div>
        </>
      );
  }
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
        className={`relative min-h-[620px] touch-none overscroll-contain overflow-hidden rounded-[32px] border border-white/40 bg-gradient-to-br ${layout.themeClass} p-6 text-center shadow-[0_26px_64px_-24px_rgba(0,0,0,0.5)] sm:p-9`}
      >
        <CardArtworkBackground layoutId={layout.id} />

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
        <div className="relative z-10 pointer-events-none flex min-h-[560px] flex-col items-center justify-between pb-2">
          {/* Top layout badge */}
          <div className="inline-flex items-center gap-1.5 rounded-full bg-black/25 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm backdrop-blur-md border border-white/20">
            <Sparkles className="h-3.5 w-3.5 text-white" />
            <span>{layout.badge} · {layout.coinLabel.toUpperCase()} SPRAY</span>
          </div>

          {/* Center visual hero coin */}
          <div className="my-auto flex flex-col items-center">
            <ThemedHeroCoin layoutId={layout.id} large />
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white drop-shadow-md">
              {layout.name} Spray
            </h1>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-white/90 drop-shadow">
              {layout.description}
            </p>
          </div>

          {/* Status & instructions */}
          <div className="w-full max-w-sm space-y-3">
            <div className="rounded-2xl bg-black/30 px-5 py-3 text-white backdrop-blur-md border border-white/15">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-80">
                Love Coins Available
              </p>
              <p className="mt-0.5 text-3xl font-extrabold tabular-nums">
                {userBalance.toLocaleString('en-NG')}
              </p>
              {userBalance === 0 && (
                <p className="text-xs font-semibold text-rose-200 mt-1">
                  Balance empty. Top up your wallet to continue spraying!
                </p>
              )}
            </div>

            <p className="text-xs font-medium text-white/85 drop-shadow">
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

        {/* 5 Theme Buttons */}
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
                className={`relative min-h-[115px] overflow-hidden rounded-2xl bg-gradient-to-br ${item.gradient} p-2.5 text-left text-white ring-2 transition-all cursor-pointer ${
                  isSelected ? 'ring-[#FF2385] shadow-lg scale-[1.02]' : 'ring-transparent opacity-85 hover:opacity-100'
                }`}
              >
                <span className={`absolute inset-0 bg-gradient-to-br ${item.themeClass}`} />
                <span className="absolute inset-0 opacity-15 [background-image:radial-gradient(white_1px,transparent_1px)] [background-size:8px_8px]" />
                {isUnderMin && <LockKeyhole className="absolute right-2 top-2 h-3.5 w-3.5 opacity-80" />}
                <div className="relative flex items-center gap-1.5">
                  <ThemedHeroCoin layoutId={item.id} />
                  <span className="text-xs font-black truncate">{item.name}</span>
                </div>
                <div className="relative mt-8">
                  <span className="block text-[11px] font-bold opacity-95">
                    {item.minimumCoins.toLocaleString('en-NG')} min
                  </span>
                  <span className="block text-[9px] opacity-75">{item.badge}</span>
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
