import { afterEach, describe, expect, it, vi } from 'vitest';
import { openSession, sealSession } from '@/lib/session-crypto';
import { changePassword, deleteNews, imageIdFromPath, isUsablePin, isValidBadId, saveTemperatures, verifyLogin } from '@/lib/wiewarm-admin';

afterEach(() => vi.unstubAllGlobals());

const session = { badid: '199', pin: 'p/in 1', expires: Date.now() + 60_000 };

describe('admin session cookie', () => {
  it('round-trips a sealed session', async () => {
    const sealed = await sealSession(session, 'secret');
    expect(sealed).not.toContain('199');
    expect(await openSession(sealed, 'secret')).toEqual(session);
  });

  it('rejects wrong secrets, tampering, and expired sessions', async () => {
    const sealed = await sealSession(session, 'secret');
    expect(await openSession(sealed, 'other')).toBeNull();
    expect(await openSession(`${sealed.slice(0, -2)}AA`, 'secret')).toBeNull();
    expect(await openSession(sealed, 'secret', session.expires + 1)).toBeNull();
    expect(await openSession(undefined, 'secret')).toBeNull();
    expect(await openSession('garbage', 'secret')).toBeNull();
  });
});

describe('admin API', () => {
  it('validates credentials locally before calling the API', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(isValidBadId('12a')).toBe(false);
    expect(isUsablePin('a/b')).toBe(false);
    expect(await verifyLogin('abc', 'pin')).toBe(false);
    expect(await verifyLogin('199', 'a/b')).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps 401 to an invalid login and encodes the PIN in the path', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await verifyLogin('199', 'a b#')).toBe(false);
    expect(fetchMock.mock.calls[0][0]).toBe('https://www.wiewarm.ch/api/v1/login/199/a%20b%23');
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'PUT', cache: 'no-store' });
  });

  it('accepts a successful login and surfaces server errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"success":"OK"}', { status: 200 })));
    expect(await verifyLogin('199', 'pin')).toBe(true);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 500 })));
    await expect(verifyLogin('199', 'pin')).rejects.toMatchObject({ status: 500 });
  });

  it('posts temperatures with credentials and reports API errors', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"error":{"code":401,"message":"Nope"}}', { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(saveTemperatures(session, { '407': 21.5 }, { '407': 1 })).rejects.toMatchObject({ status: 401, message: 'Nope' });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ badid: '199', pincode: 'p/in 1', temp: { '407': 21.5 }, status: { '407': 1 } });
  });

  it('builds the news delete path with encoded credentials', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await deleteNews(session, '25000296');
    expect(fetchMock.mock.calls[0][0]).toBe('https://www.wiewarm.ch/api/v1/news/199/p%2Fin%201/25000296');
  });

  it('sends the current and new password in the body of the password change', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"success":"OK"}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await changePassword('199', 'old pin', 'new pin');
    expect(fetchMock.mock.calls[0][0]).toBe('https://www.wiewarm.ch/api/v1/login/password');
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'PUT' });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ badid: '199', pincode: 'old pin', new_password: 'new pin' });
  });

  it('extracts image ids from image paths', () => {
    expect(imageIdFromPath('https://www.wiewarm.ch/img/baeder/199/12.jpg')).toBe('12');
    expect(imageIdFromPath('img/baeder/199/x.png')).toBeNull();
  });
});
