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

    // Create session cookie
    const expiresIn = rememberMe
      ? 30 * 24 * 60 * 60 * 1000 // 30 days in ms
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
    // verifyIdToken or createSessionCookie failed
    const code = (err as { code?: string }).code ?? '';
    if (code.includes('auth/') || code.includes('id-token')) {
      return NextResponse.json(
        { error: 'Token tidak valid atau kadaluarsa.' },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: 'Terjadi kesalahan server.' },
      { status: 500 }
    );
  }
}
