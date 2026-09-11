/**
 * Unit tests untuk API Routes: session, logout, set-role
 * Feature: firebase-auth-module
 */

import { NextRequest, NextResponse } from 'next/server';

// ─── Mock firebase.admin before any route imports ────────────────────────────

const mockVerifyIdToken = jest.fn();
const mockCreateSessionCookie = jest.fn();
const mockRevokeRefreshTokens = jest.fn();
const mockSetCustomUserClaims = jest.fn();
const mockFirestoreUpdate = jest.fn().mockResolvedValue(undefined);
const mockVerifySessionCookie = jest.fn();

jest.mock('@/features/auth/services/firebase.admin', () => {
  return {
    getAdminAuth: () => ({
      verifyIdToken: mockVerifyIdToken,
      createSessionCookie: mockCreateSessionCookie,
      revokeRefreshTokens: mockRevokeRefreshTokens,
      setCustomUserClaims: mockSetCustomUserClaims,
    }),
    getAdminDb: () => ({
      collection: () => ({
        doc: () => ({
          update: mockFirestoreUpdate,
        }),
      }),
    }),
    verifySessionCookie: mockVerifySessionCookie,
    withAuth: jest.fn((handler: (req: NextRequest, claims: unknown) => Promise<NextResponse>) => handler),
    withAdminAuth: jest.fn((handler: (req: NextRequest, claims: unknown) => Promise<NextResponse>) => {
      return async (req: NextRequest) => {
        const cookie = req.cookies.get('__session')?.value;
        if (!cookie) {
          return NextResponse.json({ error: 'Tidak terautentikasi.' }, { status: 401 });
        }
        try {
          const claims = await mockVerifySessionCookie(cookie);
          if (claims.role !== 'admin') {
            return NextResponse.json(
              { error: 'Akses ditolak. Hanya admin yang dapat mengakses endpoint ini.' },
              { status: 403 }
            );
          }
          return handler(req, claims);
        } catch {
          return NextResponse.json({ error: 'Sesi tidak valid atau telah berakhir.' }, { status: 401 });
        }
      };
    }),
  };
});

// ─── Import route handlers after mocks are set up ────────────────────────────

import { POST as sessionPost } from '@/app/api/auth/session/route';
import { POST as logoutPost } from '@/app/api/auth/logout/route';
import { POST as setRolePost } from '@/app/api/auth/set-role/route';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(url: string, body: unknown, cookieValue?: string): NextRequest {
  const req = new NextRequest(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
  if (cookieValue !== undefined) {
    req.cookies.set('__session', cookieValue);
  }
  return req;
}

// ─── /api/auth/session ────────────────────────────────────────────────────────

describe('POST /api/auth/session', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('body valid → 200 dan cookie __session di-set dengan atribut benar', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-123' });
    mockCreateSessionCookie.mockResolvedValue('mock-session-cookie');

    const req = makeRequest('http://localhost/api/auth/session', {
      idToken: 'valid-id-token',
      rememberMe: false,
    });

    const res = await sessionPost(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true });

    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).not.toBeNull();
    expect(setCookie).toContain('__session=mock-session-cookie');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('Path=/');
    expect(setCookie).toMatch(/SameSite=lax/i);
  });

  it('body valid dengan rememberMe=true → cookie maxAge 30 hari', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-123' });
    mockCreateSessionCookie.mockResolvedValue('mock-session-cookie-long');

    const req = makeRequest('http://localhost/api/auth/session', {
      idToken: 'valid-id-token',
      rememberMe: true,
    });

    const res = await sessionPost(req);
    expect(res.status).toBe(200);

    // createSessionCookie should be called with 30-day expiresIn
    expect(mockCreateSessionCookie).toHaveBeenCalledWith(
      'valid-id-token',
      { expiresIn: 30 * 24 * 60 * 60 * 1000 }
    );
  });

  it('body valid dengan rememberMe=false → cookie maxAge 5 hari', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-123' });
    mockCreateSessionCookie.mockResolvedValue('mock-session-cookie-short');

    const req = makeRequest('http://localhost/api/auth/session', {
      idToken: 'valid-id-token',
      rememberMe: false,
    });

    await sessionPost(req);

    expect(mockCreateSessionCookie).toHaveBeenCalledWith(
      'valid-id-token',
      { expiresIn: 5 * 24 * 60 * 60 * 1000 }
    );
  });

  it('idToken tidak valid → 401', async () => {
    const authError = Object.assign(new Error('Token expired'), {
      code: 'auth/id-token-expired',
    });
    mockVerifyIdToken.mockRejectedValue(authError);

    const req = makeRequest('http://localhost/api/auth/session', {
      idToken: 'expired-token',
    });

    const res = await sessionPost(req);

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });

  it('body tanpa idToken → 400', async () => {
    const req = makeRequest('http://localhost/api/auth/session', {});

    const res = await sessionPost(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toHaveProperty('error');
    expect(mockVerifyIdToken).not.toHaveBeenCalled();
  });

  it('idToken kosong string → 400', async () => {
    const req = makeRequest('http://localhost/api/auth/session', {
      idToken: '   ',
    });

    const res = await sessionPost(req);

    expect(res.status).toBe(400);
    expect(mockVerifyIdToken).not.toHaveBeenCalled();
  });

  it('idToken bukan string → 400', async () => {
    const req = makeRequest('http://localhost/api/auth/session', {
      idToken: 12345,
    });

    const res = await sessionPost(req);

    expect(res.status).toBe(400);
    expect(mockVerifyIdToken).not.toHaveBeenCalled();
  });
});

// ─── /api/auth/logout ─────────────────────────────────────────────────────────

describe('POST /api/auth/logout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('selalu return 200', async () => {
    mockVerifySessionCookie.mockResolvedValue({ uid: 'user-123' });

    const req = makeRequest('http://localhost/api/auth/logout', {}, 'valid-session-cookie');

    const res = await logoutPost(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true });
  });

  it('cookie dihapus dari response (maxAge=0)', async () => {
    mockVerifySessionCookie.mockResolvedValue({ uid: 'user-123' });

    const req = makeRequest('http://localhost/api/auth/logout', {}, 'valid-session-cookie');

    const res = await logoutPost(req);

    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).not.toBeNull();
    // MaxAge=0 or Expires in the past clears the cookie
    expect(setCookie).toMatch(/Max-Age=0|max-age=0/i);
    expect(setCookie).toContain('__session=');
  });

  it('return 200 bahkan ketika tidak ada cookie (unauthenticated)', async () => {
    const req = makeRequest('http://localhost/api/auth/logout', {});

    const res = await logoutPost(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true });
  });

  it('best-effort: return 200 bahkan ketika revokeRefreshTokens gagal', async () => {
    mockVerifySessionCookie.mockResolvedValue({ uid: 'user-123' });
    mockRevokeRefreshTokens.mockRejectedValue(new Error('Network error'));

    const req = makeRequest('http://localhost/api/auth/logout', {}, 'valid-session-cookie');

    const res = await logoutPost(req);

    expect(res.status).toBe(200);
  });
});

// ─── /api/auth/set-role ───────────────────────────────────────────────────────

describe('POST /api/auth/set-role', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFirestoreUpdate.mockResolvedValue(undefined);
    mockSetCustomUserClaims.mockResolvedValue(undefined);
  });

  it('tanpa cookie auth → 401', async () => {
    const req = makeRequest('http://localhost/api/auth/set-role', {
      uid: 'target-uid',
      role: 'admin',
    });
    // No cookie set

    const res = await setRolePost(req);

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });

  it('auth user non-admin → 403', async () => {
    mockVerifySessionCookie.mockResolvedValue({
      uid: 'requester-uid',
      email: 'user@test.com',
      role: 'user',
      email_verified: true,
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    });

    const req = makeRequest(
      'http://localhost/api/auth/set-role',
      { uid: 'target-uid', role: 'admin' },
      'user-session-cookie'
    );

    const res = await setRolePost(req);

    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });

  it('role tidak valid → 400', async () => {
    mockVerifySessionCookie.mockResolvedValue({
      uid: 'admin-uid',
      email: 'admin@test.com',
      role: 'admin',
      email_verified: true,
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    });

    const req = makeRequest(
      'http://localhost/api/auth/set-role',
      { uid: 'target-uid', role: 'superuser' },
      'admin-session-cookie'
    );

    const res = await setRolePost(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toHaveProperty('error');
    expect(mockSetCustomUserClaims).not.toHaveBeenCalled();
  });

  it('uid tidak ada → 400', async () => {
    mockVerifySessionCookie.mockResolvedValue({
      uid: 'admin-uid',
      email: 'admin@test.com',
      role: 'admin',
      email_verified: true,
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    });

    const req = makeRequest(
      'http://localhost/api/auth/set-role',
      { role: 'user' },
      'admin-session-cookie'
    );

    const res = await setRolePost(req);

    expect(res.status).toBe(400);
    expect(mockSetCustomUserClaims).not.toHaveBeenCalled();
  });

  it('berhasil → 200 dan setCustomUserClaims + Firestore update dipanggil', async () => {
    mockVerifySessionCookie.mockResolvedValue({
      uid: 'admin-uid',
      email: 'admin@test.com',
      role: 'admin',
      email_verified: true,
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    });

    const req = makeRequest(
      'http://localhost/api/auth/set-role',
      { uid: 'target-uid', role: 'admin' },
      'admin-session-cookie'
    );

    const res = await setRolePost(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true });

    expect(mockSetCustomUserClaims).toHaveBeenCalledWith('target-uid', { role: 'admin' });
    expect(mockFirestoreUpdate).toHaveBeenCalledWith({ role: 'admin' });
  });

  it('berhasil set role ke "user" → 200', async () => {
    mockVerifySessionCookie.mockResolvedValue({
      uid: 'admin-uid',
      email: 'admin@test.com',
      role: 'admin',
      email_verified: true,
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    });

    const req = makeRequest(
      'http://localhost/api/auth/set-role',
      { uid: 'another-uid', role: 'user' },
      'admin-session-cookie'
    );

    const res = await setRolePost(req);

    expect(res.status).toBe(200);
    expect(mockSetCustomUserClaims).toHaveBeenCalledWith('another-uid', { role: 'user' });
  });

  it('session cookie tidak valid → 401', async () => {
    mockVerifySessionCookie.mockRejectedValue(new Error('Session expired'));

    const req = makeRequest(
      'http://localhost/api/auth/set-role',
      { uid: 'target-uid', role: 'admin' },
      'invalid-session-cookie'
    );

    const res = await setRolePost(req);

    expect(res.status).toBe(401);
  });

  it('Firebase Admin gagal → 500', async () => {
    mockVerifySessionCookie.mockResolvedValue({
      uid: 'admin-uid',
      email: 'admin@test.com',
      role: 'admin',
      email_verified: true,
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    });
    mockSetCustomUserClaims.mockRejectedValue(new Error('Firebase Admin error'));

    const req = makeRequest(
      'http://localhost/api/auth/set-role',
      { uid: 'target-uid', role: 'user' },
      'admin-session-cookie'
    );

    const res = await setRolePost(req);

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });
});
