'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { CONSENT_KEY, CONSENT_SECONDS, isPrivatePath, parseConsent, type Consent } from '@/lib/consent';
import { startAnalytics, stopAnalytics, trackPage } from '@/lib/analytics';

const ConsentContext = createContext<() => void>(() => {});

function readConsent(): Consent | null {
  try { return parseConsent(localStorage.getItem(CONSENT_KEY)); } catch { return null; }
}

export function CookieSettingsButton() {
  const open = useContext(ConsentContext);
  return <button type="button" className="cookie-settings-link" onClick={open}>Cookie-Einstellungen</button>;
}

export function CookieConsent({ measurementId, children }: { measurementId: string; children: ReactNode }) {
  const [consent, setConsent] = useState<Consent | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const path = usePathname();

  useEffect(() => {
    function sync() {
      const saved = readConsent();
      setConsent(saved);
      setReady(true);
      if (!saved) setOpen(true);
      if (!saved?.analytics && stopAnalytics()) window.location.reload();
    }
    function storage(event: StorageEvent) { if (event.key === CONSENT_KEY || event.key === null) sync(); }
    sync();
    window.addEventListener('storage', storage);
    window.addEventListener('focus', sync);
    return () => {
      window.removeEventListener('storage', storage);
      window.removeEventListener('focus', sync);
    };
  }, []);

  useEffect(() => {
    if (!consent) return;
    const expiresAt = consent.expiresAt;
    let timer: number;
    function expire() {
      if (expiresAt > Date.now()) {
        timer = window.setTimeout(expire, Math.min(expiresAt - Date.now(), 2_147_483_647));
        return;
      }
      setConsent(null);
      setOpen(true);
      if (stopAnalytics()) window.location.reload();
    }
    expire();
    return () => window.clearTimeout(timer);
  }, [consent]);

  useEffect(() => {
    if (!ready) return;
    if (isPrivatePath(path) || !measurementId || !consent?.analytics || consent.expiresAt <= Date.now()) {
      if (stopAnalytics()) window.location.reload();
      return;
    }
    startAnalytics(measurementId);
    trackPage(path);
  }, [consent, measurementId, path, ready]);

  function choose(analytics: boolean) {
    const next: Consent = { version: 1, analytics, expiresAt: Date.now() + CONSENT_SECONDS * 1000 };
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify(next));
    } catch {
      if (analytics) {
        setError('Deine Auswahl konnte nicht gespeichert werden. Die Analyse bleibt ausgeschaltet. Du kannst die Website mit «Nur notwendige» nutzen.');
        return;
      }
    }
    setConsent(next);
    setOpen(false);
    setError('');
    if (!analytics && stopAnalytics()) window.location.reload();
  }

  return <ConsentContext.Provider value={() => setOpen(true)}>
    {children}
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="cookie-dialog" showCloseButton={false}>
        <ShieldCheck aria-hidden="true" className="cookie-dialog-icon" />
        <DialogTitle className="cookie-dialog-title">Deine Privatsphäre am Wasser</DialogTitle>
        <DialogDescription>
          Wir speichern, was für Anmeldung, Cookie-Auswahl und Deine gewählten Einstellungen nötig ist.
          {measurementId ? ' Nur mit Deiner Zustimmung nutzen wir Google Analytics für Besuchsstatistiken.' : ' Auf dieser Umgebung ist Google Analytics ausgeschaltet.'}
        </DialogDescription>
        {measurementId && <p>Google erhält Nutzungs- und Gerätedaten sowie Deine IP-Adresse; eine Verarbeitung in den USA ist möglich. Werbung ist ausgeschaltet.</p>}
        {error && <p role="alert">{error}</p>}
        <div className="cookie-dialog-actions">
          <button type="button" onClick={() => choose(false)}>Nur notwendige</button>
          {measurementId && <button type="button" onClick={() => choose(true)}>Analyse erlauben</button>}
        </div>
        <p>«Nur notwendige» blockiert Google Analytics vollständig. Deine Auswahl gilt für 180 Tage. Du kannst sie jederzeit unten über «Cookie-Einstellungen» ändern oder widerrufen.</p>
        <Link href="/datenschutz" onClick={() => setOpen(false)}>Mehr zum Datenschutz</Link>
        <button type="button" className="cookie-settings-link" onClick={() => setOpen(false)}>Ohne Änderung schliessen</button>
      </DialogContent>
    </Dialog>
  </ConsentContext.Provider>;
}
