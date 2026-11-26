/**
 * Strict Admin Access Whitelist and Master Password for Showmelove
 * Master admin password defaults to 123SHOWmelove (can be overridden via VITE_ADMIN_PASSWORD).
 */

export const DEFAULT_ADMIN_EMAILS = [
  'pbona717@gmail.com',
  '1virtue1x@gmail.com',
];

export const DEFAULT_ADMIN_PASSWORD = '123SHOWmelove';

const ADMIN_AUTH_STORAGE_KEY = 'showmelove_admin_session_auth';

/**
 * Returns the configured master admin password.
 */
export function getAdminPassword(): string {
  const envPassword = (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_ADMIN_PASSWORD;
  return (envPassword && envPassword.trim()) ? envPassword.trim() : DEFAULT_ADMIN_PASSWORD;
}

/**
 * Verifies whether the provided input matches the master admin password.
 */
export function verifyAdminPassword(password: string): boolean {
  if (!password) return false;
  return password.trim() === getAdminPassword();
}

/**
 * Checks whether the current browser session has unlocked the admin dashboard.
 */
export function isAdminSessionUnlocked(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return (
      sessionStorage.getItem(ADMIN_AUTH_STORAGE_KEY) === 'unlocked' ||
      localStorage.getItem(ADMIN_AUTH_STORAGE_KEY) === 'unlocked'
    );
  } catch {
    return false;
  }
}

/**
 * Updates the unlocked admin session state.
 */
export function setAdminSessionUnlocked(unlocked: boolean, remember = false): void {
  if (typeof window === 'undefined') return;
  try {
    if (unlocked) {
      sessionStorage.setItem(ADMIN_AUTH_STORAGE_KEY, 'unlocked');
      if (remember) {
        localStorage.setItem(ADMIN_AUTH_STORAGE_KEY, 'unlocked');
      }
    } else {
      sessionStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
      localStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
    }
  } catch {
    // Ignore
  }
}

/**
 * Instantly locks the admin session.
 */
export function lockAdminSession(): void {
  setAdminSessionUnlocked(false);
}

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
