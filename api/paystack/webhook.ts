import crypto from 'crypto';

export const config = {
  api: {
    bodyParser: false,
  },
};

function reply(res: any, status: number, body: Record<string, unknown>) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.end(JSON.stringify(body));
}

async function readRawBody(req: any): Promise<string> {
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

function verifySignature(raw: string, signature: string | undefined, secret: string): boolean {
  if (!signature || !secret) return false;
  try {
    const expected = crypto.createHmac('sha512', secret).update(raw).digest('hex').toLowerCase();
    const actual = signature.trim().toLowerCase();
    const actualBuffer = Buffer.from(actual);
    const expectedBuffer = Buffer.from(expected);
    return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

async function resolveUserId(
  metadataUserId: string | undefined,
  customerEmail: string | undefined,
  supabaseUrl: string,
  supabaseSecret: string,
): Promise<string | null> {
  if (metadataUserId && metadataUserId.trim()) return metadataUserId.trim();
  if (!customerEmail || !supabaseUrl || !supabaseSecret) return null;
  try {
    const adminRes = await fetch(
      `${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(customerEmail)}`,
      {
        headers: { apikey: supabaseSecret, Authorization: `Bearer ${supabaseSecret}` },
      },
    );
    if (adminRes.ok) {
      const data = (await adminRes.json()) as { users?: Array<{ id: string }> };
      if (data.users?.[0]?.id) return data.users[0].id;
    }
  } catch {
    // Ignore lookup error
  }
  return null;
}

async function settleFunding(
  supabaseUrl: string,
  supabaseSecret: string,
  reference: string,
  userId: string,
  amountNaira: number,
  gatewayFeeNaira: number,
): Promise<{ status: string; credited_coins: number; idempotent?: boolean }> {
  // Settlement is intentionally handled by one locked database function.
  // Do not add a browser or REST fallback: duplicate delivery is normal for
  // payment webhooks and must remain transactionally idempotent.
  const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/settle_paystack_funding`, {
    method: 'POST',
    headers: {
      apikey: supabaseSecret,
      Authorization: `Bearer ${supabaseSecret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      p_reference: reference,
      p_user_id: userId,
      p_amount_naira: amountNaira,
      p_gateway_fee_naira: gatewayFeeNaira,
    }),
  });

  if (!rpcRes.ok) {
    const detail = await rpcRes.text().catch(() => '');
    throw new Error(`Funding settlement failed (${rpcRes.status}). ${detail.slice(0, 180)}`);
  }

  const settlement = await rpcRes.json() as {
    status?: string;
    credited_coins?: number;
    idempotent?: boolean;
  };

  if (settlement.status !== 'succeeded' || !Number.isFinite(settlement.credited_coins)) {
    throw new Error('Funding settlement returned an invalid result.');
  }

  return {
    status: 'succeeded',
    credited_coins: Number(settlement.credited_coins),
    idempotent: Boolean(settlement.idempotent),
  };
}

async function settleDirectGift(
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

  const recipientUsername = String(metadata.recipient_username || giftData.recipientUsername || '').replace(/^@/, '');
  const recipientEmail = String(metadata.recipient_email || giftData.recipientEmail || '').toLowerCase();
  const recipientName = metadata.recipient_name || giftData.recipientName || (recipientUsername ? `@${recipientUsername}` : 'You');
  const senderName = metadata.sender_name || giftData.senderName || 'A Friend';
  const senderEmail = payment.customer?.email || giftData.senderEmail || undefined;

  const creditedCoins = Math.floor(amountNaira * 0.93);
  const platformFee = amountNaira - creditedCoins;

  // 1. Check idempotency
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

  // 3. Find recipient in auth.users
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

  // 4. Update recipient wallet
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

  // 5. Payment event
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

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-paystack-signature, paystack-signature');
    return res.end();
  }

  if (req.method !== 'POST') return reply(res, 405, { error: 'Method not allowed' });

  try {
    const raw = await readRawBody(req);
    const signature = String(req.headers['x-paystack-signature'] || req.headers['paystack-signature'] || '');
    const paystackSecret = (process.env.PAYSTACK_SECRET_KEY || '').trim();
    const webhookSecret = (process.env.PAYSTACK_WEBHOOK_SECRET || '').trim() || paystackSecret;

    if (!webhookSecret) {
      return reply(res, 500, { error: 'Missing PAYSTACK_SECRET_KEY in server environment' });
    }

    const isValid = verifySignature(raw, signature, webhookSecret) || verifySignature(raw, signature, paystackSecret);
    if (!isValid) {
      return reply(res, 401, { error: 'Invalid webhook signature' });
    }

    const event = JSON.parse(raw) as { event?: string; data?: { reference?: string } };

    // Handle Paystack Transfer webhook events (Withdrawals / Payouts)
    if (event.event === 'transfer.success' || event.event === 'transfer.failed' || event.event === 'transfer.reversed') {
      const transferData = event.data as any;
      const transferReference = transferData?.reference || '';
      const transferStatus = event.event === 'transfer.success' ? 'completed' : 'failed';
      return reply(res, 200, { received: true, transferReference, transferStatus });
    }

    if (event.event !== 'charge.success' || !event.data?.reference) {
      return reply(res, 200, { received: true, ignored: true });
    }

    const reference = event.data.reference;

    // Independently verify transaction with Paystack before crediting
    const verifyResponse = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${paystackSecret}` },
    });

    const verifyPayload = (await verifyResponse.json()) as {
      status?: boolean;
      data?: {
        status?: string;
        reference?: string;
        amount?: number;
        fees?: number;
        metadata?: { showmelove_user_id?: string };
        customer?: { email?: string };
      };
    };

    const payment = verifyPayload.data;
    if (
      !verifyResponse.ok ||
      !verifyPayload.status ||
      payment?.status !== 'success' ||
      payment.reference !== reference ||
      typeof payment.amount !== 'number' ||
      !Number.isInteger(payment.amount)
    ) {
      return reply(res, 400, { error: 'Unverified Paystack event' });
    }

    // Settle in Supabase
    const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim().replace(/\/$/, '');
    const supabaseSecret = (process.env.SUPABASE_SECRET_KEY || '').trim();

    if (!supabaseUrl || !supabaseSecret) {
      return reply(res, 500, { error: 'Missing SUPABASE_URL or SUPABASE_SECRET_KEY in server environment' });
    }

    // Direct Gift Webhook settlement
    if ((payment.metadata as any)?.payment_type === 'direct_gift') {
      const giftSettlement = await settleDirectGift(supabaseUrl, supabaseSecret, payment);
      return reply(res, 200, { received: true, giftSettlement });
    }

    const userId = await resolveUserId(payment.metadata?.showmelove_user_id, payment.customer?.email, supabaseUrl, supabaseSecret);
    if (!userId) {
      return reply(res, 400, { error: 'Cannot resolve user ID for settlement' });
    }

    const amountNaira = Math.floor(payment.amount / 100);
    const gatewayFeeNaira = Math.max(0, Math.floor(Number(payment.fees || 0) / 100));
    const settlement = await settleFunding(
      supabaseUrl,
      supabaseSecret,
      payment.reference,
      userId,
      amountNaira,
      gatewayFeeNaira,
    );

    return reply(res, 200, { received: true, settlement });
  } catch (error) {
    return reply(res, 500, { error: error instanceof Error ? error.message : 'Webhook processing failed' });
  }
}
