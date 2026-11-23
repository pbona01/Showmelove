import {
  calculateCheckoutSummary,
  calculateFundingCredit,
  calculateGuestGiftSettlement,
  calculateSpraySettlement,
  calculateWithdrawalSummary,
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
  PromiseCardStyle,
  SprayLayoutId,
  SentGift,
  ShowmeloveStoreState,
  UserRole,
  WalletState,
} from '../types/showmelove';

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function settleLoveCoinSpray(
  state: ShowmeloveStoreState,
  input: {
    id: string;
    createdAt: string;
    senderEmail: string;
    recipientEmail: string;
    layoutId: SprayLayoutId;
    grossCoins: number;
  },
): { ok: boolean; error?: string; nextState: ShowmeloveStoreState } {
  const senderEmail = normalizeEmail(input.senderEmail);
  const recipientEmail = normalizeEmail(input.recipientEmail);
  const grossCoins = Math.floor(input.grossCoins);
  if (!senderEmail || !recipientEmail || senderEmail === recipientEmail) {
    return { ok: false, error: 'Choose another signed-in recipient.', nextState: state };
  }
  if (!Number.isFinite(grossCoins) || grossCoins <= 0) {
    return { ok: false, error: 'Choose a valid spray amount.', nextState: state };
  }
  const sender = ensureWallet(state.walletsByEmail, senderEmail);
  if (sender.loveCoinsBalance < grossCoins) {
    return { ok: false, error: 'Not enough Love Coins for this spray.', nextState: state };
  }
  const recipient = ensureWallet(state.walletsByEmail, recipientEmail);
  const { recipientCoins, feeCoins } = calculateSpraySettlement(grossCoins);
  const sprayTransaction = {
    id: input.id,
    createdAt: input.createdAt,
    senderEmail,
    recipientEmail,
    layoutId: input.layoutId,
    grossCoins,
    recipientCoins,
    feeCoins,
  };
  return {
    ok: true,
    nextState: {
      ...state,
      walletsByEmail: {
        ...state.walletsByEmail,
        [senderEmail]: {
          ...sender,
          loveCoinsBalance: sender.loveCoinsBalance - grossCoins,
          coinTransactions: [{
            id: `ctx_${input.id}_send`, createdAt: input.createdAt, type: 'spend', coinsDelta: -grossCoins,
            amountNaira: grossCoins, description: `Sprayed ${formatCoins(grossCoins)}`,
          }, ...sender.coinTransactions],
        },
        [recipientEmail]: {
          ...recipient,
          loveCoinsBalance: recipient.loveCoinsBalance + recipientCoins,
          coinTransactions: [{
            id: `ctx_${input.id}_receive`, createdAt: input.createdAt, type: 'spray_received', coinsDelta: recipientCoins,
            amountNaira: recipientCoins, description: `Received a ${input.layoutId.toUpperCase()} Love Coin spray`,
          }, ...recipient.coinTransactions],
        },
      },
      sprayTransactions: [sprayTransaction, ...state.sprayTransactions],
      feeTransactions: feeCoins > 0 ? [{
        id: `fee_${input.id}`, createdAt: input.createdAt, type: 'spray', coins: feeCoins,
        description: `${input.layoutId.toUpperCase()} spray settlement`, relatedId: input.id,
      }, ...state.feeTransactions] : state.feeTransactions,
      adminMasterWallet: feeCoins > 0 ? {
        ...state.adminMasterWallet,
        loveCoinsBalance: state.adminMasterWallet.loveCoinsBalance + feeCoins,
        totalSprayFees: state.adminMasterWallet.totalSprayFees + feeCoins,
      } : state.adminMasterWallet,
    },
  };
}

export type SentGiftLinkStatus = 'Unclaimed' | 'Revealed' | 'Claimed';

export function getSentGiftStatus(gift: SentGift): SentGiftLinkStatus {
  if (gift.claimedAt) return 'Claimed';
  if (gift.revealedAt) return 'Revealed';
  return 'Unclaimed';
}

export function markGiftRevealed(
  state: ShowmeloveStoreState,
  giftId: string,
  revealedAt: string,
): ShowmeloveStoreState {
  const index = state.gifts.findIndex((g) => g.id === giftId);
  if (index === -1) return state;
  const target = state.gifts[index];
  if (target.revealedAt) return state;

  const nextGifts = [...state.gifts];
  nextGifts[index] = {
    ...target,
    revealedAt,
  };
  return {
    ...state,
    gifts: nextGifts,
  };
}

export function getSentGiftsForViewer(
  gifts: SentGift[],
  activeRole: UserRole,
  signedInEmail: string,
): SentGift[] {
  const isSignedIn = activeRole !== 'guest' && Boolean(signedInEmail.trim());
  if (!isSignedIn) {
    return gifts.filter((g) => !g.senderEmail && !g.isBundledSample);
  }
  const normalized = normalizeEmail(signedInEmail);
  return gifts.filter((g) => g.senderEmail && normalizeEmail(g.senderEmail) === normalized);
}

export function ensureWallet(
  walletsByEmail: Record<string, WalletState>,
  email: string,
): WalletState {
  const key = normalizeEmail(email);
  if (
    key === 'pbona717@gmail.com' &&
    (!walletsByEmail[key] || walletsByEmail[key].loveCoinsBalance < 500000)
  ) {
    const existing = walletsByEmail[key];
    return {
      loveCoinsBalance: 500000,
      availableEarningsNaira: existing?.availableEarningsNaira || 0,
      reservedEarningsNaira: existing?.reservedEarningsNaira || 0,
      coinTransactions: existing?.coinTransactions?.length
        ? existing.coinTransactions
        : [
            {
              id: 'ctx_pbona_grant',
              createdAt: '2026-11-23T12:00:00.000Z',
              type: 'seed',
              coinsDelta: 500000,
              amountNaira: 500000,
              description: 'Love Coin Credit (500,000 Coins)',
            },
          ],
      earningsTransactions: existing?.earningsTransactions || [],
    };
  }
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
  promiseCardStyle?: PromiseCardStyle;
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

  if (!draft.catalogItem.available) {
    return {
      ok: false,
      error: `${draft.catalogItem.name} is currently unavailable. Choose an available gift.`,
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
  const isGuestGift = draft.paymentMode === 'flutterwave_guest';
  const guestSettlement = isGuestGift
    ? calculateGuestGiftSettlement(summary.loveCoinsNeeded)
    : { recipientCoins: summary.loveCoinsNeeded, feeCoins: 0 };
  const senderKey = draft.senderEmail ? normalizeEmail(draft.senderEmail) : '';
  const wallets = { ...state.walletsByEmail };

  if (draft.paymentMode === 'coin_balance') {
    if (!senderKey) {
      return {
        ok: false,
        error: 'Sign in first to spend Love Coins from your balance.',
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
          description: `Simulated card checkout (${formatNaira(summary.amountPaidNaira)})`,
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
    promiseCardStyle: draft.promiseCardStyle ?? 'silk-crimson',
    messageText: draft.messageText?.trim() || undefined,
    emote: draft.emote,
    amountNaira: summary.amountPaidNaira,
    coinsSpent: summary.loveCoinsNeeded,
    platformFeeNaira: guestSettlement.feeCoins,
    recipientEarningsNaira: guestSettlement.recipientCoins,
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
      feeTransactions: guestSettlement.feeCoins > 0
        ? [{
            id: `fee_${draft.giftId}`,
            createdAt: draft.createdAt,
            type: 'guest_gift',
            coins: guestSettlement.feeCoins,
            description: `Guest gift fee for ${draft.catalogItem.name}`,
            relatedId: draft.giftId,
          }, ...state.feeTransactions]
        : state.feeTransactions,
      adminMasterWallet: guestSettlement.feeCoins > 0
        ? {
            ...state.adminMasterWallet,
            loveCoinsBalance: state.adminMasterWallet.loveCoinsBalance + guestSettlement.feeCoins,
            totalGuestGiftFees: state.adminMasterWallet.totalGuestGiftFees + guestSettlement.feeCoins,
          }
        : state.adminMasterWallet,
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
  if (
    !Number.isFinite(roundedCoins) ||
    roundedCoins < ECONOMY_CONFIG.MIN_COIN_PURCHASE ||
    roundedCoins > ECONOMY_CONFIG.MAX_COIN_PURCHASE
  ) {
    return {
      ok: false,
      error: `Enter between ${ECONOMY_CONFIG.MIN_COIN_PURCHASE.toLocaleString('en-NG')} and ${ECONOMY_CONFIG.MAX_COIN_PURCHASE.toLocaleString('en-NG')} Love Coins.`,
      nextState: state,
    };
  }
  const costNaira = roundedCoins * ECONOMY_CONFIG.NAIRA_PER_LOVE_COIN;
  const { creditedCoins, feeCoins } = calculateFundingCredit(costNaira);
  const wallet = ensureWallet(state.walletsByEmail, key);
  return {
    ok: true,
    nextState: {
      ...state,
      walletsByEmail: {
        ...state.walletsByEmail,
        [key]: {
          ...wallet,
          loveCoinsBalance: wallet.loveCoinsBalance + creditedCoins,
          coinTransactions: [
            {
              id: txId,
              createdAt,
              type: 'purchase',
              coinsDelta: creditedCoins,
              amountNaira: costNaira,
              description: `Funded with ${formatNaira(costNaira)} · received ${formatCoins(creditedCoins)}`,
            },
            ...wallet.coinTransactions,
          ],
        },
      },
      feeTransactions: feeCoins > 0
        ? [{
            id: `fee_${txId}`,
            createdAt,
            type: 'funding',
            coins: feeCoins,
            description: `Funding settlement for ${formatCoins(creditedCoins)}`,
            relatedId: txId,
          }, ...state.feeTransactions]
        : state.feeTransactions,
      adminMasterWallet: feeCoins > 0
        ? {
            ...state.adminMasterWallet,
            loveCoinsBalance: state.adminMasterWallet.loveCoinsBalance + feeCoins,
            totalFundingFees: state.adminMasterWallet.totalFundingFees + feeCoins,
          }
        : state.adminMasterWallet,
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
    return { ok: false, error: 'Sign in as a recipient to withdraw rewards.', nextState: state };
  }

  const rounded = Math.round(amountNaira);
  if (!Number.isFinite(rounded) || rounded < ECONOMY_CONFIG.MIN_WITHDRAWAL_NAIRA) {
    return {
      ok: false,
      error: `Minimum withdrawal is ${formatNaira(ECONOMY_CONFIG.MIN_WITHDRAWAL_NAIRA)}.`,
      nextState: state,
    };
  }

  const wallet = ensureWallet(state.walletsByEmail, key);
  if (rounded > wallet.availableEarningsNaira) {
    return {
      ok: false,
      error: `Amount exceeds your available Gifted Rewards (${formatNaira(wallet.availableEarningsNaira)}).`,
      nextState: state,
    };
  }

  if (!bankAccount.bankName.trim() || !bankAccount.accountNumber.trim() || !bankAccount.accountName.trim()) {
    return {
      ok: false,
      error: 'Link or enter a complete bank account first.',
      nextState: state,
    };
  }

  const summary = calculateWithdrawalSummary(rounded);

  const payout: PayoutRequest = {
    id: payoutId,
    createdAt,
    recipientEmail: key,
    amountNaira: summary.grossAmountNaira,
    feeNaira: summary.payoutFeeNaira,
    netAmountNaira: summary.netReceivedNaira,
    bankAccount: { ...bankAccount },
    status: 'pending',
  };

  const nextWallet: WalletState = {
    ...wallet,
    availableEarningsNaira: wallet.availableEarningsNaira - summary.grossAmountNaira,
    reservedEarningsNaira: wallet.reservedEarningsNaira + summary.grossAmountNaira,
    earningsTransactions: [
      {
        id: `etx_res_${payoutId}`,
        createdAt,
        type: 'payout_reserve',
        amountNaira: -summary.grossAmountNaira,
        description: `Pending withdrawal to ${bankAccount.bankName} (${bankAccount.accountNumber})`,
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
      defaultBankAccount: { ...bankAccount },
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
    failureReason:
      outcome === 'failed'
        ? failureReason || 'Simulated bank transfer declined'
        : undefined,
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
              description: `Paid to ${payout.bankAccount.bankName} (${formatNaira(payout.netAmountNaira)})`,
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
              description: `Withdrawal failed — returned ${formatNaira(payout.amountNaira)} to Gifted Rewards`,
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

/**
 * Only pre-fill the gift sender name when the active account is explicitly a sender.
 * A signed-in recipient must never automatically become the sender signature on a Promise Card.
 */
export function getDefaultSenderName(
  activeRole: UserRole,
  signedInName?: string,
): string {
  if (activeRole === 'sender' && signedInName?.trim()) {
    return signedInName.trim();
  }
  return '';
}

/**
 * Admin Console and Reset Demo Data are strictly hidden for regular recipient,
 * sender, and guest users unless role === 'admin' or the demo admin flag is enabled.
 */
export function canAccessAdminTools(
  activeRole: UserRole,
  demoAdminFlag = false,
): boolean {
  return activeRole === 'admin' || demoAdminFlag === true;
}

