import type { Metadata } from 'next';
import { Code2, Download, Handshake, Info, Link2, Scale, Smartphone, Users, Newspaper } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Info',
  description: 'Wissenswertes über wiewarm.ch: Mitmachen, Kontakt, Datenlizenz, API und Drittanwendungen.',
  alternates: { canonical: '/info' },
};

const team = [
  ['Marcel Hadorn', 'Entwicklung, CEO, CFO, CTO, Tätschmeischter', 'mh@wiewarm.ch'],
  ['Arwen Specht', 'Design', 'as@wiewarm.ch'],
  ['Christian Kaufmann', 'Entwicklung', 'ck@wiewarm.ch'],
  ['Christian Ramseyer', 'Entwicklung', 'rc@wiewarm.ch'],
  ['Kurt Marti', 'Mitinitiant, SMS-Interface Kit', 'info@aemmenet.ch'],
] as const;

const apps = [
  ['19 Grad', 'https://itunes.apple.com/de/app/19-grad/id1253503792?mt=8', 'Temperatur-App für offene Gewässer (iPhone und Android)', 'smoca'],
  ['Badi App', 'https://apps.apple.com/ch/app/badi-app/id6504495943', 'iOS App inkl. Features im Login-Bereich', 'Stefan Schwinghammer'],
  ['Badi Buddy – Schweiz', 'https://apps.apple.com/ch/app/badi-buddy-schweiz/id6825506967', 'iPhone-App zum Erfassen von Badebesuchen in Schweizer Seen, Flüssen und Badis – mit Wassertemperaturen und Punkten', 'Christian Baracchi'],
  ['GraphQL Wrapper', 'https://github.com/raphael-gosteli/wiewarm-GraphQL', 'GraphQL Wrapper für die wiewarm.ch API', 'Raphael Gosteli'],
  ['Wiewarm Android App', 'https://play.google.com/store/apps/details?id=ch.simonste.wiewarm', 'Neuer Android Client von Simon Steinmann', 'Simon Steinmann'],
  ['wiewarm-ha', 'https://github.com/eric-staedler/wiewarm-ha', 'Home Assistant Integration', 'Eric Staedler'],
] as const;

const links = [
  ['Links rund ums Baden', [
    ['bad.ch – Schweizerische Schwimmbäder und ihre Partner', 'http://www.bad.ch'],
    ['Schweizer Badmeisterverband', 'http://www.badmeister.ch'],
    ['Badi-Info – Schweizer Schwimmbadportal', 'http://www.badi-info.ch'],
    ['swimsports.ch – Interverband für Schwimmen', 'http://www.swimsports.ch'],
    ['Schweizerische Lebensrettungs-Gesellschaft SLRG', 'http://www.slrg.ch'],
  ]],
] as const;

export default function InfoPage() {
  return <main id="main-content" className="site-shell page-main info-main">
    <header className="info-intro">
      <p className="eyebrow"><Info aria-hidden="true" /> Info</p>
      <h1>Wissenswertes über wiewarm.ch</h1>
      <p>Seit 2001 sammelt wiewarm.ch die Wassertemperaturen der Schweizer Badis, Seen und Flüsse.</p>
    </header>

    <div className="info-grid">
      <section className="detail-card info-card" aria-labelledby="mitmachen">
        <div className="section-heading"><span className="section-icon"><Handshake aria-hidden="true" /></span><h2 id="mitmachen"><a className="info-section-link" href="#mitmachen">Wie kann mein Bad bei wiewarm.ch mitmachen?<Link2 aria-hidden="true" /></a></h2></div>
        <p><strong>Betreibst Du eine Badi?</strong> Damit diese Seiten für möglichst viele Leute nützlich sind, benötigen wir die Temperaturen möglichst vieler Badeanstalten. Du brauchst dafür keine spezielle Infrastruktur vor Ort: Die Daten können direkt über die Website erfasst und aktualisiert werden.</p>
        <p>Mit einem Computer oder Smartphone in Deiner Badi kannst Du die Wassertemperaturen jederzeit selber aktualisieren. Auch Adresse, Öffnungszeiten, Eintrittspreise und Infos rund um Dein Bad kannst Du selber anpassen.</p>
        <p><strong>Der Service von wiewarm.ch ist kostenlos.</strong></p>
        <h3>So funktioniert es</h3>
        <p>Gleich nach Deiner Anmeldung erhältst Du eine Badnummer sowie das dazugehörige Passwort. Nach dem Login kannst Du in einer Maske die Wassertemperaturen aktualisieren und zusätzlich folgende Angaben ändern:</p>
        <ul><li>Anschrift des Bads</li><li>Öffnungszeiten</li><li>Eintrittspreise</li><li>Infos rund um Dein Bad</li></ul>
        <p>Neben den Temperaturen kannst Du auch Hinweise für Badegäste erfassen, zum Beispiel spezielle Öffnungszeiten, wetterbedingte Schliessungen oder andere aktuelle Informationen.</p>
        <p><strong>Haben wir Dich überzeugt?</strong> Dann melde Dich per <a href="mailto:mh@wiewarm.ch">E-Mail</a> an.</p>
      </section>

      <section className="detail-card info-card" aria-labelledby="kontakt">
        <div className="section-heading"><span className="section-icon"><Users aria-hidden="true" /></span><h2 id="kontakt"><a className="info-section-link" href="#kontakt">Wer steckt hinter wiewarm.ch / Kontakt<Link2 aria-hidden="true" /></a></h2></div>
        <p>Für Anfragen sämtlicher Art wende Dich bitte an <a href="mailto:info@wiewarm.ch">info@wiewarm.ch</a>.</p>
        <h3>Erstellt mit Hilfe von …</h3>
        <ul className="info-team">{team.map(([name, role, email]) => <li key={email}><span><strong>{name}</strong> <small>{role}</small></span><a href={`mailto:${email}`}>{email}</a></li>)}</ul>
      </section>

      <section className="detail-card info-card" aria-labelledby="lizenz">
        <div className="section-heading"><span className="section-icon"><Scale aria-hidden="true" /></span><h2 id="lizenz"><a className="info-section-link" href="#lizenz">Daten unter Creative Commons Lizenz<Link2 aria-hidden="true" /></a></h2></div>
        <p>Alle auf wiewarm.ch erhobenen Daten unterstehen der <a href="https://creativecommons.org/licenses/by-sa/3.0/">CC BY-SA 3.0 Lizenz</a>. Die Daten dürfen frei kopiert und adaptiert werden, solange folgende Bedingungen eingehalten werden:</p>
        <ul>
          <li><strong>Namensnennung</strong> – Der Name des Rechteinhabers muss genannt werden. In unserem Fall: «<a href="https://www.wiewarm.ch">http://www.wiewarm.ch</a> sowie teilnehmende Badeanstalten und Individuen». Falls es das Medium erlaubt, sollte die URL ein Hyperlink sein.</li>
          <li><strong>Weitergabe unter gleichen Bedingungen</strong> – Bearbeitete oder darauf aufbauende Werke dürfen nur unter identischen oder vergleichbaren Lizenzbedingungen weitergegeben werden.</li>
        </ul>
        <p>Weitergehende Nutzungsrechte sind auf Anfrage erhältlich: <a href="mailto:info@wiewarm.ch">info@wiewarm.ch</a>.</p>
      </section>

      <section className="detail-card info-card" aria-labelledby="api">
        <div className="section-heading"><span className="section-icon"><Code2 aria-hidden="true" /></span><h2 id="api"><a className="info-section-link" href="#api">JSON API<Link2 aria-hidden="true" /></a></h2></div>
        <p>Ein API steht zur Verfügung, siehe <a href="https://www.wiewarm.ch/api/doc/index.html">www.wiewarm.ch/api/doc</a>. Bitte <a href="mailto:info@wiewarm.ch">kontaktiere uns</a> für weitere Informationen zur Benutzung.</p>
      </section>

      <section className="detail-card info-card" aria-labelledby="export">
        <div className="section-heading"><span className="section-icon"><Download aria-hidden="true" /></span><h2 id="export"><a className="info-section-link" href="#export">Datenexport<Link2 aria-hidden="true" /></a></h2></div>
        <p>Die aktuellen Daten des Tages können als <a href="https://www.wiewarm.ch/xmlData.php">XML-File</a> heruntergeladen werden. CSV-Files aller Messwerte seit 2001 sind auf <a href="https://github.com/rc9000/wiewarm-data">GitHub</a> erhältlich.</p>
      </section>

      <section className="detail-card info-card info-wide" aria-labelledby="apps">
        <div className="section-heading"><span className="section-icon"><Smartphone aria-hidden="true" /></span><h2 id="apps"><a className="info-section-link" href="#apps">Auf wiewarm.ch basierende Dritt-Applikationen, Widgets, Gadgets etc.<Link2 aria-hidden="true" /></a></h2></div>
        <ul className="info-apps">{apps.map(([title, href, description, contact]) => <li key={title}><a href={href}>{title}</a><span>{description}</span><small>{contact}</small></li>)}</ul>
        <p>Diese Applikationen werden nicht von wiewarm.ch supportet. Für Fragen oder Anregungen wende Dich bitte an den jeweiligen Kontakt. Wenn Du selber eine wiewarm-basierte Applikation entwickeln möchtest: gerne! <a href="mailto:info@wiewarm.ch">Kontaktiere uns</a>, damit wir Deine Entwicklung in dieses Verzeichnis aufnehmen können.</p>
      </section>

      <section className="detail-card info-card info-wide" aria-labelledby="links">
        <div className="section-heading"><span className="section-icon"><Link2 aria-hidden="true" /></span><h2 id="links"><a className="info-section-link" href="#links">Links<Link2 aria-hidden="true" /></a></h2></div>
        <div className="info-links">{links.map(([heading, entries]) => <div key={heading}>
          <h3>{heading}</h3>
          <ul>{entries.map(([label, href]) => <li key={href}><a href={href}>{label}</a></li>)}</ul>
        </div>)}</div>
      </section>
      <section className="detail-card info-card info-wide" aria-labelledby="media">
        <div className="section-heading"><span className="section-icon"><Newspaper aria-hidden="true" /></span><h2 id="media"><a className="info-section-link" href="#media">wiewarm in den Medien<Link2 aria-hidden="true" /></a></h2></div>
        <ul>
          <li>Reportage im Burgdorfer Tagblatt (oder ähnlich, leider nicht mehr bekannt), ca. 2001 oder 2002 – <a href="https://www.wiewarm.ch/img-dist/zeitung_2001_l.png">Screenshot</a></li>
          <li>«Drei Berner Buben bringen Badi-Temperaturen ins Netz» – SRF Digital, 04.05.2026 – <a href="https://www.srf.ch/news/schweiz/wie-warm-isch-d-badi-drei-berner-buben-bringen-badi-temperaturen-ins-netz">Textversion + Audio</a></li>
          <li>«Wie warm ist das Badi-Wasser?» – SRF Regionaljournal, 10.05.2026 – <a href="https://www.srf.ch/audio/regionaljournal-bern-freiburg-wallis/wie-warm-ist-das-badi-wasser-drei-berner-helfen-seit-25-jahren?id=AUDI20260510_NR_0016">Audio</a></li>
        </ul>
      </section>
    </div>
  </main>;
}
