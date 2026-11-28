// Intentionally disabled: resolving a username to an email exposed private
// account addresses and made account enumeration possible. Sign-in and password
// reset now use the account email address only.
export default function handler(_req: any, res: any) {
  res.statusCode = 410;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({
    error: 'Username lookup is not available. Use your account email address.',
  }));
}
