export interface VerifiedUser {
  displayName: string;
  username: string;
  email?: string;
  tag?: string;
}

export const BASE_PLATFORM_USERS: VerifiedUser[] = [];


/**
 * Validates and confirms whether a username belongs to a verified Showmelove account.
 */
export function lookupVerifiedUser(
  inputUsername: string,
  extraGifts?: Array<{ recipientName?: string; recipientEmail?: string }>,
  signedInEmail?: string | null,
  signedInName?: string | null,
): VerifiedUser | null {
  const clean = inputUsername.trim().replace(/^@/, '').toLowerCase();
  if (!clean) return null;

  // 1. Check users discovered from live account data
  const baseMatch = BASE_PLATFORM_USERS.find(
    (u) => u.username.toLowerCase() === clean,
  );
  if (baseMatch) return baseMatch;

  // 2. Check current signed-in user
  if (signedInEmail) {
    const selfUsr = signedInEmail.split('@')[0].toLowerCase();
    if (selfUsr === clean) {
      return {
        displayName: signedInName || selfUsr.charAt(0).toUpperCase() + selfUsr.slice(1),
        username: selfUsr,
        email: signedInEmail,
        tag: 'You',
      };
    }
  }

  // 3. Check localStorage user map
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('showmelove_user_map') : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      for (const [usr, eml] of Object.entries(parsed)) {
        const cleanMapUsr = usr.trim().replace(/^@/, '').toLowerCase();
        if (cleanMapUsr === clean) {
          return {
            displayName: cleanMapUsr.charAt(0).toUpperCase() + cleanMapUsr.slice(1),
            username: cleanMapUsr,
            email: String(eml),
            tag: 'Verified User',
          };
        }
      }
    }
  } catch {
    // ignore storage read issues
  }

  // 4. Check past gifts recipients
  if (extraGifts) {
    for (const g of extraGifts) {
      if (g.recipientName) {
        const cleanRecip = g.recipientName.trim().replace(/^@/, '').toLowerCase();
        if (cleanRecip === clean) {
          return {
            displayName: g.recipientName.replace(/^@/, ''),
            username: cleanRecip,
            email: g.recipientEmail,
            tag: 'Verified User',
          };
        }
      }
    }
  }

  return null;
}
