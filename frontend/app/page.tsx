import Link from 'next/link';
import { ArrowDown, ArrowRight, ArrowUp, Search, ThermometerSun, Waves, X } from 'lucide-react';
import { SummerHero } from '@/components/summer-hero';
import { Button } from '@/components/ui/button';
import { SearchAutocomplete } from '@/components/search-autocomplete';
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatTemperature } from '@/lib/format-temperature';
import { getCurrentTemperatures } from '@/lib/wiewarm-api';
import { filterAndSortTemperatures, parseTemperatureQuery, toQueryString, type SortColumn, type TemperatureQuery } from '@/lib/temperature-query';

type Params = Record<string, string | string[] | undefined>;
const columnLabels: Record<SortColumn, string> = { ort: 'Ort', bad: 'Bad / Gewässer', becken: 'Messstelle', temp: 'Temperatur', date: 'Gemessen', plz: 'PLZ', kanton: 'Kanton' };

function SortLink({ column, query }: { column: SortColumn; query: TemperatureQuery }) {
  const active = query.sort === column;
  const nextDirection = active && query.direction === 'asc' ? 'desc' : 'asc';
  return <Link className="sort-link" href={`/?${toQueryString(query, { sort: column, direction: nextDirection, page: 1 })}#temperaturen`} aria-label={`${columnLabels[column]} sortieren`}>
    {columnLabels[column]}{active ? (query.direction === 'asc' ? <ArrowUp aria-hidden="true" /> : <ArrowDown aria-hidden="true" />) : null}
  </Link>;
}

export default async function Home({ searchParams }: { searchParams?: Promise<Params> }) {
  const query = parseTemperatureQuery((await searchParams) ?? {});
  let rows;
  try {
    rows = await getCurrentTemperatures();
  } catch (error) {
    console.error('Could not load current temperatures', error);
    return <TemperatureError />;
  }

  const filtered = filterAndSortTemperatures(rows, query);
  const resultLabel = filtered.length === 1 ? 'Eintrag' : 'Einträge';
  const pageSize = query.pageSize === 'all' ? Math.max(filtered.length, 1) : query.pageSize;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(query.page, pageCount);
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  const cantons = [...new Set(rows.map((row) => row.kanton).filter(Boolean))].sort();
  const suggestions = [...new Set(rows.flatMap((row) => [row.ort, row.bad]).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'de-CH'));
  const hasFilters = Boolean(query.q || query.ort || query.bad || query.becken || query.plz || query.kanton);

  return <main id="main-content" className="site-shell page-main home-main">
    <SummerHero />
    <section className="finder-card" id="temperaturen" aria-label={`Temperatursuche mit ${rows.length} Messwerten`}>
      <div className="summer-only finder-heading"><h2>Wassertemperaturen</h2><span><Waves aria-hidden="true" /> Badis, Seen & Flüsse</span></div>
      <form key={`search-${toQueryString(query)}`} className="filter-bar" action="/#temperaturen" method="get">
        <SearchAutocomplete suggestions={suggestions} defaultValue={query.q} placeholder="Ort, Badi oder Gewässer suchen …" />
        <label className="summer-only canton-filter"><span className="sr-only">Kanton</span><select name="kanton" defaultValue={query.kanton}><option value="">Alle Kantone</option>{[...new Set([...cantons, ...(query.kanton ? [query.kanton] : [])])].sort().map((canton) => <option key={canton} value={canton}>{canton}</option>)}</select></label>
        <button className="summer-only search-submit" type="submit">Ab ans Wasser <ArrowRight aria-hidden="true" /></button>
        <input type="hidden" name="sort" value={query.sort} /><input type="hidden" name="direction" value={query.direction} />
        <input type="hidden" name="pageSize" value={query.pageSize} />
        {(['ort', 'bad', 'becken', 'plz'] as const).map((key) => query[key] ? <input key={key} type="hidden" name={key} value={query[key]} /> : null)}
      </form>
      <div className="summer-only quick-search"><span>Zum Beispiel</span>{['Zürich', 'Bern', 'Luzern', 'Basel', 'Aare'].map((place) => <Link key={place} href={`/?${toQueryString(query, { q: place, ort: '', bad: '', becken: '', plz: '', kanton: '', page: 1 })}#temperaturen`} aria-current={query.q === place ? 'true' : undefined}>{place}<ArrowRight aria-hidden="true" /></Link>)}</div>

      <div className="result-bar"><div className="result-summary"><p><strong>{filtered.length}</strong> {resultLabel}</p>{hasFilters ? <Link className="clear-filters" href={`/?${toQueryString(query, { q: '', ort: '', bad: '', becken: '', plz: '', kanton: '', page: 1 })}#temperaturen`}><X aria-hidden="true" /> Filter löschen</Link> : <span className="summer-only result-hint">Für deinen nächsten Ausflug</span>}</div>
        <form key={`size-${toQueryString(query)}`} action="/#temperaturen" method="get" className="page-size-form">
          {(['q', 'ort', 'bad', 'becken', 'plz', 'kanton', 'sort', 'direction'] as const).map((key) => query[key] ? <input key={key} type="hidden" name={key} value={String(query[key])} /> : null)}
          <label htmlFor="page-size">Pro Seite</label>
          <Select name="pageSize" defaultValue={String(query.pageSize)}><SelectTrigger id="page-size"><SelectValue /></SelectTrigger><SelectContent>
            {[10, 25, 50].map((size) => <SelectItem key={size} value={String(size)}>{size}</SelectItem>)}<SelectItem value="all">Alle</SelectItem>
          </SelectContent></Select><Button type="submit" variant="outline">Übernehmen</Button>
        </form>
      </div>

      {visible.length ? <Table className="temperature-table"><TableHeader><TableRow>
        {(['ort', 'bad', 'becken', 'temp', 'date', 'plz', 'kanton'] as SortColumn[]).map((column) => <TableHead key={column} aria-sort={query.sort === column ? (query.direction === 'asc' ? 'ascending' : 'descending') : undefined}><SortLink column={column} query={query} /></TableHead>)}
      </TableRow></TableHeader><TableBody>{visible.map((row) => <TableRow key={row.beckenid}>
        <TableCell className="location-cell">{row.ort}</TableCell>
        <TableCell><Link className="pool-link" href={`/bad/${encodeURIComponent(row.badidText)}`}>{row.bad}</Link></TableCell>
        <TableCell>{row.becken}</TableCell><TableCell><span className="temperature-value" data-warmth={row.temp >= 22 ? 'warm' : row.temp >= 16 ? 'mild' : 'cool'}>{formatTemperature(row.temp)}</span></TableCell>
        <TableCell><time dateTime={row.date}>{row.datePretty}</time>{Date.now() - Date.parse(row.date) > 7 * 86_400_000 ? <small className="summer-only outdated-reading">Älterer Messwert</small> : null}</TableCell><TableCell>{row.plz || '–'}</TableCell>
        <TableCell><span className="canton-pill">{row.kanton || '–'}</span></TableCell>
      </TableRow>)}</TableBody></Table> : <div className="empty-state"><Search aria-hidden="true" /><h2>Hier ist es noch ganz still.</h2><p>Für diese Suche haben wir keine Messwerte. Versuche einen anderen Ort.</p><Link className="button-link" href="/#temperaturen">Alle Temperaturen anzeigen <ArrowRight aria-hidden="true" /></Link></div>}

      {query.pageSize !== 'all' && pageCount > 1 ? <Pagination className="table-pagination"><PaginationContent>
        <PaginationItem><PaginationPrevious text="Zurück" href={page > 1 ? `/?${toQueryString(query, { page: page - 1 })}#temperaturen` : undefined} aria-label="Vorherige Seite" aria-disabled={page <= 1} /></PaginationItem>
        <PaginationItem><span className="page-indicator">Seite {page} von {pageCount}</span></PaginationItem>
        <PaginationItem><PaginationNext text="Weiter" href={page < pageCount ? `/?${toQueryString(query, { page: page + 1 })}#temperaturen` : undefined} aria-label="Nächste Seite" aria-disabled={page >= pageCount} /></PaginationItem>
      </PaginationContent></Pagination> : null}
      <p className="summer-only measurement-note"><ThermometerSun aria-hidden="true" /> Jeder Ort misst in seinem eigenen Rhythmus. Beachte den Zeitpunkt der Messung.</p>
    </section>
    <aside className="summer-only summer-signoff"><SunIllustration /><div><p>Die besten Pläne?<br /><strong>Haben Wasser drin.</strong></p><span>Badetuch einpacken. Lieblingsmenschen mitnehmen.</span></div><a href="#temperaturen" aria-label="Zurück zur Temperatursuche"><ArrowUp aria-hidden="true" /></a></aside>
  </main>;
}

function SunIllustration() {
  return <svg className="signoff-sun" viewBox="0 0 100 100" fill="none" aria-hidden="true"><g stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="50" cy="50" r="23" />{Array.from({ length: 12 }, (_, i) => <path key={i} d="M50 10v9" transform={`rotate(${i * 30} 50 50)`} />)}<path d="M42 54q8 10 16 0M42 44v3m16-3v3" /></g></svg>;
}

function TemperatureError() {
  return <main id="main-content" className="site-shell page-main"><section className="error-card"><ThermometerSun aria-hidden="true" />
    <p className="eyebrow">Kurze Abkühlung</p><h1>Temperaturen gerade nicht erreichbar</h1>
    <p>Die aktuellen Messwerte konnten nicht geladen werden. Bitte versuche es in einem Moment erneut.</p>
    <Link className="button-link" href="/">Erneut versuchen</Link>
  </section></main>;
}
