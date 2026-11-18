/**
 * Single configurable source of truth for Love Coin conversion,
 * demo platform fee, and gift amount bounds.
 */
export const ECONOMY_CONFIG = {
  /** Number of Nigerian Naira (₦) per 1 Love Coin */
  NAIRA_PER_LOVE_COIN: 1,
  /** Platform fee in basis points (0 = 0% demo platform fee, 500 = 5%) */
  PLATFORM_FEE_BPS: 0,
  /** Minimum allowed gift value in Naira */
  MIN_GIFT_NAIRA: 100,
  /** Maximum allowed gift value in Naira */
  MAX_GIFT_NAIRA: 100_000,
  /** Maximum voice note recording length in seconds */
  MAX_VOICE_NOTE_SECONDS: 30,
  /** Currency symbol */
  CURRENCY_SYMBOL: '₦',
} as const;

export interface CheckoutSummary {
  amountPaidNaira: number;
  loveCoinsNeeded: number;
  platformFeeNaira: number;
  recipientEarningsNaira: number;
  feePercentLabel: string;
  conversionLabel: string;
}

export function formatNaira(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  return `${ECONOMY_CONFIG.CURRENCY_SYMBOL}${safe.toLocaleString('en-NG')}`;
}

export function formatCoins(coins: number): string {
  const safe = Number.isFinite(coins) ? Math.round(coins) : 0;
  return `${safe.toLocaleString('en-NG')} Love ${safe === 1 ? 'Coin' : 'Coins'}`;
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
  const feePct = (ECONOMY_CONFIG.PLATFORM_FEE_BPS / 100).toFixed(
    ECONOMY_CONFIG.PLATFORM_FEE_BPS % 100 === 0 ? 0 : 1,
  );

  return {
    amountPaidNaira: safeAmount,
    loveCoinsNeeded,
    platformFeeNaira,
    recipientEarningsNaira,
    feePercentLabel: `${feePct}% demo platform fee`,
    conversionLabel: `1 Love Coin = ${formatNaira(ECONOMY_CONFIG.NAIRA_PER_LOVE_COIN)}`,
  };
}
