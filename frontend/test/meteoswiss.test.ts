import { describe, expect, it } from 'vitest';
import { buildForecasts, parseDailyValues, parsePostalPoints } from '@/lib/meteoswiss';
import { describeWeatherSymbol } from '@/lib/weather-symbols';

const META = [
  'point_id;point_type_id;station_abbr;postal_code;point_name',
  '75;1;BAS;;Basel / Binningen',
  '100026;2;;1000;Lausanne 26',
  '100025;2;;1000;Lausanne 25',
  '340000;2;;3400;Burgdorf',
].join('\r\n');

describe('parsePostalPoints', () => {
  it('keeps only postal-code points and the lowest id per postal code', () => {
    expect(parsePostalPoints(META)).toEqual(new Map([['100025', '1000'], ['340000', '3400']]));
  });
});

describe('parseDailyValues and buildForecasts', () => {
  const points = parsePostalPoints(META);
  const file = (parameter: string, rows: string[]) => parseDailyValues([`point_id;point_type_id;Date;${parameter}`, ...rows].join('\n'), parameter, points);

  it('combines the daily parameters per postal code and date', () => {
    const forecasts = buildForecasts({
      tre200px: file('tre200px', ['340000;2;202611110000;8.3', '340000;2;202611120000;9', '75;1;202611110000;1.0']),
      tre200pn: file('tre200pn', ['340000;2;202611110000;3.7', '340000;2;202611120000;']),
      rka150p0: file('rka150p0', ['340000;2;202611110000;0.3']),
      jp2000d0: file('jp2000d0', ['340000;2;202611110000;6', '340000;2;202611120000;17']),
    });
    expect([...forecasts.keys()]).toEqual(['3400']);
    expect(forecasts.get('3400')).toEqual([
      { date: '2026-11-11', minTemp: 3.7, maxTemp: 8.3, precipitationMm: 0.3, symbol: 6 },
      { date: '2026-11-12', minTemp: null, maxTemp: 9, precipitationMm: null, symbol: 17 },
    ]);
  });
});

describe('describeWeatherSymbol', () => {
  it('describes known pictogram numbers and ignores unknown ones', () => {
    expect(describeWeatherSymbol(1)).toEqual({ kind: 'sun', label: 'sonnig' });
    expect(describeWeatherSymbol(24)?.kind).toBe('thunder');
    expect(describeWeatherSymbol(99)).toBeNull();
    expect(describeWeatherSymbol(null)).toBeNull();
  });
});
