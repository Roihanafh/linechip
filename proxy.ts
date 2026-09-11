import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decodeSessionCookieOptimistic } from './features/auth/utils/tokenHelpers';

const PROTECTED_ROUTES = [
  '/leaderboard',
  '/game-virus',
  '/intline-run',
  '/garis-bilangan',
  '/materi',
];

const ADMIN_ROUTES = ['/admin'];
const AUTH_ROUTES = ['/login', '/register'];

// Named export — required by Next.js 16 (replaces `middleware` from older versions)
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const cookie = request.cookies.get('__session')?.value;

  // Optimistic decode — no signature verification (Edge-safe).
  // Full verification is done in API Routes via Firebase Admin SDK.
  let claims: { uid: string; role?: string } | null = null;
  if (cookie) {
    try {
      const decoded = decodeSessionCookieOptimistic(cookie);
      if (decoded && decoded.exp > Date.now() / 1000) {
        claims = { uid: decoded.uid, role: decoded.role };
      }
    } catch {
      claims = null;
    }
  }

  const isAuthenticated = claims !== null;
  const isAdmin = claims?.role === 'admin';

  // 1. Auth routes: redirect already-authenticated users to home
  if (AUTH_ROUTES.some((r) => pathname.startsWith(r)) && isAuthenticated) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 2. Protected routes: require authentication
  if (PROTECTED_ROUTES.some((r) => pathname.startsWith(r)) && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    const safePath = pathname.length <= 2000 ? pathname : '/';
    loginUrl.searchParams.set('redirect', encodeURIComponent(safePath));
    return NextResponse.redirect(loginUrl);
  }

  // 3. Admin routes: require admin role
  if (ADMIN_ROUTES.some((r) => pathname.startsWith(r))) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', encodeURIComponent(pathname));
      return NextResponse.redirect(loginUrl);
    }
    if (!isAdmin) {
      return NextResponse.redirect(new URL('/?error=unauthorized', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|public/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
};
