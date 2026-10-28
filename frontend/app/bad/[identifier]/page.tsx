import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ChartLine, Clock3, ExternalLink, Images, Info, Mail, MapPin, Phone, Sun, Ticket, Waves } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TemperatureHistory } from '@/components/temperature-history';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ImageGallery } from '@/components/image-gallery';
import { formatTemperature } from '@/lib/format-temperature';
import { getSwimmingLocation, getTemperatureTimeseries, latestLocationNews, normalizeRouteIdentifier, swimmingLocationExists, WiewarmApiError, type Basin } from '@/lib/wiewarm-api';

type RouteParams = { identifier: string };

function isRecent(date: string, days: number): boolean {
  const timestamp = Date.parse(date);
  return Number.isFinite(timestamp) && Date.now() - timestamp < days * 86_400_000 && Date.now() >= timestamp - 86_400_000;
}

function directionsUrl(location: Awaited<ReturnType<typeof getSwimmingLocation>>): string {
  const address = [location.address1, location.address2, location.postalCode, location.city].filter(Boolean).join(' ');
  const query = address || (location.latitude !== null && location.longitude !== null ? `${location.latitude},${location.longitude}` : location.city);
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function isStale(basin: Basin): boolean {
  return basin.date ? !isRecent(basin.date, 7) : true;
}

export async function generateMetadata({ params }: { params: Promise<RouteParams> }): Promise<Metadata> {
  const { identifier } = await params;
  const normalizedIdentifier = normalizeRouteIdentifier(identifier);
  try {
    const location = await getSwimmingLocation(normalizedIdentifier);
    const title = `${location.name}, ${location.city}`;
    const description = `Wassertemperaturen, Öffnungszeiten und Informationen für ${location.name} in ${location.city}.`;
    const image = location.images[0]?.original;
    return {
      title, description, alternates: { canonical: `/bad/${encodeURIComponent(normalizedIdentifier)}` },
      openGraph: { title, description, images: image ? [{ url: image }] : [] },
      twitter: { card: image ? 'summary_large_image' : 'summary', title, description, images: image ? [image] : [] },
    };
  } catch {
    return { title: 'Bad nicht gefunden' };
  }
}

export default async function SwimmingLocationPage({ params }: { params: Promise<RouteParams> }) {
  const { identifier } = await params;
  const normalizedIdentifier = normalizeRouteIdentifier(identifier);
  let location;
  try {
    location = await getSwimmingLocation(normalizedIdentifier);
  } catch (error) {
    if (error instanceof WiewarmApiError && error.status === 404) notFound();
    if (error instanceof WiewarmApiError && error.status === 500 && !(await swimmingLocationExists(normalizedIdentifier))) notFound();
    throw error;
  }

  // History is optional: the page still renders when the timeseries is unavailable.
  const series = await getTemperatureTimeseries(location.badid).catch((error: unknown) => {
    console.warn('Temperature history unavailable', error instanceof Error ? error.message : error);
    return null;
  });

  const addressLines = [location.address1, location.address2, [location.postalCode, location.city].filter(Boolean).join(' ')].filter(Boolean);
  const recentWeather = location.weather.filter((entry) => isRecent(entry.date, 3));
  const uvIsRecent = location.uvDate && isRecent(location.uvDate, 7);
  const latestNews = latestLocationNews(location.notices, 1);
  const visibleNotices = latestNews.length ? [...latestNews, ...location.notices.filter((notice) => !latestNews.some((item) => item.date === notice.date && item.info === notice.info))] : location.notices;

  return <main id="main-content" className="site-shell detail-main">
    <Button variant="ghost" nativeButton={false} render={<Link href="/" />} className="back-link"><ArrowLeft aria-hidden="true" /> Alle Temperaturen</Button>

    <header className="detail-hero"><p className="summer-only summer-eyebrow"><MapPin aria-hidden="true" />{location.city}{location.canton ? ` · ${location.canton}` : ''}</p><h1>{location.name}</h1></header>

    <div className="detail-layout">
      <div className="detail-primary">
        <section className="detail-card" aria-labelledby="basins-heading">
          <div className="section-heading"><div className="section-icon"><Waves aria-hidden="true" /></div><div><h2 id="basins-heading">Becken & Temperaturen</h2></div></div>
          {location.basins.length ? <Table className="basin-table"><TableHeader><TableRow><TableHead>Becken</TableHead><TableHead>Temperatur</TableHead><TableHead>Status</TableHead><TableHead>Aktualisiert</TableHead></TableRow></TableHeader>
            <TableBody>{location.basins.map((basin) => <TableRow key={basin.beckenid}><TableCell><strong>{basin.name}</strong><small>{basin.type}</small></TableCell>
              <TableCell><span className="detail-temp">{formatTemperature(basin.temp)}</span></TableCell>
              <TableCell><Badge variant={basin.status.toLocaleLowerCase('de-CH').includes('geöffnet') ? 'default' : 'secondary'}>{basin.status || 'Unbekannt'}</Badge></TableCell>
              <TableCell><time dateTime={basin.date}>{basin.datePretty || '–'}</time>{isStale(basin) ? <small className="stale-label">Älterer Messwert</small> : null}</TableCell>
            </TableRow>)}</TableBody></Table> : <p className="muted-copy">Keine Beckenangaben verfügbar.</p>}

        </section>

        {visibleNotices.length ? <section className="detail-card" aria-labelledby="notices-heading"><div className="section-heading"><div className="section-icon"><Info aria-hidden="true" /></div><div><p>Gut zu wissen</p><h2 id="notices-heading">Aktuelle Mitteilungen</h2></div></div>
          <div className="notice-list">{visibleNotices.map((notice, index) => <article key={`${notice.date}-${index}`}><time dateTime={notice.date}>{notice.datePretty}</time><p>{notice.info}</p></article>)}</div>
        </section> : null}

        {(location.openingHours || location.prices || location.images.length || location.info) ? <section className="info-grid">
          {location.openingHours ? <InfoBlock icon={<Clock3 />} title="Öffnungszeiten" text={location.openingHours} /> : null}
          {location.prices ? <InfoBlock icon={<Ticket />} title="Preise" text={location.prices} /> : null}
          {location.images.length ? <section className="detail-card info-wide" aria-labelledby="images-heading"><div className="section-heading"><div className="section-icon"><Images aria-hidden="true" /></div><div><h2 id="images-heading">Bilder</h2></div></div>
            <ImageGallery images={location.images} name={location.name} city={location.city} />
          </section> : null}
          {location.info ? <InfoBlock icon={<Info />} title="Weitere Informationen" text={location.info} wide /> : null}
        </section> : null}
      </div>

      <aside className="detail-sidebar">
        {(addressLines.length || location.phone || location.email || location.website) ? <section className="contact-card"><div className="section-heading"><div className="section-icon"><MapPin aria-hidden="true" /></div><h2>Adresse & Kontakt</h2></div>
          {addressLines.length ? <address>{addressLines.map((line) => <span key={line}>{line}</span>)}</address> : null}
          <div className="contact-links">{location.phone ? <a href={`tel:${location.phone.replace(/\s/g, '')}`}><Phone aria-hidden="true" /> {location.phone}</a> : null}
            {location.email ? <a href={`mailto:${location.email}`}><Mail aria-hidden="true" /> {location.email}</a> : null}
            {location.website ? <a href={location.website} target="_blank" rel="noreferrer"><ExternalLink aria-hidden="true" /> Website</a> : null}</div>
          <a className="button-link" href={directionsUrl(location)} target="_blank" rel="noreferrer"><MapPin aria-hidden="true" /> Route öffnen</a>
        </section> : null}
        {(uvIsRecent || recentWeather.length) ? <section className="weather-card"><p className="eyebrow"><Sun aria-hidden="true" /> Wetterdaten</p><h2>Sonne & Wasser</h2>
          {uvIsRecent && location.uvValue !== null ? <div className="uv-reading"><span>UV {location.uvValue}</span><small>{location.uvDatePretty}{location.uvStationName ? ` · ${location.uvStationName}` : ''}</small></div> : null}
          {recentWeather.map((entry) => <div className="weather-reading" key={entry.date}><span>{formatTemperature(entry.temperature)}</span><small>{entry.datePretty}</small></div>)}
        </section> : null}
      </aside>
    </div>

    {series && series.pools.length && series.points.length ? <section className="detail-card history-card" aria-labelledby="history-heading">
      <div className="section-heading"><div className="section-icon"><ChartLine aria-hidden="true" /></div><div><p>Verlauf</p><h2 id="history-heading">Temperaturverlauf</h2></div></div>
      <TemperatureHistory series={series} mainPoolIds={location.basins.filter((basin) => basin.isMain).map((basin) => basin.beckenid)} />
    </section> : null}
  </main>;
}

// Matches either an HTML anchor embedded in the API text (groups 1-2) or a bare URL (group 3).
const linkPattern = /<a\s[^>]*?href\s*=\s*["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>|((?:https?:\/\/|www\.)[^\s<>"]+)/gi;

function toHref(url: string): string | null {
  const href = url.trim().replace(/^www\./i, 'https://www.');
  return /^https?:\/\//i.test(href) ? href : null;
}

function linkify(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(linkPattern)) {
    const start = match.index;
    if (start > last) nodes.push(text.slice(last, start));
    last = start + match[0].length;
    if (match[3] === undefined) {
      const href = toHref(match[1]);
      const label = match[2].replace(/<[^>]*>/g, '') || match[1];
      nodes.push(href ? <a key={start} href={href} target="_blank" rel="noreferrer">{label}</a> : label);
      continue;
    }
    const url = match[3].replace(/[.,;:!?)\]]+$/, '');
    last -= match[3].length - url.length;
    nodes.push(<a key={start} href={toHref(url)!} target="_blank" rel="noreferrer">{url}</a>);
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function InfoBlock({ icon, label, title, text, wide = false }: { icon: React.ReactNode; label?: string; title: string; text: string; wide?: boolean }) {
  return <section className={`detail-card info-block${wide ? ' info-wide' : ''}`}><div className="section-heading"><div className="section-icon">{icon}</div><div>{label ? <p>{label}</p> : null}<h2>{title}</h2></div></div><p className="preformatted">{linkify(text)}</p></section>;
}
