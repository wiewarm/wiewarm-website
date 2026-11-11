import { CONSENT_SECONDS } from '@/lib/consent';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let activeId = '';
let lastPath = '';

export function startAnalytics(id: string): void {
  if (activeId || !/^G-[A-Z0-9]+$/.test(id)) return;
  activeId = id;
  window.dataLayer = window.dataLayer || [];
  // Google documents an Arguments object for commands in the data layer.
  // eslint-disable-next-line prefer-rest-params
  window.gtag = function (..._args: unknown[]) { window.dataLayer!.push(arguments); };
  // Basic consent mode: even this script is absent until explicit opt-in.
  window.gtag('consent', 'default', {
    analytics_storage: 'denied', ad_storage: 'denied',
    ad_user_data: 'denied', ad_personalization: 'denied',
  });
  window.gtag('consent', 'update', { analytics_storage: 'granted' });
  window.gtag('set', {
    page_location: window.location.origin + window.location.pathname,
    page_referrer: '', page_title: 'wiewarm.ch',
    allow_google_signals: false, allow_ad_personalization_signals: false,
  });
  window.gtag('js', new Date());
  window.gtag('config', id, {
    send_page_view: false, cookie_expires: CONSENT_SECONDS,
    cookie_update: false, cookie_domain: window.location.hostname,
    allow_google_signals: false, allow_ad_personalization_signals: false,
  });
  const script = document.createElement('script');
  script.id = 'wiewarm-google-analytics';
  script.async = true;
  script.referrerPolicy = 'no-referrer';
  script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.appendChild(script);
}

export function trackPage(path: string): void {
  if (!activeId || lastPath === path) return;
  lastPath = path;
  const location = window.location.origin + path;
  window.gtag?.('set', { page_location: location, page_referrer: '', page_title: 'wiewarm.ch' });
  window.gtag?.('event', 'page_view', {
    send_to: activeId, page_location: location, page_referrer: '', page_title: 'wiewarm.ch',
  });
}

export function clearAnalyticsCookies(): void {
  const names = document.cookie.split(';').map((cookie) => cookie.trim().split('=')[0])
    .filter((name) => /^(_ga(?:_|$)|_gid$|_gat(?:_|$)|__utm)/.test(name));
  const parts = window.location.hostname.split('.');
  const domains = ['', ...parts.map((_, index) => parts.slice(index).join('.'))];
  const paths = ['/', ...window.location.pathname.split('/').map((_, i, all) => all.slice(0, i + 1).join('/')).filter(Boolean)];
  for (const name of names) for (const domain of domains) for (const path of paths) {
    document.cookie = `${name}=; Max-Age=0; Path=${path}${domain ? `; Domain=${domain}` : ''}`;
  }
}

export function stopAnalytics(): boolean {
  if (activeId) {
    (window as unknown as Record<string, unknown>)[`ga-disable-${activeId}`] = true;
    document.getElementById('wiewarm-google-analytics')?.remove();
  }
  clearAnalyticsCookies();
  // Removing a script cannot remove its timers/listeners. Reload after revocation
  // so the next document never loads it. Do not send cookieless denial pings.
  return Boolean(activeId);
}
