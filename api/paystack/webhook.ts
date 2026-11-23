import { json, readRawBody, required, supabaseRpc, validWebhookSignature } from './_shared';

export const config = { api: { bodyParser: false } };
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  try {
    const raw = await readRawBody(req);
    const signature = String(req.headers['paystack-signature'] || req.headers['x-paystack-signature'] || '');
    if (!validWebhookSignature(raw, signature)) return json(res, 401, { error: 'Invalid webhook signature' });
    const event = JSON.parse(raw) as { event?: string; data?: { reference?: string } };
    if (event.event !== 'charge.success' || !event.data?.reference) return json(res, 200, { received: true });
    const verifiedResponse = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(event.data.reference)}`, { headers: { Authorization: `Bearer ${required('PAYSTACK_SECRET_KEY')}` } });
    const verified = await verifiedResponse.json() as { status?: boolean; data?: { status?: string; reference?: string; amount?: number; metadata?: { showmelove_user_id?: string } } };
    const payment = verified.data;
    if (!verifiedResponse.ok || !verified.status || payment?.status !== 'success' || !payment.reference || !payment.metadata?.showmelove_user_id || typeof payment.amount !== 'number' || !Number.isInteger(payment.amount)) return json(res, 400, { error: 'Unverified Paystack event' });
    const amountKobo = payment.amount;
    await supabaseRpc('settle_paystack_funding', { p_reference: payment.reference, p_user_id: payment.metadata.showmelove_user_id, p_amount_naira: Math.floor(amountKobo / 100) });
    return json(res, 200, { received: true });
  } catch (error) { return json(res, 500, { error: error instanceof Error ? error.message : 'Webhook processing failed' }); }
}

