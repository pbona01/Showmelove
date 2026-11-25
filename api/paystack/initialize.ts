// Kept self-contained deliberately: Vercel loads this as an isolated function.
function reply(res: any, status: number, body: Record<string, unknown>) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.end(JSON.stringify(body));
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing Vercel environment variable: ${name}`);
  return value;
}

async function readBody(req: any): Promise<any> {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  if (Buffer.isBuffer(req.body)) {
    try {
      return JSON.parse(req.body.toString('utf8'));
    } catch {
      return {};
    }
  }
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk: any) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

function generateReference(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return `sml_${globalThis.crypto.randomUUID().replace(/-/g, '')}`;
  }
  const random = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  return `sml_${Date.now().toString(36)}${random}`.slice(0, 32);
}

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.end();
  }

  if (req.method !== 'POST') return reply(res, 405, { error: 'Method not allowed' });

  try {
    const body = await readBody(req);
    const isDirectGift = body?.paymentType === 'direct_gift' || Boolean(body?.giftData);
    const paystackSecret = required('PAYSTACK_SECRET_KEY');
    const reference = generateReference();
    const callbackBase = process.env.PAYSTACK_CALLBACK_URL?.replace(/\/$/, '') || 'https://showmelove.fun/payments/verify';

    // DIRECT GIFT (GUEST OR REGISTERED GIVER SENDING LOVE)
    if (isDirectGift) {
      const giftData = body?.giftData || {};
      const amountNaira = Math.round(Number(body?.amountNaira || giftData?.amountNaira || 0));
      if (!Number.isInteger(amountNaira) || amountNaira < 10) {
        return reply(res, 400, { error: 'Gift amount must be at least 10 Love Coins.' });
      }

      const cleanRecipient = String(giftData.recipientUsername || giftData.recipientName || '').replace(/^@/, '');
      const customerEmail = String(
        body?.email ||
        giftData?.senderEmail ||
        (cleanRecipient ? `${cleanRecipient}.fan@showmelove.fun` : 'guest@showmelove.fun')
      ).trim().toLowerCase();

      const giftId = String(giftData.giftId || reference);
      const callbackUrl = `${callbackBase}?reference=${encodeURIComponent(reference)}&type=gift&giftId=${encodeURIComponent(giftId)}`;

      const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: customerEmail,
          amount: amountNaira * 100, // Paystack amount is in kobo
          reference,
          callback_url: callbackUrl,
          metadata: {
            payment_type: 'direct_gift',
            gift_id: giftId,
            recipient_username: cleanRecipient,
            recipient_email: String(giftData.recipientEmail || '').toLowerCase(),
            recipient_name: giftData.recipientName || (cleanRecipient ? `@${cleanRecipient}` : 'You'),
            sender_name: giftData.senderName || 'A Friend',
            amount_naira: amountNaira,
            gift_data: giftData,
          },
        }),
      });

      const payload = (await paystackResponse.json()) as {
        status?: boolean;
        message?: string;
        data?: { authorization_url?: string };
      };

      if (!paystackResponse.ok || !payload.status || !payload.data?.authorization_url) {
        return reply(res, 502, {
          error: payload.message || 'Paystack could not start gift checkout. Confirm PAYSTACK_SECRET_KEY is configured.',
        });
      }

      return reply(res, 200, { reference, authorizationUrl: payload.data.authorization_url });
    }

    // WALLET COIN FUNDING (REQUIRES SIGNED-IN USER SESSION)
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) return reply(res, 401, { error: 'Your session is missing. Sign in again before checkout.' });

    const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim().replace(/\/$/, '');
    const publishableKey = (
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      ''
    ).trim();

    if (!supabaseUrl || !publishableKey) {
      return reply(res, 500, { error: 'Supabase configuration is missing in Vercel environment variables.' });
    }

    const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: publishableKey, Authorization: `Bearer ${token}` },
    });
    if (!authResponse.ok) return reply(res, 401, { error: 'Your sign-in session has expired. Sign in again and retry.' });

    const user = (await authResponse.json()) as { id?: string; email?: string };
    if (!user.id || !user.email) return reply(res, 401, { error: 'Your account is missing an email address.' });

    const amountNaira = Math.round(Number(body?.amountNaira));
    if (!Number.isInteger(amountNaira) || amountNaira < 100 || amountNaira > 500000) {
      return reply(res, 400, { error: 'Choose a funding amount between 100 and 500,000 Love Coins.' });
    }

    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
        amount: amountNaira * 100, // Paystack amount is in kobo
        reference,
        callback_url: `${callbackBase}?reference=${encodeURIComponent(reference)}`,
        metadata: { showmelove_user_id: user.id, payment_type: 'wallet_funding' },
      }),
    });

    const payload = (await paystackResponse.json()) as {
      status?: boolean;
      message?: string;
      data?: { authorization_url?: string };
    };

    if (!paystackResponse.ok || !payload.status || !payload.data?.authorization_url) {
      return reply(res, 502, {
        error: payload.message || 'Paystack could not start checkout. Confirm PAYSTACK_SECRET_KEY is an sk_ key.',
      });
    }

    return reply(res, 200, { reference, authorizationUrl: payload.data.authorization_url });
  } catch (error) {
    return reply(res, 500, { error: error instanceof Error ? error.message : 'Checkout could not start.' });
  }
}
