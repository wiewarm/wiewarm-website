import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCurrentTemperatures, getSwimmingLocation, latestLocationNews } from '@/lib/wiewarm-api';

afterEach(() => vi.unstubAllGlobals());

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

describe('wiewarm API normalization', () => {
  it('normalizes current temperatures and drops malformed records', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response([
      { badid: '1', badid_text: 'Aare_Bern', bad: 'Aarebad', ort: 'Bern', plz: null, kanton: 'be', beckenid: '2', becken: 'Aare', temp: '20.4', date: '2026-09-03 10:00:00', date_pretty: '10:00', ortlat: '46.94', ortlong: '7.44', images: ['1.jpg'] },
      { badid: 'broken' },
    ])));
    const result = await getCurrentTemperatures();
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ badidText: 'Aare_Bern', temp: 20.4, plz: '', kanton: 'BE', latitude: 46.94 });
  });

  it('normalizes scaled coordinates, object basins, nulls, and image URLs', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({
      badid: '199', badname: 'Badi', ort: 'Steffisburg', kanton: 'BE', plz: '3612', lat: '46780291', long: '7641126', www: 'badisteffisburg.ch',
      becken: { main: { beckenid: '407', beckenname: 'Kombibecken', temp: '22.0', date: '2026-09-03 06:57:12', typ: 'Freibad', status: 'geöffnet', ismain: 't' } },
      bilder: [{ image: 'img/baeder/199/1.jpg', thumbnail: 'img/baeder-thumbnail/199/1.jpg', original: 'img/baeder-orig/199/1.jpg', text: null }], infos: [], wetter: [],
    })));
    const result = await getSwimmingLocation('Badi_Steffisburg');
    expect(result).toMatchObject({ latitude: 46.780291, longitude: 7.641126, website: 'https://badisteffisburg.ch/' });
    expect(result.basins[0]).toMatchObject({ temp: 22, isMain: true });
    expect(result.images[0].original).toBe('https://www.wiewarm.ch/img/baeder-orig/199/1.jpg');
  });

  it('decodes already-encoded route ids before calling the API', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({
      badid: '129', badname: 'Parkbad', ort: 'Münsingen', kanton: 'BE', plz: '3110',
      becken: {}, bilder: [], infos: [], wetter: [],
    }));
    vi.stubGlobal('fetch', fetchMock);

    await getSwimmingLocation('Parkbad_M%C3%BCnsingen');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/bad.json/Parkbad_M%C3%BCnsingen'),
      expect.any(Object),
    );
  });

  it('selects only the newest notice for the current overview', () => {
    const notices = [
      { date: '2026-09-02 00:00:00', datePretty: '02.09.', info: 'Older' },
      { date: '2026-09-10 00:00:00', datePretty: '10.09.', info: 'Newest' },
      { date: '2026-09-08 00:00:00', datePretty: '08.09.', info: 'Middle' },
    ];

    expect(latestLocationNews(notices, 1)).toEqual([
      { date: '2026-09-10 00:00:00', datePretty: '10.09.', info: 'Newest' },
    ]);
  });

  it('exposes upstream status codes', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ error: 'missing' }, 404)));
    await expect(getSwimmingLocation('missing')).rejects.toMatchObject({ status: 404 });
  });
});

describe('API origin', () => {
  it('can be switched to another environment via WIEWARM_ORIGIN', async () => {
    vi.stubEnv('WIEWARM_ORIGIN', 'https://beta.wiewarm.ch/');
    vi.resetModules();
    const api = await import('@/lib/wiewarm-api');
    expect(api.API_BASE).toBe('https://beta.wiewarm.ch/api/v1');
    expect(api.wiewarmAssetUrl('img/baeder/199/1.jpg')).toBe('https://beta.wiewarm.ch/img/baeder/199/1.jpg');
    vi.unstubAllEnvs();
  });
});
