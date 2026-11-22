/**
 * Single configurable source of truth for Love Coin conversion,
 * demo platform fee (20% matching reference), payout fee, and gift bounds.
 */
export const ECONOMY_CONFIG = {
  /** Number of Nigerian Naira (₦) per 1 Love Coin */
  NAIRA_PER_LOVE_COIN: 1,
  /** Uses the stated ₦10,000 -> 9,700 Coin example (3%). */
  FUNDING_FEE_BPS: 300,
  GUEST_GIFT_FEE_BPS: 850,
  SPRAY_FEE_BPS: 300,
  /** Direct-gift fee is now guest-only; see GUEST_GIFT_FEE_BPS. */
  PLATFORM_FEE_BPS: 0,
  /** Flat demo withdrawal fee in Naira (0 = free payouts) */
  WITHDRAWAL_FEE_NAIRA: 0,
  /** Withdrawal fee in basis points (0 = 0%) */
  WITHDRAWAL_FEE_BPS: 0,
  /** Minimum withdrawal amount in Naira */
  MIN_WITHDRAWAL_NAIRA: 100,
  /** Payout processing copy reflecting demo / production policy */
  PAYOUT_PROCESSING_COPY:
    'Demo requests start as Pending and settle immediately when approved. Standard Nigerian bank transfers clear within 1–2 business days.',
  /** Minimum allowed gift value in Naira */
  MIN_GIFT_NAIRA: 100,
  /** Maximum allowed gift value in Naira */
  MAX_GIFT_NAIRA: 100_000,
  /** Minimum & maximum coin top-up bounds */
  MIN_COIN_PURCHASE: 100,
  MAX_COIN_PURCHASE: 500_000,
  /** Maximum voice note recording length in seconds */
  MAX_VOICE_NOTE_SECONDS: 30,
  /** User-facing balance unit. Stored field names remain unchanged for API compatibility. */
  CURRENCY_SYMBOL: 'LC',
} as const;

export type SprayLayoutId = 'classic' | 'figo' | 'usd' | 'btc' | 'waso';

export interface SprayLayout {
  id: SprayLayoutId;
  name: string;
  minimumCoins: number;
  badge: string;
  description: string;
  gradient: string;
  symbol: string;
}

/** Original note-inspired art directions; no real currency design is reproduced. */
export const SPRAY_LAYOUTS: readonly SprayLayout[] = [
  { id: 'classic', name: 'Love Coin', minimumCoins: 12, badge: 'Classic', description: 'The original Showmelove flex.', gradient: 'from-[#F9CE72] via-[#EC83A9] to-[#4A244A]', symbol: '♥' },
  { id: 'waso', name: 'Waso', minimumCoins: 50, badge: '₦50 energy', description: 'Small note, loud love.', gradient: 'from-[#7AB48B] via-[#D4C873] to-[#2D604A]', symbol: '₦' },
  { id: 'figo', name: 'Figo', minimumCoins: 500, badge: '₦500 energy', description: 'A premium green-note-inspired flex.', gradient: 'from-[#3E8D66] via-[#A4C56A] to-[#164737]', symbol: '500' },
  { id: 'usd', name: 'USD', minimumCoins: 1500, badge: 'Dollar mode', description: 'Big green energy for the timeline.', gradient: 'from-[#1D7655] via-[#9BCB7C] to-[#0B3D30]', symbol: '$' },
  { id: 'btc', name: 'BTC', minimumCoins: 10000, badge: 'Baller tier', description: 'The no-small-talk Bitcoin-inspired flex.', gradient: 'from-[#F5A524] via-[#CE6A23] to-[#28152C]', symbol: '₿' },
] as const;

export interface CoinPackage {
  id: string;
  coins: number;
  priceNaira: number;
  popular?: boolean;
}

export const COIN_PACKAGES: CoinPackage[] = [
  { id: 'pack_100', coins: 100, priceNaira: 100 * ECONOMY_CONFIG.NAIRA_PER_LOVE_COIN },
  {
    id: 'pack_500',
    coins: 500,
    priceNaira: 500 * ECONOMY_CONFIG.NAIRA_PER_LOVE_COIN,
    popular: true,
  },
  { id: 'pack_1000', coins: 1000, priceNaira: 1000 * ECONOMY_CONFIG.NAIRA_PER_LOVE_COIN },
  { id: 'pack_5000', coins: 5000, priceNaira: 5000 * ECONOMY_CONFIG.NAIRA_PER_LOVE_COIN },
  { id: 'pack_10000', coins: 10000, priceNaira: 10000 * ECONOMY_CONFIG.NAIRA_PER_LOVE_COIN },
];

export interface CheckoutSummary {
  amountPaidNaira: number;
  loveCoinsNeeded: number;
  platformFeeNaira: number;
  recipientEarningsNaira: number;
  platformFeePercent: number;
  creatorSharePercent: number;
  feePercentLabel: string;
  conversionLabel: string;
}

export interface WithdrawalSummary {
  grossAmountNaira: number;
  payoutFeeNaira: number;
  netReceivedNaira: number;
}

export function formatNaira(amount: number): string {
  const storedValue = Number.isFinite(amount) ? Math.round(amount) : 0;
  const coins = Math.ceil(storedValue / ECONOMY_CONFIG.NAIRA_PER_LOVE_COIN);
  return formatCoins(coins);
}

export function formatCoins(coins: number): string {
  const safe = Number.isFinite(coins) ? Math.round(coins) : 0;
  return `${safe.toLocaleString('en-NG')} Love ${safe === 1 ? 'Coin' : 'Coins'}`;
}

export function formatCoinCount(coins: number): string {
  const safe = Number.isFinite(coins) ? Math.round(coins) : 0;
  return `${safe.toLocaleString('en-NG')} ${safe === 1 ? 'Coin' : 'Coins'}`;
}

export function calculateFundingCredit(fundingNaira: number): { creditedCoins: number; feeCoins: number } {
  const grossCoins = Math.max(0, Math.round(fundingNaira / ECONOMY_CONFIG.NAIRA_PER_LOVE_COIN));
  const creditedCoins = Math.floor((grossCoins * (10_000 - ECONOMY_CONFIG.FUNDING_FEE_BPS)) / 10_000);
  return { creditedCoins, feeCoins: grossCoins - creditedCoins };
}

export function calculateSpraySettlement(grossCoins: number): { recipientCoins: number; feeCoins: number } {
  const safeGross = Math.max(0, Math.floor(grossCoins));
  const feeCoins = Math.round((safeGross * ECONOMY_CONFIG.SPRAY_FEE_BPS) / 10_000);
  return { recipientCoins: safeGross - feeCoins, feeCoins };
}

export function calculateGuestGiftSettlement(grossCoins: number): { recipientCoins: number; feeCoins: number } {
  const safeGross = Math.max(0, Math.floor(grossCoins));
  const feeCoins = Math.round((safeGross * ECONOMY_CONFIG.GUEST_GIFT_FEE_BPS) / 10_000);
  return { recipientCoins: safeGross - feeCoins, feeCoins };
}

export function validateGiftAmount(rawAmount: number): {
  valid: boolean;
  error?: string;
  normalized: number;
} {
  if (!Number.isFinite(rawAmount) || Number.isNaN(rawAmount)) {
    return {
      valid: false,
      error: `Enter an amount between ${formatNaira(ECONOMY_CONFIG.MIN_GIFT_NAIRA)} and ${formatNaira(ECONOMY_CONFIG.MAX_GIFT_NAIRA)}.`,
      normalized: 0,
    };
  }
  const rounded = Math.round(rawAmount);
  if (rounded < ECONOMY_CONFIG.MIN_GIFT_NAIRA) {
    return {
      valid: false,
      error: `Minimum gift amount is ${formatNaira(ECONOMY_CONFIG.MIN_GIFT_NAIRA)}.`,
      normalized: rounded,
    };
  }
  if (rounded > ECONOMY_CONFIG.MAX_GIFT_NAIRA) {
    return {
      valid: false,
      error: `Maximum gift amount is ${formatNaira(ECONOMY_CONFIG.MAX_GIFT_NAIRA)}.`,
      normalized: rounded,
    };
  }
  return { valid: true, normalized: rounded };
}

export function calculateCheckoutSummary(giftAmountNaira: number): CheckoutSummary {
  const safeAmount = Math.max(0, Math.round(giftAmountNaira));
  const loveCoinsNeeded = Math.ceil(safeAmount / ECONOMY_CONFIG.NAIRA_PER_LOVE_COIN);
  const platformFeeNaira = Math.round((safeAmount * ECONOMY_CONFIG.PLATFORM_FEE_BPS) / 10_000);
  const recipientEarningsNaira = Math.max(0, safeAmount - platformFeeNaira);
  const platformFeePercent = ECONOMY_CONFIG.PLATFORM_FEE_BPS / 100;
  const creatorSharePercent = Math.max(0, 100 - platformFeePercent);
  const feePctStr = platformFeePercent.toFixed(
    ECONOMY_CONFIG.PLATFORM_FEE_BPS % 100 === 0 ? 0 : 1,
  );

  return {
    amountPaidNaira: safeAmount,
    loveCoinsNeeded,
    platformFeeNaira,
    recipientEarningsNaira,
    platformFeePercent,
    creatorSharePercent,
    feePercentLabel: `${feePctStr}% demo fee`,
    conversionLabel: 'All gift values are shown in Love Coins',
  };
}

export function calculateWithdrawalSummary(grossAmountNaira: number): WithdrawalSummary {
  const safeGross = Math.max(0, Math.round(grossAmountNaira));
  const pctFee = Math.round((safeGross * ECONOMY_CONFIG.WITHDRAWAL_FEE_BPS) / 10_000);
  const payoutFeeNaira =
    safeGross > 0 ? Math.min(safeGross, ECONOMY_CONFIG.WITHDRAWAL_FEE_NAIRA + pctFee) : 0;
  const netReceivedNaira = Math.max(0, safeGross - payoutFeeNaira);

  return {
    grossAmountNaira: safeGross,
    payoutFeeNaira,
    netReceivedNaira,
  };
}
