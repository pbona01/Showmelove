import type {
  DemoBankAccount,
  GiftCatalogItem,
  ShowmeloveStoreState,
} from '../types/showmelove';

/**
 * Product catalogue defaults. These are app configuration, not user/demo data.
 */
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

const EMPTY_BANK_ACCOUNT: DemoBankAccount = {
  bankName: '',
  accountNumber: '',
  accountName: '',
};

/**
 * A genuinely empty store for a new user. Balances, gifts, transactions,
 * payout requests and platform fees must originate from real backend events.
 */
export function createInitialStoreState(): ShowmeloveStoreState {
  return {
    activeRole: 'guest',
    signedInEmail: '',
    signedInName: 'Guest',
    activeSeasonalCollection: 'valentines',
    seasonalDropEnabled: true,
    catalog: INITIAL_CATALOG.map((item) => ({ ...item })),
    gifts: [],
    processedCheckoutIds: [],
    walletsByEmail: {},
    payoutRequests: [],
    sprayTransactions: [],
    feeTransactions: [],
    adminMasterWallet: {
      loveCoinsBalance: 0,
      totalGuestGiftFees: 0,
      totalFundingFees: 0,
      totalSprayFees: 0,
    },
    defaultBankAccount: { ...EMPTY_BANK_ACCOUNT },
  };
}
