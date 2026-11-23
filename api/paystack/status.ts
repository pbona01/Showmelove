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

  try {
    const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim().replace(/\/$/, '');
    const supabaseSecret = (process.env.SUPABASE_SECRET_KEY || '').trim();

    if (!supabaseUrl || !supabaseSecret) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify({ status: 'pending' }));
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/payment_events?reference=eq.${encodeURIComponent(reference)}&select=status&limit=1`,
      {
        headers: {
          apikey: supabaseSecret,
          Authorization: `Bearer ${supabaseSecret}`,
        },
      },
    );

    if (!response.ok) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify({ status: 'pending' }));
    }

    const rows = (await response.json()) as Array<{ status: string }>;
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ status: rows[0]?.status || 'pending' }));
  } catch {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ status: 'pending' }));
  }
}
