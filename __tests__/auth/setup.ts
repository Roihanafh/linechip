/**
 * Shared test setup for firebase-auth-module tests.
 *
 * This file is loaded via jest.config.ts `setupFilesAfterFramework` for every
 * test file under __tests__/auth/. It provides:
 *
 *  1. A mock for the `server-only` package so that imports of firebase.admin.ts
 *     (which has `import 'server-only'`) do not throw in the Node test environment.
 *
 *  2. Baseline mocks for the three Firebase client SDK packages (`firebase/app`,
 *     `firebase/auth`, `firebase/firestore`). Individual test files may call
 *     `jest.mock(...)` again to override these with finer-grained implementations
 *     — Jest's module registry ensures the last `jest.mock` declaration wins.
 *
 * NOTE: Because `setupFilesAfterFramework` runs AFTER the test framework is
 * installed, `jest.mock()` calls here are valid and will be applied to all
 * tests in the suite that use this setup file.
 */

// ─── 1. Mock `server-only` ────────────────────────────────────────────────────
// `server-only` throws a build-time error when imported outside of Next.js server
// context. In the Jest/Node environment we simply no-op it so that modules like
// firebase.admin.ts can be imported freely during tests.
jest.mock('server-only', () => ({}));

// ─── 2. Baseline mock: firebase/app ──────────────────────────────────────────
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({ name: '[DEFAULT]' })),
  getApps: jest.fn(() => []),
  getApp: jest.fn(() => ({ name: '[DEFAULT]' })),
}));

// ─── 3. Baseline mock: firebase/auth ─────────────────────────────────────────
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({ currentUser: null })),
  onAuthStateChanged: jest.fn(() => jest.fn()), // returns unsubscribe fn
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signInWithPopup: jest.fn(),
  signOut: jest.fn(),
  sendEmailVerification: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  GoogleAuthProvider: jest.fn(() => ({})),
  browserLocalPersistence: {},
  setPersistence: jest.fn(() => Promise.resolve()),
}));

// ─── 4. Baseline mock: firebase/firestore ────────────────────────────────────
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  doc: jest.fn((_db: unknown, collection: string, id: string) => ({
    path: `${collection}/${id}`,
  })),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  onSnapshot: jest.fn(() => jest.fn()), // returns unsubscribe fn
  serverTimestamp: jest.fn(() => ({ _serverTimestamp: true })),
  Timestamp: {
    now: jest.fn(() => ({ seconds: 0, nanoseconds: 0 })),
    fromDate: jest.fn((d: Date) => ({ seconds: Math.floor(d.getTime() / 1000), nanoseconds: 0 })),
  },
}));
