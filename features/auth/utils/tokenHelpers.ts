import { decodeJwt } from 'jose';

const DAY_MS = 24 * 60 * 60 * 1000;

export function getSessionCookieExpiry(rememberMe: boolean): number {
  return rememberMe ? 30 * DAY_MS : 5 * DAY_MS;
}

export function decodeSessionCookieOptimistic(
  cookie: string
): { uid: string; role?: string; exp: number } | null {
  try {
    const payload = decodeJwt(cookie);
    const uid = payload.sub ?? (payload as Record<string, unknown>).uid;
    const exp = payload.exp;
    if (typeof uid !== 'string' || !uid || typeof exp !== 'number') {
      return null;
    }
    const role = (payload as Record<string, unknown>).role;
    return {
      uid,
      exp,
      ...(typeof role === 'string' ? { role } : {}),
    };
  } catch {
    return null;
  }
}
