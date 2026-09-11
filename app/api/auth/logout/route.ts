import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAdminAuth, verifySessionCookie } from '@/features/auth/services/firebase.admin';

export async function POST(req: NextRequest) {
  const sessionCookie = req.cookies.get('__session')?.value;

  // Best-effort: try to revoke refresh tokens server-side
  if (sessionCookie) {
    try {
      const claims = await verifySessionCookie(sessionCookie);
      await getAdminAuth().revokeRefreshTokens(claims.uid);
    } catch {
      // Best-effort — don't throw to client if server-side revocation fails
      console.warn('[Logout] Server-side token revocation failed (best-effort)');
    }
  }

  // Always clear the cookie from the browser and return 200
  const response = NextResponse.json({ ok: true }, { status: 200 });
  response.cookies.set('__session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}
