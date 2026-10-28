import Link from 'next/link';
import { Sun, Waves } from 'lucide-react';
import { FontSelector } from '@/components/font-selector';
import { SiteMenu } from '@/components/site-menu';

export function SiteHeader() {
  return <header className="site-header"><div className="site-shell header-inner">
    <div className="header-start">
      <SiteMenu />
      <Link className="brand" href="/" aria-label="wiewarm.ch Startseite">
        <span className="brand-mark">
          <Sun className="brand-sun" aria-hidden="true" />
          <Waves className="brand-waves" aria-hidden="true" />
        </span>
        <span>wiewarm<span>.ch</span></span>
      </Link>
    </div>
    <div className="header-tools"><FontSelector /></div>
  </div></header>;
}
