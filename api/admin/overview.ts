function json(res: any, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing server environment variable: ${name}`);
  return value;
}

async function request(url: string, headers: Record<string, string>, extraHeaders: Record<string, string> = {}) {
  const response = await fetch(url, { headers: { ...headers, ...extraHeaders } });
  if (!response.ok) throw new Error(`Supabase request failed (${response.status}).`);
  return response.json();
}

async function requestAll(url: string, headers: Record<string, string>) {
  const pageSize = 1000;
  const records: any[] = [];
  for (let start = 0; ; start += pageSize) {
    const page = await request(url, headers, { Range: `${start}-${start + pageSize - 1}` }) as any[];
    records.push(...page);
    if (page.length < pageSize) return records;
  }
}

const number = (value: unknown) => Number(value || 0);

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  try {
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) return json(res, 401, { error: 'Sign in as an admin first.' });

    const base = required('SUPABASE_URL').replace(/\/$/, '');
    const publishable = process.env.SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || '';
    const secret = required('SUPABASE_SECRET_KEY');
    if (!publishable) throw new Error('Missing server environment variable: SUPABASE_PUBLISHABLE_KEY');

    const userResponse = await fetch(`${base}/auth/v1/user`, {
      headers: { apikey: publishable, Authorization: `Bearer ${token}` },
    });
    if (!userResponse.ok) return json(res, 401, { error: 'Your session has expired. Sign in again.' });
    const user = await userResponse.json() as { id: string };

    const adminHeaders = { apikey: secret, Authorization: `Bearer ${secret}` };
    const roles = await request(`${base}/rest/v1/user_roles?user_id=eq.${encodeURIComponent(user.id)}&select=role`, adminHeaders) as Array<{ role: string }>;
    if (!roles[0] || !['admin', 'super_admin'].includes(roles[0].role)) {
      return json(res, 403, { error: 'This account is not authorised for the admin workspace.' });
    }

    const [authUsers, wallets, successfulPayments, allFees, walletTransactions, gifts] = await Promise.all([
      request(`${base}/auth/v1/admin/users?page=1&per_page=1000`, adminHeaders) as Promise<{ users?: Array<any> }>,
      request(`${base}/rest/v1/wallets?select=user_id,love_coins_balance,withdrawable_gift_coins_balance,reserved_withdrawable_gift_coins_balance,updated_at`, adminHeaders) as Promise<Array<any>>,
      requestAll(`${base}/rest/v1/payment_events?status=eq.succeeded&select=reference,user_id,amount_naira,credited_coins,fee_coins,gateway_fee_naira,settled_at,created_at&order=settled_at.desc`, adminHeaders) as Promise<Array<any>>,
      requestAll(`${base}/rest/v1/platform_fee_transactions?select=id,source,category,reference,coins,gross_fee_coins,gateway_fee_naira,net_profit_naira,created_at&order=created_at.desc`, adminHeaders) as Promise<Array<any>>,
      request(`${base}/rest/v1/wallet_transactions?select=id,user_id,kind,coins_delta,reference,created_at&order=created_at.desc&limit=30`, adminHeaders).catch(() => []) as Promise<Array<any>>,
      request(`${base}/rest/v1/gifts?select=id`, adminHeaders).catch(() => []) as Promise<Array<{ id: string }>>,
    ]);

    const users = authUsers.users || [];
    const emailById = new Map(users.map((item: any) => [item.id, String(item.email || '')]));
    const nameById = new Map(users.map((item: any) => [item.id, String(item.user_metadata?.display_name || item.user_metadata?.full_name || item.user_metadata?.username || item.email || 'Unnamed user')]));
    const feeBySource = allFees.reduce((result: Record<string, number>, item: any) => {
      const source = String(item.source || 'other');
      result[source] = (result[source] || 0) + number(item.coins);
      return result;
    }, {});

    return json(res, 200, {
      generatedAt: new Date().toISOString(),
      totals: {
        users: users.length,
        confirmedUsers: users.filter((item: any) => Boolean(item.email_confirmed_at)).length,
        walletCoins: wallets.reduce((sum, item) => sum + number(item.love_coins_balance), 0),
        withdrawableGiftCoins: wallets.reduce((sum, item) => sum + number(item.withdrawable_gift_coins_balance), 0),
        reservedGiftCoins: wallets.reduce((sum, item) => sum + number(item.reserved_withdrawable_gift_coins_balance), 0),
        fundedNaira: successfulPayments.reduce((sum, item) => sum + number(item.amount_naira), 0),
        creditedCoins: successfulPayments.reduce((sum, item) => sum + number(item.credited_coins), 0),
        platformFeeCoins: allFees.reduce((sum, item) => sum + number(item.gross_fee_coins ?? item.coins), 0),
        gatewayFeeNaira: allFees.reduce((sum, item) => sum + number(item.gateway_fee_naira), 0),
        netProfitNaira: allFees.reduce((sum, item) => sum + number(item.net_profit_naira ?? item.coins), 0),
        gifts: gifts.length,
        fundingCount: successfulPayments.length,
        walletTransactions: walletTransactions.length,
      },
      feeBreakdown: Object.entries(feeBySource).map(([source, coins]) => ({ source, coins })),
      recentUsers: users
        .sort((a: any, b: any) => String(b.created_at).localeCompare(String(a.created_at)))
        .slice(0, 12)
        .map((item: any) => ({
          id: item.id,
          email: item.email || '',
          name: item.user_metadata?.display_name || item.user_metadata?.full_name || item.user_metadata?.username || item.email || 'Unnamed user',
          createdAt: item.created_at,
          confirmedAt: item.email_confirmed_at || null,
          lastSignInAt: item.last_sign_in_at || null,
        })),
      recentPayments: successfulPayments.slice(0, 20).map((item) => ({
        reference: item.reference,
        email: emailById.get(item.user_id) || '',
        name: nameById.get(item.user_id) || '',
        amountNaira: number(item.amount_naira),
        creditedCoins: number(item.credited_coins),
        feeCoins: number(item.fee_coins),
        gatewayFeeNaira: number(item.gateway_fee_naira),
        settledAt: item.settled_at || null,
      })),
      recentFees: allFees.slice(0, 20).map((item: any) => ({
        id: item.id,
        source: item.source || 'other',
        category: item.category || item.source || 'other',
        reference: item.reference || '',
        coins: number(item.gross_fee_coins ?? item.coins),
        gatewayFeeNaira: number(item.gateway_fee_naira),
        netProfitNaira: number(item.net_profit_naira ?? item.coins),
        createdAt: item.created_at || null,
      })),
      recentWalletTransactions: walletTransactions.map((item: any) => ({
        id: item.id,
        userName: nameById.get(item.user_id) || 'Unknown account',
        email: emailById.get(item.user_id) || '',
        kind: item.kind || 'wallet activity',
        coinsDelta: number(item.coins_delta),
        reference: item.reference || '',
        createdAt: item.created_at || null,
      })),
    });
  } catch (error) {
    return json(res, 500, { error: error instanceof Error ? error.message : 'Unable to load live admin data.' });
  }
}
