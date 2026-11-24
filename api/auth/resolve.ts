// Serverless resolver: maps a Showmelove username to its account email for password sign-in
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

  const rawUsername = String(req.query?.username || '').trim().replace(/^@/, '').toLowerCase();
  if (!rawUsername) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ error: 'Missing username parameter' }));
  }

  // Pre-configured well-known usernames & admin shortcuts
  const WELL_KNOWN_MAP: Record<string, string> = {
    pbona: 'pbona717@gmail.com',
    pbona717: 'pbona717@gmail.com',
    '1virtue1x': '1virtue1x@gmail.com',
    virtue: '1virtue1x@gmail.com',
    ada: 'ada@showmelove.ng',
    tunde: 'tunde@showmelove.ng',
  };

  if (WELL_KNOWN_MAP[rawUsername]) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ username: rawUsername, email: WELL_KNOWN_MAP[rawUsername] }));
  }

  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim().replace(/\/$/, '');
  const supabaseSecret = (process.env.SUPABASE_SECRET_KEY || '').trim();

  if (supabaseUrl && supabaseSecret) {
    try {
      const uRes = await fetch(`${supabaseUrl}/auth/v1/admin/users?per_page=100`, {
        headers: {
          apikey: supabaseSecret,
          Authorization: `Bearer ${supabaseSecret}`,
          'Content-Type': 'application/json',
        },
      });

      if (uRes.ok) {
        const uData = (await uRes.json()) as { users?: Array<{ id: string; email?: string; user_metadata?: any }> };
        const match = (uData.users || []).find((u) => {
          const metaUser = String(u.user_metadata?.username || '').toLowerCase();
          const emailPrefix = String(u.email || '').split('@')[0].toLowerCase();
          return metaUser === rawUsername || emailPrefix === rawUsername;
        });

        if (match?.email) {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          return res.end(JSON.stringify({ username: rawUsername, email: match.email }));
        }
      }
    } catch {
      // Fall through
    }
  }

  res.statusCode = 404;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.end(JSON.stringify({ error: `Username @${rawUsername} not found.` }));
}
