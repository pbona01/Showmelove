// Serverless endpoint to list active Nigerian banks from Paystack
export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  const paystackSecret = (process.env.PAYSTACK_SECRET_KEY || '').trim();

  if (paystackSecret) {
    try {
      const response = await fetch('https://api.paystack.co/bank?country=nigeria&perPage=100', {
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
        },
      });

      if (response.ok) {
        const payload = (await response.json()) as { status: boolean; data: any[] };
        if (payload.status && Array.isArray(payload.data)) {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          return res.end(
            JSON.stringify({
              ok: true,
              banks: payload.data.map((b) => ({
                name: b.name,
                code: b.code,
                slug: b.slug,
                active: b.active,
              })),
            }),
          );
        }
      }
    } catch {
      // Fall through
    }
  }

  // Fallback default banks
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(
    JSON.stringify({
      ok: true,
      banks: [
        { name: 'Guaranty Trust Bank (GTBank)', code: '058', slug: 'guaranty-trust-bank' },
        { name: 'Access Bank', code: '044', slug: 'access-bank' },
        { name: 'Zenith Bank', code: '057', slug: 'zenith-bank' },
        { name: 'United Bank For Africa (UBA)', code: '033', slug: 'united-bank-for-africa' },
        { name: 'First Bank of Nigeria', code: '011', slug: 'first-bank-of-nigeria' },
        { name: 'Kuda Bank', code: '50211', slug: 'kuda-bank' },
        { name: 'OPay Digital Services', code: '999992', slug: 'opay' },
        { name: 'Moniepoint MFB', code: '50515', slug: 'moniepoint-mfb-ng' },
        { name: 'PalmPay', code: '999991', slug: 'palmpay' },
        { name: 'Fidelity Bank', code: '070', slug: 'fidelity-bank' },
        { name: 'First City Monument Bank (FCMB)', code: '214', slug: 'first-city-monument-bank' },
        { name: 'Stanbic IBTC Bank', code: '221', slug: 'stanbic-ibtc-bank' },
        { name: 'Sterling Bank', code: '232', slug: 'sterling-bank' },
        { name: 'Union Bank of Nigeria', code: '032', slug: 'union-bank-of-nigeria' },
        { name: 'Wema Bank', code: '035', slug: 'wema-bank' },
        { name: 'Polaris Bank', code: '076', slug: 'polaris-bank' },
      ],
    }),
  );
}
