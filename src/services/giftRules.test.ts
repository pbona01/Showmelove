import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCheckoutSummary,
  ECONOMY_CONFIG,
  validateGiftAmount,
} from '../config/economy';
import { createInitialStoreState, DEMO_DEFAULT_BANK } from './seedData';
import {
  buyLoveCoins,
  claimGiftIdempotent,
  createPaidGiftIdempotent,
  requestWithdrawal,
  resolveWithdrawal,
} from './giftRules';

test('economy config validates bounds and computes summary accurately', () => {
  assert.equal(validateGiftAmount(99).valid, false);
  assert.equal(validateGiftAmount(100).valid, true);
  assert.equal(validateGiftAmount(100_000).valid, true);
  assert.equal(validateGiftAmount(100_001).valid, false);

  const summary = calculateCheckoutSummary(5000);
  assert.equal(summary.amountPaidNaira, 5000);
  assert.equal(summary.loveCoinsNeeded, Math.ceil(5000 / ECONOMY_CONFIG.NAIRA_PER_LOVE_COIN));
  assert.equal(summary.platformFeeNaira, 0);
  assert.equal(summary.recipientEarningsNaira, 5000);
});

test('checkout is idempotent on double-click or refresh with same checkoutAttemptId', () => {
  const initial = createInitialStoreState();
  const giftItem = initial.catalog[1]; // Rose

  const draft = {
    checkoutAttemptId: 'chk_attempt_unique_123',
    giftId: 'sml_new_gift_123',
    createdAt: '2026-11-16T10:00:00.000Z',
    catalogItem: giftItem,
    senderName: 'Guest Sender',
    recipientName: 'Adaeze',
    recipientEmail: 'ada@showmelove.ng',
    promiseText: "Dinner's on me this weekend.",
    emote: 'rose-petals' as const,
    amountNaira: 4500,
    hasVoiceNote: true,
    voiceNoteSource: 'sample' as const,
    voiceNoteDurationSec: 5,
    paymentMode: 'flutterwave_guest' as const,
  };

  const first = createPaidGiftIdempotent(initial, draft);
  assert.equal(first.ok, true);
  assert.equal(first.alreadyProcessed, undefined);
  assert.equal(first.nextState.gifts.length, initial.gifts.length + 1);

  const duplicate = createPaidGiftIdempotent(first.nextState, draft);
  assert.equal(duplicate.ok, true);
  assert.equal(duplicate.alreadyProcessed, true);
  assert.equal(duplicate.nextState.gifts.length, first.nextState.gifts.length);
});

test('claiming verifies recipient email, handles wrong recipient, and prevents double credit', () => {
  const initial = createInitialStoreState();
  const beforeEarnings = initial.walletsByEmail['ada@showmelove.ng'].availableEarningsNaira;

  const wrongUser = claimGiftIdempotent(
    initial,
    'sample',
    'other@example.com',
    '2026-11-16T11:00:00.000Z',
  );
  assert.equal(wrongUser.ok, false);
  assert.equal(wrongUser.status, 'wrong_recipient');
  assert.equal(
    wrongUser.nextState.walletsByEmail['ada@showmelove.ng'].availableEarningsNaira,
    beforeEarnings,
  );

  const firstClaim = claimGiftIdempotent(
    initial,
    'sample',
    'ADA@showmelove.ng',
    '2026-11-16T11:01:00.000Z',
  );
  assert.equal(firstClaim.ok, true);
  assert.equal(firstClaim.status, 'claimed_now');
  assert.equal(
    firstClaim.nextState.walletsByEmail['ada@showmelove.ng'].availableEarningsNaira,
    beforeEarnings + 5000,
  );

  const secondClaim = claimGiftIdempotent(
    firstClaim.nextState,
    'sample',
    'ada@showmelove.ng',
    '2026-11-16T11:02:00.000Z',
  );
  assert.equal(secondClaim.ok, true);
  assert.equal(secondClaim.status, 'already_claimed');
  assert.equal(
    secondClaim.nextState.walletsByEmail['ada@showmelove.ng'].availableEarningsNaira,
    beforeEarnings + 5000,
  );
});

test('withdrawal reserves funds, clears reservation on completion, and refunds on failure', () => {
  const initial = createInitialStoreState();
  const email = 'ada@showmelove.ng';
  const startAvailable = initial.walletsByEmail[email].availableEarningsNaira; // 7500

  const overLimit = requestWithdrawal(
    initial,
    email,
    startAvailable + 500,
    DEMO_DEFAULT_BANK,
    'pay_over',
    '2026-11-16T12:00:00.000Z',
  );
  assert.equal(overLimit.ok, false);

  const req = requestWithdrawal(
    initial,
    email,
    3000,
    DEMO_DEFAULT_BANK,
    'pay_1',
    '2026-11-16T12:01:00.000Z',
  );
  assert.equal(req.ok, true);
  assert.equal(req.nextState.walletsByEmail[email].availableEarningsNaira, startAvailable - 3000);
  assert.equal(req.nextState.walletsByEmail[email].reservedEarningsNaira, 3000);

  const failed = resolveWithdrawal(
    req.nextState,
    'pay_1',
    'failed',
    '2026-11-16T12:02:00.000Z',
  );
  assert.equal(failed.ok, true);
  assert.equal(failed.nextState.walletsByEmail[email].availableEarningsNaira, startAvailable);
  assert.equal(failed.nextState.walletsByEmail[email].reservedEarningsNaira, 0);

  const req2 = requestWithdrawal(
    failed.nextState,
    email,
    2500,
    DEMO_DEFAULT_BANK,
    'pay_2',
    '2026-11-16T12:03:00.000Z',
  );
  const completed = resolveWithdrawal(
    req2.nextState,
    'pay_2',
    'completed',
    '2026-11-16T12:04:00.000Z',
  );
  assert.equal(completed.ok, true);
  assert.equal(completed.nextState.walletsByEmail[email].availableEarningsNaira, startAvailable - 2500);
  assert.equal(completed.nextState.walletsByEmail[email].reservedEarningsNaira, 0);
});

test('signed-in sender can buy Love Coins and spend coin balance', () => {
  const initial = createInitialStoreState();
  const topup = buyLoveCoins(
    initial,
    'tunde@showmelove.ng',
    5000,
    'ctx_buy_1',
    '2026-11-16T12:10:00.000Z',
  );
  assert.equal(topup.ok, true);
  assert.equal(
    topup.nextState.walletsByEmail['tunde@showmelove.ng'].loveCoinsBalance,
    20000,
  );

  const spent = createPaidGiftIdempotent(topup.nextState, {
    checkoutAttemptId: 'chk_coin_spend_1',
    giftId: 'sml_coin_1',
    createdAt: '2026-11-16T12:11:00.000Z',
    catalogItem: topup.nextState.catalog[0],
    senderName: 'Tunde',
    senderEmail: 'tunde@showmelove.ng',
    recipientName: 'Adaeze',
    recipientEmail: 'ada@showmelove.ng',
    promiseText: 'Coffee treat!',
    emote: 'heart-burst',
    amountNaira: 1500,
    hasVoiceNote: false,
    voiceNoteSource: 'none',
    paymentMode: 'coin_balance',
  });
  assert.equal(spent.ok, true);
  assert.equal(
    spent.nextState.walletsByEmail['tunde@showmelove.ng'].loveCoinsBalance,
    18500,
  );
});
