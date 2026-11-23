import { json, required } from './_shared';
export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
  const reference = String(req.query?.reference || '');
  if (!reference) return json(res, 400, { error: 'Missing reference' });
  try {
    const base = required('SUPABASE_URL').replace(/\/$/, ''); const secret = required('SUPABASE_SECRET_KEY');
    const response = await fetch(`${base}/rest/v1/payment_events?reference=eq.${encodeURIComponent(reference)}&select=status&limit=1`, { headers: { apikey: secret, Authorization: `Bearer ${secret}` } });
    const rows = await response.json() as Array<{ status: string }>;
    return json(res, 200, { status: rows[0]?.status || 'pending' });
  } catch { return json(res, 200, { status: 'pending' }); }
}

