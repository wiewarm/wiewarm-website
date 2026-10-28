import type { Metadata } from 'next';
import '@fontsource-variable/geist';
import '@fontsource-variable/manrope';
import '@fontsource-variable/dm-sans';
import '@fontsource-variable/ibm-plex-sans';
import '@fontsource-variable/nunito-sans';
import '@fontsource-variable/space-grotesk';
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/syne';
import '@fontsource-variable/unbounded';
import '@fontsource-variable/fraunces';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { defaultDesign } from '@/lib/designs';
import './globals.css';
import './designs.css';
import './sommerfrische.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://wiewarm.ch'),
  title: { default: 'wiewarm.ch – Schweizer Wassertemperaturen', template: '%s | wiewarm.ch' },
  description: 'Aktuelle Wassertemperaturen von Schweizer Badis, Seen und Flüssen.',
  alternates: { canonical: '/' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="de-CH" data-design={defaultDesign} ><body>
    <a className="skip-link" href="#main-content">Zum Inhalt springen</a>
    <div className="page-frame"><SiteHeader />{children}<SiteFooter /></div>
  </body></html>;
}
