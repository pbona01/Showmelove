// Kept self-contained deliberately: Vercel loads this as an isolated function.
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

  let reference = String(req.query?.reference || '');
  if (!reference && req.url) {
    try {
      const parsed = new URL(req.url, 'https://showmelove.fun');
      reference = parsed.searchParams.get('reference') || '';
    } catch {
      // Ignore URL parse error
    }
  }

  if (!reference) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ error: 'Missing reference' }));
  }

  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim().replace(/\/$/, '');
  const supabaseSecret = (process.env.SUPABASE_SECRET_KEY || '').trim();
  const paystackSecret = (process.env.PAYSTACK_SECRET_KEY || '').trim();

  const send = (status: number, data: any) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(data));
  };

  try {
    // 1. Check if payment_events already has a settled record
    if (supabaseUrl && supabaseSecret) {
      try {
        const dbRes = await fetch(
          `${supabaseUrl}/rest/v1/payment_events?reference=eq.${encodeURIComponent(reference)}&select=status,credited_coins,user_id&limit=1`,
          {
            headers: {
              apikey: supabaseSecret,
              Authorization: `Bearer ${supabaseSecret}`,
            },
          },
        );
        if (dbRes.ok) {
          const rows = (await dbRes.json()) as Array<{ status: string; credited_coins?: number }>;
          if (rows[0]?.status === 'succeeded') {
            return send(200, {
              status: 'succeeded',
              credited_coins: rows[0].credited_coins,
              alreadySettled: true,
            });
          }
        }
      } catch {
        // Fall through to Paystack verification
      }
    }

    // 2. If not yet settled in DB, verify directly with Paystack API
    if (paystackSecret) {
      const verifyRes = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
        {
          headers: { Authorization: `Bearer ${paystackSecret}` },
        },
      );

      const verifyData = (await verifyRes.json()) as {
        status?: boolean;
        message?: string;
        data?: {
          status?: string;
          reference?: string;
          amount?: number;
          gateway_response?: string;
          metadata?: { showmelove_user_id?: string };
          customer?: { email?: string };
        };
      };

      const payment = verifyData.data;

      if (verifyRes.ok && verifyData.status && payment) {
        if (payment.status === 'success') {
          let userId = payment.metadata?.showmelove_user_id;

          // Fallback: If showmelove_user_id is missing in metadata, resolve user from authorization header
          if (!userId && supabaseUrl) {
            const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
            if (token) {
              const publishableKey = (
                process.env.SUPABASE_PUBLISHABLE_KEY ||
                process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
                ''
              ).trim();
              if (publishableKey) {
                const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
                  headers: { apikey: publishableKey, Authorization: `Bearer ${token}` },
                });
                if (userRes.ok) {
                  const u = (await userRes.json()) as { id?: string };
                  if (u?.id) userId = u.id;
                }
              }
            }
          }

          if (userId && supabaseUrl && supabaseSecret) {
            const amountNaira = Math.floor(Number(payment.amount || 0) / 100);
            const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/settle_paystack_funding`, {
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

            if (rpcRes.ok) {
              const settlement = (await rpcRes.json()) as { credited_coins?: number };
              return send(200, {
                status: 'succeeded',
                credited_coins: settlement?.credited_coins,
                settledLive: true,
              });
            } else {
              const rpcErr = await rpcRes.text();
              console.error('settle_paystack_funding error:', rpcErr);
            }
          }

          return send(200, { status: 'succeeded', pendingDbSettlement: true });
        } else if (payment.status === 'failed' || payment.status === 'reversed') {
          return send(200, { status: 'failed', message: payment.gateway_response || 'Payment declined' });
        } else {
          return send(200, { status: 'pending', paystackStatus: payment.status });
        }
      }
    }

    return send(200, { status: 'pending' });
  } catch (err) {
    return send(200, { status: 'pending', error: err instanceof Error ? err.message : 'Unknown error' });
  }
}
