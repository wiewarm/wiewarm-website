'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { endSession, getSession, startSession } from '@/lib/session';
import { WiewarmApiError } from '@/lib/wiewarm-api';
import { BASIN_STATUS, MAX_IMAGE_BYTES, addNews, changePassword as changePasswordRequest, deleteImage, deleteNews, isUsablePin, isValidBadId, saveBaseData, saveTemperatures, uploadImage, verifyLogin, type BaseData } from '@/lib/wiewarm-admin';
import type { AdminSession } from '@/lib/session-crypto';
import type { ActionState } from '@/app/admin/action-state';

const failure = (message: string): ActionState => ({ ok: false, message });
const success = (message: string): ActionState => ({ ok: true, message });

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

function describeError(error: unknown): string {
  if (error instanceof WiewarmApiError && error.status === 401) return 'Die Anmeldung ist nicht mehr gültig. Bitte melde Dich neu an.';
  if (error instanceof WiewarmApiError && error.status && error.status < 500) return `wiewarm.ch hat die Anfrage abgelehnt (${error.message}).`;
  return 'wiewarm.ch ist momentan nicht erreichbar. Bitte versuche es später noch einmal.';
}

async function withSession(run: (session: AdminSession) => Promise<ActionState>): Promise<ActionState> {
  const session = await getSession();
  if (!session) return failure('Die Sitzung ist abgelaufen. Bitte melde Dich neu an.');
  try {
    const result = await run(session);
    revalidatePath('/admin');
    return result;
  } catch (error) {
    console.error('admin action failed', error instanceof Error ? error.message : error);
    return failure(describeError(error));
  }
}

export async function login(_previous: ActionState | null, formData: FormData): Promise<ActionState> {
  const badid = field(formData, 'badid').trim();
  const pin = field(formData, 'pin');
  if (!isValidBadId(badid)) return failure('Bitte gib eine gültige Bad-Id (nur Ziffern) ein.');
  if (!pin) return failure('Bitte gib Deine PIN ein.');
  if (!isUsablePin(pin)) return failure('Anmeldung fehlgeschlagen. Bitte prüfe Bad-Id und PIN.');

  let valid: boolean;
  try {
    valid = await verifyLogin(badid, pin);
  } catch (error) {
    console.error('login failed', error instanceof Error ? error.message : error);
    return failure(describeError(error));
  }
  if (!valid) return failure('Anmeldung fehlgeschlagen. Bitte prüfe Bad-Id und PIN.');

  await startSession(badid, pin);
  redirect('/admin');
}

export async function logout(): Promise<void> {
  await endSession();
  redirect('/admin');
}

export async function changePassword(_previous: ActionState | null, formData: FormData): Promise<ActionState> {
  const currentPin = field(formData, 'currentPin');
  const newPin = field(formData, 'newPin');
  if (!currentPin) return failure('Bitte gib Dein aktuelles Passwort ein.');
  if (!newPin) return failure('Bitte gib ein neues Passwort ein.');
  if (newPin !== field(formData, 'confirmPin')) return failure('Die beiden neuen Passwörter stimmen nicht überein.');
  if (newPin === currentPin) return failure('Das neue Passwort muss sich vom aktuellen unterscheiden.');
  // The new password is also used in the login URL path, so it must be representable there.
  if (!isUsablePin(newPin)) return failure('Das neue Passwort darf höchstens 128 Zeichen lang sein und keinen Schrägstrich (/) enthalten.');

  const session = await getSession();
  if (!session) return failure('Die Sitzung ist abgelaufen. Bitte melde Dich neu an.');
  try {
    await changePasswordRequest(session.badid, currentPin, newPin);
  } catch (error) {
    console.error('password change failed', error instanceof Error ? error.message : error);
    if (error instanceof WiewarmApiError && error.status === 401) return failure('Das aktuelle Passwort ist falsch.');
    return failure(describeError(error));
  }
  // Keep the user signed in with the new password.
  await startSession(session.badid, newPin);
  revalidatePath('/admin');
  return success('Dein Passwort wurde geändert.');
}

export async function updateTemperatures(_previous: ActionState | null, formData: FormData): Promise<ActionState> {
  const temp: Record<string, number> = {};
  const status: Record<string, number> = {};
  const validStatuses: number[] = Object.values(BASIN_STATUS);

  for (const [name, value] of formData.entries()) {
    if (typeof value !== 'string') continue;
    const [kind, beckenid] = name.split('-');
    if (!beckenid || !/^\d+$/.test(beckenid)) continue;
    if (kind === 'temp' && value.trim() !== '') {
      const input = value.trim();
      if (!/^\d{1,2}(\.\d+)?$/.test(input)) return failure('Bitte die Temperatur mit Punkt als Dezimaltrennzeichen eingeben, z.B. 21.5.');
      const parsed = Number(input);
      if (parsed > 40) return failure('Die Temperatur muss zwischen 0 und 40 °C liegen.');
      temp[beckenid] = Math.round(parsed * 10) / 10;
    } else if (kind === 'status') {
      const parsed = Number(value);
      if (!validStatuses.includes(parsed)) return failure('Ungültiger Beckenstatus.');
      status[beckenid] = parsed;
    }
  }

  return withSession(async (session) => {
    await saveTemperatures(session, temp, status);
    return success('Temperaturen und Status wurden gespeichert.');
  });
}

export async function createNews(_previous: ActionState | null, formData: FormData): Promise<ActionState> {
  const info = field(formData, 'info').trim();
  if (!info) return failure('Bitte gib einen Text ein.');
  if (info.length > 2000) return failure('Die Kurzmitteilung ist zu lang (max. 2000 Zeichen).');
  return withSession(async (session) => {
    await addNews(session, info);
    return success('Die Kurzmitteilung wurde gespeichert.');
  });
}

export async function removeNews(_previous: ActionState | null, formData: FormData): Promise<ActionState> {
  const infoid = field(formData, 'infoid');
  if (!/^\d+$/.test(infoid)) return failure('Ungültiger Eintrag.');
  return withSession(async (session) => {
    await deleteNews(session, infoid);
    return success('Der Eintrag wurde gelöscht.');
  });
}

export async function updateBaseData(_previous: ActionState | null, formData: FormData): Promise<ActionState> {
  const data: BaseData = {
    adresse1: field(formData, 'adresse1').trim(),
    adresse2: field(formData, 'adresse2').trim(),
    plz: field(formData, 'plz').trim(),
    ort: field(formData, 'ort').trim(),
    telefon: field(formData, 'telefon').trim(),
    email: field(formData, 'email').trim(),
    www: field(formData, 'www').trim(),
    zeiten: field(formData, 'zeiten'),
    preise: field(formData, 'preise'),
    info: field(formData, 'info'),
  };
  if (!data.adresse1 || !data.plz || !data.ort) return failure('Adresse 1, PLZ und Ort dürfen nicht leer sein.');
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return failure('Die E-Mail-Adresse ist ungültig.');
  return withSession(async (session) => {
    await saveBaseData(session, data);
    return success('Die Stammdaten wurden gespeichert.');
  });
}

export async function addImage(_previous: ActionState | null, formData: FormData): Promise<ActionState> {
  const file = formData.get('image');
  if (!(file instanceof File) || file.size === 0) return failure('Bitte wähle ein Bild aus.');
  if (!file.type.startsWith('image/')) return failure('Die Datei ist kein Bild.');
  if (file.size > MAX_IMAGE_BYTES) return failure('Das Bild ist zu gross (max. 16 MB). Bitte verkleinere es zuerst.');
  const description = field(formData, 'description').trim().slice(0, 500);
  return withSession(async (session) => {
    await uploadImage(session, file, description);
    return success('Das Bild wurde hochgeladen.');
  });
}

export async function removeImage(_previous: ActionState | null, formData: FormData): Promise<ActionState> {
  const imageId = field(formData, 'imageId');
  if (!/^\d+$/.test(imageId)) return failure('Ungültiges Bild.');
  return withSession(async (session) => {
    await deleteImage(session, imageId);
    return success('Das Bild wurde gelöscht.');
  });
}
