// Serverless endpoint to resolve Nigerian bank account names using Paystack NUBAN API
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
    return res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
  }

  const accountNumber = String(req.query?.account_number || '').trim().replace(/\D/g, '');
  const bankCode = String(req.query?.bank_code || '').trim();

  if (accountNumber.length !== 10) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ ok: false, error: 'Account number must be exactly 10 digits.' }));
  }

  if (!bankCode) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ ok: false, error: 'Missing bank code.' }));
  }

  const paystackSecret = (process.env.PAYSTACK_SECRET_KEY || '').trim();

  if (paystackSecret) {
    try {
      const response = await fetch(
        `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`,
        {
          headers: {
            Authorization: `Bearer ${paystackSecret}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const data = (await response.json()) as {
        status?: boolean;
        message?: string;
        data?: {
          account_number?: string;
          account_name?: string;
          bank_id?: number;
        };
      };

      if (response.ok && data.status && data.data?.account_name) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        return res.end(
          JSON.stringify({
            ok: true,
            account_name: data.data.account_name,
            account_number: accountNumber,
            bank_code: bankCode,
          }),
        );
      }

      res.statusCode = 422;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(
        JSON.stringify({
          ok: false,
          error: data.message || 'Could not resolve account name. Check the account number and bank.',
        }),
      );
    } catch (err: any) {
      // Fall through to simulated fallback if network error
    }
  }

  // Simulated fallback for demo/test mode
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.end(
    JSON.stringify({
      ok: true,
      account_name: 'ACCOUNT HOLDER (TEST MODE)',
      account_number: accountNumber,
      bank_code: bankCode,
      simulated: true,
    }),
  );
}
