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
 * Accepts exact casing or lowercase matching against DEFAULT_ADMIN_PASSWORD and VITE_ADMIN_PASSWORD.
 */
export function verifyAdminPassword(password: string): boolean {
  if (!password) return false;
  const p = password.trim();
  const envPassword = (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_ADMIN_PASSWORD?.trim();
  return (
    p === DEFAULT_ADMIN_PASSWORD ||
    p.toLowerCase() === DEFAULT_ADMIN_PASSWORD.toLowerCase() ||
    Boolean(envPassword && (p === envPassword || p.toLowerCase() === envPassword.toLowerCase()))
  );
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

const CUSTOM_ADMINS_STORAGE_KEY = 'showmelove_custom_admins';

/**
 * Retrieves custom admins saved via the Super Admin Dashboard.
 */
export function getCustomAdminEmails(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CUSTOM_ADMINS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Adds an email to the authorized admin list.
 */
export function addAdminEmail(email: string): boolean {
  if (!email || !email.includes('@')) return false;
  const clean = email.trim().toLowerCase();
  try {
    const custom = getCustomAdminEmails();
    if (!custom.includes(clean)) {
      custom.push(clean);
      localStorage.setItem(CUSTOM_ADMINS_STORAGE_KEY, JSON.stringify(custom));
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Removes an email from the custom authorized admin list.
 */
export function removeAdminEmail(email: string): boolean {
  const clean = email.trim().toLowerCase();
  try {
    const custom = getCustomAdminEmails().filter((e) => e !== clean);
    localStorage.setItem(CUSTOM_ADMINS_STORAGE_KEY, JSON.stringify(custom));
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns the normalized list of authorized admin emails.
 * Supports dynamic addition via Admin Console, VITE_ADMIN_EMAILS, and DEFAULT_ADMIN_EMAILS.
 */
export function getAdminEmails(): string[] {
  const customAdmins = getCustomAdminEmails();
  const envAdmins = (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_ADMIN_EMAILS
    ? String((import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_ADMIN_EMAILS)
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean)
    : [];

  const combined = new Set([
    ...DEFAULT_ADMIN_EMAILS.map((e) => e.toLowerCase()),
    ...envAdmins,
    ...customAdmins.map((e) => e.trim().toLowerCase()),
  ]);
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
