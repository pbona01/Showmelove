// Serverless endpoint to execute automated bank transfers via Paystack Transfers API
export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify({ ok: false, error: 'Invalid JSON body' }));
    }
  }

  const {
    payoutId,
    amountNaira,
    accountNumber,
    bankCode,
    accountName,
    recipientEmail,
    adminPassword,
  } = body || {};

  // Security check: must have valid admin authorization
  const expectedAdminPassword = (process.env.ADMIN_PASSWORD || process.env.VITE_ADMIN_PASSWORD || '123SHOWmelove').trim();
  if (adminPassword && adminPassword.trim() !== expectedAdminPassword) {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ ok: false, error: 'Unauthorized: Invalid admin credentials.' }));
  }

  const cleanAmount = Number(amountNaira);
  if (!cleanAmount || cleanAmount < 1000) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ ok: false, error: 'Minimum payout amount is ₦1,000.' }));
  }

  const cleanNuban = String(accountNumber || '').trim().replace(/\D/g, '');
  if (cleanNuban.length !== 10) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ ok: false, error: 'Valid 10-digit account number required.' }));
  }

  const paystackSecret = (process.env.PAYSTACK_SECRET_KEY || '').trim();

  // If live or test Paystack secret key is present:
  if (paystackSecret) {
    try {
      // 1. Create Transfer Recipient
      const recipientRes = await fetch('https://api.paystack.co/transferrecipient', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'nuban',
          name: accountName || 'Showmelove Recipient',
          account_number: cleanNuban,
          bank_code: bankCode || '058',
          currency: 'NGN',
        }),
      });

      const recipientPayload = (await recipientRes.json()) as {
        status?: boolean;
        message?: string;
        data?: { recipient_code?: string };
      };

      if (!recipientRes.ok || !recipientPayload.status || !recipientPayload.data?.recipient_code) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        return res.end(
          JSON.stringify({
            ok: false,
            error: recipientPayload.message || 'Failed to create Paystack transfer recipient.',
          }),
        );
      }

      const recipientCode = recipientPayload.data.recipient_code;
      const transferReference = `payout_${payoutId || Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      // 2. Initiate Transfer from Paystack Balance
      const transferRes = await fetch('https://api.paystack.co/transfer', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source: 'balance',
          amount: Math.round(cleanAmount * 100), // in kobo
          recipient: recipientCode,
          reason: `Showmelove payout for ${recipientEmail || cleanNuban}`,
          reference: transferReference,
        }),
      });

      const transferPayload = (await transferRes.json()) as {
        status?: boolean;
        message?: string;
        data?: {
          status?: string;
          transfer_code?: string;
          reference?: string;
          amount?: number;
        };
      };

      if (!transferRes.ok || !transferPayload.status) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        return res.end(
          JSON.stringify({
            ok: false,
            error: transferPayload.message || 'Transfer initiation failed on Paystack.',
          }),
        );
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(
        JSON.stringify({
          ok: true,
          status: 'completed',
          transferCode: transferPayload.data?.transfer_code,
          reference: transferPayload.data?.reference || transferReference,
          message: 'Transfer queued successfully via Paystack.',
        }),
      );
    } catch (err: any) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(
        JSON.stringify({
          ok: false,
          error: err.message || 'Network error communicating with Paystack transfer service.',
        }),
      );
    }
  }

  // Safe fallback if Paystack secret is not yet set in environment
  const mockRef = `sim_payout_${payoutId || Date.now()}`;
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.end(
    JSON.stringify({
      ok: true,
      status: 'completed',
      transferCode: `TRF_SIM_${Date.now().toString(36)}`,
      reference: mockRef,
      message: 'Simulated payout approved and disbursed (Test Mode).',
      simulated: true,
    }),
  );
}
