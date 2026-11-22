import { calculateCheckoutSummary } from '../config/economy';
import type {
  DemoBankAccount,
  DemoUser,
  GiftCatalogItem,
  SentGift,
  ShowmeloveStoreState,
} from '../types/showmelove';

export const DEMO_USERS: Record<'sender' | 'recipient' | 'admin', DemoUser> = {
  sender: {
    id: 'usr_sender_tunde',
    role: 'sender',
    displayName: 'Tunde Adeyemi',
    email: 'tunde@showmelove.ng',
  },
  recipient: {
    id: 'usr_recipient_ada',
    role: 'recipient',
    displayName: 'Adaeze Okafor',
    email: 'ada@showmelove.ng',
  },
  admin: {
    id: 'usr_admin_chidi',
    role: 'admin',
    displayName: 'Chidi (Demo Ops)',
    email: 'admin@showmelove.ng',
  },
};

export const DEMO_DEFAULT_BANK: DemoBankAccount = {
  id: 'bank_gtb_ada',
  bankName: 'GTBank Nigeria',
  accountNumber: '0123456789',
  accountName: 'Adaeze Okafor',
};

export const DEMO_BANK_PRESETS: DemoBankAccount[] = [
  DEMO_DEFAULT_BANK,
  {
    id: 'bank_access_ada',
    bankName: 'Access Bank Nigeria',
    accountNumber: '0045819203',
    accountName: 'Adaeze Okafor',
  },
];

export const INITIAL_CATALOG: GiftCatalogItem[] = [
  {
    id: 'gift_little_heart',
    artworkId: 'little-heart',
    name: 'Little Heart',
    tagline: 'Mini hearts gather around our mascot into a glowing heart.',
    defaultPriceNaira: 1000,
    collectionId: 'evergreen',
    themeColor: '#FF176C',
    accentColor: '#4A1830',
    animationType: 'pulse',
    available: true,
  },
  {
    id: 'gift_rose',
    artworkId: 'rose',
    name: 'Velvet Rose',
    tagline: 'A crimson bud rises and blooms petal by petal across the stage.',
    defaultPriceNaira: 2500,
    collectionId: 'valentines',
    themeColor: '#FF2D78',
    accentColor: '#3C1630',
    animationType: 'bloom',
    available: true,
  },
  {
    id: 'gift_teddy_hug',
    artworkId: 'teddy-hug',
    name: 'Teddy Hug',
    tagline: 'A bouncy teddy opens its arms wide to send a glowing heart.',
    defaultPriceNaira: 5000,
    collectionId: 'evergreen',
    themeColor: '#D97B48',
    accentColor: '#33222A',
    animationType: 'wave',
    available: true,
  },
  {
    id: 'gift_box',
    artworkId: 'gift-box',
    name: 'Celebration Box',
    tagline: 'A purple-lit satin gift box opens with ribbons and confetti.',
    defaultPriceNaira: 10000,
    collectionId: 'valentines',
    themeColor: '#A855F7',
    accentColor: '#2B1B46',
    animationType: 'confetti-open',
    available: true,
  },
];

const sampleCheckout = calculateCheckoutSummary(5000);
const roseCheckout = calculateCheckoutSummary(2500);
const teddyCheckout = calculateCheckoutSummary(5000);

/**
 * Bundled sample reveal URL (/gift/sample) that works on every deployment
 * with zero setup or prior storage state.
 */
export const BUNDLED_SAMPLE_GIFT: SentGift = {
  id: 'sample',
  checkoutAttemptId: 'chk_bundled_sample_001',
  createdAt: '2026-11-14T15:30:00.000Z',
  senderName: 'Tunde',
  senderEmail: 'tunde@showmelove.ng',
  recipientName: 'Adaeze',
  recipientEmail: 'ada@showmelove.ng',
  promiseText: "Dinner's on me this weekend — pick any spot in Victoria Island.",
  messageText: 'Thank you for always showing up when it matters most.',
  emote: 'party-confetti',
  amountNaira: sampleCheckout.amountPaidNaira,
  coinsSpent: sampleCheckout.loveCoinsNeeded,
  platformFeeNaira: sampleCheckout.platformFeeNaira,
  recipientEarningsNaira: sampleCheckout.recipientEarningsNaira,
  hasVoiceNote: true,
  voiceNoteSource: 'sample',
  voiceNoteDurationSec: 5,
  isBundledSample: true,
  snapshot: {
    catalogId: 'gift_box',
    artworkId: 'gift-box',
    name: 'Celebration Box',
    priceNaira: 5000,
    animationType: 'confetti-open',
    themeColor: '#A855F7',
    accentColor: '#2B1B46',
  },
};

export function createInitialStoreState(): ShowmeloveStoreState {
  const sampleSeededGifts: SentGift[] = [
    {
      ...BUNDLED_SAMPLE_GIFT,
    },
    {
      id: 'sml_seed_rose_02',
      checkoutAttemptId: 'chk_seed_002',
      createdAt: '2026-11-12T18:10:00.000Z',
      senderName: 'Kemi',
      senderEmail: 'kemi@example.ng',
      recipientName: 'Adaeze',
      recipientEmail: 'ada@showmelove.ng',
      promiseText: 'Coffee and pastries on Friday morning!',
      messageText: 'Congrats on shipping the new campaign!',
      emote: 'rose-petals',
      amountNaira: roseCheckout.amountPaidNaira,
      coinsSpent: roseCheckout.loveCoinsNeeded,
      platformFeeNaira: roseCheckout.platformFeeNaira,
      recipientEarningsNaira: roseCheckout.recipientEarningsNaira,
      hasVoiceNote: true,
      voiceNoteSource: 'sample',
      voiceNoteDurationSec: 5,
      claimedAt: '2026-11-12T18:22:00.000Z',
      claimedByEmail: 'ada@showmelove.ng',
      snapshot: {
        catalogId: 'gift_rose',
        artworkId: 'rose',
        name: 'Velvet Rose',
        priceNaira: 2500,
        animationType: 'bloom',
        themeColor: '#FF2D78',
        accentColor: '#3C1630',
      },
    },
    {
      id: 'sml_seed_teddy_03',
      checkoutAttemptId: 'chk_seed_003',
      createdAt: '2026-11-10T10:05:00.000Z',
      senderName: 'Tunde',
      senderEmail: 'tunde@showmelove.ng',
      recipientName: 'Adaeze',
      recipientEmail: 'ada@showmelove.ng',
      promiseText: 'Uber rides on me all week.',
      messageText: 'Stay safe out there!',
      emote: 'sparkle-hug',
      amountNaira: teddyCheckout.amountPaidNaira,
      coinsSpent: teddyCheckout.loveCoinsNeeded,
      platformFeeNaira: teddyCheckout.platformFeeNaira,
      recipientEarningsNaira: teddyCheckout.recipientEarningsNaira,
      hasVoiceNote: false,
      voiceNoteSource: 'none',
      claimedAt: '2026-11-10T10:30:00.000Z',
      claimedByEmail: 'ada@showmelove.ng',
      snapshot: {
        catalogId: 'gift_teddy_hug',
        artworkId: 'teddy-hug',
        name: 'Teddy Hug',
        priceNaira: 5000,
        animationType: 'wave',
        themeColor: '#D97B48',
        accentColor: '#33222A',
      },
    },
  ];

  const adaezeClaimedTotal =
    roseCheckout.recipientEarningsNaira + teddyCheckout.recipientEarningsNaira;

  return {
    activeRole: 'recipient',
    signedInEmail: DEMO_USERS.recipient.email,
    signedInName: DEMO_USERS.recipient.displayName,
    activeSeasonalCollection: 'valentines',
    seasonalDropEnabled: true,
    catalog: INITIAL_CATALOG.map((item) => ({ ...item })),
    gifts: sampleSeededGifts,
    processedCheckoutIds: ['chk_bundled_sample_001', 'chk_seed_002', 'chk_seed_003'],
    walletsByEmail: {
      [DEMO_USERS.sender.email]: {
        loveCoinsBalance: 15000,
        availableEarningsNaira: 0,
        reservedEarningsNaira: 0,
        coinTransactions: [
          {
            id: 'ctx_seed_spend_03',
            createdAt: '2026-11-10T10:05:00.000Z',
            type: 'spend',
            coinsDelta: -5000,
            amountNaira: 5000,
            description: 'Sent Teddy Hug to Adaeze',
            relatedGiftId: 'sml_seed_teddy_03',
          },
          {
            id: 'ctx_seed_topup_01',
            createdAt: '2026-11-09T09:00:00.000Z',
            type: 'seed',
            coinsDelta: 20000,
            amountNaira: 20000,
            description: 'Seeded Love Coin wallet (demo)',
          },
        ],
        earningsTransactions: [],
      },
      [DEMO_USERS.recipient.email]: {
        loveCoinsBalance: 4000,
        availableEarningsNaira: adaezeClaimedTotal,
        reservedEarningsNaira: 0,
        coinTransactions: [
          {
            id: 'ctx_rec_seed_01',
            createdAt: '2026-11-08T12:00:00.000Z',
            type: 'seed',
            coinsDelta: 4000,
            amountNaira: 4000,
            description: 'Welcome Love Coin balance (demo)',
          },
        ],
        earningsTransactions: [
          {
            id: 'etx_seed_02',
            createdAt: '2026-11-12T18:22:00.000Z',
            type: 'claim',
            amountNaira: roseCheckout.recipientEarningsNaira,
            description: 'Claimed Velvet Rose from Kemi',
            relatedId: 'sml_seed_rose_02',
          },
          {
            id: 'etx_seed_03',
            createdAt: '2026-11-10T10:30:00.000Z',
            type: 'claim',
            amountNaira: teddyCheckout.recipientEarningsNaira,
            description: 'Claimed Teddy Hug from Tunde',
            relatedId: 'sml_seed_teddy_03',
          },
        ],
      },
    },
    payoutRequests: [],
    sprayTransactions: [],
    feeTransactions: [],
    adminMasterWallet: {
      loveCoinsBalance: 0,
      totalGuestGiftFees: 0,
      totalFundingFees: 0,
      totalSprayFees: 0,
    },
    defaultBankAccount: { ...DEMO_DEFAULT_BANK },
  };
}
