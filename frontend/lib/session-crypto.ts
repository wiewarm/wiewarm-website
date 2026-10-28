export interface AdminSession {
  badid: string;
  pin: string;
  expires: number;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array {
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function importKey(secret: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(secret));
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

// The wiewarm API has no tokens: every write needs badid + PIN, so the session keeps both, encrypted.
export async function sealSession(session: AdminSession, secret: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = encoder.encode(JSON.stringify(session));
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await importKey(secret), data));
  return `${toBase64Url(iv)}.${toBase64Url(encrypted)}`;
}

export async function openSession(value: string | undefined, secret: string, now = Date.now()): Promise<AdminSession | null> {
  if (!value) return null;
  const [ivPart, dataPart, ...rest] = value.split('.');
  if (!ivPart || !dataPart || rest.length > 0) return null;
  try {
    const iv = fromBase64Url(ivPart);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv as BufferSource }, await importKey(secret), fromBase64Url(dataPart) as BufferSource);
    const parsed: unknown = JSON.parse(decoder.decode(decrypted));
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { badid, pin, expires } = parsed as Partial<AdminSession>;
    if (typeof badid !== 'string' || typeof pin !== 'string' || typeof expires !== 'number' || expires <= now) return null;
    return { badid, pin, expires };
  } catch {
    return null;
  }
}
