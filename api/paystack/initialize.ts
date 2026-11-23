// Kept self-contained deliberately: Vercel loads this as an isolated function.
function reply(res: any, status: number, body: Record<string, unknown>) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing Vercel environment variable: ${name}`);
  return value;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return reply(res, 405, { error: 'Method not allowed' });
  try {
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) return reply(res, 401, { error: 'Your session is missing. Sign in again before checkout.' });
    const supabaseUrl = required('SUPABASE_URL').replace(/\/$/, '');
    const publishableKey = required('SUPABASE_PUBLISHABLE_KEY');
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: publishableKey, Authorization: `Bearer ${token}` } });
    if (!authResponse.ok) return reply(res, 401, { error: 'Your sign-in session has expired. Sign in again and retry.' });
    const user = await authResponse.json() as { id?: string; email?: string };
    if (!user.id || !user.email) return reply(res, 401, { error: 'Your account is missing an email address.' });
    const amountNaira = Math.round(Number(req.body?.amountNaira));
    if (!Number.isInteger(amountNaira) || amountNaira < 100 || amountNaira > 500000) return reply(res, 400, { error: 'Choose a funding amount between 100 and 500,000 Love Coins.' });
    const reference = `sml_${globalThis.crypto.randomUUID().replace(/-/g, '')}`;
    const callbackBase = process.env.PAYSTACK_CALLBACK_URL?.replace(/\/$/, '') || 'https://showmelove.fun/payments/verify';
    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', { method: 'POST', headers: { Authorization: `Bearer ${required('PAYSTACK_SECRET_KEY')}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: user.email, amount: amountNaira * 100, reference, callback_url: `${callbackBase}?reference=${encodeURIComponent(reference)}`, metadata: { showmelove_user_id: user.id } }) });
    const paystack = await paystackResponse.json() as { status?: boolean; message?: string; data?: { authorization_url?: string } };
    if (!paystackResponse.ok || !paystack.status || !paystack.data?.authorization_url) return reply(res, 502, { error: paystack.message || 'Paystack could not start checkout. Confirm PAYSTACK_SECRET_KEY is an sk_ key.' });
    return reply(res, 200, { reference, authorizationUrl: paystack.data.authorization_url });
  } catch (error) { return reply(res, 500, { error: error instanceof Error ? error.message : 'Checkout could not start.' }); }
}

