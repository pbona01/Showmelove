import { randomUUID } from 'node:crypto';
import { getSupabaseUser, json, required } from './_shared';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  try {
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const user = token ? await getSupabaseUser(token) : null;
    if (!user?.email) return json(res, 401, { error: 'Sign in before funding your wallet.' });
    const amountNaira = Math.round(Number(req.body?.amountNaira));
    if (!Number.isInteger(amountNaira) || amountNaira < 100 || amountNaira > 500000) return json(res, 400, { error: 'Choose a funding amount between 100 and 500,000 Love Coins.' });
    const reference = `sml_${randomUUID().replace(/-/g, '')}`;
    const callbackUrl = process.env.PAYSTACK_CALLBACK_URL || `${String(req.headers.origin || 'https://showmelove.fun').replace(/\/$/, '')}/payments/verify`;
    const paystack = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST', headers: { Authorization: `Bearer ${required('PAYSTACK_SECRET_KEY')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, amount: amountNaira * 100, reference, callback_url: `${callbackUrl}?reference=${encodeURIComponent(reference)}`, metadata: { showmelove_user_id: user.id } }),
    });
    const payload = await paystack.json() as { status?: boolean; message?: string; data?: { authorization_url?: string; access_code?: string } };
    if (!paystack.ok || !payload.status || !payload.data?.authorization_url) return json(res, 502, { error: payload.message || 'Paystack could not start this payment.' });
    return json(res, 200, { reference, authorizationUrl: payload.data.authorization_url });
  } catch (error) { return json(res, 500, { error: error instanceof Error ? error.message : 'Could not start payment.' }); }
}

