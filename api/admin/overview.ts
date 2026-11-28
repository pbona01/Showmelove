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

async function request(url: string, headers: Record<string, string>) {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`Supabase request failed (${response.status}).`);
  return response.json();
}

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

    const [authUsers, wallets, payments, fees, gifts] = await Promise.all([
      request(`${base}/auth/v1/admin/users?page=1&per_page=1000`, adminHeaders) as Promise<{ users?: Array<any> }>,
      request(`${base}/rest/v1/wallets?select=user_id,love_coins_balance`, adminHeaders) as Promise<Array<{ love_coins_balance: number }>>,
      request(`${base}/rest/v1/payment_events?status=eq.succeeded&select=reference,user_id,amount_naira,credited_coins,fee_coins,settled_at&order=settled_at.desc&limit=8`, adminHeaders) as Promise<Array<any>>,
      request(`${base}/rest/v1/platform_fee_transactions?select=coins`, adminHeaders) as Promise<Array<{ coins: number }>>,
      request(`${base}/rest/v1/gifts?select=id`, adminHeaders).catch(() => []) as Promise<Array<{ id: string }>>,
    ]);

    const users = authUsers.users || [];
    const emailById = new Map(users.map((item: any) => [item.id, String(item.email || '')]));
    const totals = {
      users: users.length,
      confirmedUsers: users.filter((item: any) => Boolean(item.email_confirmed_at)).length,
      walletCoins: wallets.reduce((sum, item) => sum + Number(item.love_coins_balance || 0), 0),
      fundedNaira: payments.reduce((sum, item) => sum + Number(item.amount_naira || 0), 0),
      platformFeeCoins: fees.reduce((sum, item) => sum + Number(item.coins || 0), 0),
      gifts: gifts.length,
    };

    return json(res, 200, {
      generatedAt: new Date().toISOString(),
      totals,
      recentUsers: users
        .sort((a: any, b: any) => String(b.created_at).localeCompare(String(a.created_at)))
        .slice(0, 8)
        .map((item: any) => ({
          id: item.id,
          email: item.email || '',
          name: item.user_metadata?.display_name || item.user_metadata?.full_name || item.user_metadata?.username || item.email || 'Unnamed user',
          createdAt: item.created_at,
          confirmedAt: item.email_confirmed_at || null,
        })),
      recentPayments: payments.map((item) => ({
        reference: item.reference,
        email: emailById.get(item.user_id) || '',
        amountNaira: Number(item.amount_naira || 0),
        creditedCoins: Number(item.credited_coins || 0),
        feeCoins: Number(item.fee_coins || 0),
        settledAt: item.settled_at || null,
      })),
    });
  } catch (error) {
    return json(res, 500, { error: error instanceof Error ? error.message : 'Unable to load live admin data.' });
  }
}
