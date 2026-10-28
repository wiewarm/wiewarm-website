import type { CurrentTemperature } from '@/lib/wiewarm-api';
import { formatTemperature } from '@/lib/format-temperature';

export const sortableColumns = ['ort', 'bad', 'becken', 'temp', 'date', 'plz', 'kanton'] as const;
export type SortColumn = (typeof sortableColumns)[number];
export type SortDirection = 'asc' | 'desc';

export interface TemperatureQuery {
  q: string; ort: string; bad: string; becken: string; plz: string; kanton: string;
  sort: SortColumn; direction: SortDirection; page: number; pageSize: number | 'all';
}

type SearchParams = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
const clean = (value: string | string[] | undefined) => first(value).trim().slice(0, 120);

export function parseTemperatureQuery(params: SearchParams): TemperatureQuery {
  const sortValue = clean(params.sort);
  const rawPageSize = clean(params.pageSize);
  const numericPageSize = Number.parseInt(rawPageSize, 10);
  const rawPage = Number.parseInt(clean(params.page), 10);
  return {
    q: clean(params.q), ort: clean(params.ort), bad: clean(params.bad), becken: clean(params.becken),
    plz: clean(params.plz), kanton: clean(params.kanton).toUpperCase() === 'ALLE' ? '' : clean(params.kanton).toUpperCase(),
    sort: sortableColumns.includes(sortValue as SortColumn) ? (sortValue as SortColumn) : 'date',
    direction: clean(params.direction) === 'asc' ? 'asc' : 'desc',
    page: Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1,
    pageSize: rawPageSize === 'all' ? 'all' : [10, 25, 50].includes(numericPageSize) ? numericPageSize : 10,
  };
}

const includes = (value: string, query: string) => value.toLocaleLowerCase('de-CH').includes(query.toLocaleLowerCase('de-CH'));

export function filterAndSortTemperatures(rows: CurrentTemperature[], query: TemperatureQuery): CurrentTemperature[] {
  const filtered = rows.filter((row) => {
    const searchable = `${row.ort} ${row.bad} ${row.becken} ${row.temp} ${formatTemperature(row.temp)} ${row.date} ${row.datePretty} ${row.plz} ${row.kanton}`;
    return (!query.q || includes(searchable, query.q)) && (!query.ort || includes(row.ort, query.ort)) &&
      (!query.bad || includes(row.bad, query.bad)) && (!query.becken || includes(row.becken, query.becken)) &&
      (!query.plz || includes(row.plz, query.plz)) && (!query.kanton || row.kanton === query.kanton);
  });

  return filtered.map((row, index) => ({ row, index })).sort((a, b) => {
    let comparison: number;
    if (query.sort === 'temp') comparison = a.row.temp - b.row.temp;
    else if (query.sort === 'date') comparison = Date.parse(a.row.date) - Date.parse(b.row.date);
    else comparison = a.row[query.sort].localeCompare(b.row[query.sort], 'de-CH', { numeric: true });
    return (query.direction === 'asc' ? comparison : -comparison) || a.index - b.index;
  }).map(({ row }) => row);
}

export function toQueryString(query: TemperatureQuery, overrides: Partial<TemperatureQuery> = {}): string {
  const value = { ...query, ...overrides };
  const params = new URLSearchParams();
  for (const key of ['q', 'ort', 'bad', 'becken', 'plz', 'kanton'] as const) if (value[key]) params.set(key, value[key]);
  if (value.sort !== 'date') params.set('sort', value.sort);
  if (value.direction !== 'desc') params.set('direction', value.direction);
  if (value.page > 1) params.set('page', String(value.page));
  if (value.pageSize !== 10) params.set('pageSize', String(value.pageSize));
  return params.toString();
}
