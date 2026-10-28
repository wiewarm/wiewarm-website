export interface TimeseriesPool {
  beckenid: string;
  name: string;
}

export interface TimeseriesPoint {
  date: string;
  temperatures: Record<string, number | null>;
}

export interface TemperatureTimeseries {
  pools: TimeseriesPool[];
  points: TimeseriesPoint[];
}

export const RANGE_OPTIONS = [7, 14, 30, 60, 90] as const;
export type RangeDays = (typeof RANGE_OPTIONS)[number];
export const DEFAULT_RANGE_DAYS: RangeDays = 30;
export const MAX_RANGE_DAYS = 90;

// The API returns days + 1 dates, ending at the latest reading.
export function sliceRange(points: TimeseriesPoint[], days: number): TimeseriesPoint[] {
  return points.slice(-(days + 1));
}

// Main pools by default; if the location marks none, fall back to all pools.
export function defaultPoolIds(pools: TimeseriesPool[], mainPoolIds: string[]): string[] {
  const main = pools.filter((pool) => mainPoolIds.includes(pool.beckenid)).map((pool) => pool.beckenid);
  return main.length ? main : pools.map((pool) => pool.beckenid);
}

export function hasReadings(points: TimeseriesPoint[], poolIds: string[]): boolean {
  return points.some((point) => poolIds.some((id) => point.temperatures[id] != null));
}

export function formatShortDate(isoDate: string): string {
  const [, month, day] = isoDate.split('-');
  return month && day ? `${day}.${month}.` : isoDate;
}

export function formatLongDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return year && month && day ? `${day}.${month}.${year}` : isoDate;
}
