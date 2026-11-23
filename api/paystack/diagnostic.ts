// Safe diagnostic endpoint: confirms environment configuration and external service reachability
// WITHOUT EVER REVEALING SECRET KEY VALUES.
export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  }

  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const supabasePub = (
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    ''
  ).trim();
  const supabaseSec = (process.env.SUPABASE_SECRET_KEY || '').trim();
  const paystackSec = (process.env.PAYSTACK_SECRET_KEY || '').trim();
  const paystackPub = (process.env.VITE_PAYSTACK_PUBLIC_KEY || '').trim();
  const paystackCallback = (process.env.PAYSTACK_CALLBACK_URL || '').trim();

  // Validate format safely without showing the secret
  let paystackMode = 'missing';
  if (paystackSec) {
    if (paystackSec.startsWith('sk_test_')) {
      paystackMode = 'sk_test_*** (valid test mode)';
    } else if (paystackSec.startsWith('sk_live_')) {
      paystackMode = 'sk_live_*** (valid live mode)';
    } else {
      paystackMode = 'invalid_prefix (must start with sk_test_ or sk_live_)';
    }
  }

  // Ping Supabase public endpoint
  let supabaseAuthStatus = 'not_checked';
  if (supabaseUrl && supabasePub) {
    try {
      const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/settings`, {
        headers: { apikey: supabasePub },
      });
      supabaseAuthStatus = response.ok ? 'connected' : `http_${response.status}`;
    } catch (e) {
      supabaseAuthStatus = `error: ${e instanceof Error ? e.message : 'unreachable'}`;
    }
  }

  // Ping Supabase database with service secret
  let supabaseDbStatus = 'not_checked';
  if (supabaseUrl && supabaseSec) {
    try {
      const response = await fetch(
        `${supabaseUrl.replace(/\/$/, '')}/rest/v1/payment_events?select=reference&limit=1`,
        {
          headers: { apikey: supabaseSec, Authorization: `Bearer ${supabaseSec}` },
        },
      );
      supabaseDbStatus = response.ok ? 'connected' : `http_${response.status}`;
    } catch (e) {
      supabaseDbStatus = `error: ${e instanceof Error ? e.message : 'unreachable'}`;
    }
  }

  // Ping Paystack API
  let paystackApiStatus = 'not_checked';
  if (paystackSec) {
    try {
      const response = await fetch('https://api.paystack.co/integration/payment_session_timeout', {
        headers: { Authorization: `Bearer ${paystackSec}` },
      });
      const data = (await response.json()) as { status?: boolean; message?: string };
      paystackApiStatus = response.ok && data.status ? 'connected' : `declined: ${data.message || response.status}`;
    } catch (e) {
      paystackApiStatus = `error: ${e instanceof Error ? e.message : 'unreachable'}`;
    }
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.end(
    JSON.stringify({
      status: 'ok',
      service: 'showmelove-paystack-api',
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      cryptoRandomUUID: typeof globalThis.crypto?.randomUUID === 'function',
      variablesPresent: {
        SUPABASE_URL: Boolean(supabaseUrl),
        SUPABASE_PUBLISHABLE_KEY: Boolean(supabasePub),
        SUPABASE_SECRET_KEY: Boolean(supabaseSec),
        PAYSTACK_SECRET_KEY: Boolean(paystackSec),
        PAYSTACK_SECRET_KEY_MODE: paystackMode,
        PAYSTACK_CALLBACK_URL: paystackCallback || 'https://showmelove.fun/payments/verify',
        VITE_PAYSTACK_PUBLIC_KEY: Boolean(paystackPub),
      },
      connectivity: {
        supabaseAuth: supabaseAuthStatus,
        supabaseDatabase: supabaseDbStatus,
        paystackApi: paystackApiStatus,
      },
    }),
  );
}
