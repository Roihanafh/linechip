/**
 * @jest-environment jsdom
 *
 * Unit tests for UserDetailClient component.
 * Feature: admin-dashboard
 * Requirements: 4.3, 4.4
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock Next.js navigation — must be before component imports
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
}));

// Mock Next.js Image
jest.mock('next/image', () => ({
  __esModule: true,
  default: function MockImage(props: React.ImgHTMLAttributes<HTMLImageElement> & { alt: string }) {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

// Mock Next.js Link
jest.mock('next/link', () => ({
  __esModule: true,
  default: function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>;
  },
}));

// ConfirmationDialog uses createPortal — ensure body is clean
beforeEach(() => {
  document.body.innerHTML = '';
});

import UserDetailClient from '@/components/admin/UserDetailClient';
import type { AdminUserDetail } from '@/app/admin/users/[uid]/page';

function makeProfile(overrides: Partial<AdminUserDetail> = {}): AdminUserDetail {
  return {
    uid: 'test-uid-123',
    name: 'Jane Doe',
    email: 'jane@example.com',
    school: 'SMP Contoh',
    photoURL: null,
    role: 'user',
    totalScore: 500,
    disabled: false,
    createdAt: '2024-01-15T10:30:00.000Z',
    updatedAt: '2024-06-01T08:00:00.000Z',
    ...overrides,
  };
}

describe('UserDetailClient — disable/enable button visibility', () => {
  it('shows "Nonaktifkan Akun" and hides "Aktifkan Akun" when isDisabled=false', () => {
    render(<UserDetailClient profile={makeProfile()} isDisabled={false} />);
    // "Nonaktifkan Akun" button should be present
    const buttons = screen.getAllByRole('button');
    const labels = buttons.map((b) => b.textContent ?? '');
    expect(labels.some((l) => l.includes('Nonaktifkan Akun'))).toBe(true);
    // No standalone "Aktifkan Akun" button (i.e., no button whose text starts with "Aktifkan")
    expect(labels.some((l) => /^[\s\S]*Aktifkan Akun$/.test(l) && !l.includes('Non'))).toBe(false);
  });

  it('shows "Aktifkan Akun" and hides "Nonaktifkan Akun" when isDisabled=true', () => {
    render(<UserDetailClient profile={makeProfile({ disabled: true })} isDisabled={true} />);
    const buttons = screen.getAllByRole('button');
    const labels = buttons.map((b) => b.textContent ?? '');
    // "Aktifkan Akun" button present
    expect(labels.some((l) => l.includes('Aktifkan Akun') && !l.includes('Non'))).toBe(true);
    // "Nonaktifkan Akun" button absent
    expect(labels.some((l) => l.includes('Nonaktifkan Akun'))).toBe(false);
  });

  it('always shows "Hapus Pengguna" for non-admin users', () => {
    render(<UserDetailClient profile={makeProfile()} isDisabled={false} />);
    const buttons = screen.getAllByRole('button');
    const labels = buttons.map((b) => b.textContent ?? '');
    expect(labels.some((l) => l.includes('Hapus Pengguna'))).toBe(true);
  });

  it('hides action buttons and shows message for admin accounts', () => {
    render(
      <UserDetailClient
        profile={makeProfile({ role: 'admin' })}
        isDisabled={false}
      />
    );
    const buttons = screen.queryAllByRole('button');
    const labels = buttons.map((b) => b.textContent ?? '');
    expect(labels.some((l) => l.includes('Nonaktifkan Akun'))).toBe(false);
    expect(labels.some((l) => l.includes('Aktifkan Akun') && !l.includes('Non'))).toBe(false);
    expect(labels.some((l) => l.includes('Hapus Pengguna'))).toBe(false);
    expect(
      screen.getByText(/akun admin tidak dapat dimodifikasi/i)
    ).toBeTruthy();
  });

  it('displays user name', () => {
    render(<UserDetailClient profile={makeProfile()} isDisabled={false} />);
    expect(screen.getByText('Jane Doe')).toBeTruthy();
  });

  it('displays user email', () => {
    render(<UserDetailClient profile={makeProfile()} isDisabled={false} />);
    expect(screen.getByText('jane@example.com')).toBeTruthy();
  });
});
