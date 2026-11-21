import { ArrowLeft, Sparkles } from 'lucide-react';
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
  const canSpray = isSignedIn && currentWallet.loveCoinsBalance > 0;

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

      <section className="relative min-h-[440px] overflow-hidden rounded-[32px] border border-[#F3B843]/45 bg-[radial-gradient(circle_at_50%_5%,#FFF7D4_0%,#FFCF9E_35%,#EB7BAF_68%,#492449_100%)] p-6 text-center shadow-[0_26px_64px_-28px_rgba(225,119,41,0.85)] dark:bg-[radial-gradient(circle_at_50%_5%,#74422C_0%,#592947_45%,#1E1429_100%)] sm:p-9">
        <SprayCoins
          isEnabled={canSpray}
          coinBalance={currentWallet.loveCoinsBalance}
          onSpray={(count) => {
            void sprayLoveCoins(count);
          }}
        />

        <div className="relative z-10 pointer-events-none flex min-h-[390px] flex-col items-center justify-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/60 px-3 py-1.5 text-xs font-bold text-[#633417] shadow-sm backdrop-blur-md dark:bg-white/10 dark:text-[#FFE4A6]">
            <Sparkles className="h-4 w-4" />
            LOVE COIN SPRAY
          </div>
          <GoldLoveCoinSvg className="mt-6 h-28 w-28 drop-shadow-[0_18px_18px_rgba(89,38,21,0.3)]" priority />
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-[#28140F] dark:text-white">
            Spread the love
          </h1>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#643528] dark:text-[#F5DDE7]">
            {canSpray
              ? 'Swipe sideways across this card to launch 12–20 Love Coins with every spray.'
              : isSignedIn
                ? 'Your Love Coin balance is empty. Add coins to start spraying.'
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

      {!isSignedIn && (
        <Button variant="primary" size="lg" fullWidth onClick={() => switchRole('recipient')}>
          Sign in to start spraying
        </Button>
      )}
    </div>
  );
}
