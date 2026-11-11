export const CONSENT_KEY = 'wiewarm-consent-v1';
export const CONSENT_SECONDS = 180 * 24 * 60 * 60;

export interface Consent {
  version: 1;
  analytics: boolean;
  expiresAt: number;
}

export function parseConsent(value: string | null, now = Date.now()): Consent | null {
  try {
    const consent = JSON.parse(value ?? 'null') as Partial<Consent> | null;
    if (consent?.version !== 1 || typeof consent.analytics !== 'boolean'
      || typeof consent.expiresAt !== 'number' || !Number.isFinite(consent.expiresAt)
      || consent.expiresAt <= now || consent.expiresAt > now + CONSENT_SECONDS * 1000) return null;
    return consent as Consent;
  } catch {
    return null;
  }
}

export function analyticsId(env: Record<string, string | undefined>): string {
  // Restore the existing public GA4 property only on the production website.
  // An explicit empty value disables analytics; beta/local need an explicit ID.
  let id = env.GOOGLE_ANALYTICS_ID;
  if (id === undefined && env.NODE_ENV === 'production') {
    try {
      const host = new URL(env.WIEWARM_ORIGIN || 'https://www.wiewarm.ch').hostname;
      if (['www.wiewarm.ch', 'wiewarm.ch'].includes(host)) id = 'G-SLQMWRY7SY';
    } catch { /* Invalid origins must not enable analytics. */ }
  }
  return id && /^G-[A-Z0-9]+$/.test(id) ? id : '';
}

export function isPrivatePath(path: string): boolean {
  return path === '/admin' || path.startsWith('/admin/');
}
