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
  // All environments offer the same opt-in. An explicit empty value disables it.
  const id = env.GOOGLE_ANALYTICS_ID ?? 'G-SLQMWRY7SY';
  return id && /^G-[A-Z0-9]+$/.test(id) ? id : '';
}

export function isPrivatePath(path: string): boolean {
  return path === '/admin' || path.startsWith('/admin/');
}
