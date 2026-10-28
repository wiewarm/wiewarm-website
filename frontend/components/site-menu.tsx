'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Info, List, LogIn, Menu, X } from 'lucide-react';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

const items = [
  { label: 'Liste', description: 'Alle Bäder und Wassertemperaturen', href: '/#temperaturen', icon: List },
  { label: 'Info', description: 'Wissenswertes über wiewarm.ch', href: '/info', icon: Info },
  { label: 'Login', description: 'Für Badmeisterinnen und Badmeister', href: '/admin', icon: LogIn },
] as const;

export function SiteMenu() {
  const [open, setOpen] = useState(false);

  return <Sheet open={open} onOpenChange={setOpen}>
    <SheetTrigger className="menu-button" aria-label="Menü öffnen"><Menu aria-hidden="true" /></SheetTrigger>
    <SheetContent side="left" showCloseButton={false} className="menu-panel">
      <SheetClose className="menu-close" aria-label="Menü schliessen"><X aria-hidden="true" /></SheetClose>
      <SheetTitle className="sr-only">Menü</SheetTitle>
      <SheetDescription className="sr-only">Hauptnavigation von wiewarm.ch</SheetDescription>
      <nav aria-label="Hauptnavigation"><ul className="menu-list">
        {items.map(({ label, description, href, icon: Icon, ...rest }) => <li key={label}>
          {'external' in rest
            ? <a className="menu-item" href={href} rel="noopener" onClick={() => setOpen(false)}><Icon aria-hidden="true" /><span><strong>{label}</strong><small>{description}</small></span><ChevronRight aria-hidden="true" /></a>
            : <Link className="menu-item" href={href} onClick={() => setOpen(false)}><Icon aria-hidden="true" /><span><strong>{label}</strong><small>{description}</small></span><ChevronRight aria-hidden="true" /></Link>}
        </li>)}
      </ul></nav>
    </SheetContent>
  </Sheet>;
}
