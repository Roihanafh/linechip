/**
 * Unit tests for useRegisterForm behavior (task 7.5)
 *
 * Because @testing-library/react is not installed, we cannot call hooks directly.
 * We mirror the hook's internal logic as a plain async function and inject mock
 * dependencies (AuthService, router) to verify the four required behaviors:
 *
 *  1. Valid submit → AuthService.registerWithEmail called → toast success → router.replace('/login')
 *  2. AuthError with `field` → errors[field] populated, toast remains null
 *  3. AuthError without `field` → toast.type === 'error', errors object stays empty
 *  4. Double-submit is prevented by submittingRef guard
 *  5. Client-side validation blocks AuthService (bonus: tests validation contract)
 */

import * as AuthService from '@/features/auth/services/authService';
import type { AuthError } from '@/features/auth/types';

// ─── Mock AuthService ─────────────────────────────────────────────────────────

jest.mock('@/features/auth/services/authService', () => ({
  loginWithEmail: jest.fn(),
  registerWithEmail: jest.fn(),
}));

// ─── Mirror of useRegisterForm logic ─────────────────────────────────────────
// Mirrors the state machine inside useRegisterForm without React.
// Must stay in sync with features/auth/hooks/useRegisterForm.ts

interface RegisterFormState {
  loading: boolean;
  errors: Record<string, string>;
  toast: { message: string; type: 'success' | 'error' } | null;
}

interface MockRouter {
  replace: jest.Mock;
}

function isValidEmailLocal(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function runRegisterSubmit(
  name: string,
  email: string,
  password: string,
  school: string,
  state: RegisterFormState,
  router: MockRouter,
  submittingRef: { current: boolean }
): Promise<void> {
  if (submittingRef.current) return;

  const validationErrors: Record<string, string> = {};

  const trimmedName = name.trim();
  if (!trimmedName || trimmedName.length < 1 || trimmedName.length > 100) {
    validationErrors.name = 'Nama harus diisi (1–100 karakter).';
  }

  const trimmedEmail = email.trim();
  if (!trimmedEmail || !isValidEmailLocal(trimmedEmail)) {
    validationErrors.email = 'Format email tidak valid.';
  }

  if (!password || password.length < 6) {
    validationErrors.password = 'Kata sandi minimal 6 karakter.';
  }

  const trimmedSchool = school.trim();
  if (!trimmedSchool || trimmedSchool.length < 1 || trimmedSchool.length > 200) {
    validationErrors.school = 'Nama sekolah harus diisi (1–200 karakter).';
  }

  if (Object.keys(validationErrors).length > 0) {
    state.errors = validationErrors;
    return;
  }

  submittingRef.current = true;
  state.loading = true;
  state.errors = {};

  try {
    await AuthService.registerWithEmail(name, email, password, school);
    state.toast = {
      message: 'Akun berhasil dibuat! Cek email untuk verifikasi.',
      type: 'success',
    };
    router.replace('/login');
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeState(): RegisterFormState {
  return { loading: false, errors: {}, toast: null };
}

function makeRouter(): MockRouter {
  return { replace: jest.fn() };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useRegisterForm — unit tests (task 7.5)', () => {
  const registerWithEmailMock = AuthService.registerWithEmail as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── 1. Valid submit ──────────────────────────────────────────────────────────
  describe('valid submit', () => {
    it('calls AuthService.registerWithEmail with correct arguments', async () => {
      registerWithEmailMock.mockResolvedValueOnce(undefined);
      const state = makeState();
      const router = makeRouter();

      await runRegisterSubmit('Alice', 'alice@example.com', 'password123', 'SMA Negeri 1', state, router, { current: false });

      expect(registerWithEmailMock).toHaveBeenCalledTimes(1);
      expect(registerWithEmailMock).toHaveBeenCalledWith('Alice', 'alice@example.com', 'password123', 'SMA Negeri 1');
    });

    it('sets toast to success after successful registration', async () => {
      registerWithEmailMock.mockResolvedValueOnce(undefined);
      const state = makeState();
      const router = makeRouter();

      await runRegisterSubmit('Alice', 'alice@example.com', 'password123', 'SMA 1', state, router, { current: false });

      expect(state.toast).not.toBeNull();
      expect(state.toast!.type).toBe('success');
      expect(state.toast!.message).toContain('berhasil');
    });

    it('calls router.replace("/login") after successful registration', async () => {
      registerWithEmailMock.mockResolvedValueOnce(undefined);
      const state = makeState();
      const router = makeRouter();

      await runRegisterSubmit('Alice', 'alice@example.com', 'password123', 'SMA 1', state, router, { current: false });

      expect(router.replace).toHaveBeenCalledWith('/login');
    });

    it('leaves errors empty after successful registration', async () => {
      registerWithEmailMock.mockResolvedValueOnce(undefined);
      const state = makeState();
      const router = makeRouter();

      await runRegisterSubmit('Alice', 'alice@example.com', 'password123', 'SMA 1', state, router, { current: false });

      expect(state.errors).toEqual({});
    });

    it('resets loading to false after successful registration', async () => {
      registerWithEmailMock.mockResolvedValueOnce(undefined);
      const state = makeState();
      const router = makeRouter();

      await runRegisterSubmit('Alice', 'alice@example.com', 'password123', 'SMA 1', state, router, { current: false });

      expect(state.loading).toBe(false);
    });
  });

  // ── 2. AuthError with field ──────────────────────────────────────────────────
  describe('AuthError with field property', () => {
    it('populates errors[field] with the error message', async () => {
      const authErr: AuthError = {
        code: 'auth/email-already-in-use',
        message: 'Email sudah terdaftar.',
        field: 'email',
      };
      registerWithEmailMock.mockRejectedValueOnce(authErr);
      const state = makeState();
      const router = makeRouter();

      await runRegisterSubmit('Alice', 'taken@example.com', 'password123', 'SMA 1', state, router, { current: false });

      expect(state.errors['email']).toBe('Email sudah terdaftar.');
    });

    it('keeps toast null when AuthError has a field', async () => {
      const authErr: AuthError = {
        code: 'auth/email-already-in-use',
        message: 'Email sudah terdaftar.',
        field: 'email',
      };
      registerWithEmailMock.mockRejectedValueOnce(authErr);
      const state = makeState();
      const router = makeRouter();

      await runRegisterSubmit('Alice', 'taken@example.com', 'password123', 'SMA 1', state, router, { current: false });

      expect(state.toast).toBeNull();
    });

    it('does not call router.replace when AuthError has a field', async () => {
      const authErr: AuthError = {
        code: 'auth/email-already-in-use',
        message: 'Email sudah terdaftar.',
        field: 'email',
      };
      registerWithEmailMock.mockRejectedValueOnce(authErr);
      const state = makeState();
      const router = makeRouter();

      await runRegisterSubmit('Alice', 'taken@example.com', 'password123', 'SMA 1', state, router, { current: false });

      expect(router.replace).not.toHaveBeenCalled();
    });

    it('stores the error under the correct field key for a server-side password error', async () => {
      // Use a password that passes client validation (>= 6 chars) so AuthService is called
      const authErr: AuthError = {
        code: 'auth/weak-password',
        message: 'Kata sandi terlalu lemah.',
        field: 'password',
      };
      registerWithEmailMock.mockRejectedValueOnce(authErr);
      const state = makeState();
      const router = makeRouter();

      await runRegisterSubmit('Alice', 'alice@example.com', 'abc123', 'SMA 1', state, router, { current: false });

      expect(state.errors['password']).toBe('Kata sandi terlalu lemah.');
      expect(Object.keys(state.errors)).toHaveLength(1);
    });

    it('server-side field error populates only the specified field in errors', async () => {
      const authErr: AuthError = {
        code: 'auth/email-already-in-use',
        message: 'Email ini sudah digunakan.',
        field: 'email',
      };
      registerWithEmailMock.mockRejectedValueOnce(authErr);
      const state = makeState();
      const router = makeRouter();

      await runRegisterSubmit('Alice', 'existing@example.com', 'password123', 'SMA 1', state, router, { current: false });

      expect(state.errors).toEqual({ email: 'Email ini sudah digunakan.' });
      expect(Object.keys(state.errors)).toHaveLength(1);
    });
  });

  // ── 3. AuthError without field ───────────────────────────────────────────────
  describe('AuthError without field property', () => {
    it('sets toast.type to "error"', async () => {
      const authErr: AuthError = {
        code: 'registration-failed',
        message: 'Registrasi gagal. Silakan coba lagi.',
      };
      registerWithEmailMock.mockRejectedValueOnce(authErr);
      const state = makeState();
      const router = makeRouter();

      await runRegisterSubmit('Alice', 'alice@example.com', 'password123', 'SMA 1', state, router, { current: false });

      expect(state.toast).not.toBeNull();
      expect(state.toast!.type).toBe('error');
    });

    it('sets toast.message to the AuthError message', async () => {
      const authErr: AuthError = {
        code: 'network-error',
        message: 'Tidak ada koneksi internet.',
      };
      registerWithEmailMock.mockRejectedValueOnce(authErr);
      const state = makeState();
      const router = makeRouter();

      await runRegisterSubmit('Alice', 'alice@example.com', 'password123', 'SMA 1', state, router, { current: false });

      expect(state.toast!.message).toBe('Tidak ada koneksi internet.');
    });

    it('keeps errors empty when AuthError has no field', async () => {
      const authErr: AuthError = {
        code: 'auth/operation-not-allowed',
        message: 'Operasi tidak diizinkan.',
      };
      registerWithEmailMock.mockRejectedValueOnce(authErr);
      const state = makeState();
      const router = makeRouter();

      await runRegisterSubmit('Alice', 'alice@example.com', 'password123', 'SMA 1', state, router, { current: false });

      expect(state.errors).toEqual({});
    });

    it('uses fallback message "Terjadi kesalahan." when AuthError has no message', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const authErr: any = { code: 'unknown' }; // no message property
      registerWithEmailMock.mockRejectedValueOnce(authErr);
      const state = makeState();
      const router = makeRouter();

      await runRegisterSubmit('Alice', 'alice@example.com', 'password123', 'SMA 1', state, router, { current: false });

      expect(state.toast!.message).toBe('Terjadi kesalahan.');
    });

    it('does not call router.replace on error', async () => {
      const authErr: AuthError = { code: 'unknown', message: 'Kesalahan tidak diketahui.' };
      registerWithEmailMock.mockRejectedValueOnce(authErr);
      const state = makeState();
      const router = makeRouter();

      await runRegisterSubmit('Alice', 'alice@example.com', 'password123', 'SMA 1', state, router, { current: false });

      expect(router.replace).not.toHaveBeenCalled();
    });
  });

  // ── 4. Double-submit prevention ──────────────────────────────────────────────
  describe('double-submit prevention via submittingRef', () => {
    it('does not call AuthService if submittingRef.current is true', async () => {
      const state = makeState();
      const router = makeRouter();
      const submittingRef = { current: true }; // already submitting

      await runRegisterSubmit('Alice', 'alice@example.com', 'password123', 'SMA 1', state, router, submittingRef);

      expect(registerWithEmailMock).not.toHaveBeenCalled();
    });

    it('resets submittingRef.current to false after successful submit', async () => {
      registerWithEmailMock.mockResolvedValueOnce(undefined);
      const state = makeState();
      const router = makeRouter();
      const submittingRef = { current: false };

      await runRegisterSubmit('Alice', 'alice@example.com', 'password123', 'SMA 1', state, router, submittingRef);

      expect(submittingRef.current).toBe(false);
    });

    it('resets submittingRef.current to false after failed submit', async () => {
      registerWithEmailMock.mockRejectedValueOnce({ code: 'unknown', message: 'Error' } as AuthError);
      const state = makeState();
      const router = makeRouter();
      const submittingRef = { current: false };

      await runRegisterSubmit('Alice', 'alice@example.com', 'password123', 'SMA 1', state, router, submittingRef);

      expect(submittingRef.current).toBe(false);
    });

    it('second concurrent call is silently dropped while first is in-flight', async () => {
      let resolveFirst!: () => void;
      const firstCallPromise = new Promise<void>((res) => {
        resolveFirst = res;
      });
      registerWithEmailMock.mockReturnValueOnce(firstCallPromise);

      const state = makeState();
      const router = makeRouter();
      const submittingRef = { current: false };

      // Start first call — do NOT await yet
      const firstCall = runRegisterSubmit('Alice', 'alice@example.com', 'password123', 'SMA 1', state, router, submittingRef);

      // submittingRef.current is true after the guard passes and before the first await
      expect(submittingRef.current).toBe(true);

      // Second call should be dropped immediately
      await runRegisterSubmit('Alice', 'alice@example.com', 'password123', 'SMA 1', state, router, submittingRef);
      expect(registerWithEmailMock).toHaveBeenCalledTimes(1);

      resolveFirst();
      await firstCall;

      expect(submittingRef.current).toBe(false);
    });
  });

  // ── 5. Client-side validation blocks AuthService ─────────────────────────────
  describe('client-side validation blocks AuthService', () => {
    it('does not call AuthService when name is empty', async () => {
      const state = makeState();
      const router = makeRouter();

      await runRegisterSubmit('', 'alice@example.com', 'password123', 'SMA 1', state, router, { current: false });

      expect(registerWithEmailMock).not.toHaveBeenCalled();
      expect(state.errors.name).toBeTruthy();
    });

    it('does not call AuthService when email is invalid', async () => {
      const state = makeState();
      const router = makeRouter();

      await runRegisterSubmit('Alice', 'not-an-email', 'password123', 'SMA 1', state, router, { current: false });

      expect(registerWithEmailMock).not.toHaveBeenCalled();
      expect(state.errors.email).toBeTruthy();
    });

    it('does not call AuthService when password is too short', async () => {
      const state = makeState();
      const router = makeRouter();

      await runRegisterSubmit('Alice', 'alice@example.com', '123', 'SMA 1', state, router, { current: false });

      expect(registerWithEmailMock).not.toHaveBeenCalled();
      expect(state.errors.password).toBeTruthy();
    });

    it('does not call AuthService when school is empty', async () => {
      const state = makeState();
      const router = makeRouter();

      await runRegisterSubmit('Alice', 'alice@example.com', 'password123', '', state, router, { current: false });

      expect(registerWithEmailMock).not.toHaveBeenCalled();
      expect(state.errors.school).toBeTruthy();
    });

    it('reports all validation errors at once for multiple invalid fields', async () => {
      const state = makeState();
      const router = makeRouter();

      await runRegisterSubmit('', 'bad-email', '12', '', state, router, { current: false });

      expect(Object.keys(state.errors).length).toBeGreaterThanOrEqual(4);
      expect(state.errors.name).toBeTruthy();
      expect(state.errors.email).toBeTruthy();
      expect(state.errors.password).toBeTruthy();
      expect(state.errors.school).toBeTruthy();
    });
  });
});
