export type GiftArtworkId = 'little-heart' | 'rose' | 'teddy-hug' | 'gift-box';

export type GiftAnimationType = 'pulse' | 'bloom' | 'wave' | 'confetti-open';

export type CollectionId = 'evergreen' | 'valentines';

export type EmoteOption = 'none' | 'heart-burst' | 'rose-petals' | 'sparkle-hug' | 'party-confetti';

export type UserRole = 'guest' | 'sender' | 'recipient' | 'admin';
export type SprayLayoutId = 'classic' | 'figo' | 'usd' | 'btc' | 'waso';

export interface DemoUser {
  id: string;
  role: UserRole;
  displayName: string;
  email: string;
}

export interface GiftCatalogItem {
  id: string;
  artworkId: GiftArtworkId;
  name: string;
  tagline: string;
  defaultPriceNaira: number;
  collectionId: CollectionId;
  themeColor: string;
  accentColor: string;
  animationType: GiftAnimationType;
  available: boolean;
}

export interface GiftSnapshot {
  catalogId: string;
  artworkId: GiftArtworkId;
  name: string;
  priceNaira: number;
  animationType: GiftAnimationType;
  themeColor: string;
  accentColor: string;
}

export type PromiseCardStyle =
  | 'silk-crimson'
  | 'royal-plum'
  | 'midnight-indigo'
  | 'rose-velvet'
  | 'parchment-ribbon';

export interface SentGift {
  id: string;
  checkoutAttemptId: string;
  createdAt: string;
  senderName: string;
  senderEmail?: string;
  recipientName: string;
  recipientEmail: string;
  promiseText: string;
  promiseCardStyle?: PromiseCardStyle;
  messageText?: string;
  emote: EmoteOption;
  amountNaira: number;
  coinsSpent: number;
  platformFeeNaira: number;
  recipientEarningsNaira: number;
  hasVoiceNote: boolean;
  voiceNoteSource: 'none' | 'sample' | 'recorded';
  voiceNoteBlobKey?: string;
  voiceNoteDurationSec?: number;
  snapshot: GiftSnapshot;
  revealedAt?: string;
  claimedAt?: string;
  claimedByEmail?: string;
  isBundledSample?: boolean;
}

export interface CoinTransaction {
  id: string;
  createdAt: string;
  type: 'purchase' | 'spend' | 'spray_received' | 'seed';
  coinsDelta: number;
  amountNaira: number;
  description: string;
  relatedGiftId?: string;
}

export type FeeType = 'guest_gift' | 'funding' | 'spray';

export interface FeeTransaction {
  id: string;
  createdAt: string;
  type: FeeType;
  coins: number;
  description: string;
  relatedId?: string;
}

export interface AdminMasterWallet {
  loveCoinsBalance: number;
  totalGuestGiftFees: number;
  totalFundingFees: number;
  totalSprayFees: number;
}

export interface SprayTransaction {
  id: string;
  createdAt: string;
  senderEmail: string;
  recipientEmail: string;
  layoutId: SprayLayoutId;
  grossCoins: number;
  recipientCoins: number;
  feeCoins: number;
}

export interface EarningsTransaction {
  id: string;
  createdAt: string;
  type: 'claim' | 'payout_reserve' | 'payout_complete' | 'payout_refund';
  amountNaira: number;
  description: string;
  relatedId?: string;
}

export interface DemoBankAccount {
  id?: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export type PayoutStatus = 'pending' | 'completed' | 'failed';

export interface PayoutRequest {
  id: string;
  createdAt: string;
  resolvedAt?: string;
  recipientEmail: string;
  amountNaira: number;
  feeNaira: number;
  netAmountNaira: number;
  bankAccount: DemoBankAccount;
  status: PayoutStatus;
  failureReason?: string;
}

export interface WalletState {
  loveCoinsBalance: number;
  availableEarningsNaira: number;
  reservedEarningsNaira: number;
  coinTransactions: CoinTransaction[];
  earningsTransactions: EarningsTransaction[];
}

export interface ShowmeloveStoreState {
  activeRole: UserRole;
  signedInEmail: string;
  signedInName: string;
  activeSeasonalCollection: CollectionId;
  seasonalDropEnabled: boolean;
  catalog: GiftCatalogItem[];
  gifts: SentGift[];
  processedCheckoutIds: string[];
  walletsByEmail: Record<string, WalletState>;
  payoutRequests: PayoutRequest[];
  defaultBankAccount: DemoBankAccount;
  sprayTransactions: SprayTransaction[];
  feeTransactions: FeeTransaction[];
  adminMasterWallet: AdminMasterWallet;
}
