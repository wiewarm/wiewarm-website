import 'server-only';
import { MAX_RANGE_DAYS, type TemperatureTimeseries, type TimeseriesPoint, type TimeseriesPool } from '@/lib/timeseries';

// Override with WIEWARM_ORIGIN (e.g. https://beta.wiewarm.ch) to run against another environment.
const API_ORIGIN = (process.env.WIEWARM_ORIGIN || 'https://www.wiewarm.ch').replace(/\/+$/, '');
export const API_BASE = `${API_ORIGIN}/api/v1`;

export class WiewarmApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'WiewarmApiError';
  }
}

export interface CurrentTemperature {
  badid: string;
  badidText: string;
  bad: string;
  ort: string;
  plz: string;
  kanton: string;
  beckenid: string;
  becken: string;
  temp: number;
  date: string;
  datePretty: string;
  latitude: number | null;
  longitude: number | null;
  images: string[];
}

export interface Basin {
  beckenid: string;
  name: string;
  temp: number | null;
  date: string;
  datePretty: string;
  type: string;
  status: string;
  isMain: boolean;
}

export interface LocationImage {
  image: string;
  thumbnail: string;
  original: string;
  text: string;
}

export interface LocationNotice {
  date: string;
  datePretty: string;
  info: string;
}

export interface WeatherEntry {
  symbol: string;
  temperature: number | null;
  date: string;
  datePretty: string;
}

export interface SwimmingLocationDetail {
  badid: string;
  name: string;
  canton: string;
  postalCode: string;
  city: string;
  address1: string;
  address2: string;
  email: string;
  phone: string;
  website: string;
  openingHours: string;
  prices: string;
  info: string;
  latitude: number | null;
  longitude: number | null;
  uvStationName: string;
  uvValue: number | null;
  uvDate: string;
  uvDatePretty: string;
  basins: Basin[];
  images: LocationImage[];
  notices: LocationNotice[];
  weather: WeatherEntry[];
}

export function latestLocationNews(notices: LocationNotice[], limit = 3): LocationNotice[] {
  return [...notices]
    .sort((left, right) => {
      const leftTime = Date.parse(left.date || right.date);
      const rightTime = Date.parse(right.date || left.date);
      if (Number.isNaN(leftTime) && Number.isNaN(rightTime)) return 0;
      if (Number.isNaN(leftTime)) return 1;
      if (Number.isNaN(rightTime)) return -1;
      return rightTime - leftTime;
    })
    .slice(0, limit);
}

export interface ApiResult<T> {
  data: T;
  receivedAt: string;
}

export interface SwimmingLocationReference {
  badid: string;
  badidText: string;
}

type UnknownRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function text(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value).trim()
    : '';
}

export function finiteNumber(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function normalizeRouteIdentifier(identifier: string): string {
  try {
    return decodeURIComponent(identifier);
  } catch {
    return identifier;
  }
}

function normalizeCurrentTemperature(value: unknown): CurrentTemperature | null {
  if (!isRecord(value)) return null;
  const badid = text(value.badid);
  const beckenid = text(value.beckenid);
  const bad = text(value.bad);
  const becken = text(value.becken);
  const ort = text(value.ort);
  const temp = finiteNumber(value.temp);
  const date = text(value.date);

  if (!badid || !beckenid || !bad || !becken || !ort || temp === null || !date) return null;

  return {
    badid,
    badidText: text(value.badid_text) || badid,
    bad,
    ort,
    plz: text(value.plz),
    kanton: text(value.kanton).toUpperCase(),
    beckenid,
    becken,
    temp,
    date,
    datePretty: text(value.date_pretty) || date,
    latitude: finiteNumber(value.ortlat),
    longitude: finiteNumber(value.ortlong),
    images: Array.isArray(value.images) ? value.images.map(text).filter(Boolean) : [],
  };
}

export async function getJson(path: string, options: { fresh?: boolean } = {}): Promise<unknown> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { accept: 'application/json' },
    ...(options.fresh ? { cache: 'no-store' as const } : { next: { revalidate: 300 } }),
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) throw new WiewarmApiError(`wiewarm API returned ${response.status}`, response.status);
  try {
    return await response.json();
  } catch {
    throw new WiewarmApiError('wiewarm API returned invalid JSON', response.status);
  }
}

export async function getCurrentTemperatures(): Promise<CurrentTemperature[]> {
  const payload = await getJson('/temperature/all_current.json/0');
  if (!Array.isArray(payload)) throw new WiewarmApiError('Unexpected temperature response');
  const rows = payload.map(normalizeCurrentTemperature).filter((row): row is CurrentTemperature => row !== null);
  if (rows.length !== payload.length) console.warn(`Ignored ${payload.length - rows.length} malformed temperature records`);
  return rows;
}

export function wiewarmAssetUrl(path: string): string {
  return new URL(path.replace(/^\/+/, ''), `${API_ORIGIN}/`).toString();
}

function coordinate(value: unknown): number | null {
  const number = finiteNumber(value);
  if (number === null) return null;
  return Math.abs(number) > 180 ? number / 1_000_000 : number;
}

function safeWebsite(value: unknown): string {
  const input = text(value);
  if (!input) return '';
  try {
    const url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
  } catch {
    return '';
  }
}

function normalizeBasin(value: unknown): Basin | null {
  if (!isRecord(value)) return null;
  const beckenid = text(value.beckenid);
  const name = text(value.beckenname);
  if (!beckenid || !name) return null;
  return {
    beckenid,
    name,
    temp: value.temp === null || value.temp === '' ? null : finiteNumber(value.temp),
    date: text(value.date),
    datePretty: text(value.date_pretty) || text(value.date),
    type: text(value.typ),
    status: text(value.status),
    isMain: text(value.ismain).toLowerCase() === 't',
  };
}

function normalizeImage(value: unknown): LocationImage | null {
  if (!isRecord(value) || !text(value.image)) return null;
  const image = wiewarmAssetUrl(text(value.image));
  return {
    image,
    thumbnail: text(value.thumbnail) ? wiewarmAssetUrl(text(value.thumbnail)) : image,
    original: text(value.original) ? wiewarmAssetUrl(text(value.original)) : image,
    text: text(value.text) || text(value.description),
  };
}

function normalizeNotice(value: unknown): LocationNotice | null {
  if (!isRecord(value) || !text(value.info)) return null;
  return { date: text(value.date), datePretty: text(value.date_pretty) || text(value.date), info: text(value.info) };
}

function normalizeWeather(value: unknown): WeatherEntry | null {
  if (!isRecord(value) || !text(value.wetter_date)) return null;
  return {
    symbol: text(value.wetter_symbol),
    temperature: finiteNumber(value.wetter_temp),
    date: text(value.wetter_date),
    datePretty: text(value.wetter_date_pretty) || text(value.wetter_date),
  };
}

export async function getSwimmingLocation(identifier: string, options: { fresh?: boolean } = {}): Promise<SwimmingLocationDetail> {
  const normalizedIdentifier = normalizeRouteIdentifier(identifier);
  const payload = await getJson(`/bad.json/${encodeURIComponent(normalizedIdentifier)}`, options);
  if (!isRecord(payload) || !text(payload.badid) || !text(payload.badname) || !text(payload.ort)) {
    throw new WiewarmApiError('Unexpected swimming location response');
  }
  const basinValues = isRecord(payload.becken) ? Object.values(payload.becken) : [];
  return {
    badid: text(payload.badid), name: text(payload.badname), canton: text(payload.kanton).toUpperCase(),
    postalCode: text(payload.plz), city: text(payload.ort), address1: text(payload.adresse1), address2: text(payload.adresse2),
    email: text(payload.email), phone: text(payload.telefon), website: safeWebsite(payload.www),
    openingHours: text(payload.zeiten), prices: text(payload.preise), info: text(payload.info),
    latitude: coordinate(payload.lat), longitude: coordinate(payload.long),
    uvStationName: text(payload.uv_station_name), uvValue: finiteNumber(payload.uv_wert),
    uvDate: text(payload.uv_date), uvDatePretty: text(payload.uv_date_pretty) || text(payload.uv_date),
    basins: basinValues.map(normalizeBasin).filter((value): value is Basin => value !== null),
    images: (Array.isArray(payload.bilder) ? payload.bilder : []).map(normalizeImage).filter((value): value is LocationImage => value !== null),
    notices: (Array.isArray(payload.infos) ? payload.infos : []).map(normalizeNotice).filter((value): value is LocationNotice => value !== null),
    weather: (Array.isArray(payload.wetter) ? payload.wetter : []).map(normalizeWeather).filter((value): value is WeatherEntry => value !== null),
  };
}

export async function getSwimmingLocationReferences(): Promise<SwimmingLocationReference[]> {
  const payload = await getJson('/bad.json');
  if (!Array.isArray(payload)) throw new WiewarmApiError('Unexpected swimming location list response');
  return payload.flatMap((value) => {
    if (!isRecord(value)) return [];
    const badid = text(value.badid);
    const badidText = text(value.badid_text);
    return badid ? [{ badid, badidText: badidText || badid }] : [];
  });
}

export async function swimmingLocationExists(identifier: string): Promise<boolean> {
  const normalizedIdentifier = normalizeRouteIdentifier(identifier);
  const references = await getSwimmingLocationReferences();
  return references.some((reference) => reference.badid === normalizedIdentifier || reference.badidText === normalizedIdentifier);
}

function normalizeTimeseries(payload: unknown): TemperatureTimeseries {
  if (!isRecord(payload) || !Array.isArray(payload.becken) || !Array.isArray(payload.data)) throw new WiewarmApiError('Unexpected timeseries response');
  const pools = payload.becken.flatMap((value): TimeseriesPool[] => {
    if (!isRecord(value) || !text(value.beckenid)) return [];
    return [{ beckenid: text(value.beckenid), name: text(value.beckenname) || text(value.beckenid) }];
  });
  const points = payload.data.flatMap((value): TimeseriesPoint[] => {
    if (!isRecord(value) || !text(value.date)) return [];
    const readings = isRecord(value.temperatures) ? value.temperatures : {};
    const temperatures: Record<string, number | null> = {};
    for (const pool of pools) temperatures[pool.beckenid] = readings[pool.beckenid] == null ? null : finiteNumber(readings[pool.beckenid]);
    return [{ date: text(value.date), temperatures }];
  });
  return { pools, points };
}

export async function getTemperatureTimeseries(badid: string): Promise<TemperatureTimeseries> {
  if (!/^\d+$/.test(badid)) throw new WiewarmApiError('Invalid badid');
  return normalizeTimeseries(await getJson(`/bad/${badid}/timeseries.json?days=${MAX_RANGE_DAYS}`));
}
