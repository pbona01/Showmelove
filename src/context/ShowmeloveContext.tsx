import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  CollectionId,
  DemoBankAccount,
  GiftCatalogItem,
  SentGift,
  SprayLayoutId,
  ShowmeloveStoreState,
  UserRole,
  WalletState,
} from '../types/showmelove';
import {
  buyLoveCoins,
  claimGiftIdempotent,
  createPaidGiftIdempotent,
  ensureWallet,
  markGiftRevealed as applyMarkGiftRevealed,
  normalizeEmail,
  requestWithdrawal,
  resolveWithdrawal,
  settleLoveCoinSpray,
  type ClaimResult,
  type ComposeGiftDraft,
  type CheckoutResult,
} from '../services/giftRules';
import { BUNDLED_SAMPLE_GIFT, DEMO_USERS } from '../services/seedData';
import { showmeloveStorage } from '../services/storage';
import { audioStorage } from '../services/audioStorage';
import {
  fetchSharedGiftFromSupabase,
  publishGiftToSupabase,
} from '../services/supabaseBridge';

interface ShowmeloveContextValue {
  state: ShowmeloveStoreState;
  currentWallet: WalletState;
  switchRole: (role: UserRole) => void;
  signInDemoEmail: (email: string, displayName?: string) => void;
  resetDemo: () => Promise<void>;
  submitCheckout: (draft: ComposeGiftDraft) => CheckoutResult;
  purchaseLoveCoins: (coins: number) => { ok: boolean; error?: string };
  sprayLoveCoins: (input: { coins: number; recipientEmail: string; layoutId: SprayLayoutId }) => { ok: boolean; error?: string };
  markGiftRevealed: (giftId: string) => void;
  claimGift: (giftId: string, overrideEmail?: string) => ClaimResult;
  getGiftById: (giftId: string) => SentGift | undefined;
  resolveGiftAsync: (giftId: string) => Promise<SentGift | undefined>;
  submitWithdrawal: (
    amountNaira: number,
    bankAccount: DemoBankAccount,
  ) => { ok: boolean; error?: string; payoutId?: string };
  resolvePayout: (
    payoutId: string,
    outcome: 'completed' | 'failed',
    reason?: string,
  ) => { ok: boolean; error?: string };
  updateDefaultBankAccount: (bankAccount: DemoBankAccount) => void;
  updateCatalogItem: (id: string, patch: Partial<GiftCatalogItem>) => void;
  setSeasonalConfig: (collection: CollectionId, enabled: boolean) => void;
}

const ShowmeloveContext = createContext<ShowmeloveContextValue | null>(null);

export function ShowmeloveProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ShowmeloveStoreState>(() => showmeloveStorage.load());
  const stateRef = useRef<ShowmeloveStoreState>(state);
  stateRef.current = state;

  const commitNext = useCallback((next: ShowmeloveStoreState) => {
    stateRef.current = next;
    showmeloveStorage.save(next);
    setState(next);
  }, []);

  useEffect(() => {
    const unsubscribe = showmeloveStorage.subscribeCrossTab((externalState) => {
      stateRef.current = externalState;
      setState(externalState);
    });
    return unsubscribe;
  }, []);

  const switchRole = useCallback(
    (role: UserRole) => {
      const prev = stateRef.current;
      if (role === 'guest') {
        commitNext({
          ...prev,
          activeRole: 'guest',
          signedInEmail: '',
          signedInName: 'Guest',
        });
        return;
      }
      const user = DEMO_USERS[role];
      commitNext({
        ...prev,
        activeRole: role,
        signedInEmail: user.email,
        signedInName: user.displayName,
      });
    },
    [commitNext],
  );

  const signInDemoEmail = useCallback(
    (email: string, displayName?: string) => {
      const normalized = normalizeEmail(email);
      const prev = stateRef.current;
      commitNext({
        ...prev,
        activeRole:
          normalized === DEMO_USERS.admin.email
            ? 'admin'
            : normalized === DEMO_USERS.sender.email
              ? 'sender'
              : 'recipient',
        signedInEmail: normalized,
        signedInName: displayName?.trim() || normalized.split('@')[0] || 'Demo User',
      });
    },
    [commitNext],
  );

  const resetDemo = useCallback(async () => {
    await audioStorage.clearAll().catch(() => undefined);
    const fresh = showmeloveStorage.reset();
    stateRef.current = fresh;
    setState(fresh);
  }, []);

  const submitCheckout = useCallback(
    (draft: ComposeGiftDraft): CheckoutResult => {
      const result = createPaidGiftIdempotent(stateRef.current, draft);
      commitNext(result.nextState);
      if (result.ok && result.gift && !result.alreadyProcessed) {
        void publishGiftToSupabase(result.gift);
      }
      return result;
    },
    [commitNext],
  );

  const purchaseLoveCoins = useCallback(
    (coins: number): { ok: boolean; error?: string } => {
      const txId = `ctx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const now = new Date().toISOString();
      const prev = stateRef.current;
      const res = buyLoveCoins(prev, prev.signedInEmail, coins, txId, now);
      commitNext(res.nextState);
      return { ok: res.ok, error: res.error };
    },
    [commitNext],
  );

  const sprayLoveCoins = useCallback(
    (input: { coins: number; recipientEmail: string; layoutId: SprayLayoutId }): { ok: boolean; error?: string } => {
      const prev = stateRef.current;
      const email = normalizeEmail(prev.signedInEmail);
      if (!email) return { ok: false, error: 'Sign in to spray Love Coins.' };
      const result = settleLoveCoinSpray(prev, {
        id: `spray_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        createdAt: new Date().toISOString(),
        senderEmail: email,
        recipientEmail: input.recipientEmail,
        layoutId: input.layoutId,
        grossCoins: input.coins,
      });
      if (result.ok) commitNext(result.nextState);
      return { ok: result.ok, error: result.error };
    },
    [commitNext],
  );

  const markGiftRevealed = useCallback(
    (giftId: string) => {
      const now = new Date().toISOString();
      const prev = stateRef.current;
      const next = applyMarkGiftRevealed(prev, giftId, now);
      if (next !== prev) {
        commitNext(next);
      }
    },
    [commitNext],
  );

  const claimGift = useCallback(
    (giftId: string, overrideEmail?: string): ClaimResult => {
      const now = new Date().toISOString();
      const prev = stateRef.current;
      const emailToUse = overrideEmail ?? prev.signedInEmail;
      const result = claimGiftIdempotent(prev, giftId, emailToUse, now);
      commitNext(result.nextState);
      return result;
    },
    [commitNext],
  );

  const getGiftById = useCallback(
    (giftId: string): SentGift | undefined => {
      const found = state.gifts.find((g) => g.id === giftId);
      if (found) return found;
      if (giftId === BUNDLED_SAMPLE_GIFT.id) return BUNDLED_SAMPLE_GIFT;
      return undefined;
    },
    [state.gifts],
  );

  const resolveGiftAsync = useCallback(
    async (giftId: string): Promise<SentGift | undefined> => {
      const local = getGiftById(giftId);
      if (local) return local;
      const remote = await fetchSharedGiftFromSupabase(giftId);
      if (remote) {
        const prev = stateRef.current;
        if (!prev.gifts.some((g) => g.id === remote.id)) {
          commitNext({
            ...prev,
            gifts: [remote, ...prev.gifts],
          });
        }
        return remote;
      }
      return undefined;
    },
    [commitNext, getGiftById],
  );

  const submitWithdrawal = useCallback(
    (amountNaira: number, bankAccount: DemoBankAccount) => {
      const payoutId = `pay_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const now = new Date().toISOString();
      const prev = stateRef.current;
      const res = requestWithdrawal(
        prev,
        prev.signedInEmail,
        amountNaira,
        bankAccount,
        payoutId,
        now,
      );
      commitNext(res.nextState);
      return { ok: res.ok, error: res.error, payoutId: res.payout?.id };
    },
    [commitNext],
  );

  const resolvePayout = useCallback(
    (payoutId: string, outcomeStatus: 'completed' | 'failed', reason?: string) => {
      const now = new Date().toISOString();
      const res = resolveWithdrawal(
        stateRef.current,
        payoutId,
        outcomeStatus,
        now,
        reason,
      );
      commitNext(res.nextState);
      return { ok: res.ok, error: res.error };
    },
    [commitNext],
  );

  const updateDefaultBankAccount = useCallback(
    (bankAccount: DemoBankAccount) => {
      const prev = stateRef.current;
      commitNext({
        ...prev,
        defaultBankAccount: { ...bankAccount },
      });
    },
    [commitNext],
  );

  const updateCatalogItem = useCallback(
    (id: string, patch: Partial<GiftCatalogItem>) => {
      const prev = stateRef.current;
      commitNext({
        ...prev,
        catalog: prev.catalog.map((item) =>
          item.id === id ? { ...item, ...patch } : item,
        ),
      });
    },
    [commitNext],
  );

  const setSeasonalConfig = useCallback(
    (collection: CollectionId, enabled: boolean) => {
      const prev = stateRef.current;
      commitNext({
        ...prev,
        activeSeasonalCollection: collection,
        seasonalDropEnabled: enabled,
      });
    },
    [commitNext],
  );

  const currentWallet = useMemo(
    () => ensureWallet(state.walletsByEmail, state.signedInEmail),
    [state.walletsByEmail, state.signedInEmail],
  );

  const value = useMemo<ShowmeloveContextValue>(
    () => ({
      state,
      currentWallet,
      switchRole,
      signInDemoEmail,
      resetDemo,
      submitCheckout,
      purchaseLoveCoins,
      sprayLoveCoins,
      markGiftRevealed,
      claimGift,
      getGiftById,
      resolveGiftAsync,
      submitWithdrawal,
      resolvePayout,
      updateDefaultBankAccount,
      updateCatalogItem,
      setSeasonalConfig,
    }),
    [
      state,
      currentWallet,
      switchRole,
      signInDemoEmail,
      resetDemo,
      submitCheckout,
      purchaseLoveCoins,
      sprayLoveCoins,
      markGiftRevealed,
      claimGift,
      getGiftById,
      resolveGiftAsync,
      submitWithdrawal,
      resolvePayout,
      updateDefaultBankAccount,
      updateCatalogItem,
      setSeasonalConfig,
    ],
  );

  return <ShowmeloveContext.Provider value={value}>{children}</ShowmeloveContext.Provider>;
}

export function useShowmelove() {
  const ctx = useContext(ShowmeloveContext);
  if (!ctx) {
    throw new Error('useShowmelove must be used inside ShowmeloveProvider');
  }
  return ctx;
}
