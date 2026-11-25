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
import { supabase } from '../lib/supabase';
import {
  fetchIncomingGiftsForUser,
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
  sprayLoveCoins: (input: { coins: number; recipientEmail?: string; layoutId: SprayLayoutId }) => { ok: boolean; error?: string };
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
  updateUserProfile: (profile: { displayName?: string; username?: string }) => Promise<void>;
  refreshLiveWallet: (userId?: string, email?: string) => Promise<void>;
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

  // Real Supabase sessions are the source of identity in production. The demo role
  // remains only as an offline-preview fallback; it is never used by Paystack APIs.
  const refreshLiveWallet = useCallback(
    async (userId?: string, email?: string) => {
      try {
        let targetUserId = userId;
        let targetEmail = email;
        if (supabase && (!targetUserId || !targetEmail)) {
          const { data: sessionData } = await supabase.auth.getSession();
          targetUserId = sessionData?.session?.user?.id;
          targetEmail = sessionData?.session?.user?.email;
        }
        if (!targetEmail) {
          targetEmail = stateRef.current.signedInEmail;
        }
        if (!targetEmail) return;

        const normEmail = normalizeEmail(targetEmail);
        const prev = stateRef.current;
        const current = ensureWallet(prev.walletsByEmail, normEmail);

        let nextGifts = [...prev.gifts];
        let balanceChanged = false;
        let nextLoveCoins = current.loveCoinsBalance;
        let nextEarnings = current.availableEarningsNaira;
        const nextCoinTx = [...current.coinTransactions];
        const nextEarnTx = [...current.earningsTransactions];

        // 1. Sync live wallet balance from Supabase wallets table
        if (supabase && targetUserId) {
          const { data: walletData, error } = await supabase
            .from('wallets')
            .select('love_coins_balance')
            .eq('user_id', targetUserId)
            .maybeSingle();

          if (!error && walletData && typeof walletData.love_coins_balance === 'number') {
            if (current.loveCoinsBalance !== walletData.love_coins_balance) {
              nextLoveCoins = walletData.love_coins_balance;
              balanceChanged = true;
            }
          }
        }

        // 2. Cross-device gift sync: fetch all incoming gifts addressed to this user from Supabase
        const targetUsername = normEmail.split('@')[0];
        const incomingGifts = await fetchIncomingGiftsForUser(normEmail, targetUsername);
        if (incomingGifts.length > 0) {
          for (const gift of incomingGifts) {
            if (!nextGifts.some((g) => g.id === gift.id)) {
              nextGifts = [gift, ...nextGifts];
              balanceChanged = true;

              // Credit the gifted coins / earnings if not already credited in transactions
              const txId = `ctx_gift_${gift.id}`;
              if (!nextCoinTx.some((t) => t.id === txId) && !nextEarnTx.some((t) => t.id === txId)) {
                const giftCoins = gift.recipientEarningsNaira || Math.floor(gift.amountNaira * 0.93);
                nextLoveCoins += giftCoins;
                nextEarnings += giftCoins;
                nextCoinTx.unshift({
                  id: txId,
                  createdAt: gift.createdAt,
                  type: 'spend',
                  coinsDelta: giftCoins,
                  amountNaira: gift.amountNaira,
                  description: `Received ${gift.snapshot.name} from ${gift.senderName}`,
                  relatedGiftId: gift.id,
                });
              }
            }
          }
        }

        if (balanceChanged || nextGifts.length !== prev.gifts.length) {
          commitNext({
            ...prev,
            gifts: nextGifts,
            walletsByEmail: {
              ...prev.walletsByEmail,
              [normEmail]: {
                ...current,
                loveCoinsBalance: nextLoveCoins,
                availableEarningsNaira: nextEarnings,
                coinTransactions: nextCoinTx,
                earningsTransactions: nextEarnTx,
              },
            },
          });
        }
      } catch {
        // Fallback gracefully
      }
    },
    [commitNext],
  );

  useEffect(() => {
    let activeUserId = '';
    let activeUserEmail = '';

    const applySession = (session: any) => {
      const email = session?.user?.email;
      const metadata = session?.user?.user_metadata || {};
      const displayName = String(
        metadata.username ||
        metadata.display_name ||
        metadata.full_name ||
        (email ? email.split('@')[0] : '')
      );
      if (email) {
        activeUserId = session?.user?.id || '';
        activeUserEmail = email;
        signInDemoEmail(email, displayName);
        void refreshLiveWallet(activeUserId, email);
      }
    };

    if (supabase) {
      void supabase.auth.getSession().then(({ data }: { data: any }) => {
        applySession(data.session);
      });

      const { data } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
        applySession(session);
      });

      const handleFocus = () => {
        if (activeUserId && activeUserEmail) {
          void refreshLiveWallet(activeUserId, activeUserEmail);
        }
      };
      window.addEventListener('focus', handleFocus);

      // Periodic live background sync every 8 seconds for real-time gift reception
      const syncInterval = window.setInterval(() => {
        if (activeUserEmail) {
          void refreshLiveWallet(activeUserId, activeUserEmail);
        }
      }, 8000);

      return () => {
        data.subscription.unsubscribe();
        window.removeEventListener('focus', handleFocus);
        window.clearInterval(syncInterval);
      };
    } else {
      // Fallback polling for offline/preview environments
      const syncInterval = window.setInterval(() => {
        void refreshLiveWallet();
      }, 8000);
      return () => {
        window.clearInterval(syncInterval);
      };
    }
  }, [refreshLiveWallet, signInDemoEmail]);

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
    (input: { coins: number; recipientEmail?: string; layoutId: SprayLayoutId }): { ok: boolean; error?: string } => {
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
      if (result.ok) {
        commitNext(result.nextState);
        // Persist decreased balance directly to Supabase so window focus never reverts it
        const sb = supabase;
        if (sb) {
          const nextBal = result.nextState.walletsByEmail[email]?.loveCoinsBalance ?? 0;
          void sb.auth.getSession().then(({ data }) => {
            const uid = data?.session?.user?.id;
            if (uid) {
              void sb
                .from('wallets')
                .update({ love_coins_balance: nextBal, updated_at: new Date().toISOString() })
                .eq('user_id', uid);
            }
          });
        }
      }
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

  const updateUserProfile = useCallback(
    async (profile: { displayName?: string; username?: string }) => {
      const prev = stateRef.current;
      const cleanUsername = profile.username
        ? profile.username.trim().replace(/^@/, '').toLowerCase()
        : undefined;
      const cleanName = profile.displayName
        ? profile.displayName.trim()
        : cleanUsername || prev.signedInName;

      commitNext({
        ...prev,
        signedInName: cleanName,
      });

      if (supabase) {
        try {
          await supabase.auth.updateUser({
            data: {
              ...(cleanUsername ? { username: cleanUsername } : {}),
              ...(cleanName ? { display_name: cleanName, full_name: cleanName } : {}),
            },
          });
        } catch {
          // Fallback
        }
      }

      if (cleanUsername && prev.signedInEmail) {
        try {
          const rawMap = localStorage.getItem('showmelove_user_map');
          const map = rawMap ? JSON.parse(rawMap) : {};
          map[cleanUsername] = prev.signedInEmail.toLowerCase();
          localStorage.setItem('showmelove_user_map', JSON.stringify(map));
        } catch {
          // Ignore
        }
      }
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
      updateUserProfile,
      refreshLiveWallet,
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
      updateUserProfile,
      refreshLiveWallet,
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

