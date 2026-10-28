import { Heart, Waves } from 'lucide-react';

export function SiteFooter() {
  return <footer className="site-footer" id="ueber">
    <div className="site-shell summer-only summer-footer-intro">
      <div><Waves aria-hidden="true" /><p>Für alle, die lieber<br /><strong>am Wasser sind.</strong></p></div>
      <p>Seit 2001 bringt wiewarm.ch die Wassertemperaturen<br className="desktop-break" /> der Schweiz an einen Ort. Für deinen nächsten Sprung ins Glück.</p>
      <span className="footer-love"><Heart aria-hidden="true" /> Von hier. Für draussen.</span>
    </div>
    <div className="site-shell footer-inner">
    <p>© wiewarm.ch 2001–{new Date().getFullYear()}</p>
    <p>Daten unter <a href="https://creativecommons.org/licenses/by-sa/3.0/">CC BY-SA 3.0</a>{' · '}<a href="https://github.com/wiewarm/wiewarm-website">Open Source</a></p>
  </div></footer>;
}
