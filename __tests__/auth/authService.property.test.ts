/**
 * Property-based tests for authService pure functions.
 * Uses fast-check for property generation.
 * Feature: admin-user-management
 */

// Feature: admin-user-management, Property 2: resolveLoginRedirect security and correctness

import * as fc from 'fast-check';
import { resolveLoginRedirect } from '@/features/auth/services/authService';

// ---------------------------------------------------------------------------
// Helpers — mirrors the isAdminPath predicate inside resolveLoginRedirect
// ---------------------------------------------------------------------------

function isAdminPath(p: string): boolean {
  return p === '/admin' || p.startsWith('/admin/');
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/**
 * A representative mix of redirect param values including admin-paths,
 * non-admin-paths, and arbitrary strings so the property covers all branches.
 */
const redirectParamArb = fc.option(
  fc.oneof(
    fc.constant('/admin'),
    fc.constant('/admin/users'),
    fc.constant('/profile'),
    fc.constant('/'),
    fc.string()
  ),
  { nil: null }
);

const roleArb = fc.constantFrom<'user' | 'admin'>('user', 'admin');

// ---------------------------------------------------------------------------
// Property 2: Role-based redirect security and correctness
// Validates: Requirements 3.2, 3.3, 3.4, 3.5, 3.7
// ---------------------------------------------------------------------------

describe('Property 2: resolveLoginRedirect security and correctness', () => {
  it('satisfies all four role-based redirect invariants', () => {
    fc.assert(
      fc.property(roleArb, redirectParamArb, (role, redirectParam) => {
        const result = resolveLoginRedirect(role, redirectParam);

        if (role === 'admin') {
          if (redirectParam !== null && isAdminPath(redirectParam)) {
            // Invariant 1: admin + valid admin-path → that path
            if (result !== redirectParam) return false;
          } else {
            // Invariant 2: admin + non-admin-path or null → '/admin'
            if (result !== '/admin') return false;
          }
        } else {
          // role === 'user'
          if (redirectParam !== null && !isAdminPath(redirectParam)) {
            // Invariant 3: user + non-admin-path → that path
            if (result !== redirectParam) return false;
          } else {
            // Invariant 4: user + admin-path or null → '/'
            if (result !== '/') return false;
          }
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: admin-user-management, Property 3: sanitizeInput removes control chars and HTML

import { sanitizeInput } from '@/features/auth/services/authService';

// ---------------------------------------------------------------------------
// Property 3: sanitizeInput removes control characters and HTML tags
// Validates: Requirements 6.1
// ---------------------------------------------------------------------------

describe('Property 3: sanitizeInput removes control characters and HTML tags', () => {
  it('removes all control characters and HTML tags from arbitrary unicode strings', () => {
    fc.assert(
      fc.property(
        fc.string({ unit: 'grapheme' }),
        (input: string) => {
          const result = sanitizeInput(input);
          // No control characters
          if (/[\x00-\x1F\x7F]/.test(result)) return false;
          // No HTML tags
          if (/<[^>]*>/.test(result)) return false;
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
