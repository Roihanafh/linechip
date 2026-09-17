/**
 * Preservation Tests — Task 2
 *
 * Feature: auth-logout-state-bug
 * Property 2: Preservation — Non-Logout Auth Flows Unchanged
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**
 *
 * PURPOSE:
 *   Capture the baseline behavior of non-logout auth flows on UNFIXED code.
 *   These tests MUST PASS before AND after the fix — any regression here
 *   means the fix broke something it shouldn't have.
 *
 *   Observed behaviors on unfixed code (observation-first methodology):
 *   1. loginWithEmail() calls fetch('/api/auth/session') and resolves for valid credentials
 *   2. proxy() returns isAuthenticated = true for a valid, non-expired __session cookie
 *   3. proxy() returns isAuthenticated = false when no cookie is present
 *   4. proxy() returns isAuthenticated = false for an expired cookie (exp ≤ Date.now()/1000)
 *
 * PBT properties:
 *   - For all (uid, role, futureExp) where futureExp > Date.now()/1000 → isAuthenticated = true
 *   - For all expiredExp ≤ Date.now()/1000 → isAuthenticated = false
 *
 * EXPECTED OUTCOME: ALL tests PASS on unfixed code (confirms the baseline).
 */

import * as fc from 'fast-check';
import { NextRequest } from 'next/server';

// ─── Mocks (declared before imports) ─────────────────────────────────────────

const mockSignInWithEmailAndPassword = jest.fn();
const mockGetAuth = jest.fn(() => ({ currentUser: null }));

jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({ name: '[DEFAULT]' })),
  getApps: jest.fn(() => [{ name: '[DEFAULT]' }]),
  getApp: jest.fn(() => ({ name: '[DEFAULT]' })),
}));

jest.mock('firebase/auth', () => ({
  getAuth: mockGetAuth,
  signInWithEmailAndPassword: mockSignInWithEmailAndPassword,
  browserLocalPersistence: {},
  setPersistence: jest.fn(() => Promise.resolve()),
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
}));

jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(() => ({})),
}));

// ─── Subjects under test ──────────────────────────────────────────────────────

import { loginWithEmail } from '@/features/auth/services/authService';
import { proxy } from '@/proxy';

// ─── JWT helper ───────────────────────────────────────────────────────────────

/**
 * Build a structurally valid JWT with a fake (unverified) signature.
 * `decodeSessionCookieOptimistic` uses `jose`'s `decodeJwt` which only
 * base64-decodes the payload — it never verifies the signature.
 * This is intentional: proxy.ts is Edge-safe and does optimistic decoding only.
 */
function makeFakeJwt(payload: {
  sub: string;
  exp: number;
  role?: string;
}): string {
  const header = Buffer.from(
    JSON.stringify({ alg: 'HS256', typ: 'JWT' })
  ).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.fake-sig`;
}

/**
 * Build a NextRequest with an optional __session cookie.
 */
function makeRequest(pathname: string, sessionCookie?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (sessionCookie) {
    headers['cookie'] = `__session=${sessionCookie}`;
  }
  return new NextRequest(`http://localhost${pathname}`, { headers });
}

// ─── Environment Setup ────────────────────────────────────────────────────────

const originalEnv = process.env;

beforeAll(() => {
  process.env = {
    ...originalEnv,
    NEXT_PUBLIC_FIREBASE_API_KEY: 'test-api-key',
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'test.firebaseapp.com',
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'test-project',
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'test.appspot.com',
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '123456789',
    NEXT_PUBLIC_FIREBASE_APP_ID: '1:123456789:web:abcdef',
  };
});

afterAll(() => {
  process.env = originalEnv;
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── Section 1: loginWithEmail() — Observation ───────────────────────────────

describe('loginWithEmail() — observation on unfixed code', () => {
  /**
   * Requirement 3.3: loginWithEmail calls fetch('/api/auth/session') and resolves
   * for valid credentials.
   *
   * Observed: loginWithEmail() calls signInWithEmailAndPassword, gets idToken,
   * then POSTs to /api/auth/session. It resolves (void) on success.
   */
  it('calls fetch("/api/auth/session") and resolves when credentials are valid', async () => {
    const mockUser = {
      getIdToken: jest.fn().mockResolvedValue('mock-id-token'),
    };
    mockSignInWithEmailAndPassword.mockResolvedValue({ user: mockUser });

    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    );

    await expect(
      loginWithEmail('user@test.com', 'password123', false)
    ).resolves.toBeUndefined();

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/auth/session',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('mock-id-token'),
      })
    );

    fetchSpy.mockRestore();
  });

  /**
   * Requirement 3.3: loginWithEmail throws a normalized AuthError when
   * signInWithEmailAndPassword fails (invalid credentials).
   * This ensures existing error-normalization behavior is preserved.
   */
  it('throws a normalized AuthError when credentials are invalid', async () => {
    const firebaseError = Object.assign(new Error('Firebase: invalid credential'), {
      code: 'auth/invalid-credential',
    });
    mockSignInWithEmailAndPassword.mockRejectedValue(firebaseError);

    await expect(
      loginWithEmail('wrong@test.com', 'badpass', false)
    ).rejects.toMatchObject({ code: 'auth/invalid-credential' });
  });
});

// ─── Section 2: proxy() — Observation on concrete cases ──────────────────────

describe('proxy() — observation on unfixed code', () => {
  /**
   * Requirement 3.2: proxy() allows access when a valid non-expired
   * __session cookie is present. Observed: NextResponse.next() is returned.
   */
  it('returns NextResponse.next() (isAuthenticated = true) for a valid non-expired cookie', () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    const jwt = makeFakeJwt({ sub: 'uid-abc', exp: futureExp, role: 'user' });
    const req = makeRequest('/leaderboard', jwt);

    const result = proxy(req);

    // NextResponse.next() has no Location header — it passes through
    expect(result.headers.get('location')).toBeNull();
    expect(result.status).toBe(200);
  });

  /**
   * Requirement 3.1: proxy() redirects to /login when no cookie is present.
   * Observed: NextResponse.redirect(loginUrl) is returned for protected routes.
   */
  it('redirects to /login (isAuthenticated = false) when no cookie is present', () => {
    const req = makeRequest('/leaderboard'); // no cookie

    const result = proxy(req);

    const location = result.headers.get('location');
    expect(location).not.toBeNull();
    expect(location).toContain('/login');
  });

  /**
   * Requirement 3.6: proxy() treats an expired cookie as unauthenticated.
   * Observed: exp ≤ Date.now()/1000 → claims = null → isAuthenticated = false.
   */
  it('redirects to /login (isAuthenticated = false) for an expired cookie', () => {
    const expiredExp = Math.floor(Date.now() / 1000) - 1; // 1 second ago
    const jwt = makeFakeJwt({ sub: 'uid-abc', exp: expiredExp, role: 'user' });
    const req = makeRequest('/leaderboard', jwt);

    const result = proxy(req);

    const location = result.headers.get('location');
    expect(location).not.toBeNull();
    expect(location).toContain('/login');
  });

  /**
   * Requirement 3.5: proxy() redirects an authenticated user away from /login.
   * Observed: valid cookie on an AUTH_ROUTE → redirect to /.
   */
  it('redirects an authenticated user away from /login to home', () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const jwt = makeFakeJwt({ sub: 'uid-xyz', exp: futureExp });
    const req = makeRequest('/login', jwt);

    const result = proxy(req);

    const location = result.headers.get('location');
    expect(location).not.toBeNull();
    // Redirects to home (/) — not to /login
    const url = new URL(location!);
    expect(url.pathname).toBe('/');
  });
});

// ─── Section 3: PBT — proxy() with valid non-expired cookies ─────────────────

describe('proxy() PBT — Property 2: Preservation', () => {
  /**
   * Property: For all (uid, role, futureExp) where futureExp > Date.now()/1000,
   * a cookie decoded to { uid, role, exp: futureExp } makes proxy() treat the
   * request as authenticated (isAuthenticated = true → no redirect on
   * non-auth routes, redirect away from /login).
   *
   * **Validates: Requirements 3.2, 3.5**
   */
  it('isAuthenticated = true for all valid non-expired cookies (PBT)', () => {
    const now = Math.floor(Date.now() / 1000);

    fc.assert(
      fc.property(
        // uid: non-empty alphanumeric string (realistic Firebase UIDs)
        fc.stringMatching(/^[a-zA-Z0-9]{1,128}$/),
        // role: either 'user' or 'admin' (the two roles the system knows about)
        fc.constantFrom('user', 'admin'),
        // futureExp: between 1 second and 30 days from now
        fc.integer({ min: now + 1, max: now + 30 * 24 * 3600 }),
        (uid, role, futureExp) => {
          const jwt = makeFakeJwt({ sub: uid, exp: futureExp, role });
          const req = makeRequest('/leaderboard', jwt);

          const result = proxy(req);

          // Authenticated user on a protected route → NextResponse.next() (no redirect)
          const location = result.headers.get('location');
          expect(location).toBeNull();
          expect(result.status).toBe(200);
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * Property: For all expiredExp ≤ Date.now()/1000, the cookie is rejected
   * and proxy() treats the request as unauthenticated → redirects to /login
   * for protected routes.
   *
   * **Validates: Requirements 3.1, 3.6**
   */
  it('isAuthenticated = false for all expired cookies (PBT)', () => {
    const now = Math.floor(Date.now() / 1000);

    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-zA-Z0-9]{1,128}$/),
        // expiredExp: between 30 days ago and exactly now (inclusive)
        fc.integer({ min: now - 30 * 24 * 3600, max: now }),
        (uid, expiredExp) => {
          const jwt = makeFakeJwt({ sub: uid, exp: expiredExp });
          const req = makeRequest('/leaderboard', jwt);

          const result = proxy(req);

          // Unauthenticated → redirect to /login
          const location = result.headers.get('location');
          expect(location).not.toBeNull();
          expect(location).toContain('/login');
        }
      ),
      { numRuns: 200 }
    );
  });
});
