/**
 * Strict Admin Access Whitelist for Showmelove
 * Only emails in this whitelist are permitted to view or manage the Admin Dashboard,
 * review payout requests, and modify catalog settings.
 */

export const DEFAULT_ADMIN_EMAILS = [
  'pbona717@gmail.com',
  '1virtue1x@gmail.com',
];

/**
 * Returns the normalized list of authorized admin emails.
 * Supports dynamic addition via VITE_ADMIN_EMAILS in .env or Vercel.
 */
export function getAdminEmails(): string[] {
  const envAdmins = (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_ADMIN_EMAILS
    ? String((import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_ADMIN_EMAILS)
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean)
    : [];

  const combined = new Set([...DEFAULT_ADMIN_EMAILS.map((e) => e.toLowerCase()), ...envAdmins]);
  return Array.from(combined);
}

/**
 * Checks whether a given user email is an authorized administrator.
 */
export function isUserAdmin(email?: string | null): boolean {
  if (!email || !email.trim()) return false;
  const normalized = email.trim().toLowerCase();
  return getAdminEmails().includes(normalized);
}
