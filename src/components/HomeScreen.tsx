import { ArrowRight, Gift as GiftIcon, Play, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { ECONOMY_CONFIG, formatNaira } from '../config/economy';
import { useShowmelove } from '../context/ShowmeloveContext';
import { GiftArtworkSvg, ShowmeloveMascotSvg } from './GiftArtwork';
import { Button, PriceLabel, PromisePaperCard, TactileGiftCard } from './ui/DesignSystem';

interface HomeScreenProps {
  onStartSend: (giftId?: string) => void;
  onTrySampleReveal: () => void;
}

export function HomeScreen({ onStartSend, onTrySampleReveal }: HomeScreenProps) {
  const { state } = useShowmelove();

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const seasonalAvailableGifts = state.seasonalDropEnabled
    ? state.catalog.filter(
        (item) => item.collectionId === state.activeSeasonalCollection && item.available,
      )
    : [];

  const showSeasonalCollection = seasonalAvailableGifts.length > 0;

  const catalogGifts = state.catalog.filter((item) => {
    if (!state.seasonalDropEnabled && item.collectionId === state.activeSeasonalCollection) {
      return false;
    }
    return true;
  });

  // One featured gift with subtle idle motion
  const featuredGift =
    catalogGifts.find((g) => g.artworkId === 'gift-box' && g.available) ??
    catalogGifts.find((g) => g.available) ??
    catalogGifts[0];

  return (
    <div className="space-y-10 sm:space-y-12 pb-12">
      {/* Hero Split */}
      <section className="rounded-3xl bg-white border border-[#171314]/8 p-5 sm:p-9 lg:p-11 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          <div className="lg:col-span-7 space-y-5">
            <p className="text-xs font-medium text-[#5E5255]">
              Animated 3D gifts · Personal voice notes · Nigerian bank payouts
            </p>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.45rem] font-bold tracking-tight text-[#171314] leading-[1.04] text-balance">
              Send a little love
            </h1>

            <p className="text-base sm:text-lg text-[#5E5255] max-w-xl leading-relaxed">
              Pick a tactile gift, write a Digital Promise Card, and add a voice note. Share one link on WhatsApp—our mascot hands it over in 3D and they claim the naira value.
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
                <Play className="w-4 h-4 text-[#E62E45] fill-current" />
                <span>Try a sample reveal</span>
              </Button>
            </div>

            <p className="text-xs text-[#5E5255] tabular-nums">
              1 Love Coin = {formatNaira(ECONOMY_CONFIG.NAIRA_PER_LOVE_COIN)} ·{' '}
              {(ECONOMY_CONFIG.PLATFORM_FEE_BPS / 100).toFixed(0)}% demo fee · Gifts from{' '}
              {formatNaira(ECONOMY_CONFIG.MIN_GIFT_NAIRA)} to{' '}
              {formatNaira(ECONOMY_CONFIG.MAX_GIFT_NAIRA)}
            </p>
          </div>

          {/* One featured gift with subtle idle motion + mascot */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-sm rounded-3xl bg-gradient-to-b from-[#FFF0F2] to-[#FDF8F3] border border-[#E62E45]/12 p-5 sm:p-6 flex flex-col items-center text-center space-y-4">
              <div className="relative flex items-center justify-center w-full py-1">
                <ShowmeloveMascotSvg className="w-36 h-36 sm:w-44 sm:h-44" holdingGift={false} />
                {featuredGift && (
                  <motion.button
                    type="button"
                    onClick={() => onStartSend(featuredGift.id)}
                    aria-label={`Featured gift: ${featuredGift.name}`}
                    animate={reducedMotion ? undefined : { y: [0, -7, 0] }}
                    transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
                    className="-ml-4 mt-8 w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-white border border-[#171314]/10 shadow-lg flex items-center justify-center hover:scale-105 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E62E45]"
                  >
                    <GiftArtworkSvg artworkId={featuredGift.artworkId} className="w-20 h-20 sm:w-22 sm:h-22" />
                  </motion.button>
                )}
              </div>

              {featuredGift && (
                <div className="w-full flex items-center justify-between gap-2 px-1 text-left">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-[#5E5255]">Featured gift</p>
                    <p className="font-display text-sm font-bold text-[#171314] truncate">
                      {featuredGift.name}
                    </p>
                  </div>
                  <PriceLabel amountNaira={featuredGift.defaultPriceNaira} showCoins size="sm" accent />
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

      {/* Gift Catalog — 2-column gift grid on mobile */}
      <section className="space-y-5" aria-labelledby="catalog-heading">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h2
              id="catalog-heading"
              className="font-display text-2xl sm:text-3xl font-bold text-[#171314]"
            >
              Gift catalog
            </h2>
            <p className="text-sm text-[#5E5255] mt-1">
              Each gift brings its own 3D mascot handoff. Tap any card to customize your amount.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {catalogGifts.map((item) => (
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

      {/* Separate Seasonal Collection — rendered ONLY when it contains available gifts */}
      {showSeasonalCollection && (
        <section
          className="rounded-3xl bg-[#FFF0F2]/80 border border-[#E62E45]/15 p-5 sm:p-7 space-y-5"
          aria-labelledby="seasonal-heading"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-[#E62E45]/15 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-[#E62E45]" />
              </div>
              <div>
                <h2
                  id="seasonal-heading"
                  className="font-display text-xl sm:text-2xl font-bold text-[#171314]"
                >
                  Valentine&apos;s Seasonal Collection
                </h2>
                <p className="text-xs sm:text-sm text-[#5E5255]">
                  Limited seasonal drops with custom 3D reveal moments.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {seasonalAvailableGifts.map((item) => (
              <TactileGiftCard
                key={`seasonal-${item.id}`}
                item={item}
                showCoins={true}
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
