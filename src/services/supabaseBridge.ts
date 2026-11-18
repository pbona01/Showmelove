import type { SentGift } from '../types/showmelove';

/**
 * Clean backend boundary for cross-device gift sharing via Supabase REST + Storage.
 * When VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are omitted (default preview),
 * all operations resolve cleanly with `isConfigured: false` and the app falls back
 * to local browser storage without throwing or blocking any user flow.
 */
const SUPABASE_URL = (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_SUPABASE_URL?.trim() || '';
const SUPABASE_ANON_KEY = (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_SUPABASE_ANON_KEY?.trim() || '';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export interface RemoteSyncResult {
  synced: boolean;
  reason: 'configured_ok' | 'not_configured' | 'network_fallback';
}

function getHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

export async function publishGiftToSupabase(gift: SentGift): Promise<RemoteSyncResult> {
  if (!isSupabaseConfigured) {
    return { synced: false, reason: 'not_configured' };
  }

  try {
    // Store public gift payload without private recipientEmail exposure on public read
    const publicPayload = {
      id: gift.id,
      checkout_attempt_id: gift.checkoutAttemptId,
      created_at: gift.createdAt,
      sender_name: gift.senderName,
      recipient_name: gift.recipientName,
      promise_text: gift.promiseText,
      message_text: gift.messageText ?? null,
      emote: gift.emote,
      amount_naira: gift.amountNaira,
      coins_spent: gift.coinsSpent,
      platform_fee_naira: gift.platformFeeNaira,
      recipient_earnings_naira: gift.recipientEarningsNaira,
      has_voice_note: gift.hasVoiceNote,
      voice_note_source: gift.voiceNoteSource,
      voice_note_duration_sec: gift.voiceNoteDurationSec ?? null,
      snapshot: gift.snapshot,
    };

    const res = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/gifts`, {
      method: 'POST',
      headers: getHeaders({ Prefer: 'resolution=merge-duplicates' }),
      body: JSON.stringify(publicPayload),
    });

    if (!res.ok) {
      return { synced: false, reason: 'network_fallback' };
    }
    return { synced: true, reason: 'configured_ok' };
  } catch {
    return { synced: false, reason: 'network_fallback' };
  }
}

export async function fetchSharedGiftFromSupabase(giftId: string): Promise<SentGift | null> {
  if (!isSupabaseConfigured || !giftId || giftId === 'sample') {
    return null;
  }

  try {
    const res = await fetch(
      `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/gifts?id=eq.${encodeURIComponent(giftId)}&select=*`,
      {
        headers: getHeaders(),
      },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<Record<string, unknown>>;
    const row = rows[0];
    if (!row) return null;

    return {
      id: String(row.id),
      checkoutAttemptId: String(row.checkout_attempt_id ?? ''),
      createdAt: String(row.created_at ?? new Date().toISOString()),
      senderName: String(row.sender_name ?? 'A friend'),
      recipientName: String(row.recipient_name ?? 'You'),
      recipientEmail: String(row.recipient_email ?? ''),
      promiseText: String(row.promise_text ?? 'A little love from me to you.'),
      messageText: row.message_text ? String(row.message_text) : undefined,
      emote: (row.emote as SentGift['emote']) || 'heart-burst',
      amountNaira: Number(row.amount_naira ?? 1000),
      coinsSpent: Number(row.coins_spent ?? 1000),
      platformFeeNaira: Number(row.platform_fee_naira ?? 200),
      recipientEarningsNaira: Number(row.recipient_earnings_naira ?? 800),
      hasVoiceNote: Boolean(row.has_voice_note),
      voiceNoteSource: (row.voice_note_source as SentGift['voiceNoteSource']) || 'none',
      voiceNoteDurationSec: row.voice_note_duration_sec ? Number(row.voice_note_duration_sec) : undefined,
      snapshot: row.snapshot as SentGift['snapshot'],
      claimedAt: row.claimed_at ? String(row.claimed_at) : undefined,
    };
  } catch {
    return null;
  }
}
