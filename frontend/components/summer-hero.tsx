import { Sun } from 'lucide-react';

export function SummerHero() {
  return <section className="summer-only summer-hero" aria-labelledby="summer-heading">
    <div className="summer-hero-copy">
      <p className="summer-eyebrow"><span /> Die Schweiz. Ein Sprung ins Glück.</p>
      <h1 id="summer-heading">Das Glück liegt am <span className="water-word">Wasser.<svg viewBox="0 0 310 16" aria-hidden="true"><path d="M3 9C62 1 124 14 186 7S267 3 306 7M21 14C104 7 196 16 281 11" /></svg></span></h1>
      <p className="summer-lead">Temperaturen checken. Badetuch einpacken. Ab ins Wasser.</p>
    </div>
    <div className="summer-postcard">
      <div className="postcard-art"><img src="/sommerfrische.svg" alt="Illustrierter Sommertag am Schweizer See: türkisblaues Wasser, Berge und ein gestreifter Sonnenschirm am Badesteg." width="640" height="420" fetchPriority="high" /></div>
      <div className="postcard-stamp" aria-hidden="true"><Sun /><span>AB INS<br /><strong>BLAUE!</strong></span><small>WIEWARM.CH</small></div>
      <p className="postcard-caption"><span>Grüsse vom Wasser.</span><span>♡</span></p>
    </div>
  </section>;
}
