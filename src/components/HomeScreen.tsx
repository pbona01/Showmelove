import { ArrowRight, Gift as GiftIcon, Play, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import {
  ECONOMY_CONFIG,
  formatCoinCount,
  formatNaira,
} from '../config/economy';
import { useShowmelove } from '../context/ShowmeloveContext';
import { GiftArtworkSvg, ShowmeloveMascotSvg } from './GiftArtwork';
import { Button, PromisePaperCard, TactileGiftCard } from './ui/DesignSystem';

interface HomeScreenProps {
  onStartSend: (giftId?: string) => void;
  onTrySampleReveal: () => void;
}

export function HomeScreen({ onStartSend, onTrySampleReveal }: HomeScreenProps) {
  const { state } = useShowmelove();

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // Keep evergreen and seasonal gifts strictly separated so NO gift renders twice
  const evergreenGifts = state.catalog.filter(
    (item) => item.collectionId !== state.activeSeasonalCollection,
  );

  const seasonalAvailableGifts = state.seasonalDropEnabled
    ? state.catalog.filter(
        (item) =>
          item.collectionId === state.activeSeasonalCollection && item.available,
      )
    : [];

  const allAvailableGifts = [...evergreenGifts.filter((g) => g.available), ...seasonalAvailableGifts];
  const featuredGift =
    allAvailableGifts.find((g) => g.artworkId === 'gift-box') ??
    allAvailableGifts[0] ??
    state.catalog[0];

  const feePercent = (ECONOMY_CONFIG.PLATFORM_FEE_BPS / 100).toFixed(0);

  return (
    <div className="space-y-8 sm:space-y-10 pb-10">
      {/* Hero Split */}
      <section className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5 sm:p-8 lg:p-10 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 lg:gap-10 items-center">
          <div className="lg:col-span-7 space-y-5">
            <p className="text-xs font-medium text-[var(--text-secondary)]">
              Animated gifts · Personal voice notes · Nigerian bank payouts · Guest checkout available
            </p>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.35rem] font-bold tracking-tight text-[var(--text-primary)] leading-[1.05] text-balance">
              Send a little love
            </h1>

            <p className="text-base sm:text-lg text-[var(--text-secondary)] max-w-xl leading-relaxed">
              Pick an animated gift, write a Digital Promise Card, and record a voice note. Share one link on WhatsApp—watch your gift come to life and let them withdraw the naira rewards.
            </p>

            {/* Primary CTA first, Sample Reveal second */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
              <Button
                variant="primary"
                size="lg"
                onClick={() => onStartSend()}
                data-testid="home-send-gift-btn"
              >
                <GiftIcon className="w-5 h-5" />
                <span>Send a gift</span>
                <ArrowRight className="w-4 h-4" />
              </Button>

              <Button
                variant="secondary"
                size="lg"
                onClick={onTrySampleReveal}
                data-testid="home-sample-reveal-btn"
              >
                <Play className="w-4 h-4 text-[#DF0756] dark:text-[#FF176C] fill-current" />
                <span>Try a sample reveal</span>
              </Button>
            </div>

            <p className="text-xs text-[var(--text-secondary)] tabular-nums">
              1 Love Coin = {formatNaira(ECONOMY_CONFIG.NAIRA_PER_LOVE_COIN)} · {feePercent}% demo platform fee · No account needed to send
            </p>
          </div>

          {/* One featured gift with subtle idle motion + mascot */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-sm rounded-3xl love-coin-surface border border-[#DF0756]/20 dark:border-white/10 p-5 sm:p-6 flex flex-col items-center text-center space-y-4">
              <div className="relative flex items-center justify-center w-full py-1">
                <ShowmeloveMascotSvg className="w-36 h-36 sm:w-42 sm:h-42" holdingGift={false} />
                {featuredGift && (
                  <motion.button
                    type="button"
                    onClick={() => onStartSend(featuredGift.id)}
                    aria-label={`Featured gift: ${featuredGift.name}`}
                    animate={reducedMotion ? undefined : { y: [0, -7, 0] }}
                    transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
                    className="-ml-4 mt-8 w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-lg flex items-center justify-center hover:scale-105 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF176C]"
                  >
                    <GiftArtworkSvg
                      artworkId={featuredGift.artworkId}
                      className="w-20 h-20 sm:w-22 sm:h-22"
                    />
                  </motion.button>
                )}
              </div>

              {featuredGift && (
                <div className="w-full flex items-center justify-between gap-2 px-1 text-left">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[#6F6478] dark:text-[#EADCE8]">
                      Featured gift
                    </p>
                    <p className="text-sm font-bold text-[#201727] dark:text-[#FAF8FC] truncate">
                      {featuredGift.name}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold tabular-nums text-[#DF0756] dark:text-[#FF7AA8]">
                      {formatCoinCount(featuredGift.defaultPriceNaira)}
                    </p>
                    <p className="text-xs tabular-nums text-[#6F6478] dark:text-[#DFC8DD]">
                      {formatNaira(featuredGift.defaultPriceNaira)}
                    </p>
                  </div>
                </div>
              )}

              <div className="w-full">
                <PromisePaperCard
                  promiseText="Dinner's on me this weekend."
                  senderName="Tunde"
                  recipientName="Adaeze"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Gift Catalog — Evergreen Gifts (each gift rendered once) */}
      <section className="space-y-4" aria-labelledby="catalog-heading">
        <div>
          <h2
            id="catalog-heading"
            className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]"
          >
            Classic gifts
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Each animated gift comes with a signature mascot handoff. Tap any tile to customize the value.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {evergreenGifts.map((item) => (
            <TactileGiftCard
              key={item.id}
              item={item}
              showCoins={true}
              featured={featuredGift?.id === item.id}
              actionLabel="Send"
              onSelect={() => onStartSend(item.id)}
            />
          ))}
        </div>
      </section>

      {/* Separate Seasonal Collection — rendered ONLY when enabled & containing available gifts */}
      {seasonalAvailableGifts.length > 0 && (
        <section
          className="rewards-glow-surface rounded-3xl border border-[#8439D5]/25 dark:border-[#A855F7]/30 p-5 sm:p-7 space-y-5"
          aria-labelledby="seasonal-heading"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-[#8439D5] dark:text-[#A855F7]" />
            </div>
            <div>
              <h2
                id="seasonal-heading"
                className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]"
              >
                Valentine&apos;s Seasonal Collection
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                Limited seasonal animated gifts with custom reveal effects.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {seasonalAvailableGifts.map((item) => (
              <TactileGiftCard
                key={item.id}
                item={item}
                showCoins={true}
                featured={featuredGift?.id === item.id}
                actionLabel="Send"
                onSelect={() => onStartSend(item.id)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
