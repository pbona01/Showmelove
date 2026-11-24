import { ArrowLeft, Info } from 'lucide-react';
import {
  calculateCheckoutSummary,
  ECONOMY_CONFIG,
  formatNaira,
} from '../config/economy';
import { LoveCoinHeartSvg, PurpleGiftBoxSvg } from './GiftArtwork';
import { Button } from './ui/DesignSystem';
import { Reveal } from './ui/MotionPrimitives';

interface BalanceInfoScreenProps {
  onBack: () => void;
  onBuyCoins: () => void;
  onWithdraw: () => void;
}

export function BalanceInfoScreen({
  onBack,
  onBuyCoins,
  onWithdraw,
}: BalanceInfoScreenProps) {
  const sampleBreakdown = calculateCheckoutSummary(1000);

  return (
    <Reveal type="slide-up" className="max-w-3xl mx-auto pb-12 space-y-6">
      {/* Top Bar */}
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
          Balance Info
        </h1>
      </div>

      {/* Reference Card 1: Love Coin vs Gifted Rewards */}
      <section className="apple-card rounded-[28px] divide-y divide-[var(--border-subtle)] overflow-hidden">
        <div className="p-5 sm:p-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <LoveCoinHeartSvg className="w-14 h-14 sm:w-16 sm:h-16 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                Love Coin
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                Use Love Coins to send gifts and show love to creators.
              </p>
            </div>
          </div>

          <span className="px-3 py-1 rounded-full bg-[#FFEAF2] dark:bg-[#3A162B] text-[#E10B5C] dark:text-[#FF7AA8] text-xs font-semibold whitespace-nowrap shrink-0">
            For Gifting
          </span>
        </div>

        <div className="p-5 sm:p-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <PurpleGiftBoxSvg className="w-14 h-14 sm:w-16 sm:h-16 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                Gifted Rewards
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                Rewards from gifts you receive. You can withdraw them.
              </p>
            </div>
          </div>

          <span className="px-3 py-1 rounded-full bg-[#E6F6EF] dark:bg-[#0D3326] text-[#087F56] dark:text-[#24C888] text-xs font-semibold whitespace-nowrap shrink-0">
            Withdrawable
          </span>
        </div>
      </section>

      {/* Reference Card 2: Fee Structure & Show Me Love Balance */}
      <section className="space-y-3">
        <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
          Fee Structure & Balance Policy
        </h2>

        <div className="apple-card rounded-[28px] p-5 sm:p-6 space-y-5">
          <div className="divide-y divide-[var(--border-subtle)] text-sm sm:text-base">
            <div className="pb-3.5 flex items-center justify-between gap-4">
              <span className="text-[var(--text-secondary)]">App balance</span>
              <span className="font-bold tabular-nums text-[var(--text-primary)]">
                Love Coins only
              </span>
            </div>

            <div className="py-3.5 flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-[var(--text-primary)]">Love Coin Spray</p>
                <p className="text-xs text-[var(--text-secondary)]">Platform fee (3%) · Creator receives 97%</p>
              </div>
              <span className="font-bold tabular-nums text-[#087F56] dark:text-[#24C888]">
                97%
              </span>
            </div>

            <div className="py-3.5 flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-[var(--text-primary)]">Standard Gift &amp; Promise Cards</p>
                <p className="text-xs text-[var(--text-secondary)]">Platform fee ({sampleBreakdown.platformFeePercent}%) · Creator receives {sampleBreakdown.creatorSharePercent}%</p>
              </div>
              <span className="font-bold tabular-nums text-[#087F56] dark:text-[#24C888]">
                {sampleBreakdown.creatorSharePercent}%
              </span>
            </div>

            <div className="pt-3.5 flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-[var(--text-primary)]">Guest Gifts (No account needed)</p>
                <p className="text-xs text-[var(--text-secondary)]">Platform processing fee (8.5%) · Creator receives 91.5%</p>
              </div>
              <span className="font-bold tabular-nums text-[#087F56] dark:text-[#24C888]">
                91.5%
              </span>
            </div>
          </div>

          <div className="rounded-2xl bg-[var(--bg-raised)] border border-[var(--border-subtle)] p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-[var(--text-secondary)] shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
              <p className="font-medium text-[var(--text-primary)]">
                Love Coins can only be used for gifting and spraying. Gifted rewards can be withdrawn to your Nigerian bank account.
              </p>
              <p className="tabular-nums">
                All platform fees maintain instant payment processing, server infrastructure, and secure withdrawals.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="primary" size="lg" fullWidth onClick={onBuyCoins}>
          Buy Coins
        </Button>
        <Button variant="secondary" size="lg" fullWidth onClick={onWithdraw}>
          Withdraw Rewards
        </Button>
      </div>
    </Reveal>
  );
}
