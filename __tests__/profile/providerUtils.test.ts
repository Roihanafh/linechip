/**
 * Tests for features/profile/utils/providerUtils.ts
 *
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 3.11
 */

import * as fc from 'fast-check';
import {
  getAuthProvider,
  getInitials,
  getProviderLabel,
  type AuthProvider,
} from '@/features/profile/utils/providerUtils';
import type { User as FirebaseUser } from 'firebase/auth';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeUser(providerId: string): FirebaseUser {
  return { providerData: [{ providerId }] } as unknown as FirebaseUser;
}

function makeEmptyUser(): FirebaseUser {
  return { providerData: [] } as unknown as FirebaseUser;
}

// ─── getAuthProvider ─────────────────────────────────────────────────────────

describe('getAuthProvider', () => {
  const VALID_PROVIDERS: AuthProvider[] = ['password', 'google.com', 'unknown'];

  /**
   * Property 1: getAuthProvider selalu mengembalikan nilai terdefinisi
   * Validates: Requirements 5.1, 5.2, 5.3, 5.4
   */
  it('Property 1: selalu mengembalikan salah satu dari password | google.com | unknown', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant('password'),
          fc.constant('google.com'),
          fc.string(),
        ),
        (providerId) => {
          const user = makeUser(providerId);
          const result = getAuthProvider(user);
          return VALID_PROVIDERS.includes(result);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('mengembalikan "password" untuk provider password', () => {
    expect(getAuthProvider(makeUser('password'))).toBe('password');
  });

  it('mengembalikan "google.com" untuk provider google.com', () => {
    expect(getAuthProvider(makeUser('google.com'))).toBe('google.com');
  });

  it('mengembalikan "unknown" untuk provider yang tidak dikenali', () => {
    expect(getAuthProvider(makeUser('github.com'))).toBe('unknown');
    expect(getAuthProvider(makeUser('facebook.com'))).toBe('unknown');
    expect(getAuthProvider(makeUser(''))).toBe('unknown');
  });

  it('mengembalikan "unknown" untuk providerData kosong', () => {
    expect(getAuthProvider(makeEmptyUser())).toBe('unknown');
  });
});

// ─── getInitials ─────────────────────────────────────────────────────────────

describe('getInitials', () => {
  /**
   * Property 2: getInitials menghasilkan representasi valid
   * Validates: Requirements 5.2, 3.11
   */
  it('Property 2a: untuk string non-empty non-whitespace, panjang hasil adalah 1 atau 2 dan semua karakter uppercase', () => {
    // Filter string yang bukan hanya whitespace dan punya karakter non-space
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        (name) => {
          const result = getInitials(name);
          const lengthValid = result.length >= 1 && result.length <= 2;
          const allUppercase = result === result.toUpperCase();
          return lengthValid && allUppercase;
        },
      ),
      { numRuns: 200 },
    );
  });

  it('Property 2b: untuk string kosong atau hanya whitespace, mengembalikan "?"', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(''),
          fc.stringMatching(/^\s+$/),
        ),
        (input) => {
          return getInitials(input) === '?';
        },
      ),
      { numRuns: 100 },
    );
  });

  // Unit tests — contoh spesifik
  it('menghasilkan inisial dari dua kata: "Budi Santoso" → "BS"', () => {
    expect(getInitials('Budi Santoso')).toBe('BS');
  });

  it('menghasilkan 2 karakter pertama dari satu kata: "Budi" → "BU"', () => {
    expect(getInitials('Budi')).toBe('BU');
  });

  it('mengembalikan "?" untuk string kosong', () => {
    expect(getInitials('')).toBe('?');
  });

  it('mengembalikan "?" untuk string hanya whitespace', () => {
    expect(getInitials('   ')).toBe('?');
    expect(getInitials('\t')).toBe('?');
  });

  it('menghasilkan huruf kapital meski input huruf kecil', () => {
    expect(getInitials('budi santoso')).toBe('BS');
    expect(getInitials('budi')).toBe('BU');
  });

  it('menggunakan kata pertama dan kata terakhir untuk lebih dari dua kata', () => {
    // "Ana Maria Cruz" → A + C = "AC"
    expect(getInitials('Ana Maria Cruz')).toBe('AC');
  });

  it('single character name menghasilkan 1 karakter', () => {
    expect(getInitials('A')).toBe('A');
  });
});

// ─── getProviderLabel ─────────────────────────────────────────────────────────

describe('getProviderLabel', () => {
  it('mengembalikan label Bahasa Indonesia untuk provider "password"', () => {
    expect(getProviderLabel('password')).toBe('Email & Kata Sandi');
  });

  it('mengembalikan label Bahasa Indonesia untuk provider "google.com"', () => {
    expect(getProviderLabel('google.com')).toBe('Google');
  });

  it('mengembalikan label Bahasa Indonesia untuk provider "unknown"', () => {
    expect(getProviderLabel('unknown')).toBe('Tidak diketahui');
  });

  it('mengembalikan string non-empty untuk semua nilai AuthProvider yang valid', () => {
    const providers: AuthProvider[] = ['password', 'google.com', 'unknown'];
    for (const provider of providers) {
      const label = getProviderLabel(provider);
      expect(label.length).toBeGreaterThan(0);
    }
  });
});

// ─── Additional Property Tests (Task 10.2) ───────────────────────────────────

describe('getInitials – additional properties', () => {
  /**
   * Property 3: getInitials tidak pernah menghasilkan karakter lowercase
   * Validates: Requirements 5.1, 5.2, 5.3, 5.4
   */
  it('Property 3: getInitials tidak pernah menghasilkan karakter lowercase', () => {
    fc.assert(
      fc.property(fc.string(), (name) => {
        const result = getInitials(name);
        // Each character in result must not be lowercase
        return result.split('').every((c) => c === c.toUpperCase());
      }),
      { numRuns: 200 },
    );
  });

  /**
   * Property 4: getInitials selalu menghasilkan subset karakter dari nama input (kecuali fallback '?')
   * Validates: Requirements 5.2, 5.3
   */
  it('Property 4: getInitials selalu menghasilkan subset karakter dari nama input', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        (name) => {
          const result = getInitials(name);
          if (result === '?') return true; // fallback allowed
          const nameUpperChars = new Set(
            name
              .toUpperCase()
              .split('')
              .filter((c) => c.trim()),
          );
          return result.split('').every((c) => nameUpperChars.has(c));
        },
      ),
      { numRuns: 200 },
    );
  });
});
