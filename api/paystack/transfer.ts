/**
 * Automated payouts are intentionally disabled until role authorization and
 * webhook-backed settlement are deployed. Never initiate a bank transfer from
 * browser-controlled data.
 */
export default function handler(req: any, res: any) {
  res.statusCode = 503;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({
    ok: false,
    error: 'Automated payouts are temporarily unavailable while secure settlement is being enabled.',
  }));
}
