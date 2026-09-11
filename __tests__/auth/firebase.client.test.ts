// Feature: firebase-auth-module, Property 1: Whitespace env vars treated as missing
import * as fc from 'fast-check';

jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({ name: '[DEFAULT]' })),
  getApps: jest.fn(() => []),
  getApp: jest.fn(),
}));
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({})),
  browserLocalPersistence: {},
  setPersistence: jest.fn(() => Promise.resolve()),
}));
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
}));

// Import after mocks
import {
  REQUIRED_ENV_VARS,
  validateClientEnv,
  getFirebaseClient,
} from '@/features/auth/services/firebase.client';
import { initializeApp } from 'firebase/app';

const mockedInitializeApp = initializeApp as jest.MockedFunction<typeof initializeApp>;

describe('firebase.client', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Clone env so mutations don't bleed across tests
    process.env = { ...originalEnv };
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // ─── validateClientEnv ─────────────────────────────────────────────────────

  describe('validateClientEnv', () => {
    /**
     * Property 1: string kosong atau whitespace-only diperlakukan sebagai tidak terdefinisi.
     * For any non-empty subset of required env vars set to whitespace-only values,
     * validateClientEnv() must throw an Error that mentions the offending var name(s).
     */
    it('throws when any required env var is whitespace-only', () => {
      fc.assert(
        fc.property(
          fc.subarray([...REQUIRED_ENV_VARS], { minLength: 1 }),
          fc.stringMatching(/^[\s\t\n]+$/),
          (offendingVars, whitespaceVal) => {
            // Set all vars to valid values first
            REQUIRED_ENV_VARS.forEach((key) => {
              process.env[key] = 'valid-value';
            });
            // Override selected vars with whitespace-only
            offendingVars.forEach((key) => {
              process.env[key] = whitespaceVal;
            });

            let thrownError: Error | undefined;
            try {
              validateClientEnv();
            } catch (err) {
              thrownError = err as Error;
            }

            // Must throw
            expect(thrownError).toBeDefined();

            // Error message must mention at least one of the offending var names
            const msg = thrownError!.message;
            const mentionsVar = offendingVars.some((v) => msg.includes(v));
            expect(mentionsVar).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('throws when any required env var is undefined', () => {
      fc.assert(
        fc.property(
          fc.subarray([...REQUIRED_ENV_VARS], { minLength: 1 }),
          (missingVars) => {
            REQUIRED_ENV_VARS.forEach((key) => {
              process.env[key] = 'valid-value';
            });
            missingVars.forEach((key) => {
              delete process.env[key];
            });

            expect(() => validateClientEnv()).toThrow();
          },
        ),
        { numRuns: 100 },
      );
    });

    it('throws when a required env var is empty string', () => {
      REQUIRED_ENV_VARS.forEach((key) => {
        process.env[key] = 'valid-value';
      });
      process.env['NEXT_PUBLIC_FIREBASE_API_KEY'] = '';

      expect(() => validateClientEnv()).toThrow(/NEXT_PUBLIC_FIREBASE_API_KEY/);
    });

    it('does not throw when all required env vars are non-whitespace', () => {
      REQUIRED_ENV_VARS.forEach((key) => {
        process.env[key] = 'valid-firebase-value';
      });

      expect(() => validateClientEnv()).not.toThrow();
    });
  });

  // ─── getFirebaseClient — initializeApp not called before validation passes ─

  describe('getFirebaseClient', () => {
    it('does not call initializeApp when validation fails (env vars missing)', () => {
      // Clear all required env vars to force a validation failure
      REQUIRED_ENV_VARS.forEach((key) => {
        delete process.env[key];
      });

      expect(() => getFirebaseClient()).toThrow();
      expect(mockedInitializeApp).not.toHaveBeenCalled();
    });

    it('does not call initializeApp when validation fails (env vars whitespace)', () => {
      REQUIRED_ENV_VARS.forEach((key) => {
        process.env[key] = '   ';
      });

      expect(() => getFirebaseClient()).toThrow();
      expect(mockedInitializeApp).not.toHaveBeenCalled();
    });
  });
});
