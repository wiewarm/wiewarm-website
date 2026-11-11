import type { Metadata } from 'next';
import Link from 'next/link';
import { CookieSettingsButton } from '@/components/cookie-consent';
import { analyticsId } from '@/lib/consent';

export const metadata: Metadata = {
  title: 'Datenschutz',
  alternates: { canonical: '/datenschutz' },
};

export default function PrivacyPage() {
  const analyticsEnabled = Boolean(analyticsId(process.env));
  return <main id="main-content" className="site-shell page-main info-main">
    <header className="info-intro"><h1>Datenschutz und Cookies</h1>
      <p>Hier erfährst Du, welche Daten beim Besuch von wiewarm.ch verarbeitet werden und wie Du Deine Auswahl ändern kannst.</p>
      <CookieSettingsButton />
    </header>
    <div className="info-grid">
      <section className="detail-card info-card">
        <h2>Kontakt und Deine Rechte</h2>
        <p>Bei Fragen zur Datenverarbeitung auf wiewarm.ch erreichst Du das Betreiberteam unter <a href="mailto:info@wiewarm.ch">info@wiewarm.ch</a>. Weitere Kontakte findest Du auf der <Link href="/info">Info-Seite</Link>.</p>
        <p>Du kannst Auskunft, Berichtigung oder Löschung Deiner personenbezogenen Daten verlangen. Je nach anwendbarem Recht stehen Dir auch Einschränkung der Verarbeitung, Datenübertragbarkeit, Widerspruch und eine Beschwerde bei der zuständigen Datenschutzbehörde zu.</p>
      </section>
      <section className="detail-card info-card">
        <h2>Notwendige Speicherung</h2>
        <p>Wir speichern Deine Cookie-Auswahl im Browser unter <code>wiewarm-consent-v1</code> für 180 Tage. Sie enthält die Entscheidung zur Analyse, eine Versionsnummer und den Ablaufzeitpunkt, keine Besucherkennung. Danach fragen wir erneut.</p>
        <p>Bei einer Anmeldung speichert das Cookie <code>wiewarm_admin</code> die für die API benötigten Zugangsdaten verschlüsselt für höchstens acht Stunden. Es ist nicht durch JavaScript lesbar. Beim Abmelden wird es gelöscht.</p>
        <p>Von Dir gewählte Designs und Schriftarten werden lokal im Browser gespeichert, bis Du die Browserdaten löschst. Der Schrift-Auswahlmodus gilt für die Browsersitzung. Diese Einstellungen werden nicht an Google gesendet.</p>
      </section>
      <section className="detail-card info-card info-wide">
        <h2>Freiwillige Nutzungsanalyse</h2>
        <p>{analyticsEnabled ? 'Google Analytics 4 ist auf dieser Website verfügbar, wird aber erst nach «Analyse erlauben» geladen.' : 'Google Analytics ist auf dieser Umgebung ausgeschaltet. Es werden keine Google-Analytics-Skripte geladen.'}</p>
        <p>Bei aktivierter Analyse und Deiner Einwilligung verarbeitet Google Ireland Limited (Gordon House, Barrow Street, Dublin 4, Irland) Informationen über Seitenaufrufe, Deinen Browser und Dein Gerät sowie die beim Verbindungsaufbau übermittelte IP-Adresse. Dabei können Daten auch in den USA verarbeitet werden.</p>
        <p>Die Analyse beruht auf Deiner freiwilligen Einwilligung (Art. 6 Abs. 1 lit. a DSGVO, soweit anwendbar). Ohne Zustimmung laden wir den Google-Tag nicht und senden auch keine cookielosen Analyse-Anfragen. Der Login- und Verwaltungsbereich ist von unserer Analyse ausgeschlossen.</p>
        <p>Die Analyse-Cookies <code>_ga</code> und <code>_ga_…</code> dienen der Wiedererkennung von Besuchen. Wir begrenzen ihre Laufzeit auf 180 Tage ohne automatische Verlängerung. Werbefunktionen und Google Signals sind deaktiviert. Unsere Seitenaufruf-Ereignisse enthalten keine Suchparameter oder URL-Fragmente.</p>
        <p>Du kannst Deine Einwilligung jederzeit über <CookieSettingsButton /> widerrufen. Dann stoppen wir die Analyse, löschen erreichbare Analyse-Cookies und laden die Seite neu. Bereits übermittelte Daten werden dadurch nicht rückwirkend gelöscht; die Rechtmässigkeit der bisherigen Verarbeitung bleibt unberührt.</p>
        <p>Weitere Informationen: <a href="https://policies.google.com/privacy">Datenschutzerklärung von Google</a> und <a href="https://support.google.com/analytics/answer/6004245">Datenschutz bei Google Analytics</a>.</p>
      </section>
      <section className="detail-card info-card info-wide">
        <h2>Bereitstellung der Website und externe Links</h2>
        <p>Für die Bereitstellung und Absicherung der Website verarbeiten die Webserver Verbindungsdaten, darunter IP-Adresse, Zeitpunkt, angeforderte Adresse und Browserinformationen. Die Cookie-Auswahl schaltet diese technisch notwendigen Server-Anfragen nicht ab.</p>
        <p>Schriftarten werden von unserer Website ausgeliefert. Links zu Google Maps und anderen externen Angeboten öffnen deren Websites erst, wenn Du den Link auswählst; dort gelten die jeweiligen Datenschutzbedingungen.</p>
      </section>
    </div>
  </main>;
}
