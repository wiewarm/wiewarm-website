import Link from 'next/link';
import { MapPinOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return <main id="main-content" className="site-shell page-main"><section className="error-card"><MapPinOff aria-hidden="true" />
    <p className="eyebrow">Nicht gefunden</p><h1>Diese Badi kennen wir nicht</h1><p>Vielleicht wurde der Link geändert oder die Badi ist nicht mehr eingetragen.</p>
    <Button nativeButton={false} render={<Link href="/" />}>Zu allen Temperaturen</Button>
  </section></main>;
}
