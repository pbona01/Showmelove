import { createHmac, timingSafeEqual } from 'node:crypto';

export function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing server environment variable: ${name}`);
  return value;
}

export function json(res: any, status: number, body: unknown) {
  res.status(status).setHeader('Content-Type', 'application/json').send(JSON.stringify(body));
}

export async function readRawBody(req: any): Promise<string> {
  if (typeof req.body === 'string') return req.body;
  if (req.body && typeof req.body === 'object') return JSON.stringify(req.body);
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

export function validWebhookSignature(raw: string, signature: string | undefined): boolean {
  if (!signature) return false;
  // Older Paystack projects sign with the API secret; newer projects may expose a
  // dedicated webhook secret. Prefer the dedicated value but stay compatible.
  const secret = process.env.PAYSTACK_WEBHOOK_SECRET?.trim() || required('PAYSTACK_SECRET_KEY');
  const expected = createHmac('sha512', secret).update(raw).digest('hex');
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

export async function getSupabaseUser(accessToken: string) {
  const base = required('SUPABASE_URL').replace(/\/$/, '');
  const publishable = required('SUPABASE_PUBLISHABLE_KEY');
  const response = await fetch(`${base}/auth/v1/user`, { headers: { apikey: publishable, Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) return null;
  return response.json() as Promise<{ id: string; email?: string }>;
}

export async function supabaseRpc(name: string, body: unknown) {
  const base = required('SUPABASE_URL').replace(/\/$/, '');
  const secret = required('SUPABASE_SECRET_KEY');
  const response = await fetch(`${base}/rest/v1/rpc/${name}`, { method: 'POST', headers: { apikey: secret, Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`Supabase RPC ${name} failed (${response.status}).`);
  return response.json();
}

