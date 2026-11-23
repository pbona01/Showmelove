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
): Promise<{ status: string; credited_coins: number; idempotent?: boolean }> {
  // Check idempotency first
  try {
    const checkRes = await fetch(
      `${supabaseUrl}/rest/v1/payment_events?reference=eq.${encodeURIComponent(reference)}&select=status,credited_coins`,
      {
        headers: { apikey: supabaseSecret, Authorization: `Bearer ${supabaseSecret}` },
      },
    );
    if (checkRes.ok) {
      const rows = (await checkRes.json()) as any[];
      if (rows[0]?.status === 'succeeded') {
        return { status: 'succeeded', credited_coins: rows[0].credited_coins, idempotent: true };
      }
    }
  } catch {
    // Continue
  }

  const v_credit = Math.floor(amountNaira * 0.97);
  const v_fee = amountNaira - v_credit;

  // Attempt 1: Try RPC settle_paystack_funding
  try {
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
      }),
    });
    if (rpcRes.ok) {
      const settlement = (await rpcRes.json()) as any;
      return {
        status: 'succeeded',
        credited_coins: settlement?.credited_coins ?? v_credit,
        idempotent: Boolean(settlement?.idempotent),
      };
    }
  } catch {
    // Continue to fallback
  }

  // Attempt 2: Direct REST fallback via service_role key
  const headers = {
    apikey: supabaseSecret,
    Authorization: `Bearer ${supabaseSecret}`,
    'Content-Type': 'application/json',
  };

  // Upsert payment_events
  await fetch(`${supabaseUrl}/rest/v1/payment_events`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({
      reference,
      user_id: userId,
      amount_naira: amountNaira,
      credited_coins: v_credit,
      fee_coins: v_fee,
      status: 'succeeded',
      settled_at: new Date().toISOString(),
    }),
  }).catch(() => undefined);

  // Update or insert wallets
  try {
    const wRes = await fetch(
      `${supabaseUrl}/rest/v1/wallets?user_id=eq.${encodeURIComponent(userId)}&select=love_coins_balance`,
      { headers },
    );
    const wRows = wRes.ok ? ((await wRes.json()) as any[]) : [];
    if (wRows.length > 0) {
      const currentBal = Number(wRows[0]?.love_coins_balance || 0);
      await fetch(`${supabaseUrl}/rest/v1/wallets?user_id=eq.${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          love_coins_balance: currentBal + v_credit,
          updated_at: new Date().toISOString(),
        }),
      });
    } else {
      await fetch(`${supabaseUrl}/rest/v1/wallets`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify({
          user_id: userId,
          love_coins_balance: v_credit,
          updated_at: new Date().toISOString(),
        }),
      });
    }
  } catch (err) {
    console.error('Wallet balance update error in webhook:', err);
  }

  // Record transactions (best-effort)
  await fetch(`${supabaseUrl}/rest/v1/wallet_transactions`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'resolution=ignore-duplicates' },
    body: JSON.stringify({
      user_id: userId,
      kind: 'paystack_funding',
      coins_delta: v_credit,
      reference,
    }),
  }).catch(() => undefined);

  await fetch(`${supabaseUrl}/rest/v1/platform_fee_transactions`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'resolution=ignore-duplicates' },
    body: JSON.stringify({
      source: 'wallet_funding',
      reference,
      coins: v_fee,
    }),
  }).catch(() => undefined);

  return { status: 'succeeded', credited_coins: v_credit, idempotent: false };
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

    const userId = await resolveUserId(payment.metadata?.showmelove_user_id, payment.customer?.email, supabaseUrl, supabaseSecret);
    if (!userId) {
      return reply(res, 400, { error: 'Cannot resolve user ID for settlement' });
    }

    const amountNaira = Math.floor(payment.amount / 100);
    const settlement = await settleFunding(supabaseUrl, supabaseSecret, payment.reference, userId, amountNaira);

    return reply(res, 200, { received: true, settlement });
  } catch (error) {
    return reply(res, 500, { error: error instanceof Error ? error.message : 'Webhook processing failed' });
  }
}
