import type { ShowmeloveStoreState } from '../types/showmelove';
import { BUNDLED_SAMPLE_GIFT, createInitialStoreState } from './seedData';

export const STORAGE_KEY = 'showmelove_demo_state_v1';

/**
 * Storage adapter interface so browser localStorage can be replaced
 * with a shared Supabase / Postgres backend later without changing UI code.
 */
export interface ShowmeloveStorageAdapter {
  load(): ShowmeloveStoreState;
  save(state: ShowmeloveStoreState): void;
  reset(): ShowmeloveStoreState;
  subscribeCrossTab(onExternalUpdate: (next: ShowmeloveStoreState) => void): () => void;
}

function hydrateState(raw: string | null): ShowmeloveStoreState {
  const fallback = createInitialStoreState();
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw) as Partial<ShowmeloveStoreState>;
    const gifts = Array.isArray(parsed.gifts) ? parsed.gifts : fallback.gifts;
    // Always guarantee bundled sample gift exists in state
    const hasSample = gifts.some((g) => g.id === BUNDLED_SAMPLE_GIFT.id);
    return {
      ...fallback,
      ...parsed,
      catalog:
        Array.isArray(parsed.catalog) && parsed.catalog.length > 0
          ? parsed.catalog
          : fallback.catalog,
      gifts: hasSample ? gifts : [BUNDLED_SAMPLE_GIFT, ...gifts],
      processedCheckoutIds: Array.isArray(parsed.processedCheckoutIds)
        ? parsed.processedCheckoutIds
        : fallback.processedCheckoutIds,
      walletsByEmail: parsed.walletsByEmail ?? fallback.walletsByEmail,
      payoutRequests: Array.isArray(parsed.payoutRequests)
        ? parsed.payoutRequests
        : fallback.payoutRequests,
      defaultBankAccount: parsed.defaultBankAccount ?? fallback.defaultBankAccount,
    };
  } catch {
    return fallback;
  }
}

class BrowserStorageAdapter implements ShowmeloveStorageAdapter {
  load(): ShowmeloveStoreState {
    if (typeof window === 'undefined') {
      return createInitialStoreState();
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const hydrated = hydrateState(raw);
    if (!raw) {
      this.save(hydrated);
    }
    return hydrated;
  }

  save(state: ShowmeloveStoreState): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  reset(): ShowmeloveStoreState {
    const fresh = createInitialStoreState();
    this.save(fresh);
    return fresh;
  }

  subscribeCrossTab(onExternalUpdate: (next: ShowmeloveStoreState) => void): () => void {
    if (typeof window === 'undefined') return () => {};
    const handler = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        onExternalUpdate(hydrateState(event.newValue));
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }
}

export const showmeloveStorage: ShowmeloveStorageAdapter = new BrowserStorageAdapter();
