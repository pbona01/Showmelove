import { supabase } from '../lib/supabase';

export interface PromiseCardItem {
  id: string;
  title: string;
  coins: number;
}

export interface UserPromiseCard {
  username: string;
  title: string;
  items: PromiseCardItem[];
  updatedAt?: string;
}

export const DEFAULT_PROMISE_CARD_ITEMS: PromiseCardItem[] = [
  { id: 'item_lunch', title: 'Lunch on you 🍕🥤', coins: 2500 },
  { id: 'item_coffee', title: 'Coffee & sweet treat ☕🥐', coins: 1200 },
  { id: 'item_cinema', title: 'Cinema ticket + popcorn 🍿🎬', coins: 4000 },
  { id: 'item_vip', title: 'Special celebration treat 👑✨', coins: 10000 },
];

const STORAGE_KEY_PREFIX = 'showmelove_promise_card_';

export function encodePromiseCardPayload(card: UserPromiseCard): string {
  try {
    const compact = {
      t: card.title.trim(),
      i: card.items.map((item) => [item.title.trim(), item.coins]),
    };
    return encodeURIComponent(JSON.stringify(compact));
  } catch {
    return '';
  }
}

export function decodePromiseCardPayload(rawParam: string, username: string): UserPromiseCard | null {
  if (!rawParam) return null;
  try {
    const decoded = decodeURIComponent(rawParam);
    const parsed = JSON.parse(decoded);
    const clean = username.replace(/^@/, '').toLowerCase().trim();
    if (parsed && Array.isArray(parsed.i)) {
      const items: PromiseCardItem[] = parsed.i.map((item: any, idx: number) => {
        if (Array.isArray(item)) {
          return {
            id: `item_p_${idx}_${Date.now()}`,
            title: String(item[0] || 'Wishlist Item').trim(),
            coins: Math.max(10, Math.round(Number(item[1]) || 100)),
          };
        }
        return {
          id: `item_p_${idx}_${Date.now()}`,
          title: String(item.title || item.t || 'Wishlist Item').trim(),
          coins: Math.max(10, Math.round(Number(item.coins || item.c) || 100)),
        };
      });
      const card: UserPromiseCard = {
        username: clean,
        title: String(parsed.t || `${clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : 'My'}'s Promise Card`).trim(),
        items,
        updatedAt: new Date().toISOString(),
      };
      // Cache decoded card locally for subsequent reloads
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}${clean}`, JSON.stringify(card));
      } catch {
        // Ignore
      }
      return card;
    }
  } catch {
    // Ignore decode error
  }
  return null;
}

export function getLocalPromiseCard(username: string): UserPromiseCard {
  const clean = username.replace(/^@/, '').toLowerCase().trim();
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${clean}`);
    if (raw) {
      const parsed = JSON.parse(raw) as UserPromiseCard;
      if (parsed && Array.isArray(parsed.items)) {
        return parsed;
      }
    }
  } catch {
    // Ignore storage parse error
  }

  return {
    username: clean,
    title: `${clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : 'My'}'s Promise Card`,
    items: [...DEFAULT_PROMISE_CARD_ITEMS],
  };
}

export async function getUserPromiseCard(username: string, rawCardParam?: string): Promise<UserPromiseCard> {
  const clean = username.replace(/^@/, '').toLowerCase().trim();

  // If card data is provided via link param, decode and prioritize it immediately
  if (rawCardParam) {
    const fromParam = decodePromiseCardPayload(rawCardParam, clean);
    if (fromParam) return fromParam;
  }

  const fallback = getLocalPromiseCard(clean);

  if (!supabase) return fallback;

  try {
    const { data, error } = await supabase
      .from('promise_cards')
      .select('username, title, items, updated_at')
      .eq('username', clean)
      .maybeSingle();

    if (!error && data && Array.isArray(data.items)) {
      const card: UserPromiseCard = {
        username: data.username,
        title: data.title || fallback.title,
        items: data.items as PromiseCardItem[],
        updatedAt: data.updated_at,
      };
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}${clean}`, JSON.stringify(card));
      } catch {
        // Ignore
      }
      return card;
    }
  } catch {
    // Fallback to local
  }

  return fallback;
}

export async function saveUserPromiseCard(card: UserPromiseCard): Promise<{ ok: boolean; error?: string }> {
  const clean = card.username.replace(/^@/, '').toLowerCase().trim();
  const normalized: UserPromiseCard = {
    username: clean,
    title: card.title.trim() || `${clean}'s Promise Card`,
    items: card.items.map((item, idx) => ({
      id: item.id || `item_${idx}_${Date.now()}`,
      title: item.title.trim(),
      coins: Math.max(10, Math.round(Number(item.coins) || 100)),
    })),
    updatedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${clean}`, JSON.stringify(normalized));
  } catch {
    // Ignore
  }

  if (supabase) {
    try {
      const { error } = await supabase.from('promise_cards').upsert(
        {
          username: clean,
          title: normalized.title,
          items: normalized.items,
          updated_at: normalized.updatedAt,
        },
        { onConflict: 'username' }
      );
      if (error) {
        console.warn('Could not save promise card to Supabase:', error.message);
      }
    } catch (err) {
      console.warn('Network error saving promise card to Supabase:', err);
    }
  }

  return { ok: true };
}
