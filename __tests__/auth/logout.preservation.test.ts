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
 *   4. proxy() returns isAuthenticated = false for an expired cookie (exp <= Date.now()/1000)
 *
 * PBT properties:
 *   - For all (uid, role, offsetSeconds > 0) -> exp = now + offset > now -> isAuthenticated = true
 *   - For all (uid, offsetSeconds >= 0) -> exp = now - offset <= now -> isAuthenticated = false
 *
 * EXPECTED OUTCOME: ALL tests PASS on unfixed code (confirms the baseline).
 */

import * as fc from 'fast-check';
import { NextRequest } from 'next/server';

// --- Mocks (declared before imports) -----------------------------------------

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

// --- Subjects under test ------------------------------------------------------

import { loginWithEmail } from '@/features/auth/services/authService';
import { proxy } from '@/proxy';

// --- JWT helper ---------------------------------------------------------------

/**
 * Build a structurally valid JWT with a fake (unverified) signature.
 * decodeSessionCookieOptimistic uses jose's decodeJwt which only
 * base64-decodes the payload -- it never verifies the signature.
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

// --- Environment Setup --------------------------------------------------------

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

// --- Section 1: loginWithEmail() -- Observation ------------------------------

describe('loginWithEmail() -- observation on unfixed code', () => {
  /**
   * Requirement 3.3: loginWithEmail calls fetch('/api/auth/session') and resolves
   * for valid credentials.
   */
  it('calls fetch("/api/auth/session") and resolves when credentials are valid', async () => {
    const mockUser = {
      uid: 'mock-uid-123',
      getIdToken: jest.fn().mockResolvedValue('mock-id-token'),
    };
    mockSignInWithEmailAndPassword.mockResolvedValue({ user: mockUser });

    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    );

    await expect(
      loginWithEmail('user@test.com', 'password123', false)
    ).resolves.toMatchObject({ uid: expect.any(String) });

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

// --- Section 2: proxy() -- Observation on concrete cases ---------------------

describe('proxy() -- observation on unfixed code', () => {
  /**
   * Requirement 3.2: proxy() allows access when a valid non-expired
   * __session cookie is present.
   */
  it('returns NextResponse.next() (isAuthenticated = true) for a valid non-expired cookie', () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    const jwt = makeFakeJwt({ sub: 'uid-abc', exp: futureExp, role: 'user' });
    const req = makeRequest('/leaderboard', jwt);

    const result = proxy(req);

    expect(result.headers.get('location')).toBeNull();
    expect(result.status).toBe(200);
  });

  /**
   * Requirement 3.1: proxy() redirects to /login when no cookie is present.
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
   */
  it('redirects an authenticated user away from /login to home', () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const jwt = makeFakeJwt({ sub: 'uid-xyz', exp: futureExp });
    const req = makeRequest('/login', jwt);

    const result = proxy(req);

    const location = result.headers.get('location');
    expect(location).not.toBeNull();
    const url = new URL(location!);
    expect(url.pathname).toBe('/');
  });
});

// --- Section 3: PBT -- proxy() with valid non-expired cookies ----------------

describe('proxy() PBT -- Property 2: Preservation', () => {
  /**
   * Property: For all (uid, role, offsetSeconds) where offsetSeconds is in [1, 30 days],
   * a cookie with exp = floor(Date.now()/1000) + offsetSeconds makes proxy() treat
   * the request as authenticated (isAuthenticated = true).
   *
   * NOTE: exp is computed fresh inside each property evaluation so the test
   * never goes stale when fast-check replays shrunk counterexamples later.
   * Previously this used a fixed `now` captured at describe() time, which caused
   * failures once the captured timestamp drifted into the past.
   *
   * **Validates: Requirements 3.2, 3.5**
   */
  it('isAuthenticated = true for all valid non-expired cookies (PBT)', () => {
    fc.assert(
      fc.property(
        // uid: non-empty alphanumeric string (realistic Firebase UIDs)
        fc.stringMatching(/^[a-zA-Z0-9]{1,128}$/),
        // role: either 'user' or 'admin'
        fc.constantFrom('user', 'admin'),
        // offsetSeconds: how far in the future the token expires (1s to 30 days).
        // Using an offset instead of an absolute timestamp prevents staleness.
        fc.integer({ min: 1, max: 30 * 24 * 3600 }),
        (uid, role, offsetSeconds) => {
          // Compute exp fresh on every evaluation -- never stale.
          const futureExp = Math.floor(Date.now() / 1000) + offsetSeconds;
          const jwt = makeFakeJwt({ sub: uid, exp: futureExp, role });
          const req = makeRequest('/leaderboard', jwt);

          const result = proxy(req);

          // Authenticated user on a protected route -> NextResponse.next() (no redirect)
          const location = result.headers.get('location');
          expect(location).toBeNull();
          expect(result.status).toBe(200);
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * Property: For all (uid, offsetSeconds) where offsetSeconds is in [0, 30 days],
   * a cookie with exp = floor(Date.now()/1000) - offsetSeconds is expired and
   * proxy() treats the request as unauthenticated -> redirects to /login.
   *
   * offsetSeconds = 0 means exp === floor(now), which is already expired because
   * proxy uses strict `>`: decoded.exp > Date.now() / 1000.
   *
   * NOTE: exp is computed fresh inside each property evaluation.
   *
   * **Validates: Requirements 3.1, 3.6**
   */
  it('isAuthenticated = false for all expired cookies (PBT)', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-zA-Z0-9]{1,128}$/),
        // offsetSeconds: how far in the past the token expired (0s to 30 days).
        // offset=0 -> exp === floor(now) -> expired (proxy uses strict >).
        fc.integer({ min: 0, max: 30 * 24 * 3600 }),
        (uid, offsetSeconds) => {
          // Compute exp fresh on every evaluation -- never stale.
          const expiredExp = Math.floor(Date.now() / 1000) - offsetSeconds;
          const jwt = makeFakeJwt({ sub: uid, exp: expiredExp });
          const req = makeRequest('/leaderboard', jwt);

          const result = proxy(req);

          // Unauthenticated -> redirect to /login
          const location = result.headers.get('location');
          expect(location).not.toBeNull();
          expect(location).toContain('/login');
        }
      ),
      { numRuns: 200 }
    );
  });
});
