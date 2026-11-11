import 'server-only';

// MeteoSwiss Open Data, local forecasts. The source must be cited: "Quelle: MeteoSchweiz".
const BASE = 'https://data.geo.admin.ch/ch.meteoschweiz.ogd-local-forecasting';
const META_POINT_URL = `${BASE}/ogd-local-forecasting_meta_point.csv`;
const PARAMETERS = ['tre200pn', 'tre200px', 'rka150p0', 'jp2000d0'] as const;
type Parameter = (typeof PARAMETERS)[number];
type DailyValues = Map<string, Map<string, number | null>>;

const FORECAST_DAYS = 4;
const CACHE_MS = 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 20_000;
const MAX_RUN_FALLBACK_HOURS = 4;
// Postal-code points have point_type_id 2; stations (1) and mountain points of interest are ignored.
const POSTAL_POINT_TYPE = '2';

export interface DailyForecast {
  date: string;
  minTemp: number | null;
  maxTemp: number | null;
  precipitationMm: number | null;
  symbol: number | null;
}

type ForecastsByPostalCode = Map<string, DailyForecast[]>;

export function parseCsv(content: string): string[][] {
  return content.split(/\r?\n/).filter(Boolean).map((line) => line.split(';'));
}

/** Maps MeteoSwiss point ids to postal codes. Several points may share a postal code; the lowest id wins. */
export function parsePostalPoints(content: string): Map<string, string> {
  const [header, ...rows] = parseCsv(content);
  const idColumn = header.indexOf('point_id');
  const typeColumn = header.indexOf('point_type_id');
  const postalColumn = header.indexOf('postal_code');
  const lowestId = new Map<string, number>();
  for (const row of rows) {
    const postalCode = row[postalColumn];
    const id = Number(row[idColumn]);
    if (row[typeColumn] !== POSTAL_POINT_TYPE || !postalCode || !Number.isFinite(id)) continue;
    if (id < (lowestId.get(postalCode) ?? Infinity)) lowestId.set(postalCode, id);
  }
  return new Map([...lowestId].map(([postalCode, id]) => [String(id), postalCode]));
}

/** Reads one daily parameter file into `postalCode -> YYYY-MM-DD -> value`. */
export function parseDailyValues(content: string, parameter: string, points: Map<string, string>): DailyValues {
  const [header, ...rows] = parseCsv(content);
  const idColumn = header.indexOf('point_id');
  const dateColumn = header.indexOf('Date');
  const valueColumn = header.indexOf(parameter);
  const values: DailyValues = new Map();
  for (const row of rows) {
    const postalCode = points.get(row[idColumn]);
    const stamp = row[dateColumn];
    if (!postalCode || !stamp || stamp.length < 8) continue;
    const date = `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)}`;
    const raw = row[valueColumn];
    const value = raw === undefined || raw === '' ? null : Number(raw);
    const days = values.get(postalCode) ?? new Map<string, number | null>();
    days.set(date, value !== null && Number.isFinite(value) ? value : null);
    values.set(postalCode, days);
  }
  return values;
}

export function buildForecasts(files: Record<Parameter, DailyValues>): ForecastsByPostalCode {
  const forecasts: ForecastsByPostalCode = new Map();
  for (const [postalCode, days] of files.tre200px) {
    forecasts.set(postalCode, [...days.keys()].sort().map((date) => ({
      date,
      minTemp: files.tre200pn.get(postalCode)?.get(date) ?? null,
      maxTemp: days.get(date) ?? null,
      precipitationMm: files.rka150p0.get(postalCode)?.get(date) ?? null,
      symbol: files.jp2000d0.get(postalCode)?.get(date) ?? null,
    })));
  }
  return forecasts;
}

function zurichDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zurich', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

async function fetchText(url: string): Promise<string | null> {
  const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`MeteoSwiss returned ${response.status} for ${url}`);
  return new TextDecoder('latin1').decode(await response.arrayBuffer());
}

function runUrl(run: Date, parameter: Parameter): string {
  const iso = run.toISOString();
  const day = iso.slice(0, 10).replaceAll('-', '');
  return `${BASE}/${day}-ch/vnut12.lssw.${day}${iso.slice(11, 13)}00.${parameter}.csv`;
}

/** Downloads the newest published run. A run appears a few minutes after the full hour, so fall back hour by hour. */
async function loadForecasts(): Promise<ForecastsByPostalCode> {
  const metaText = await fetchText(META_POINT_URL);
  if (!metaText) throw new Error('MeteoSwiss point metadata not found');
  const points = parsePostalPoints(metaText);

  const now = new Date();
  now.setUTCMinutes(0, 0, 0);
  for (let back = 0; back < MAX_RUN_FALLBACK_HOURS; back++) {
    const run = new Date(now.getTime() - back * 3_600_000);
    const texts = await Promise.all(PARAMETERS.map((parameter) => fetchText(runUrl(run, parameter))));
    if (texts.some((text) => text === null)) continue;
    const files = Object.fromEntries(PARAMETERS.map((parameter, index) => [parameter, parseDailyValues(texts[index]!, parameter, points)])) as Record<Parameter, DailyValues>;
    return buildForecasts(files);
  }
  throw new Error('No recent MeteoSwiss forecast run available');
}

const RETRY_AFTER_FAILURE_MS = 60 * 1000;
let cache: { forecasts: ForecastsByPostalCode; loadedAt: number } | null = null;
let inFlight: Promise<ForecastsByPostalCode> | null = null;
let lastFailureAt = 0;

function refresh(): Promise<ForecastsByPostalCode> {
  inFlight ??= loadForecasts()
    .then((forecasts) => {
      cache = { forecasts, loadedAt: Date.now() };
      return forecasts;
    })
    .catch((error: unknown) => {
      lastFailureAt = Date.now();
      throw error;
    })
    .finally(() => { inFlight = null; });
  return inFlight;
}

/** Serves the cached run immediately and refreshes it in the background once it is an hour old. */
async function getForecasts(): Promise<ForecastsByPostalCode> {
  if (cache && Date.now() - cache.loadedAt < CACHE_MS) return cache.forecasts;
  const recentlyFailed = Date.now() - lastFailureAt < RETRY_AFTER_FAILURE_MS;
  if (cache) {
    if (!recentlyFailed) refresh().catch(() => undefined);
    return cache.forecasts;
  }
  if (recentlyFailed) throw new Error('MeteoSwiss forecast temporarily unavailable');
  return refresh();
}

/** Forecast for today and the following days at the given Swiss postal code, or an empty list when unknown. */
export async function getLocalForecast(postalCode: string): Promise<DailyForecast[]> {
  const days = (await getForecasts()).get(postalCode.trim()) ?? [];
  const today = zurichDate(new Date());
  return days.filter((day) => day.date >= today).slice(0, FORECAST_DAYS);
}
