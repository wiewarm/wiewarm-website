import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultPoolIds, hasReadings, sliceRange, type TimeseriesPoint } from '@/lib/timeseries';
import { getTemperatureTimeseries } from '@/lib/wiewarm-api';

afterEach(() => vi.unstubAllGlobals());

const pools = [{ beckenid: '1', name: 'Hallenbad' }, { beckenid: '2', name: 'Kinderbecken' }];
const points: TimeseriesPoint[] = Array.from({ length: 91 }, (_, index) => ({ date: `d${index}`, temperatures: { '1': index, '2': null } }));

describe('timeseries helpers', () => {
  it('selects main pools by default and falls back to all pools', () => {
    expect(defaultPoolIds(pools, ['2'])).toEqual(['2']);
    expect(defaultPoolIds(pools, [])).toEqual(['1', '2']);
    expect(defaultPoolIds(pools, ['99'])).toEqual(['1', '2']);
  });

  it('keeps the last days + 1 points of the series', () => {
    const slice = sliceRange(points, 30);
    expect(slice).toHaveLength(31);
    expect(slice.at(-1)?.date).toBe('d90');
    expect(sliceRange(points.slice(0, 5), 30)).toHaveLength(5);
  });

  it('detects whether the selected pools have any readings', () => {
    expect(hasReadings(points, ['1'])).toBe(true);
    expect(hasReadings(points, ['2'])).toBe(false);
    expect(hasReadings([], ['1'])).toBe(false);
  });
});

describe('getTemperatureTimeseries', () => {
  it('requests 90 days and keeps missing readings as null rather than 0', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      badid: 49, becken: [{ beckenid: 134, beckenname: 'Rhein' }, { beckenid: 135, beckenname: 'Bad' }],
      data: [{ date: '2026-10-27', temperatures: { '134': 16.4, '135': null } }, { date: '2026-10-28', temperatures: { '134': 0 } }, { nodate: true }],
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const series = await getTemperatureTimeseries('49');
    expect(fetchMock.mock.calls[0][0]).toBe('https://www.wiewarm.ch/api/v1/bad/49/timeseries.json?days=90');
    expect(series.pools).toEqual([{ beckenid: '134', name: 'Rhein' }, { beckenid: '135', name: 'Bad' }]);
    expect(series.points).toEqual([
      { date: '2026-10-27', temperatures: { '134': 16.4, '135': null } },
      { date: '2026-10-28', temperatures: { '134': 0, '135': null } },
    ]);
  });

  it('rejects invalid ids and unexpected payloads', async () => {
    await expect(getTemperatureTimeseries('49/../x')).rejects.toThrow();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"x":1}', { status: 200 })));
    await expect(getTemperatureTimeseries('49')).rejects.toThrow('Unexpected');
  });
});
