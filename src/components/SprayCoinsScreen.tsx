import { ArrowLeft, LockKeyhole, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { SPRAY_LAYOUTS, type SprayLayoutId } from '../config/economy';
import { useShowmelove } from '../context/ShowmeloveContext';
import { GoldLoveCoinSvg } from './GiftArtwork';
import { SprayCoins } from './SprayCoins';
import { Button } from './ui/DesignSystem';

interface SprayCoinsScreenProps {
  onBack: () => void;
}

export function SprayCoinsScreen({ onBack }: SprayCoinsScreenProps) {
  const { state, currentWallet, sprayLoveCoins, switchRole } = useShowmelove();
  const isSignedIn = state.activeRole !== 'guest' && Boolean(state.signedInEmail);
  const [layoutId, setLayoutId] = useState<SprayLayoutId>('classic');
  const [sprayAmountInput, setSprayAmountInput] = useState('20');
  const recipients = useMemo(
    () => Object.keys(state.walletsByEmail).filter((email) => email !== state.signedInEmail.toLowerCase()),
    [state.signedInEmail, state.walletsByEmail],
  );
  const [recipientEmail, setRecipientEmail] = useState('adaeze.okafor@example.com');
  const layout = SPRAY_LAYOUTS.find((item) => item.id === layoutId) ?? SPRAY_LAYOUTS[0];
  const sprayAmount = Math.floor(Number(sprayAmountInput));
  const canSpray = isSignedIn && sprayAmount >= layout.minimumCoins && currentWallet.loveCoinsBalance >= sprayAmount && Boolean(recipientEmail);

  return (
    <div className="mx-auto max-w-xl space-y-5 pb-8">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl px-3 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF2385]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Wallet Home
      </button>

      <section className={`relative min-h-[440px] touch-none overscroll-contain overflow-hidden rounded-[32px] border border-[#F3B843]/45 bg-gradient-to-br ${layout.gradient} p-6 text-center shadow-[0_26px_64px_-28px_rgba(225,119,41,0.85)] sm:p-9`}>
        <SprayCoins
          isEnabled={canSpray}
          coinBalance={currentWallet.loveCoinsBalance}
          minimumSpray={layout.minimumCoins}
          sprayAmount={sprayAmount}
          onSpray={(count) => sprayLoveCoins({ coins: count, recipientEmail, layoutId }).ok}
        />

        <div className="relative z-10 pointer-events-none flex min-h-[390px] flex-col items-center justify-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/60 px-3 py-1.5 text-xs font-bold text-[#633417] shadow-sm backdrop-blur-md dark:bg-white/10 dark:text-[#FFE4A6]">
            <Sparkles className="h-4 w-4" />
            {layout.badge} · LOVE COIN SPRAY
          </div>
          <div className="mt-6 flex h-28 w-28 items-center justify-center rounded-full bg-white/20 text-6xl font-black text-white shadow-[0_18px_18px_rgba(89,38,21,0.3)] backdrop-blur-sm">
            {layout.id === 'classic' ? <GoldLoveCoinSvg className="h-28 w-28" priority /> : layout.symbol}
          </div>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-[#28140F] dark:text-white">
            {layout.name} Spray
          </h1>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#643528] dark:text-[#F5DDE7]">
            {canSpray
              ? `Swipe up or down to launch ${sprayAmount.toLocaleString('en-NG')} Love Coins. ${layout.description}`
              : isSignedIn
                ? `You need at least ${layout.minimumCoins.toLocaleString('en-NG')} Love Coins for this layout.`
                : 'Sign in to a demo account to unlock Love Coin Spray.'}
          </p>
          <div className="mt-5 rounded-2xl bg-white/60 px-5 py-3 text-[#4D2519] shadow-sm backdrop-blur-md dark:bg-black/20 dark:text-white">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-70">Love Coins available</p>
            <p className="mt-0.5 text-3xl font-bold tabular-nums">
              {currentWallet.loveCoinsBalance.toLocaleString('en-NG')}
            </p>
          </div>
        </div>
      </section>

      <section className="apple-card rounded-[28px] p-4 sm:p-5 space-y-4">
        <div>
          <h2 className="text-base font-bold text-[var(--text-primary)]">Choose your flex</h2>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">Each layout has its own social-status minimum.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {SPRAY_LAYOUTS.map((item) => {
            const locked = currentWallet.loveCoinsBalance < item.minimumCoins;
            return (
              <button key={item.id} type="button" onClick={() => { setLayoutId(item.id); setSprayAmountInput(String(item.minimumCoins)); }} className={`relative min-h-[82px] rounded-2xl bg-gradient-to-br ${item.gradient} p-2 text-left text-white ring-2 transition ${layoutId === item.id ? 'ring-white shadow-lg' : 'ring-transparent opacity-85 hover:opacity-100'}`}>
                {locked && <LockKeyhole className="absolute right-2 top-2 h-3 w-3" />}
                <span className="block text-sm font-black">{item.name}</span>
                <span className="mt-3 block text-[10px] font-bold opacity-90">{item.minimumCoins.toLocaleString('en-NG')} Coins min.</span>
              </button>
            );
          })}
        </div>
        <label className="block text-xs font-semibold text-[var(--text-secondary)]">
          Love Coins per spray
          <input type="number" min={layout.minimumCoins} max={currentWallet.loveCoinsBalance || layout.minimumCoins} step={1} value={sprayAmountInput} onChange={(event) => setSprayAmountInput(event.target.value)} className="mt-1.5 min-h-[44px] w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-raised)] px-3 text-base font-bold tabular-nums text-[var(--text-primary)]" />
          <span className="mt-1 block font-normal">Minimum: {layout.minimumCoins.toLocaleString('en-NG')} Coins · Available: {currentWallet.loveCoinsBalance.toLocaleString('en-NG')} Coins</span>
        </label>
        <label className="block text-xs font-semibold text-[var(--text-secondary)]">
          Send spray to
          <select value={recipientEmail} onChange={(event) => setRecipientEmail(event.target.value)} className="mt-1.5 w-full min-h-[44px] rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-raised)] px-3 text-sm font-semibold text-[var(--text-primary)]">
            {recipients.map((email) => <option key={email} value={email}>{email}</option>)}
          </select>
        </label>
        <p className="text-xs text-[var(--text-secondary)]">The receiver gets 97% of every spray; Showmelove settles 3% to the platform wallet.</p>
      </section>

      {!isSignedIn && (
        <Button variant="primary" size="lg" fullWidth onClick={() => switchRole('recipient')}>
          Sign in to start spraying
        </Button>
      )}
    </div>
  );
}
