// Safe diagnostic endpoint: confirms environment configuration and external service reachability
// WITHOUT EVER REVEALING SECRET KEY VALUES.
async function settleFunding(
  supabaseUrl: string,
  supabaseSecret: string,
  reference: string,
  userId: string,
  amountNaira: number,
): Promise<{ status: string; credited_coins: number; idempotent?: boolean }> {
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

  // Try RPC settle_paystack_funding first
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
    // Continue
  }

  // Direct REST fallback
  const headers = {
    apikey: supabaseSecret,
    Authorization: `Bearer ${supabaseSecret}`,
    'Content-Type': 'application/json',
  };

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
    console.error('Wallet balance update error:', err);
  }

  return { status: 'succeeded', credited_coins: v_credit, idempotent: false };
}

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

  // Admin authorization check: require secret admin key for sensitive metrics, sync, and grants
  const parsedUrl = req.url ? new URL(req.url, 'https://showmelove.fun') : null;
  const adminSecret = (process.env.ADMIN_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY || '').trim();
  const authHeader = String(req.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim();
  const adminKeyHeader = String(req.headers['x-admin-key'] || '').trim();
  const adminKeyQuery = String(parsedUrl?.searchParams.get('admin_key') || req.query?.admin_key || '').trim();

  const providedKey = adminKeyHeader || adminKeyQuery || authHeader;
  const isAuthorized = Boolean(
    adminSecret &&
    providedKey &&
    (providedKey === adminSecret || (paystackSec && providedKey === paystackSec))
  );

  const grantEmail = (parsedUrl?.searchParams.get('grant_email') || req.query?.grant_email || '').trim().toLowerCase();
  const grantCoins = parseInt(parsedUrl?.searchParams.get('grant_coins') || req.query?.grant_coins || '500000', 10);
  const isSyncRequested =
    String(req.query?.sync || '') === '1' ||
    (parsedUrl?.searchParams.get('sync') === '1');

  // Block unauthorized grant or sync attempts immediately
  if ((grantEmail || isSyncRequested) && !isAuthorized) {
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(
      JSON.stringify({
        error: 'Unauthorized: A valid admin key (via x-admin-key header or admin_key parameter) is required for administrative operations.',
      }),
    );
  }

  // If not authorized and just a general health check probe, return safe public status
  if (!isAuthorized) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(
      JSON.stringify({
        status: 'ok',
        service: 'showmelove-paystack-api',
        timestamp: new Date().toISOString(),
        healthy: true,
        protected: true,
        message: 'Operational. Provide admin key in x-admin-key header or admin_key query parameter for detailed metrics.',
      }),
    );
  }

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
  let syncOutcomes: any = null;

  if (paystackSec) {
    try {
      const response = await fetch('https://api.paystack.co/transaction?perPage=5', {
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

        if (isSyncRequested && supabaseUrl && supabaseSec) {
          syncOutcomes = [];
          for (const t of data.data || []) {
            if (t.status === 'success' && t.reference && t.metadata?.showmelove_user_id) {
              const amountNaira = Math.floor(Number(t.amount || 0) / 100);
              const result = await settleFunding(
                supabaseUrl.replace(/\/$/, ''),
                supabaseSec,
                t.reference,
                t.metadata.showmelove_user_id,
                amountNaira,
              );
              syncOutcomes.push({
                reference: `${t.reference.slice(0, 12)}...`,
                amountNaira,
                outcome: result,
              });
            }
          }
        }
      } else {
        paystackApiStatus = `declined: ${data.message || response.status}`;
      }
    } catch (e) {
      paystackApiStatus = `error: ${e instanceof Error ? e.message : 'unreachable'}`;
    }
  }

  // Support direct admin coin grants to a user by email (authorized admin only)
  let grantResult: any = null;

  if (grantEmail && supabaseUrl && supabaseSec) {
    const sUrl = supabaseUrl.replace(/\/$/, '');
    const authHeaders = {
      apikey: supabaseSec,
      Authorization: `Bearer ${supabaseSec}`,
      'Content-Type': 'application/json',
    };
    let targetUserId: string | null = null;
    try {
      const uRes = await fetch(`${sUrl}/auth/v1/admin/users?per_page=100`, { headers: authHeaders });
      if (uRes.ok) {
        const uData = (await uRes.json()) as { users?: Array<{ id: string; email?: string }> };
        const userMatch = (uData.users || []).find((u) => u.email?.toLowerCase() === grantEmail);
        if (userMatch) {
          targetUserId = userMatch.id;
        }
      }
    } catch (e) {
      console.error('Error finding user in auth admin:', e);
    }

    if (!targetUserId) {
      try {
        const createRes = await fetch(`${sUrl}/auth/v1/admin/users`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ email: grantEmail, email_confirm: true }),
        });
        if (createRes.ok) {
          const newUser = (await createRes.json()) as { id: string };
          targetUserId = newUser.id;
        }
      } catch (e) {
        console.error('Error creating user in auth admin:', e);
      }
    }

    if (targetUserId) {
      const restHeaders = {
        apikey: supabaseSec,
        Authorization: `Bearer ${supabaseSec}`,
        'Content-Type': 'application/json',
      };
      let currentCoins = 0;
      try {
        const wRes = await fetch(
          `${sUrl}/rest/v1/wallets?user_id=eq.${encodeURIComponent(targetUserId)}&select=love_coins_balance`,
          { headers: restHeaders },
        );
        if (wRes.ok) {
          const rows = (await wRes.json()) as any[];
          if (rows.length > 0) {
            currentCoins = Number(rows[0]?.love_coins_balance || 0);
          }
        }
      } catch (e) {
        console.error('Error fetching wallet:', e);
      }

      const newBal = Math.max(currentCoins + grantCoins, grantCoins);
      await fetch(`${sUrl}/rest/v1/wallets`, {
        method: 'POST',
        headers: { ...restHeaders, Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify({
          user_id: targetUserId,
          love_coins_balance: newBal,
          updated_at: new Date().toISOString(),
        }),
      }).catch(() => undefined);

      await fetch(`${sUrl}/rest/v1/wallet_transactions`, {
        method: 'POST',
        headers: { ...restHeaders, Prefer: 'resolution=ignore-duplicates' },
        body: JSON.stringify({
          user_id: targetUserId,
          kind: 'admin_grant',
          coins_delta: grantCoins,
          reference: `grant_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        }),
      }).catch(() => undefined);

      grantResult = {
        success: true,
        email: grantEmail,
        user_id: targetUserId,
        previous_balance: currentCoins,
        new_balance: newBal,
        credited_coins: grantCoins,
      };
    } else {
      grantResult = {
        success: false,
        email: grantEmail,
        error: 'User not found or could not be initialized in Supabase auth',
      };
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
        syncOutcomes,
        grantResult,
      },
    }),
  );
}
