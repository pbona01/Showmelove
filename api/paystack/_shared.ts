import crypto from 'crypto';

export function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing server environment variable: ${name}`);
  return value;
}

export function json(res: any, status: number, body: unknown) {
  const payload = JSON.stringify(body);
  if (typeof res.status === 'function') res.status(status);
  else res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (typeof res.send === 'function') res.send(payload);
  else res.end(payload);
}

export async function readRawBody(req: any): Promise<string> {
  if (typeof req.body === 'string') return req.body;
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
  if (req.body && typeof req.body === 'object') return JSON.stringify(req.body);
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

export function validWebhookSignature(raw: string, signature: string | undefined): boolean {
  if (!signature) return false;
  const secret = process.env.PAYSTACK_WEBHOOK_SECRET?.trim() || required('PAYSTACK_SECRET_KEY');
  const expected = crypto.createHmac('sha512', secret).update(raw).digest('hex');
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

export async function getSupabaseUser(accessToken: string) {
  const base = required('SUPABASE_URL').replace(/\/$/, '');
  const publishable = process.env.SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || '';
  const response = await fetch(`${base}/auth/v1/user`, { headers: { apikey: publishable, Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) return null;
  return response.json() as Promise<{ id: string; email?: string }>;
}

export async function supabaseRpc(name: string, body: unknown) {
  const base = required('SUPABASE_URL').replace(/\/$/, '');
  const secret = required('SUPABASE_SECRET_KEY');
  const response = await fetch(`${base}/rest/v1/rpc/${name}`, { method: 'POST', headers: { apikey: secret, Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`Supabase RPC ${name} failed (${response.status}).`);
  return response.json();
}

export async function settleDirectGift(
  supabaseUrl: string,
  supabaseSecret: string,
  payment: {
    reference?: string;
    amount?: number;
    customer?: { email?: string };
    metadata?: Record<string, any>;
  },
): Promise<{ status: string; gift_id: string; credited_coins: number; idempotent?: boolean }> {
  const reference = payment.reference || String(payment.metadata?.gift_id || `sml_ref_${Date.now()}`);
  const metadata = payment.metadata || {};
  const giftData = metadata.gift_data || {};
  const giftId = metadata.gift_id || giftData.giftId || reference;
  const amountNaira = Math.floor(Number(payment.amount || 0) / 100) || Number(metadata.amount_naira || giftData.amountNaira || 0);

  // Recipient details
  const recipientUsername = String(metadata.recipient_username || giftData.recipientUsername || '').replace(/^@/, '');
  const recipientEmail = String(metadata.recipient_email || giftData.recipientEmail || '').toLowerCase();
  const recipientName = metadata.recipient_name || giftData.recipientName || (recipientUsername ? `@${recipientUsername}` : 'You');
  const senderName = metadata.sender_name || giftData.senderName || 'A Friend';
  const senderEmail = payment.customer?.email || giftData.senderEmail || undefined;

  // 7% fee upfront on purchase/gift: recipient receives 93%
  const creditedCoins = Math.floor(amountNaira * 0.93);
  const platformFee = amountNaira - creditedCoins;

  // 1. Check idempotency in payment_events
  try {
    const checkRes = await fetch(
      `${supabaseUrl}/rest/v1/payment_events?reference=eq.${encodeURIComponent(reference)}&select=status,credited_coins`,
      { headers: { apikey: supabaseSecret, Authorization: `Bearer ${supabaseSecret}` } },
    );
    if (checkRes.ok) {
      const rows = (await checkRes.json()) as any[];
      if (rows[0]?.status === 'succeeded') {
        return { status: 'succeeded', gift_id: giftId, credited_coins: rows[0].credited_coins, idempotent: true };
      }
    }
  } catch {
    // Continue
  }

  const headers = {
    apikey: supabaseSecret,
    Authorization: `Bearer ${supabaseSecret}`,
    'Content-Type': 'application/json',
  };

  // 2. Save gift into Supabase public.gifts
  const giftPayload = {
    id: giftId,
    checkout_attempt_id: reference,
    created_at: new Date().toISOString(),
    sender_name: senderName,
    sender_email: senderEmail || null,
    recipient_name: recipientName,
    recipient_email: recipientEmail || null,
    promise_text: giftData.promiseText || 'Showing you love ✨',
    message_text: giftData.messageText || null,
    emote: giftData.emote || 'heart-burst',
    amount_naira: amountNaira,
    coins_spent: amountNaira,
    platform_fee_naira: platformFee,
    recipient_earnings_naira: creditedCoins,
    has_voice_note: Boolean(giftData.hasVoiceNote),
    voice_note_source: giftData.voiceNoteSource || 'none',
    voice_note_duration_sec: giftData.voiceNoteDurationSec || null,
    snapshot: giftData.snapshot || giftData.catalogItem || {
      id: 'gift_card',
      catalogId: 'gift_card',
      artworkId: 'little-heart',
      name: 'Showmelove Gift',
      priceNaira: amountNaira,
      animationType: 'bloom',
      themeColor: '#FF2D78',
      accentColor: '#3C1630',
    },
    claimed_at: null,
    claimed_by_email: null,
  };

  try {
    await fetch(`${supabaseUrl}/rest/v1/gifts`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify(giftPayload),
    });
  } catch (err) {
    console.error('Error inserting gift into Supabase:', err);
  }

  // 3. Find recipient user_id in auth.users (if registered)
  let recipientUserId: string | null = null;
  if (recipientEmail) {
    try {
      const adminRes = await fetch(
        `${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(recipientEmail)}`,
        { headers },
      );
      if (adminRes.ok) {
        const data = (await adminRes.json()) as { users?: Array<{ id: string }> };
        if (data.users?.[0]?.id) recipientUserId = data.users[0].id;
      }
    } catch {
      // Ignore
    }
  }

  // 4. If recipient has a user account, update their wallet in Supabase
  if (recipientUserId) {
    try {
      const wRes = await fetch(
        `${supabaseUrl}/rest/v1/wallets?user_id=eq.${encodeURIComponent(recipientUserId)}&select=love_coins_balance`,
        { headers },
      );
      const wRows = wRes.ok ? ((await wRes.json()) as any[]) : [];
      if (wRows.length > 0) {
        const currentBal = Number(wRows[0]?.love_coins_balance || 0);
        await fetch(`${supabaseUrl}/rest/v1/wallets?user_id=eq.${encodeURIComponent(recipientUserId)}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            love_coins_balance: currentBal + creditedCoins,
            updated_at: new Date().toISOString(),
          }),
        });
      } else {
        await fetch(`${supabaseUrl}/rest/v1/wallets`, {
          method: 'POST',
          headers: { ...headers, Prefer: 'resolution=merge-duplicates' },
          body: JSON.stringify({
            user_id: recipientUserId,
            love_coins_balance: creditedCoins,
            updated_at: new Date().toISOString(),
          }),
        });
      }
    } catch (err) {
      console.error('Error updating recipient wallet in Supabase:', err);
    }
  }

  // 5. Record payment_event (best-effort)
  if (recipientUserId) {
    try {
      await fetch(`${supabaseUrl}/rest/v1/payment_events`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify({
          reference,
          user_id: recipientUserId,
          amount_naira: amountNaira,
          credited_coins: creditedCoins,
          fee_coins: platformFee,
          status: 'succeeded',
          settled_at: new Date().toISOString(),
        }),
      });
    } catch {
      // Ignore
    }
  }

  return { status: 'succeeded', gift_id: giftId, credited_coins: creditedCoins, idempotent: false };
}
