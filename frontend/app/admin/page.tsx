import type { Metadata } from 'next';
import Link from 'next/link';
import { Clock3, Images, KeyRound, ShieldAlert, Megaphone, ShieldCheck, Thermometer, UserRoundCog } from 'lucide-react';
import { getSession } from '@/lib/session';
import { getSwimmingLocation, WiewarmApiError, type SwimmingLocationDetail } from '@/lib/wiewarm-api';
import { BASIN_STATUS, getNews, imageIdFromPath, type AdminNews } from '@/lib/wiewarm-admin';
import { AdminImage, BaseDataForm, ChangePasswordDialog, ImageDeleteButton, ImageUploadForm, LoginForm, LogoutButton, NewsDeleteButton, NewsForm, TemperatureForm } from '@/app/admin/admin-forms';

export const metadata: Metadata = {
  title: 'Login für Badmeister',
  description: 'Interner Bereich für Badmeisterinnen und Badmeister von wiewarm.ch.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

function LoginView() {
  return <main id="main-content" className="site-shell page-main admin-main">
    <section className="detail-card login-card" aria-labelledby="login-title">
      <header className="info-intro">
        <p className="eyebrow"><KeyRound aria-hidden="true" /> Login</p>
        <h1 id="login-title">Interner Bereich für Badmeister</h1>
        <p>Melde Dich mit Deiner Bad-Id und Deiner PIN an, um Temperaturen, Mitteilungen und Bilder Deines Bads zu pflegen.</p>
      </header>
      <LoginForm />
      <p className="admin-hint">Noch keinen Zugang? Erfahre auf der <Link href="/info#mitmachen">Info-Seite</Link>, wie Dein Bad mitmachen kann.</p>
    </section>
  </main>;
}

function Section({ id, icon, title, children }: { id: string; icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return <section className="detail-card info-card" aria-labelledby={id}>
    <div className="section-heading"><span className="section-icon">{icon}</span><h2 id={id}>{title}</h2></div>
    {children}
  </section>;
}

const SHORT_PASSWORD_LENGTH = 4;

function DashboardView({ location, news, shortPassword }: { location: SwimmingLocationDetail; news: AdminNews[]; shortPassword: boolean }) {
  const basins = location.basins.map((basin) => ({
    beckenid: basin.beckenid,
    name: basin.name,
    type: basin.type,
    currentTemp: basin.temp === null ? '' : basin.temp.toFixed(1),
    datePretty: basin.datePretty,
    status: BASIN_STATUS[basin.status as keyof typeof BASIN_STATUS] ?? BASIN_STATUS.geöffnet,
  }));
  const images = location.images.flatMap((image) => {
    const imageId = imageIdFromPath(image.image);
    return imageId ? [{ ...image, imageId }] : [];
  });

  return <main id="main-content" className="site-shell page-main admin-main">
    <header className="info-intro admin-intro">
      <div>
        <p className="eyebrow"><ShieldCheck aria-hidden="true" /> Interner Bereich</p>
        <h1>{location.name}, {location.city}</h1>
        <p>Bad-Id {location.badid} · <Link href={`/bad/${location.badid}`}>Öffentliche Seite ansehen</Link></p>
      </div>
      <div className="admin-actions"><ChangePasswordDialog /><LogoutButton /></div>
    </header>

    {shortPassword ? <p className="admin-notice" role="alert"><ShieldAlert aria-hidden="true" /><span><strong>Dein Passwort ist sehr kurz.</strong> Bitte wähle aus Sicherheitsgründen ein neues, längeres Passwort mit der Schaltfläche «Passwort ändern».</span></p> : null}

    <div className="info-grid admin-grid-layout">
      <Section id="temperaturen" icon={<Thermometer aria-hidden="true" />} title="Temperatur oder Beckenstatus aktualisieren">
        <TemperatureForm basins={basins} />
      </Section>

      <Section id="kurzmitteilung" icon={<Megaphone aria-hidden="true" />} title="Kurzmitteilung abschicken">
        <NewsForm />
        <h3>Bisherige Einträge (90 Tage)</h3>
        {news.length === 0 ? <p className="admin-hint">Keine Einträge vorhanden.</p> : <ul className="admin-news">{news.map((entry) => <li key={entry.infoid}>
          <div><p>{entry.info}</p><small><Clock3 aria-hidden="true" /> {entry.datePretty}</small></div>
          <NewsDeleteButton infoid={entry.infoid} />
        </li>)}</ul>}
      </Section>

      <div className="info-wide">
        <Section id="stammdaten" icon={<UserRoundCog aria-hidden="true" />} title="Stammdaten verwalten">
          <BaseDataForm values={{
            adresse1: location.address1, adresse2: location.address2, plz: location.postalCode, ort: location.city,
            telefon: location.phone, email: location.email, www: location.website, zeiten: location.openingHours, preise: location.prices, info: location.info,
          }} />
        </Section>
      </div>

      <div className="info-wide">
        <Section id="bilder" icon={<Images aria-hidden="true" />} title="Bilder verwalten">
          <ImageUploadForm />
          <h3>Vorhandene Bilder</h3>
          {images.length === 0 ? <p className="admin-hint">Noch keine Bilder hochgeladen.</p> : <ul className="admin-images">{images.map((image) => <li key={image.imageId}>
            <AdminImage src={image.thumbnail} alt={image.text || `Bild ${image.imageId}`} />
            <p>{image.text || <span className="admin-hint">Ohne Beschreibung</span>}</p>
            <ImageDeleteButton imageId={image.imageId} />
          </li>)}</ul>}
        </Section>
      </div>
    </div>
  </main>;
}

function LoadError() {
  return <main id="main-content" className="site-shell page-main admin-main">
    <section className="detail-card error-card">
      <p className="eyebrow">Interner Bereich</p>
      <h1>Daten momentan nicht verfügbar</h1>
      <p>Die Daten Deines Bads konnten nicht geladen werden. Bitte versuche es später noch einmal.</p>
      <LogoutButton />
    </section>
  </main>;
}

export default async function AdminPage() {
  const session = await getSession();
  if (!session) return <LoginView />;

  const data = await Promise.all([getSwimmingLocation(session.badid, { fresh: true }), getNews(session.badid)]).catch((error: unknown) => {
    console.error('admin page failed', error instanceof WiewarmApiError ? error.message : error);
    return null;
  });
  return data ? <DashboardView location={data[0]} news={data[1]} shortPassword={session.pin.length <= SHORT_PASSWORD_LENGTH} /> : <LoadError />;
}
