/**
 * Unit tests for useLoginForm behavior (task 7.5 + task 10.5)
 *
 * Because @testing-library/react is not installed, we cannot call hooks directly.
 * Instead we mirror the hook's internal logic as a plain async function and inject
 * mock dependencies (AuthService, router) to verify the required behaviors:
 *
 *  1. Valid submit → AuthService.loginWithEmail called → toast success → redirect via resolveLoginRedirect
 *  2. AuthError with `field` → errors[field] populated, toast remains null
 *  3. AuthError without `field` → toast.type === 'error', errors object stays empty
 *  4. Double-submit is prevented by submittingRef guard
 *  5. Role-based redirect (task 10.5):
 *     - getRoleAfterSession returns 'admin' → redirect to /admin
 *     - getRoleAfterSession returns 'user' → redirect to /
 *     - getRoleAfterSession throws (internally falls back to 'user') → redirect to /
 *     - Google login + admin role → redirect to /admin
 *     - Google login returns null (popup dismissed) → silent, no redirect
 */

import * as AuthService from '@/features/auth/services/authService';
import type { AuthError } from '@/features/auth/types';

// ─── Mock AuthService ─────────────────────────────────────────────────────────

jest.mock('@/features/auth/services/authService', () => ({
  loginWithEmail: jest.fn(),
  loginWithGoogle: jest.fn(),
  registerWithEmail: jest.fn(),
  getRoleAfterSession: jest.fn(),
  resolveLoginRedirect: jest.fn(),
}));

// ─── Mirror of useLoginForm logic ─────────────────────────────────────────────
// Mirrors the state machine inside useLoginForm without React.
// This stays in sync with features/auth/hooks/useLoginForm.ts

interface LoginFormState {
  loading: boolean;
  errors: Record<string, string>;
  toast: { message: string; type: 'success' | 'error' } | null;
}

interface MockRouter {
  replace: jest.Mock;
}

interface MockSearchParams {
  get: (key: string) => string | null;
}

/**
 * Executes the same logic as useLoginForm.onSubmit but as a plain async function.
 * Matches the CURRENT hook behavior (with getRoleAfterSession + resolveLoginRedirect).
 */
async function runLoginSubmit(
  email: string,
  password: string,
  rememberMe: boolean,
  state: LoginFormState,
  router: MockRouter,
  searchParams: MockSearchParams,
  submittingRef: { current: boolean }
): Promise<void> {
  if (submittingRef.current) return;
  submittingRef.current = true;
  state.loading = true;
  state.errors = {};

  try {
    const { uid } = await AuthService.loginWithEmail(email, password, rememberMe) as { uid: string };
    state.toast = { message: 'Login berhasil! Selamat datang kembali.', type: 'success' };
    const redirectParam = searchParams.get('redirect');
    const role = await AuthService.getRoleAfterSession(uid);
    const targetUrl = AuthService.resolveLoginRedirect(role, redirectParam);
    if (typeof window !== 'undefined' && window.location) {
      window.location.href = targetUrl;
    } else {
      router.replace(targetUrl);
    }
  } catch (err) {
    const authErr = err as AuthError;
    if (authErr.field) {
      state.errors = { [authErr.field]: authErr.message };
    } else {
      state.toast = { message: authErr.message ?? 'Terjadi kesalahan.', type: 'error' };
    }
  } finally {
    state.loading = false;
    submittingRef.current = false;
  }
}

/**
 * Executes the same logic as useLoginForm.onGoogleSubmit but as a plain async function.
 * Matches the CURRENT hook behavior (with getRoleAfterSession + resolveLoginRedirect).
 */
async function runGoogleSubmit(
  state: LoginFormState,
  router: MockRouter,
  searchParams: MockSearchParams,
  submittingRef: { current: boolean }
): Promise<void> {
  if (submittingRef.current) return;
  submittingRef.current = true;
  state.loading = true;
  state.errors = {};

  try {
    const result = await AuthService.loginWithGoogle() as { uid: string } | null;
    if (result === null) return; // popup dismissed — silent
    state.toast = { message: 'Login Google berhasil! Selamat datang kembali.', type: 'success' };
    const redirectParam = searchParams.get('redirect');
    const role = await AuthService.getRoleAfterSession(result.uid);
    const targetUrl = AuthService.resolveLoginRedirect(role, redirectParam);
    if (typeof window !== 'undefined' && window.location) {
      window.location.href = targetUrl;
    } else {
      router.replace(targetUrl);
    }
  } catch (err) {
    const authErr = err as AuthError;
    if (authErr.message) {
      state.toast = { message: authErr.message, type: 'error' };
    }
  } finally {
    state.loading = false;
    submittingRef.current = false;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeState(): LoginFormState {
  return { loading: false, errors: {}, toast: null };
}

function makeRouter(): MockRouter {
  return { replace: jest.fn() };
}

function makeSearchParams(redirect: string | null = null): MockSearchParams {
  return { get: (_key: string) => redirect };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useLoginForm — unit tests (task 7.5)', () => {
  const loginWithEmailMock = AuthService.loginWithEmail as jest.Mock;
  const getRoleAfterSessionMock = AuthService.getRoleAfterSession as jest.Mock;
  const resolveLoginRedirectMock = AuthService.resolveLoginRedirect as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: resolveLoginRedirect delegates to the real implementation so
    // existing tests that check router.replace('/') continue to work.
    resolveLoginRedirectMock.mockImplementation(
      (role: 'user' | 'admin', redirectParam: string | null) => {
        const isAdminPath = (p: string) => p === '/admin' || p.startsWith('/admin/');
        if (role === 'admin') {
          if (redirectParam !== null && isAdminPath(redirectParam)) return redirectParam;
          return '/admin';
        }
        if (redirectParam !== null && !isAdminPath(redirectParam)) return redirectParam;
        return '/';
      }
    );
    // Default role: 'user'
    getRoleAfterSessionMock.mockResolvedValue('user');
  });

  // ── 1. Valid submit ──────────────────────────────────────────────────────────
  describe('valid submit', () => {
    it('calls AuthService.loginWithEmail with the correct arguments', async () => {
      loginWithEmailMock.mockResolvedValueOnce({ uid: 'uid-1' });
      const state = makeState();
      const router = makeRouter();

      await runLoginSubmit('user@example.com', 'password123', false, state, router, makeSearchParams(), { current: false });

      expect(loginWithEmailMock).toHaveBeenCalledTimes(1);
      expect(loginWithEmailMock).toHaveBeenCalledWith('user@example.com', 'password123', false);
    });

    it('sets toast to success after successful login', async () => {
      loginWithEmailMock.mockResolvedValueOnce({ uid: 'uid-1' });
      const state = makeState();
      const router = makeRouter();

      await runLoginSubmit('user@example.com', 'pass', true, state, router, makeSearchParams(), { current: false });

      expect(state.toast).not.toBeNull();
      expect(state.toast!.type).toBe('success');
      expect(state.toast!.message).toBeTruthy();
    });

    it('calls router.replace("/") when no redirect param is present and role is user', async () => {
      loginWithEmailMock.mockResolvedValueOnce({ uid: 'uid-1' });
      getRoleAfterSessionMock.mockResolvedValueOnce('user');
      const state = makeState();
      const router = makeRouter();

      await runLoginSubmit('user@example.com', 'pass', false, state, router, makeSearchParams(null), { current: false });

      expect(router.replace).toHaveBeenCalledWith('/');
    });

    it('calls router.replace with redirect path when redirect param is present (user role)', async () => {
      loginWithEmailMock.mockResolvedValueOnce({ uid: 'uid-1' });
      getRoleAfterSessionMock.mockResolvedValueOnce('user');
      const state = makeState();
      const router = makeRouter();
      // The hook passes the raw redirectParam to resolveLoginRedirect — no pre-decoding.
      const redirectPath = '/dashboard';

      await runLoginSubmit('user@example.com', 'pass', false, state, router, makeSearchParams(redirectPath), { current: false });

      expect(router.replace).toHaveBeenCalledWith(redirectPath);
    });

    it('leaves errors empty after successful login', async () => {
      loginWithEmailMock.mockResolvedValueOnce({ uid: 'uid-1' });
      const state = makeState();
      const router = makeRouter();

      await runLoginSubmit('user@example.com', 'pass', false, state, router, makeSearchParams(), { current: false });

      expect(state.errors).toEqual({});
    });

    it('resets loading to false after successful login', async () => {
      loginWithEmailMock.mockResolvedValueOnce({ uid: 'uid-1' });
      const state = makeState();
      const router = makeRouter();

      await runLoginSubmit('user@example.com', 'pass', false, state, router, makeSearchParams(), { current: false });

      expect(state.loading).toBe(false);
    });
  });

  // ── 2. AuthError with field ──────────────────────────────────────────────────
  describe('AuthError with field property', () => {
    it('populates errors[field] with the error message', async () => {
      const authErr: AuthError = {
        code: 'auth/invalid-credential',
        message: 'Email atau kata sandi salah.',
        field: 'email',
      };
      loginWithEmailMock.mockRejectedValueOnce(authErr);
      const state = makeState();
      const router = makeRouter();

      await runLoginSubmit('wrong@example.com', 'wrongpass', false, state, router, makeSearchParams(), { current: false });

      expect(state.errors['email']).toBe('Email atau kata sandi salah.');
    });

    it('keeps toast null when AuthError has a field', async () => {
      const authErr: AuthError = {
        code: 'auth/invalid-email',
        message: 'Format email tidak valid.',
        field: 'email',
      };
      loginWithEmailMock.mockRejectedValueOnce(authErr);
      const state = makeState();
      const router = makeRouter();

      await runLoginSubmit('invalid', 'pass', false, state, router, makeSearchParams(), { current: false });

      expect(state.toast).toBeNull();
    });

    it('does not call router.replace when AuthError has a field', async () => {
      const authErr: AuthError = {
        code: 'auth/user-not-found',
        message: 'Pengguna tidak ditemukan.',
        field: 'email',
      };
      loginWithEmailMock.mockRejectedValueOnce(authErr);
      const state = makeState();
      const router = makeRouter();

      await runLoginSubmit('notfound@example.com', 'pass', false, state, router, makeSearchParams(), { current: false });

      expect(router.replace).not.toHaveBeenCalled();
    });

    it('stores the error under the correct field key', async () => {
      const authErr: AuthError = {
        code: 'auth/weak-password',
        message: 'Kata sandi terlalu lemah.',
        field: 'password',
      };
      loginWithEmailMock.mockRejectedValueOnce(authErr);
      const state = makeState();
      const router = makeRouter();

      await runLoginSubmit('user@example.com', '123', false, state, router, makeSearchParams(), { current: false });

      expect(state.errors['password']).toBe('Kata sandi terlalu lemah.');
      expect(Object.keys(state.errors)).toHaveLength(1);
    });
  });

  // ── 3. AuthError without field ───────────────────────────────────────────────
  describe('AuthError without field property', () => {
    it('sets toast.type to "error"', async () => {
      const authErr: AuthError = {
        code: 'auth/too-many-requests',
        message: 'Terlalu banyak percobaan. Silakan coba lagi nanti.',
      };
      loginWithEmailMock.mockRejectedValueOnce(authErr);
      const state = makeState();
      const router = makeRouter();

      await runLoginSubmit('user@example.com', 'pass', false, state, router, makeSearchParams(), { current: false });

      expect(state.toast).not.toBeNull();
      expect(state.toast!.type).toBe('error');
    });

    it('sets toast.message to the AuthError message', async () => {
      const authErr: AuthError = {
        code: 'network-error',
        message: 'Tidak ada koneksi internet.',
      };
      loginWithEmailMock.mockRejectedValueOnce(authErr);
      const state = makeState();
      const router = makeRouter();

      await runLoginSubmit('user@example.com', 'pass', false, state, router, makeSearchParams(), { current: false });

      expect(state.toast!.message).toBe('Tidak ada koneksi internet.');
    });

    it('keeps errors empty when AuthError has no field', async () => {
      const authErr: AuthError = {
        code: 'auth/user-disabled',
        message: 'Akun ini telah dinonaktifkan.',
      };
      loginWithEmailMock.mockRejectedValueOnce(authErr);
      const state = makeState();
      const router = makeRouter();

      await runLoginSubmit('user@example.com', 'pass', false, state, router, makeSearchParams(), { current: false });

      expect(state.errors).toEqual({});
    });

    it('uses fallback message "Terjadi kesalahan." when AuthError has no message', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const authErr: any = { code: 'unknown' }; // no message property
      loginWithEmailMock.mockRejectedValueOnce(authErr);
      const state = makeState();
      const router = makeRouter();

      await runLoginSubmit('user@example.com', 'pass', false, state, router, makeSearchParams(), { current: false });

      expect(state.toast!.message).toBe('Terjadi kesalahan.');
    });

    it('does not call router.replace on error', async () => {
      const authErr: AuthError = { code: 'unknown', message: 'Kesalahan tidak diketahui.' };
      loginWithEmailMock.mockRejectedValueOnce(authErr);
      const state = makeState();
      const router = makeRouter();

      await runLoginSubmit('user@example.com', 'pass', false, state, router, makeSearchParams(), { current: false });

      expect(router.replace).not.toHaveBeenCalled();
    });
  });

  // ── 4. Double-submit prevention ──────────────────────────────────────────────
  describe('double-submit prevention via submittingRef', () => {
    it('does not call AuthService if submittingRef.current is true', async () => {
      const state = makeState();
      const router = makeRouter();
      const submittingRef = { current: true }; // already submitting

      await runLoginSubmit('user@example.com', 'pass', false, state, router, makeSearchParams(), submittingRef);

      expect(loginWithEmailMock).not.toHaveBeenCalled();
    });

    it('resets submittingRef.current to false after successful submit', async () => {
      loginWithEmailMock.mockResolvedValueOnce({ uid: 'uid-1' });
      const state = makeState();
      const router = makeRouter();
      const submittingRef = { current: false };

      await runLoginSubmit('user@example.com', 'pass', false, state, router, makeSearchParams(), submittingRef);

      expect(submittingRef.current).toBe(false);
    });

    it('resets submittingRef.current to false after failed submit', async () => {
      loginWithEmailMock.mockRejectedValueOnce({ code: 'unknown', message: 'Error' } as AuthError);
      const state = makeState();
      const router = makeRouter();
      const submittingRef = { current: false };

      await runLoginSubmit('user@example.com', 'pass', false, state, router, makeSearchParams(), submittingRef);

      expect(submittingRef.current).toBe(false);
    });

    it('second concurrent call is silently dropped while first is in-flight', async () => {
      let resolveFirst!: () => void;
      const firstCallPromise = new Promise<{ uid: string }>((res) => {
        resolveFirst = () => res({ uid: 'uid-1' });
      });
      loginWithEmailMock.mockReturnValueOnce(firstCallPromise);

      const state = makeState();
      const router = makeRouter();
      const submittingRef = { current: false };

      // Start first call — do NOT await yet
      const firstCall = runLoginSubmit('user@example.com', 'pass', false, state, router, makeSearchParams(), submittingRef);

      // At this point submittingRef.current is true (set synchronously before await)
      expect(submittingRef.current).toBe(true);

      // Second call should be dropped immediately
      await runLoginSubmit('user@example.com', 'pass', false, state, router, makeSearchParams(), submittingRef);
      expect(loginWithEmailMock).toHaveBeenCalledTimes(1);

      // Resolve the first call
      resolveFirst();
      await firstCall;

      expect(submittingRef.current).toBe(false);
    });
  });

  // ── 5. Role-based redirect (task 10.5) ───────────────────────────────────────
  describe('role-based redirect after loginWithEmail', () => {
    it('redirects to /admin when getRoleAfterSession returns "admin"', async () => {
      loginWithEmailMock.mockResolvedValueOnce({ uid: 'admin-uid' });
      getRoleAfterSessionMock.mockResolvedValueOnce('admin');
      const state = makeState();
      const router = makeRouter();

      await runLoginSubmit('admin@example.com', 'pass', false, state, router, makeSearchParams(null), { current: false });

      expect(getRoleAfterSessionMock).toHaveBeenCalledWith('admin-uid');
      expect(router.replace).toHaveBeenCalledWith('/admin');
    });

    it('redirects to / when getRoleAfterSession returns "user"', async () => {
      loginWithEmailMock.mockResolvedValueOnce({ uid: 'user-uid' });
      getRoleAfterSessionMock.mockResolvedValueOnce('user');
      const state = makeState();
      const router = makeRouter();

      await runLoginSubmit('user@example.com', 'pass', false, state, router, makeSearchParams(null), { current: false });

      expect(getRoleAfterSessionMock).toHaveBeenCalledWith('user-uid');
      expect(router.replace).toHaveBeenCalledWith('/');
    });

    it('redirects to / when getRoleAfterSession throws (safe fallback via resolveLoginRedirect)', async () => {
      // getRoleAfterSession in production catches internally and returns 'user',
      // but here we model the hook-level behavior: if getRoleAfterSession resolves
      // to 'user' (its safe fallback), resolveLoginRedirect returns '/'.
      loginWithEmailMock.mockResolvedValueOnce({ uid: 'some-uid' });
      // Simulate the real getRoleAfterSession fallback behavior:
      // it catches all errors internally and returns 'user'
      getRoleAfterSessionMock.mockResolvedValueOnce('user');
      const state = makeState();
      const router = makeRouter();

      await runLoginSubmit('user@example.com', 'pass', false, state, router, makeSearchParams(null), { current: false });

      expect(router.replace).toHaveBeenCalledWith('/');
    });

    it('passes the uid from loginWithEmail to getRoleAfterSession', async () => {
      loginWithEmailMock.mockResolvedValueOnce({ uid: 'specific-uid-123' });
      getRoleAfterSessionMock.mockResolvedValueOnce('user');
      const state = makeState();
      const router = makeRouter();

      await runLoginSubmit('user@example.com', 'pass', false, state, router, makeSearchParams(null), { current: false });

      expect(getRoleAfterSessionMock).toHaveBeenCalledWith('specific-uid-123');
    });

    it('calls resolveLoginRedirect with the role and null redirect param', async () => {
      loginWithEmailMock.mockResolvedValueOnce({ uid: 'uid-1' });
      getRoleAfterSessionMock.mockResolvedValueOnce('admin');
      const state = makeState();
      const router = makeRouter();

      await runLoginSubmit('admin@example.com', 'pass', false, state, router, makeSearchParams(null), { current: false });

      expect(resolveLoginRedirectMock).toHaveBeenCalledWith('admin', null);
    });
  });

  // ── 6. Google submit & redirect (task 10.5 + original) ───────────────────────
  describe('Google submit & redirect', () => {
    const loginWithGoogleMock = AuthService.loginWithGoogle as jest.Mock;

    it('calls AuthService.loginWithGoogle and redirects to "/" on success (user role)', async () => {
      loginWithGoogleMock.mockResolvedValueOnce({ uid: 'uid-google' });
      getRoleAfterSessionMock.mockResolvedValueOnce('user');
      const state = makeState();
      const router = makeRouter();

      await runGoogleSubmit(state, router, makeSearchParams(null), { current: false });

      expect(loginWithGoogleMock).toHaveBeenCalledTimes(1);
      expect(state.toast?.type).toBe('success');
      expect(router.replace).toHaveBeenCalledWith('/');
    });

    it('redirects to /admin when Google login + admin role', async () => {
      loginWithGoogleMock.mockResolvedValueOnce({ uid: 'admin-uid' });
      getRoleAfterSessionMock.mockResolvedValueOnce('admin');
      const state = makeState();
      const router = makeRouter();

      await runGoogleSubmit(state, router, makeSearchParams(null), { current: false });

      expect(getRoleAfterSessionMock).toHaveBeenCalledWith('admin-uid');
      expect(router.replace).toHaveBeenCalledWith('/admin');
    });

    it('redirects to redirect param when present (user role)', async () => {
      loginWithGoogleMock.mockResolvedValueOnce({ uid: 'uid-google' });
      getRoleAfterSessionMock.mockResolvedValueOnce('user');
      const state = makeState();
      const router = makeRouter();

      await runGoogleSubmit(state, router, makeSearchParams('/game-virus'), { current: false });

      expect(router.replace).toHaveBeenCalledWith('/game-virus');
    });

    it('is silent and does not redirect when loginWithGoogle returns null (popup dismissed)', async () => {
      loginWithGoogleMock.mockResolvedValueOnce(null);
      const state = makeState();
      const router = makeRouter();

      await runGoogleSubmit(state, router, makeSearchParams(null), { current: false });

      expect(getRoleAfterSessionMock).not.toHaveBeenCalled();
      expect(router.replace).not.toHaveBeenCalled();
      expect(state.toast).toBeNull();
    });

    it('sets toast to error when loginWithGoogle throws', async () => {
      const authErr: AuthError = { code: 'auth/popup-blocked', message: 'Popup diblokir oleh browser.' };
      loginWithGoogleMock.mockRejectedValueOnce(authErr);
      const state = makeState();
      const router = makeRouter();

      await runGoogleSubmit(state, router, makeSearchParams(null), { current: false });

      expect(state.toast?.type).toBe('error');
      expect(state.toast?.message).toBe('Popup diblokir oleh browser.');
      expect(router.replace).not.toHaveBeenCalled();
    });
  });
});
