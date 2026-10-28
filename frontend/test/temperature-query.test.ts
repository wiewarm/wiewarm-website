import { describe, expect, it } from 'vitest';
import { filterAndSortTemperatures, parseTemperatureQuery, toQueryString } from '@/lib/temperature-query';
import type { CurrentTemperature } from '@/lib/wiewarm-api';

const rows: CurrentTemperature[] = [
  { badid: '1', badidText: 'Aare_Bern', bad: 'Aarebad', ort: 'Bern', plz: '3000', kanton: 'BE', beckenid: '1', becken: 'Aare', temp: 20.1, date: '2026-09-03 09:00:00', datePretty: '09:00', latitude: 46.94, longitude: 7.44, images: [] },
  { badid: '2', badidText: 'Seebad_Zürich', bad: 'Seebad', ort: 'Zürich', plz: '8000', kanton: 'ZH', beckenid: '2', becken: 'Zürichsee', temp: 24.8, date: '2026-09-03 10:00:00', datePretty: '10:00', latitude: 47.37, longitude: 8.54, images: [] },
];

describe('temperature query', () => {
  it('applies safe defaults to invalid URL values', () => {
    expect(parseTemperatureQuery({ page: '-2', pageSize: '99', sort: 'oops', kanton: 'alle' })).toMatchObject({ page: 1, pageSize: 10, sort: 'date', direction: 'desc', kanton: '' });
  });

  it('filters across every displayed field and exact canton', () => {
    const query = parseTemperatureQuery({ q: 'see', kanton: 'ZH' });
    expect(filterAndSortTemperatures(rows, query).map((row) => row.badid)).toEqual(['2']);
    expect(filterAndSortTemperatures(rows, parseTemperatureQuery({ q: '24.8' })).map((row) => row.badid)).toEqual(['2']);
    expect(filterAndSortTemperatures(rows, parseTemperatureQuery({ q: '10:00' })).map((row) => row.badid)).toEqual(['2']);
    expect(filterAndSortTemperatures(rows, parseTemperatureQuery({ q: 'ZH' })).map((row) => row.badid)).toEqual(['2']);
  });

  it('sorts temperatures numerically and keeps query state shareable', () => {
    const query = parseTemperatureQuery({ sort: 'temp', direction: 'asc', pageSize: '25', q: 'bad' });
    expect(filterAndSortTemperatures(rows, query).map((row) => row.temp)).toEqual([20.1, 24.8]);
    expect(toQueryString(query, { page: 2 })).toBe('q=bad&sort=temp&direction=asc&page=2&pageSize=25');
  });
});
