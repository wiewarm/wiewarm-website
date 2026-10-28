import 'server-only';
import { cookies } from 'next/headers';
import { openSession, sealSession, type AdminSession } from '@/lib/session-crypto';

const COOKIE_NAME = 'wiewarm_admin';
const SESSION_SECONDS = 8 * 60 * 60;

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') throw new Error('SESSION_SECRET is not configured');
  return 'wiewarm-development-only-secret';
}

export async function getSession(): Promise<AdminSession | null> {
  const store = await cookies();
  return openSession(store.get(COOKIE_NAME)?.value, sessionSecret());
}

export async function startSession(badid: string, pin: string): Promise<void> {
  const session: AdminSession = { badid, pin, expires: Date.now() + SESSION_SECONDS * 1000 };
  const store = await cookies();
  store.set(COOKIE_NAME, await sealSession(session, sessionSecret()), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/admin',
    maxAge: SESSION_SECONDS,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.delete({ name: COOKIE_NAME, path: '/admin' });
}
