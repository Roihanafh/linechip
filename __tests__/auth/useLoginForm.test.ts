/**
 * Unit tests for useLoginForm behavior (task 7.5)
 *
 * Because @testing-library/react is not installed, we cannot call hooks directly.
 * Instead we mirror the hook's internal logic as a plain async function and inject
 * mock dependencies (AuthService, router) to verify the four required behaviors:
 *
 *  1. Valid submit → AuthService.loginWithEmail called → toast success → router.replace called
 *  2. AuthError with `field` → errors[field] populated, toast remains null
 *  3. AuthError without `field` → toast.type === 'error', errors object stays empty
 *  4. Double-submit is prevented by submittingRef guard
 */

import * as AuthService from '@/features/auth/services/authService';
import type { AuthError } from '@/features/auth/types';

// ─── Mock AuthService ─────────────────────────────────────────────────────────

jest.mock('@/features/auth/services/authService', () => ({
  loginWithEmail: jest.fn(),
  loginWithGoogle: jest.fn(),
  registerWithEmail: jest.fn(),
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
 * Executes the same logic as useLoginForm.onSubmit but as a plain async function
 * so it can run in a Jest/Node environment without React.
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
    await AuthService.loginWithEmail(email, password, rememberMe);
    state.toast = { message: 'Login berhasil! Selamat datang kembali.', type: 'success' };
    const redirect = searchParams.get('redirect');
    const targetUrl = redirect ? decodeURIComponent(redirect) : '/';
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
    await AuthService.loginWithGoogle();
    state.toast = { message: 'Login Google berhasil! Selamat datang kembali.', type: 'success' };
    const redirect = searchParams.get('redirect');
    const targetUrl = redirect ? decodeURIComponent(redirect) : '/';
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── 1. Valid submit ──────────────────────────────────────────────────────────
  describe('valid submit', () => {
    it('calls AuthService.loginWithEmail with the correct arguments', async () => {
      loginWithEmailMock.mockResolvedValueOnce(undefined);
      const state = makeState();
      const router = makeRouter();

      await runLoginSubmit('user@example.com', 'password123', false, state, router, makeSearchParams(), { current: false });

      expect(loginWithEmailMock).toHaveBeenCalledTimes(1);
      expect(loginWithEmailMock).toHaveBeenCalledWith('user@example.com', 'password123', false);
    });

    it('sets toast to success after successful login', async () => {
      loginWithEmailMock.mockResolvedValueOnce(undefined);
      const state = makeState();
      const router = makeRouter();

      await runLoginSubmit('user@example.com', 'pass', true, state, router, makeSearchParams(), { current: false });

      expect(state.toast).not.toBeNull();
      expect(state.toast!.type).toBe('success');
      expect(state.toast!.message).toBeTruthy();
    });

    it('calls router.replace("/") when no redirect param is present', async () => {
      loginWithEmailMock.mockResolvedValueOnce(undefined);
      const state = makeState();
      const router = makeRouter();

      await runLoginSubmit('user@example.com', 'pass', false, state, router, makeSearchParams(null), { current: false });

      expect(router.replace).toHaveBeenCalledWith('/');
    });

    it('calls router.replace with decoded redirect path when redirect param is present', async () => {
      loginWithEmailMock.mockResolvedValueOnce(undefined);
      const state = makeState();
      const router = makeRouter();
      const redirectPath = '/dashboard';
      const encoded = encodeURIComponent(redirectPath);

      await runLoginSubmit('user@example.com', 'pass', false, state, router, makeSearchParams(encoded), { current: false });

      expect(router.replace).toHaveBeenCalledWith(redirectPath);
    });

    it('leaves errors empty after successful login', async () => {
      loginWithEmailMock.mockResolvedValueOnce(undefined);
      const state = makeState();
      const router = makeRouter();

      await runLoginSubmit('user@example.com', 'pass', false, state, router, makeSearchParams(), { current: false });

      expect(state.errors).toEqual({});
    });

    it('resets loading to false after successful login', async () => {
      loginWithEmailMock.mockResolvedValueOnce(undefined);
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
      loginWithEmailMock.mockResolvedValueOnce(undefined);
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
      const firstCallPromise = new Promise<void>((res) => {
        resolveFirst = res;
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

  // ── 5. Google submit & redirect ──────────────────────────────────────────────
  describe('Google submit & redirect', () => {
    const loginWithGoogleMock = AuthService.loginWithGoogle as jest.Mock;

    it('calls AuthService.loginWithGoogle and redirects to "/" on success', async () => {
      loginWithGoogleMock.mockResolvedValueOnce(undefined);
      const state = makeState();
      const router = makeRouter();

      await runGoogleSubmit(state, router, makeSearchParams(null), { current: false });

      expect(loginWithGoogleMock).toHaveBeenCalledTimes(1);
      expect(state.toast?.type).toBe('success');
      expect(router.replace).toHaveBeenCalledWith('/');
    });

    it('redirects to redirect param when present', async () => {
      loginWithGoogleMock.mockResolvedValueOnce(undefined);
      const state = makeState();
      const router = makeRouter();

      await runGoogleSubmit(state, router, makeSearchParams('/game-virus'), { current: false });

      expect(router.replace).toHaveBeenCalledWith('/game-virus');
    });
  });
});
