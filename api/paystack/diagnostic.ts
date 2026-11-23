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
  let rpcStatus = 'not_checked';
  let paymentEventsSummary: any = null;
  let walletsCount = -1;

  if (supabaseUrl && supabaseSec) {
    const sUrl = supabaseUrl.replace(/\/$/, '');
    try {
      const response = await fetch(
        `${sUrl}/rest/v1/payment_events?select=reference,status,amount_naira,credited_coins,created_at&order=created_at.desc&limit=5`,
        {
          headers: { apikey: supabaseSec, Authorization: `Bearer ${supabaseSec}` },
        },
      );
      if (response.ok) {
        const events = (await response.json()) as any[];
        supabaseDbStatus = 'connected';
        paymentEventsSummary = events.map((e) => ({
          reference: e.reference ? `${String(e.reference).slice(0, 10)}...` : null,
          status: e.status,
          amount_naira: e.amount_naira,
          credited_coins: e.credited_coins,
          created_at: e.created_at,
        }));
      } else {
        supabaseDbStatus = `http_${response.status}`;
      }
    } catch (e) {
      supabaseDbStatus = `error: ${e instanceof Error ? e.message : 'unreachable'}`;
    }

    // Check RPC settle_paystack_funding
    try {
      const rpcCheck = await fetch(`${sUrl}/rest/v1/rpc/settle_paystack_funding`, {
        method: 'POST',
        headers: { apikey: supabaseSec, Authorization: `Bearer ${supabaseSec}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const rpcText = await rpcCheck.text();
      // If the function exists, PostgREST returns 400 with a parameter error or function signature error.
      // If it DOES NOT exist, PostgREST returns 404 with "Could not find the function".
      if (rpcCheck.status === 404 || rpcText.includes('Could not find')) {
        rpcStatus = 'missing_rpc (settle_paystack_funding does not exist in public schema)';
      } else {
        rpcStatus = `exists (status: ${rpcCheck.status}, msg: ${rpcText.slice(0, 120)})`;
      }
    } catch (e) {
      rpcStatus = `error: ${e instanceof Error ? e.message : 'unreachable'}`;
    }

    // Check wallets table
    try {
      const wCheck = await fetch(`${sUrl}/rest/v1/wallets?select=user_id`, {
        headers: { apikey: supabaseSec, Authorization: `Bearer ${supabaseSec}`, Range: '0-0', Prefer: 'count=exact' },
      });
      const range = wCheck.headers.get('content-range') || '';
      walletsCount = range.includes('/') ? parseInt(range.split('/')[1] || '-1', 10) : -1;
    } catch {
      // Ignore count error
    }
  }

  // Ping Paystack API and inspect recent transactions
  let paystackApiStatus = 'not_checked';
  let recentPaystackTransactions: any = null;
  if (paystackSec) {
    try {
      const response = await fetch('https://api.paystack.co/transaction?perPage=3', {
        headers: { Authorization: `Bearer ${paystackSec}` },
      });
      const data = (await response.json()) as {
        status?: boolean;
        message?: string;
        data?: Array<{
          status?: string;
          reference?: string;
          amount?: number;
          metadata?: any;
          paid_at?: string;
        }>;
      };
      if (response.ok && data.status) {
        paystackApiStatus = 'connected';
        recentPaystackTransactions = (data.data || []).map((t) => ({
          status: t.status,
          reference: t.reference ? `${t.reference.slice(0, 12)}...` : null,
          amount_kobo: t.amount,
          amount_naira: typeof t.amount === 'number' ? t.amount / 100 : null,
          has_user_id: Boolean(t.metadata?.showmelove_user_id),
          paid_at: t.paid_at,
        }));
      } else {
        paystackApiStatus = `declined: ${data.message || response.status}`;
      }
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
        supabaseRpcSettle: rpcStatus,
        paystackApi: paystackApiStatus,
      },
      dataSummary: {
        paymentEventsRecent: paymentEventsSummary,
        walletsTotalCount: walletsCount,
        recentPaystackTransactions,
      },
    }),
  );
}
