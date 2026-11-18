import {
  calculateCheckoutSummary,
  ECONOMY_CONFIG,
  formatCoins,
  formatNaira,
  validateGiftAmount,
} from '../config/economy';
import type {
  DemoBankAccount,
  EmoteOption,
  GiftCatalogItem,
  GiftSnapshot,
  PayoutRequest,
  SentGift,
  ShowmeloveStoreState,
  WalletState,
} from '../types/showmelove';

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function ensureWallet(
  walletsByEmail: Record<string, WalletState>,
  email: string,
): WalletState {
  const key = normalizeEmail(email);
  return (
    walletsByEmail[key] ?? {
      loveCoinsBalance: 0,
      availableEarningsNaira: 0,
      reservedEarningsNaira: 0,
      coinTransactions: [],
      earningsTransactions: [],
    }
  );
}

export function createGiftSnapshot(
  item: GiftCatalogItem,
  amountNaira: number,
): GiftSnapshot {
  return {
    catalogId: item.id,
    artworkId: item.artworkId,
    name: item.name,
    priceNaira: amountNaira,
    animationType: item.animationType,
    themeColor: item.themeColor,
    accentColor: item.accentColor,
  };
}

export interface ComposeGiftDraft {
  checkoutAttemptId: string;
  giftId: string;
  createdAt: string;
  catalogItem: GiftCatalogItem;
  senderName: string;
  senderEmail?: string;
  recipientName: string;
  recipientEmail: string;
  promiseText: string;
  messageText?: string;
  emote: EmoteOption;
  amountNaira: number;
  hasVoiceNote: boolean;
  voiceNoteSource: 'none' | 'sample' | 'recorded';
  voiceNoteBlobKey?: string;
  voiceNoteDurationSec?: number;
  paymentMode: 'flutterwave_guest' | 'coin_balance' | 'flutterwave_signed_in';
}

export interface CheckoutResult {
  ok: boolean;
  alreadyProcessed?: boolean;
  error?: string;
  gift?: SentGift;
  nextState: ShowmeloveStoreState;
}

export function createPaidGiftIdempotent(
  state: ShowmeloveStoreState,
  draft: ComposeGiftDraft,
): CheckoutResult {
  if (state.processedCheckoutIds.includes(draft.checkoutAttemptId)) {
    const existingGift = state.gifts.find(
      (g) => g.checkoutAttemptId === draft.checkoutAttemptId,
    );
    return {
      ok: true,
      alreadyProcessed: true,
      gift: existingGift,
      nextState: state,
    };
  }

  const amountCheck = validateGiftAmount(draft.amountNaira);
  if (!amountCheck.valid) {
    return { ok: false, error: amountCheck.error, nextState: state };
  }

  if (!draft.senderName.trim() || !draft.recipientName.trim()) {
    return {
      ok: false,
      error: 'Sender name and recipient name are required.',
      nextState: state,
    };
  }

  const recipientEmail = normalizeEmail(draft.recipientEmail);
  if (!recipientEmail || !recipientEmail.includes('@')) {
    return {
      ok: false,
      error: 'Enter a valid recipient email for claiming.',
      nextState: state,
    };
  }

  const summary = calculateCheckoutSummary(amountCheck.normalized);
  const senderKey = draft.senderEmail ? normalizeEmail(draft.senderEmail) : '';
  const wallets = { ...state.walletsByEmail };

  if (draft.paymentMode === 'coin_balance') {
    if (!senderKey) {
      return {
        ok: false,
        error: 'Sign in as a demo sender to spend Love Coins from your balance.',
        nextState: state,
      };
    }
    const senderWallet = ensureWallet(wallets, senderKey);
    if (senderWallet.loveCoinsBalance < summary.loveCoinsNeeded) {
      return {
        ok: false,
        error: `Insufficient Love Coins. You need ${formatCoins(summary.loveCoinsNeeded)}.`,
        nextState: state,
      };
    }
    wallets[senderKey] = {
      ...senderWallet,
      loveCoinsBalance: senderWallet.loveCoinsBalance - summary.loveCoinsNeeded,
      coinTransactions: [
        {
          id: `ctx_${draft.giftId}_spend`,
          createdAt: draft.createdAt,
          type: 'spend',
          coinsDelta: -summary.loveCoinsNeeded,
          amountNaira: summary.amountPaidNaira,
          description: `Sent ${draft.catalogItem.name} to ${draft.recipientName.trim()}`,
          relatedGiftId: draft.giftId,
        },
        ...senderWallet.coinTransactions,
      ],
    };
  } else if (draft.paymentMode === 'flutterwave_signed_in' && senderKey) {
    // Signed-in user buys exact coins via Flutterwave demo and spends them immediately
    const senderWallet = ensureWallet(wallets, senderKey);
    wallets[senderKey] = {
      ...senderWallet,
      coinTransactions: [
        {
          id: `ctx_${draft.giftId}_spend`,
          createdAt: draft.createdAt,
          type: 'spend',
          coinsDelta: -summary.loveCoinsNeeded,
          amountNaira: summary.amountPaidNaira,
          description: `Sent ${draft.catalogItem.name} to ${draft.recipientName.trim()}`,
          relatedGiftId: draft.giftId,
        },
        {
          id: `ctx_${draft.giftId}_buy`,
          createdAt: draft.createdAt,
          type: 'purchase',
          coinsDelta: summary.loveCoinsNeeded,
          amountNaira: summary.amountPaidNaira,
          description: `Flutterwave demo purchase (${formatNaira(summary.amountPaidNaira)})`,
          relatedGiftId: draft.giftId,
        },
        ...senderWallet.coinTransactions,
      ],
    };
  }

  const gift: SentGift = {
    id: draft.giftId,
    checkoutAttemptId: draft.checkoutAttemptId,
    createdAt: draft.createdAt,
    senderName: draft.senderName.trim(),
    senderEmail: senderKey || undefined,
    recipientName: draft.recipientName.trim(),
    recipientEmail,
    promiseText: draft.promiseText.trim() || 'A little love from me to you.',
    messageText: draft.messageText?.trim() || undefined,
    emote: draft.emote,
    amountNaira: summary.amountPaidNaira,
    coinsSpent: summary.loveCoinsNeeded,
    platformFeeNaira: summary.platformFeeNaira,
    recipientEarningsNaira: summary.recipientEarningsNaira,
    hasVoiceNote: draft.hasVoiceNote,
    voiceNoteSource: draft.voiceNoteSource,
    voiceNoteBlobKey: draft.voiceNoteBlobKey,
    voiceNoteDurationSec: draft.voiceNoteDurationSec,
    snapshot: createGiftSnapshot(draft.catalogItem, summary.amountPaidNaira),
  };

  return {
    ok: true,
    gift,
    nextState: {
      ...state,
      gifts: [gift, ...state.gifts],
      processedCheckoutIds: [...state.processedCheckoutIds, draft.checkoutAttemptId],
      walletsByEmail: wallets,
    },
  };
}

export function buyLoveCoins(
  state: ShowmeloveStoreState,
  email: string,
  coinsAmount: number,
  txId: string,
  createdAt: string,
): { ok: boolean; error?: string; nextState: ShowmeloveStoreState } {
  const key = normalizeEmail(email);
  if (!key) {
    return { ok: false, error: 'Sign in to buy Love Coins.', nextState: state };
  }
  const roundedCoins = Math.round(coinsAmount);
  if (roundedCoins < ECONOMY_CONFIG.MIN_GIFT_NAIRA || roundedCoins > 500_000) {
    return {
      ok: false,
      error: `Enter between ${ECONOMY_CONFIG.MIN_GIFT_NAIRA} and 500,000 Love Coins.`,
      nextState: state,
    };
  }
  const costNaira = roundedCoins * ECONOMY_CONFIG.NAIRA_PER_LOVE_COIN;
  const wallet = ensureWallet(state.walletsByEmail, key);
  return {
    ok: true,
    nextState: {
      ...state,
      walletsByEmail: {
        ...state.walletsByEmail,
        [key]: {
          ...wallet,
          loveCoinsBalance: wallet.loveCoinsBalance + roundedCoins,
          coinTransactions: [
            {
              id: txId,
              createdAt,
              type: 'purchase',
              coinsDelta: roundedCoins,
              amountNaira: costNaira,
              description: `Topped up ${formatCoins(roundedCoins)} via Flutterwave demo`,
            },
            ...wallet.coinTransactions,
          ],
        },
      },
    },
  };
}

export type ClaimStatus =
  | 'claimed_now'
  | 'already_claimed'
  | 'wrong_recipient'
  | 'sign_in_required'
  | 'not_found';

export interface ClaimResult {
  ok: boolean;
  status: ClaimStatus;
  error?: string;
  gift?: SentGift;
  nextState: ShowmeloveStoreState;
}

export function claimGiftIdempotent(
  state: ShowmeloveStoreState,
  giftId: string,
  claimerEmail: string,
  claimedAt: string,
): ClaimResult {
  const giftIndex = state.gifts.findIndex((g) => g.id === giftId);
  if (giftIndex === -1) {
    return {
      ok: false,
      status: 'not_found',
      error: 'This gift link could not be found.',
      nextState: state,
    };
  }

  const gift = state.gifts[giftIndex];
  const normalizedClaimer = normalizeEmail(claimerEmail);

  if (!normalizedClaimer) {
    return {
      ok: false,
      status: 'sign_in_required',
      error: `Sign in as ${gift.recipientEmail} to claim this gift.`,
      gift,
      nextState: state,
    };
  }

  if (normalizedClaimer !== normalizeEmail(gift.recipientEmail)) {
    return {
      ok: false,
      status: 'wrong_recipient',
      error: `This gift was addressed to ${gift.recipientEmail}, not ${normalizedClaimer}.`,
      gift,
      nextState: state,
    };
  }

  if (gift.claimedAt) {
    return {
      ok: true,
      status: 'already_claimed',
      gift,
      nextState: state,
    };
  }

  const updatedGift: SentGift = {
    ...gift,
    claimedAt,
    claimedByEmail: normalizedClaimer,
  };

  const nextGifts = [...state.gifts];
  nextGifts[giftIndex] = updatedGift;

  const wallet = ensureWallet(state.walletsByEmail, normalizedClaimer);
  const nextWallet: WalletState = {
    ...wallet,
    availableEarningsNaira: wallet.availableEarningsNaira + gift.recipientEarningsNaira,
    earningsTransactions: [
      {
        id: `etx_claim_${gift.id}`,
        createdAt: claimedAt,
        type: 'claim',
        amountNaira: gift.recipientEarningsNaira,
        description: `Claimed ${gift.snapshot.name} from ${gift.senderName}`,
        relatedId: gift.id,
      },
      ...wallet.earningsTransactions,
    ],
  };

  return {
    ok: true,
    status: 'claimed_now',
    gift: updatedGift,
    nextState: {
      ...state,
      gifts: nextGifts,
      walletsByEmail: {
        ...state.walletsByEmail,
        [normalizedClaimer]: nextWallet,
      },
    },
  };
}

export function requestWithdrawal(
  state: ShowmeloveStoreState,
  recipientEmail: string,
  amountNaira: number,
  bankAccount: DemoBankAccount,
  payoutId: string,
  createdAt: string,
): { ok: boolean; error?: string; payout?: PayoutRequest; nextState: ShowmeloveStoreState } {
  const key = normalizeEmail(recipientEmail);
  if (!key) {
    return { ok: false, error: 'Sign in as a recipient to withdraw earnings.', nextState: state };
  }

  const rounded = Math.round(amountNaira);
  if (!Number.isFinite(rounded) || rounded < 100) {
    return { ok: false, error: 'Minimum demo withdrawal is ₦100.', nextState: state };
  }

  const wallet = ensureWallet(state.walletsByEmail, key);
  if (rounded > wallet.availableEarningsNaira) {
    return {
      ok: false,
      error: `Amount exceeds your available earnings (${formatNaira(wallet.availableEarningsNaira)}).`,
      nextState: state,
    };
  }

  const payout: PayoutRequest = {
    id: payoutId,
    createdAt,
    recipientEmail: key,
    amountNaira: rounded,
    bankAccount: { ...bankAccount },
    status: 'pending',
  };

  const nextWallet: WalletState = {
    ...wallet,
    availableEarningsNaira: wallet.availableEarningsNaira - rounded,
    reservedEarningsNaira: wallet.reservedEarningsNaira + rounded,
    earningsTransactions: [
      {
        id: `etx_res_${payoutId}`,
        createdAt,
        type: 'payout_reserve',
        amountNaira: -rounded,
        description: `Reserved for demo payout to ${bankAccount.bankName} (${bankAccount.accountNumber})`,
        relatedId: payoutId,
      },
      ...wallet.earningsTransactions,
    ],
  };

  return {
    ok: true,
    payout,
    nextState: {
      ...state,
      payoutRequests: [payout, ...state.payoutRequests],
      walletsByEmail: {
        ...state.walletsByEmail,
        [key]: nextWallet,
      },
    },
  };
}

export function resolveWithdrawal(
  state: ShowmeloveStoreState,
  payoutId: string,
  outcome: 'completed' | 'failed',
  resolvedAt: string,
  failureReason?: string,
): { ok: boolean; error?: string; nextState: ShowmeloveStoreState } {
  const index = state.payoutRequests.findIndex((p) => p.id === payoutId);
  if (index === -1) {
    return { ok: false, error: 'Payout request not found.', nextState: state };
  }

  const payout = state.payoutRequests[index];
  if (payout.status !== 'pending') {
    return { ok: true, nextState: state };
  }

  const key = normalizeEmail(payout.recipientEmail);
  const wallet = ensureWallet(state.walletsByEmail, key);
  const nextReserved = Math.max(0, wallet.reservedEarningsNaira - payout.amountNaira);

  const updatedPayout: PayoutRequest = {
    ...payout,
    status: outcome,
    resolvedAt,
    failureReason: outcome === 'failed' ? failureReason || 'Simulated bank transfer declined' : undefined,
  };

  const nextPayouts = [...state.payoutRequests];
  nextPayouts[index] = updatedPayout;

  const nextWallet: WalletState =
    outcome === 'completed'
      ? {
          ...wallet,
          reservedEarningsNaira: nextReserved,
          earningsTransactions: [
            {
              id: `etx_done_${payoutId}`,
              createdAt: resolvedAt,
              type: 'payout_complete',
              amountNaira: 0,
              description: `Demo payout settled to ${payout.bankAccount.bankName} (${formatNaira(payout.amountNaira)})`,
              relatedId: payoutId,
            },
            ...wallet.earningsTransactions,
          ],
        }
      : {
          ...wallet,
          reservedEarningsNaira: nextReserved,
          availableEarningsNaira: wallet.availableEarningsNaira + payout.amountNaira,
          earningsTransactions: [
            {
              id: `etx_refund_${payoutId}`,
              createdAt: resolvedAt,
              type: 'payout_refund',
              amountNaira: payout.amountNaira,
              description: `Demo payout failed — returned ${formatNaira(payout.amountNaira)} to available earnings`,
              relatedId: payoutId,
            },
            ...wallet.earningsTransactions,
          ],
        };

  return {
    ok: true,
    nextState: {
      ...state,
      payoutRequests: nextPayouts,
      walletsByEmail: {
        ...state.walletsByEmail,
        [key]: nextWallet,
      },
    },
  };
}
