import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAdminAuth } from '@/features/auth/services/firebase.admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { idToken, rememberMe } = body as { idToken?: string; rememberMe?: boolean };

    if (!idToken || typeof idToken !== 'string' || idToken.trim() === '') {
      return NextResponse.json(
        { error: 'idToken wajib disertakan.' },
        { status: 400 }
      );
    }

    const adminAuth = getAdminAuth();

    // Verify the ID token first
    await adminAuth.verifyIdToken(idToken);

    // Create session cookie (Firebase Admin limit is 5 mins to 14 days max)
    const expiresIn = rememberMe
      ? 14 * 24 * 60 * 60 * 1000 // 14 days in ms (Firebase Admin maximum)
      : 5 * 24 * 60 * 60 * 1000; // 5 days in ms

    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

    const maxAge = expiresIn / 1000; // convert ms to seconds
    const response = NextResponse.json({ ok: true }, { status: 200 });

    response.cookies.set('__session', sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge,
    });

    return response;
  } catch (err) {
    // Log server-side so we can diagnose issues in dev
    console.error('[/api/auth/session] Error:', err);

    // verifyIdToken or createSessionCookie failed
    const code = (err as { code?: string }).code ?? '';
    const message = (err as { message?: string }).message ?? '';

    if (
      code.includes('auth/') ||
      code.includes('id-token') ||
      message.includes('Firebase Admin env')
    ) {
      return NextResponse.json(
        { error: 'Token tidak valid atau kadaluarsa.', code },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: 'Terjadi kesalahan server.', code },
      { status: 500 }
    );
  }
}
