import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCheckoutSummary,
  calculateWithdrawalSummary,
  COIN_PACKAGES,
  ECONOMY_CONFIG,
  validateGiftAmount,
} from '../config/economy';
import { createInitialStoreState, DEMO_DEFAULT_BANK } from './seedData';
import {
  buyLoveCoins,
  canAccessAdminTools,
  claimGiftIdempotent,
  createPaidGiftIdempotent,
  getDefaultSenderName,
  getSentGiftsForViewer,
  getSentGiftStatus,
  markGiftRevealed,
  requestWithdrawal,
  resolveWithdrawal,
} from './giftRules';

test('economy config validates bounds and computes fee summary accurately', () => {
  assert.equal(validateGiftAmount(99).valid, false);
  assert.equal(validateGiftAmount(100).valid, true);
  assert.equal(validateGiftAmount(100_000).valid, true);
  assert.equal(validateGiftAmount(100_001).valid, false);

  assert.equal(ECONOMY_CONFIG.NAIRA_PER_LOVE_COIN, 1);
  assert.equal(ECONOMY_CONFIG.FUNDING_FEE_BPS, 300);
  assert.equal(ECONOMY_CONFIG.GUEST_GIFT_FEE_BPS, 850);
  assert.equal(ECONOMY_CONFIG.SPRAY_FEE_BPS, 300);

  const refSummary = calculateCheckoutSummary(1000);
  assert.equal(refSummary.amountPaidNaira, 1000);
  assert.equal(refSummary.loveCoinsNeeded, 1000);

  // Coin packages match reference tiers
  assert.deepEqual(
    COIN_PACKAGES.map((p) => p.coins),
    [100, 500, 1000, 5000, 10000],
  );
  assert.equal(COIN_PACKAGES.find((p) => p.popular)?.coins, 500);
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
  assert.equal(first.gift?.recipientEarningsNaira, 4117);
  assert.equal(first.gift?.platformFeeNaira, 383);
  assert.equal(first.gift?.promiseCardStyle, 'silk-crimson');

  const styled = createPaidGiftIdempotent(first.nextState, {
    ...draft,
    checkoutAttemptId: 'chk_attempt_styled_456',
    giftId: 'sml_styled_gift_456',
    promiseCardStyle: 'royal-plum',
  });
  assert.equal(styled.ok, true);
  assert.equal(styled.gift?.promiseCardStyle, 'royal-plum');

  const duplicate = createPaidGiftIdempotent(first.nextState, draft);
  assert.equal(duplicate.ok, true);
  assert.equal(duplicate.alreadyProcessed, true);
  assert.equal(duplicate.nextState.gifts.length, first.nextState.gifts.length);
});

test('unavailable gifts are rejected cleanly at checkout', () => {
  const initial = createInitialStoreState();
  const unavailableItem = { ...initial.catalog[0], available: false };

  const blocked = createPaidGiftIdempotent(initial, {
    checkoutAttemptId: 'chk_unavailable_1',
    giftId: 'sml_unavailable_1',
    createdAt: '2026-11-16T10:00:00.000Z',
    catalogItem: unavailableItem,
    senderName: 'Tunde',
    recipientName: 'Adaeze',
    recipientEmail: 'ada@showmelove.ng',
    promiseText: 'Hi',
    emote: 'heart-burst',
    amountNaira: 1000,
    hasVoiceNote: false,
    voiceNoteSource: 'none',
    paymentMode: 'flutterwave_guest',
  });

  assert.equal(blocked.ok, false);
  assert.match(blocked.error || '', /unavailable/i);
});

test('claiming verifies recipient email, handles wrong recipient, and prevents double credit', () => {
  const initial = createInitialStoreState();
  const beforeEarnings = initial.walletsByEmail['ada@showmelove.ng'].availableEarningsNaira;
  const sampleGiftRewards = initial.gifts.find((g) => g.id === 'sample')!.recipientEarningsNaira;
  assert.equal(sampleGiftRewards, 5000); // 5,000 coins with 0% direct-gift fee = ₦5,000

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
    beforeEarnings + sampleGiftRewards,
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
    beforeEarnings + sampleGiftRewards,
  );
});

test('withdrawal calculates net summary, reserves funds, clears on completion, and refunds on failure', () => {
  const initial = createInitialStoreState();
  const email = 'ada@showmelove.ng';
  const startAvailable = initial.walletsByEmail[email].availableEarningsNaira; // 6000

  const withdrawSummary = calculateWithdrawalSummary(2000);
  assert.equal(withdrawSummary.grossAmountNaira, 2000);
  assert.equal(withdrawSummary.netReceivedNaira, 2000 - withdrawSummary.payoutFeeNaira);

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
    2500,
    DEMO_DEFAULT_BANK,
    'pay_1',
    '2026-11-16T12:01:00.000Z',
  );
  assert.equal(req.ok, true);
  assert.equal(req.payout?.netAmountNaira, calculateWithdrawalSummary(2500).netReceivedNaira);
  assert.equal(req.nextState.walletsByEmail[email].availableEarningsNaira, startAvailable - 2500);
  assert.equal(req.nextState.walletsByEmail[email].reservedEarningsNaira, 2500);

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
    2000,
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
  assert.equal(completed.nextState.walletsByEmail[email].availableEarningsNaira, startAvailable - 2000);
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
    19850,
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
    18350,
  );
});

test('sent gift status transitions from Unclaimed to Revealed to Claimed and filters by viewer', () => {
  const initial = createInitialStoreState();

  const sampleGift = initial.gifts.find((g) => g.id === 'sample')!;
  const claimedSeedGift = initial.gifts.find((g) => g.id === 'sml_seed_teddy_03')!;

  assert.equal(getSentGiftStatus(sampleGift), 'Unclaimed');
  assert.equal(getSentGiftStatus(claimedSeedGift), 'Claimed');

  const revealedState = markGiftRevealed(initial, 'sample', '2026-11-17T10:00:00.000Z');
  assert.equal(
    getSentGiftStatus(revealedState.gifts.find((g) => g.id === 'sample')!),
    'Revealed',
  );
  // Idempotent on second call
  assert.equal(
    markGiftRevealed(revealedState, 'sample', '2026-11-17T10:05:00.000Z'),
    revealedState,
  );

  const claimed = claimGiftIdempotent(
    revealedState,
    'sample',
    'ada@showmelove.ng',
    '2026-11-17T10:10:00.000Z',
  );
  assert.equal(
    getSentGiftStatus(claimed.nextState.gifts.find((g) => g.id === 'sample')!),
    'Claimed',
  );

  // Tunde sees his sent gifts (sample + teddy), Adaeze sees none yet, Guest sees none until creating one
  const tundeSent = getSentGiftsForViewer(claimed.nextState.gifts, 'sender', 'tunde@showmelove.ng');
  assert.deepEqual(
    tundeSent.map((g) => g.id),
    ['sample', 'sml_seed_teddy_03'],
  );
  assert.equal(
    getSentGiftsForViewer(claimed.nextState.gifts, 'recipient', 'ada@showmelove.ng').length,
    0,
  );

  const guestSent = createPaidGiftIdempotent(claimed.nextState, {
    checkoutAttemptId: 'chk_guest_sent_test',
    giftId: 'sml_guest_sent_1',
    createdAt: '2026-11-17T11:00:00.000Z',
    catalogItem: claimed.nextState.catalog[0],
    senderName: 'Guest Friend',
    recipientName: 'Chidi',
    recipientEmail: 'chidi@example.ng',
    promiseText: 'Lunch is on me!',
    emote: 'heart-burst',
    amountNaira: 1500,
    hasVoiceNote: false,
    voiceNoteSource: 'none',
    paymentMode: 'flutterwave_guest',
  });
  const guestVisible = getSentGiftsForViewer(guestSent.nextState.gifts, 'guest', '');
  assert.deepEqual(
    guestVisible.map((g) => g.id),
    ['sml_guest_sent_1'],
  );
});

test('promise card sender default never uses signed-in recipient name', () => {
  assert.equal(getDefaultSenderName('recipient', 'Adaeze Okafor'), '');
  assert.equal(getDefaultSenderName('guest', ''), '');
  assert.equal(getDefaultSenderName('admin', 'Showmelove Admin'), '');
  assert.equal(getDefaultSenderName('sender', 'Tunde Balogun'), 'Tunde Balogun');
});

test('admin tools are hidden for recipient, sender, and guest unless demo admin flag is on', () => {
  assert.equal(canAccessAdminTools('recipient', false), false);
  assert.equal(canAccessAdminTools('sender', false), false);
  assert.equal(canAccessAdminTools('guest', false), false);
  assert.equal(canAccessAdminTools('admin', false), true);
  assert.equal(canAccessAdminTools('recipient', true), true);
});
