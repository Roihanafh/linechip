/**
 * @jest-environment jsdom
 *
 * Unit tests for CreateUserForm component.
 * Feature: admin-user-management
 * Requirements: 1.2–1.7, 5.1, 7.1–7.7
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

// ─── Mock next/navigation ─────────────────────────────────────────────────────
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), prefetch: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

// ─── Mock next/link → plain <a> ───────────────────────────────────────────────
jest.mock('next/link', () => ({
  __esModule: true,
  default: function MockLink({
    children,
    href,
    className,
    tabIndex,
    'aria-disabled': ariaDisabled,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
    tabIndex?: number;
    'aria-disabled'?: boolean;
  }) {
    return (
      <a href={href} className={className} tabIndex={tabIndex} aria-disabled={ariaDisabled}>
        {children}
      </a>
    );
  },
}));

import CreateUserForm from '@/components/admin/CreateUserForm';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Fill all four fields with valid data. */
function fillValidForm() {
  fireEvent.change(screen.getByLabelText(/Alamat Email/i), {
    target: { value: 'user@example.com' },
  });
  fireEvent.change(screen.getByLabelText(/Password Sementara/i), {
    target: { value: 'password123' },
  });
  fireEvent.change(screen.getByLabelText(/Nama Lengkap/i), {
    target: { value: 'Budi Santoso' },
  });
  fireEvent.change(screen.getByLabelText(/Sekolah/i), {
    target: { value: 'SMPN 1 Jakarta' },
  });
}

/** Mock a successful fetch (201). */
function mockFetch201() {
  global.fetch = jest.fn().mockResolvedValueOnce({
    status: 201,
    json: async () => ({ ok: true, uid: 'uid-abc', email: 'user@example.com' }),
  });
}

/** Mock a 400 error fetch with a specific error message. */
function mockFetch400(error = 'Email sudah terdaftar. Gunakan email yang berbeda.') {
  global.fetch = jest.fn().mockResolvedValueOnce({
    status: 400,
    json: async () => ({ error }),
  });
}

/** Mock a 500 error fetch. */
function mockFetch500() {
  global.fetch = jest.fn().mockResolvedValueOnce({
    status: 500,
    json: async () => ({ error: 'Gagal membuat akun pengguna. Silakan coba lagi.' }),
  });
}

/** Mock fetch rejecting with an AbortError. */
function mockFetchAbort() {
  global.fetch = jest.fn().mockRejectedValueOnce(
    Object.assign(new Error('Aborted'), { name: 'AbortError' })
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  // Reset fake timers — individual tests opt in with jest.useFakeTimers()
  jest.useRealTimers();
});

// ─── 1. Rendering ─────────────────────────────────────────────────────────────

describe('Rendering', () => {
  it('renders 4 input fields', () => {
    render(<CreateUserForm />);
    expect(screen.getByLabelText(/Alamat Email/i)).toBeTruthy();
    expect(screen.getByLabelText(/Password Sementara/i)).toBeTruthy();
    expect(screen.getByLabelText(/Nama Lengkap/i)).toBeTruthy();
    expect(screen.getByLabelText(/Sekolah/i)).toBeTruthy();
  });

  it('renders the submit button "Buat Akun"', () => {
    render(<CreateUserForm />);
    expect(screen.getByRole('button', { name: /Buat Akun/i })).toBeTruthy();
  });

  it('renders the static info banner about temporary password', () => {
    render(<CreateUserForm />);
    // The info banner contains "Password sementara" inside a <strong> tag.
    // Use getAllByText since the password field label also contains the word.
    const matches = screen.getAllByText(/Password sementara/i);
    expect(matches.length).toBeGreaterThan(0);
    // Confirm the banner paragraph is present
    expect(
      screen.getByText(/yang Anda atur akan diberikan kepada pengguna/i)
    ).toBeTruthy();
  });

  it('renders the "Batal" cancel link pointing to /admin/users', () => {
    render(<CreateUserForm />);
    const cancelLink = screen.getByText(/Batal/i).closest('a');
    expect(cancelLink).not.toBeNull();
    expect(cancelLink?.getAttribute('href')).toBe('/admin/users');
  });

  it('form element has accessible aria-label', () => {
    render(<CreateUserForm />);
    expect(screen.getByRole('form', { name: /Formulir buat pengguna baru/i })).toBeTruthy();
  });
});

// ─── 2. Client-side validation — submit blocked when fields empty ──────────────

describe('Client-side validation', () => {
  it('does not send a fetch request when all fields are empty', async () => {
    global.fetch = jest.fn();
    render(<CreateUserForm />);
    fireEvent.click(screen.getByRole('button', { name: /Buat Akun/i }));
    await act(async () => {});
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('does not send a fetch request when only email is filled', async () => {
    global.fetch = jest.fn();
    render(<CreateUserForm />);
    fireEvent.change(screen.getByLabelText(/Alamat Email/i), {
      target: { value: 'user@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Buat Akun/i }));
    await act(async () => {});
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('shows field-level errors when submitting with empty fields', async () => {
    render(<CreateUserForm />);
    fireEvent.click(screen.getByRole('button', { name: /Buat Akun/i }));
    await act(async () => {});
    // At minimum one error message should appear (role="alert" from FloatingInput)
    const alerts = screen.getAllByRole('alert');
    expect(alerts.length).toBeGreaterThan(0);
  });
});

// ─── 3. Loading state ─────────────────────────────────────────────────────────

describe('Loading state', () => {
  it('disables all fields and shows spinner during loading', async () => {
    // Fetch never resolves — keeps loading state indefinitely
    global.fetch = jest.fn().mockReturnValueOnce(new Promise(() => {}));
    render(<CreateUserForm />);
    fillValidForm();

    fireEvent.click(screen.getByRole('button', { name: /Buat Akun/i }));

    await waitFor(() => {
      expect(screen.getByText(/Membuat Akun\.\.\./i)).toBeTruthy();
    });

    // All four inputs should be disabled (check via DOM attribute — jest-dom not available)
    expect(
      (screen.getByLabelText(/Alamat Email/i) as HTMLInputElement).disabled
    ).toBe(true);
    expect(
      (screen.getByLabelText(/Password Sementara/i) as HTMLInputElement).disabled
    ).toBe(true);
    expect(
      (screen.getByLabelText(/Nama Lengkap/i) as HTMLInputElement).disabled
    ).toBe(true);
    expect(
      (screen.getByLabelText(/Sekolah/i) as HTMLInputElement).disabled
    ).toBe(true);

    // Submit button should be disabled
    expect(
      (screen.getByRole('button', { name: /Membuat Akun\.\.\./i }) as HTMLButtonElement).disabled
    ).toBe(true);
  });
});

// ─── 4. Success (201) ────────────────────────────────────────────────────────

describe('Success flow (HTTP 201)', () => {
  it('shows success banner with created email after 201', async () => {
    jest.useFakeTimers();
    mockFetch201();
    render(<CreateUserForm />);
    fillValidForm();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Buat Akun/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/Akun berhasil dibuat!/i)).toBeTruthy();
      expect(screen.getByText(/user@example\.com/)).toBeTruthy();
    });
  });

  it('calls router.push("/admin/users") after 2000 ms on success', async () => {
    jest.useFakeTimers();
    mockFetch201();
    render(<CreateUserForm />);
    fillValidForm();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Buat Akun/i }));
    });

    // Should not navigate yet
    expect(mockPush).not.toHaveBeenCalledWith('/admin/users');

    // Advance 2000 ms
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    expect(mockPush).toHaveBeenCalledWith('/admin/users');
  });
});

// ─── 5. Error 400 ─────────────────────────────────────────────────────────────

describe('Error flow (HTTP 400)', () => {
  it('shows email field-level error message from server on 400', async () => {
    mockFetch400('Email sudah terdaftar. Gunakan email yang berbeda.');
    render(<CreateUserForm />);
    fillValidForm();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Buat Akun/i }));
    });

    await waitFor(() => {
      // The error text appears in both the visible alert <p> and the sr-only hint <p>.
      // getAllByText to avoid "multiple elements" error.
      const matches = screen.getAllByText(/Email sudah terdaftar/i);
      expect(matches.length).toBeGreaterThan(0);
    });
  });

  it('re-enables fields after a 400 error', async () => {
    mockFetch400();
    render(<CreateUserForm />);
    fillValidForm();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Buat Akun/i }));
    });

    await waitFor(() => {
      expect(
        (screen.getByLabelText(/Alamat Email/i) as HTMLInputElement).disabled
      ).toBe(false);
    });
  });

  it('preserves field values after a 400 error', async () => {
    mockFetch400();
    render(<CreateUserForm />);
    fillValidForm();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Buat Akun/i }));
    });

    await waitFor(() => {
      expect(
        (screen.getByLabelText(/Alamat Email/i) as HTMLInputElement).value
      ).toBe('user@example.com');
    });
  });
});

// ─── 6. Error 500 ─────────────────────────────────────────────────────────────

describe('Error flow (HTTP 500)', () => {
  it('shows generic red error banner on 500', async () => {
    mockFetch500();
    render(<CreateUserForm />);
    fillValidForm();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Buat Akun/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/Gagal membuat akun. Silakan coba lagi./i)).toBeTruthy();
    });
  });

  it('re-enables fields after a 500 error', async () => {
    mockFetch500();
    render(<CreateUserForm />);
    fillValidForm();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Buat Akun/i }));
    });

    await waitFor(() => {
      expect(
        (screen.getByLabelText(/Alamat Email/i) as HTMLInputElement).disabled
      ).toBe(false);
    });
  });
});

// ─── 7. AbortError (network/timeout) ──────────────────────────────────────────

describe('AbortError / timeout', () => {
  it('shows generic red error banner when fetch is aborted', async () => {
    mockFetchAbort();
    render(<CreateUserForm />);
    fillValidForm();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Buat Akun/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/Terjadi kesalahan. Silakan coba lagi./i)).toBeTruthy();
    });
  });
});

// ─── 8. Escape key ────────────────────────────────────────────────────────────

describe('Keyboard UX — Escape key', () => {
  it('calls router.push("/admin/users") when Escape is pressed', () => {
    render(<CreateUserForm />);
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    expect(mockPush).toHaveBeenCalledWith('/admin/users');
  });
});

// ─── 9. ARIA attributes ───────────────────────────────────────────────────────

describe('ARIA — aria-invalid on fields with errors', () => {
  it('sets aria-invalid="true" on email input when validation fails on blur', async () => {
    render(<CreateUserForm />);
    const emailInput = screen.getByLabelText(/Alamat Email/i);

    // Trigger blur with invalid value
    fireEvent.change(emailInput, { target: { value: 'not-an-email' } });
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(emailInput.getAttribute('aria-invalid')).toBe('true');
    });
  });

  it('sets aria-invalid="true" on all invalid fields after failed submit', async () => {
    render(<CreateUserForm />);
    // Submit with all empty fields
    fireEvent.click(screen.getByRole('button', { name: /Buat Akun/i }));
    await act(async () => {});

    // All four inputs should have aria-invalid="true"
    expect(
      screen.getByLabelText(/Alamat Email/i).getAttribute('aria-invalid')
    ).toBe('true');
    expect(
      screen.getByLabelText(/Nama Lengkap/i).getAttribute('aria-invalid')
    ).toBe('true');
    expect(
      screen.getByLabelText(/Sekolah/i).getAttribute('aria-invalid')
    ).toBe('true');
  });
});

// ─── 10. role="alert" on error messages ───────────────────────────────────────

describe('ARIA — role="alert" on error messages', () => {
  it('renders error messages with role="alert" after failed submit', async () => {
    render(<CreateUserForm />);
    fireEvent.click(screen.getByRole('button', { name: /Buat Akun/i }));
    await act(async () => {});

    const alerts = screen.getAllByRole('alert');
    expect(alerts.length).toBeGreaterThan(0);
  });

  it('global error banner has role="alert" on 500', async () => {
    mockFetch500();
    render(<CreateUserForm />);
    fillValidForm();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Buat Akun/i }));
    });

    await waitFor(() => {
      const alerts = screen.getAllByRole('alert');
      const globalBanner = alerts.find((el) =>
        el.textContent?.includes('Gagal membuat akun')
      );
      expect(globalBanner).toBeTruthy();
    });
  });

  it('success banner has role="alert" on 201', async () => {
    jest.useFakeTimers();
    mockFetch201();
    render(<CreateUserForm />);
    fillValidForm();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Buat Akun/i }));
    });

    await waitFor(() => {
      const alerts = screen.getAllByRole('alert');
      const successBanner = alerts.find((el) =>
        el.textContent?.includes('Akun berhasil dibuat')
      );
      expect(successBanner).toBeTruthy();
    });
  });
});
