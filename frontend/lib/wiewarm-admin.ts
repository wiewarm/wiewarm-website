import 'server-only';
import { API_BASE, WiewarmApiError, getJson, isRecord, text } from '@/lib/wiewarm-api';
import type { AdminSession } from '@/lib/session-crypto';

export const BASIN_STATUS = { geöffnet: 1, gesperrt: 2, geschlossen: 3 } as const;
export type BasinStatusLabel = keyof typeof BASIN_STATUS;

export const MAX_IMAGE_BYTES = 16 * 1024 * 1024;

export interface AdminNews {
  infoid: string;
  date: string;
  datePretty: string;
  info: string;
}

export interface BaseData {
  adresse1: string;
  adresse2: string;
  plz: string;
  ort: string;
  telefon: string;
  email: string;
  www: string;
  zeiten: string;
  preise: string;
  info: string;
}

export function isValidBadId(badid: string): boolean {
  return /^\d{1,9}$/.test(badid);
}

// The API carries the PIN as a URL path segment, where a slash cannot be represented.
export function isUsablePin(pin: string): boolean {
  return pin.length > 0 && pin.length <= 128 && !pin.includes('/');
}

async function request(method: string, path: string, init: { json?: unknown; form?: FormData } = {}): Promise<Response> {
  const headers: Record<string, string> = { accept: 'application/json' };
  let body: BodyInit | undefined;
  if (init.json !== undefined) {
    headers['content-type'] = 'application/json';
    body = JSON.stringify(init.json);
  } else if (init.form) {
    body = init.form;
  }
  return fetch(`${API_BASE}${path}`, { method, headers, body, cache: 'no-store', signal: AbortSignal.timeout(20_000) });
}

async function expectOk(response: Response): Promise<void> {
  if (response.ok) return;
  let message = `wiewarm API returned ${response.status}`;
  try {
    const payload: unknown = await response.json();
    if (isRecord(payload) && isRecord(payload.error) && text(payload.error.message)) message = text(payload.error.message);
  } catch {
    // keep the generic message
  }
  throw new WiewarmApiError(message, response.status);
}

export async function verifyLogin(badid: string, pin: string): Promise<boolean> {
  if (!isValidBadId(badid) || !isUsablePin(pin)) return false;
  const response = await request('PUT', `/login/${badid}/${encodeURIComponent(pin)}`, { json: {} });
  if (response.status === 401) return false;
  await expectOk(response);
  return true;
}

export async function changePassword(badid: string, currentPin: string, newPin: string): Promise<void> {
  await expectOk(await request('PUT', '/login/password', { json: { badid, pincode: currentPin, new_password: newPin } }));
}

export async function saveTemperatures(session: AdminSession, temp: Record<string, number>, status: Record<string, number>): Promise<void> {
  await expectOk(await request('POST', '/temperature', { json: { badid: session.badid, pincode: session.pin, temp, status } }));
}

export async function getNews(badid: string): Promise<AdminNews[]> {
  const payload = await getJson(`/news.json?search=__all__&badid=${encodeURIComponent(badid)}`, { fresh: true });
  if (!Array.isArray(payload)) throw new WiewarmApiError('Unexpected news response');
  return payload.flatMap((value) => {
    if (!isRecord(value) || !text(value.infoid) || !text(value.info)) return [];
    return [{ infoid: text(value.infoid), date: text(value.date), datePretty: text(value.date_pretty) || text(value.date), info: text(value.info) }];
  });
}

export async function addNews(session: AdminSession, info: string): Promise<void> {
  await expectOk(await request('POST', '/news', { json: { badid: session.badid, pincode: session.pin, info } }));
}

export async function deleteNews(session: AdminSession, infoid: string): Promise<void> {
  await expectOk(await request('DELETE', `/news/${session.badid}/${encodeURIComponent(session.pin)}/${encodeURIComponent(infoid)}`));
}

export async function saveBaseData(session: AdminSession, data: BaseData): Promise<void> {
  await expectOk(await request('PUT', '/bad', { json: { ...data, badid: session.badid, pincode: session.pin } }));
}

export async function uploadImage(session: AdminSession, file: File, description: string): Promise<void> {
  const form = new FormData();
  form.set('badid', session.badid);
  form.set('pincode', session.pin);
  form.set('description', description);
  form.set('image', file, file.name);
  await expectOk(await request('POST', '/image', { form }));
}

export function imageIdFromPath(path: string): string | null {
  return /(\d+)\.jpg$/.exec(path)?.[1] ?? null;
}

export async function deleteImage(session: AdminSession, imageId: string): Promise<void> {
  if (!/^\d+$/.test(imageId)) throw new WiewarmApiError('Invalid image id');
  await expectOk(await request('DELETE', `/image/${session.badid}/${encodeURIComponent(session.pin)}/${imageId}`));
}
