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

    // Settle in Supabase via RPC using server secret
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
    const rpcResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/settle_paystack_funding`, {
      method: 'POST',
      headers: {
        apikey: supabaseSecret,
        Authorization: `Bearer ${supabaseSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_reference: payment.reference,
        p_user_id: userId,
        p_amount_naira: amountNaira,
      }),
    });

    if (!rpcResponse.ok) {
      const rpcError = await rpcResponse.text();
      return reply(res, 500, { error: `Supabase settlement RPC failed: ${rpcError}` });
    }

    const settlement = await rpcResponse.json();
    return reply(res, 200, { received: true, settlement });
  } catch (error) {
    return reply(res, 500, { error: error instanceof Error ? error.message : 'Webhook processing failed' });
  }
}
