/**
 * Bug Condition Exploration Test — Task 1 / Task 3.3 (Post-Fix Verification)
 *
 * Feature: auth-logout-state-bug
 * Property 1: Expected Behavior — logout() Propagates Errors (Post-Fix)
 *
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4
 *
 * PURPOSE (Post-Fix — Task 3.3):
 *   Assertions are now inverted to verify that the fix works correctly.
 *   `logout()` MUST throw when fetch fails (network error or non-ok response),
 *   proving that errors are now propagated and the caller is notified.
 *
 * COUNTEREXAMPLES DOCUMENTED (from unfixed code — Task 1):
 *   1. Network error: `logout()` returned `undefined` instead of throwing →
 *      cookie `__session` remained intact in browser, proxy still read it as
 *      isAuthenticated = true.
 *   2. Non-ok response (`{ ok: false, status: 500 }`): `logout()` returned
 *      `undefined` instead of throwing → missing res.ok check confirmed.
 *
 * FIX VERIFIED (Task 3.3):
 *   Both failure modes now cause `logout()` to throw → bug is fixed.
 */

// ─── Mocks (declared before imports) ─────────────────────────────────────────

const mockSignOut = jest.fn();
const mockGetAuth = jest.fn(() => ({ currentUser: null }));

jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({ name: '[DEFAULT]' })),
  getApps: jest.fn(() => [{ name: '[DEFAULT]' }]),
  getApp: jest.fn(() => ({ name: '[DEFAULT]' })),
}));

jest.mock('firebase/auth', () => ({
  getAuth: mockGetAuth,
  signOut: mockSignOut,
  browserLocalPersistence: {},
  setPersistence: jest.fn(() => Promise.resolve()),
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
}));

jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(() => ({})),
}));

// ─── Subject under test ───────────────────────────────────────────────────────

import { logout } from '@/features/auth/services/authService';

// ─── Test Setup ───────────────────────────────────────────────────────────────

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
  // signOut always resolves successfully — isolating the fetch failure
  mockSignOut.mockResolvedValue(undefined);
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('logout() — Fix Verified: Errors Are Propagated', () => {
  /**
   * Fix Verification 1: fetch throws a network error.
   *
   * On FIXED code: logout() propagates the error via Promise.allSettled →
   * the caller receives a thrown Error('Cookie logout failed').
   *
   * Counterexample (from unfixed code): logout() = undefined when fetch throws
   * NetworkError → __session cookie remained intact in browser.
   * Fix confirmed: logout() now throws → caller can handle the failure.
   */
  it('throws when fetch throws a network error (fix verified — error is propagated)', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockRejectedValue(
      new TypeError('Failed to fetch'),
    );

    // On fixed code: logout() throws → caller is notified that cookie was NOT cleared
    await expect(logout()).rejects.toThrow();

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith('/api/auth/logout', { method: 'POST' });

    fetchSpy.mockRestore();
  });

  /**
   * Fix Verification 2: fetch returns { ok: false, status: 500 }.
   *
   * On FIXED code: logout() checks res.ok and throws
   * Error('Cookie logout returned non-ok status') when the server signals failure.
   *
   * Counterexample (from unfixed code): logout() = undefined when fetch returns
   * { ok: false, status: 500 } → /api/auth/logout failed silently.
   * Fix confirmed: res.ok check added → logout() now throws on non-ok responses.
   */
  it('throws when fetch returns { ok: false, status: 500 } (fix verified — res.ok check added)', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(null, { status: 500, statusText: 'Internal Server Error' }),
    );

    // On fixed code: res.ok check throws → caller is notified
    await expect(logout()).rejects.toThrow();

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith('/api/auth/logout', { method: 'POST' });

    fetchSpy.mockRestore();
  });
});
