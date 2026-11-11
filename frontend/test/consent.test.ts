import { describe, expect, it } from 'vitest';
import { analyticsId, CONSENT_SECONDS, isPrivatePath, parseConsent } from '@/lib/consent';

describe('consent validation', () => {
  const now = 1_000_000;
  const valid = { version: 1, analytics: true, expiresAt: now + CONSENT_SECONDS * 1000 };
  it('accepts explicit opt-in and explicit essential-only choices', () => {
    expect(parseConsent(JSON.stringify(valid), now)?.analytics).toBe(true);
    expect(parseConsent(JSON.stringify({ ...valid, analytics: false }), now)?.analytics).toBe(false);
  });
  it('fails closed for absent, malformed, expired, future-version or invalid decisions', () => {
    for (const input of [null, '', '{}', 'true', 'not JSON',
      JSON.stringify({ ...valid, version: 2 }),
      JSON.stringify({ ...valid, analytics: 'true' }),
      JSON.stringify({ ...valid, expiresAt: now }),
      JSON.stringify({ ...valid, expiresAt: valid.expiresAt + 1 }),
    ]) expect(parseConsent(input, now)).toBeNull();
  });
});

describe('analytics deployment configuration', () => {
  it('offers the same consent-controlled GA4 property in all environments', () => {
    expect(analyticsId({ NODE_ENV: 'production', WIEWARM_ORIGIN: 'https://www.wiewarm.ch' })).toBe('G-SLQMWRY7SY');
    expect(analyticsId({ NODE_ENV: 'production', WIEWARM_ORIGIN: 'https://beta.wiewarm.ch' })).toBe('G-SLQMWRY7SY');
    expect(analyticsId({ NODE_ENV: 'production', WIEWARM_ORIGIN: 'http://localhost:3770' })).toBe('G-SLQMWRY7SY');
    expect(analyticsId({ NODE_ENV: 'development' })).toBe('G-SLQMWRY7SY');
  });
  it('supports explicit enable/disable without accepting arbitrary script URLs or obsolete tags', () => {
    expect(analyticsId({ GOOGLE_ANALYTICS_ID: 'G-TEST123' })).toBe('G-TEST123');
    expect(analyticsId({ NODE_ENV: 'production', GOOGLE_ANALYTICS_ID: '' })).toBe('');
    expect(analyticsId({ GOOGLE_ANALYTICS_ID: 'UA-123-1' })).toBe('');
    expect(analyticsId({ GOOGLE_ANALYTICS_ID: 'https://example.com/script.js' })).toBe('');
  });
  it('excludes the entire admin area', () => {
    expect(isPrivatePath('/admin')).toBe(true);
    expect(isPrivatePath('/admin/settings')).toBe(true);
    expect(isPrivatePath('/bad/199')).toBe(false);
  });
});
