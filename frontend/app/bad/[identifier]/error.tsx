'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DetailError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main id="main-content" className="site-shell page-main"><section className="error-card"><AlertTriangle aria-hidden="true" />
    <p className="eyebrow">Verbindung unterbrochen</p><h1>Diese Badi ist gerade nicht erreichbar</h1>
    <p>Die Angaben konnten nicht geladen werden. Bitte versuche es in einem Moment erneut.</p><Button onClick={reset}>Erneut versuchen</Button>
  </section></main>;
}
