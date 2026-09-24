// Feature: admin-user-management — unit tests for resolveLoginRedirect
// Requirements: 3.2, 3.3, 3.4, 3.5

import { resolveLoginRedirect } from '@/features/auth/services/authService';

describe('resolveLoginRedirect', () => {
  // ── Admin role ─────────────────────────────────────────────────────────────

  it('admin + null redirectParam → /admin', () => {
    expect(resolveLoginRedirect('admin', null)).toBe('/admin');
  });

  it('admin + /admin/users → /admin/users (valid admin path preserved)', () => {
    expect(resolveLoginRedirect('admin', '/admin/users')).toBe('/admin/users');
  });

  it('admin + /profile (non-admin path) → /admin (overridden)', () => {
    expect(resolveLoginRedirect('admin', '/profile')).toBe('/admin');
  });

  // ── User role ──────────────────────────────────────────────────────────────

  it('user + null redirectParam → /', () => {
    expect(resolveLoginRedirect('user', null)).toBe('/');
  });

  it('user + / → / (root path preserved)', () => {
    expect(resolveLoginRedirect('user', '/')).toBe('/');
  });

  it('user + /admin (admin path) → / (blocked for non-admin)', () => {
    expect(resolveLoginRedirect('user', '/admin')).toBe('/');
  });

  it('user + /profile (non-admin path) → /profile (preserved)', () => {
    expect(resolveLoginRedirect('user', '/profile')).toBe('/profile');
  });
});
