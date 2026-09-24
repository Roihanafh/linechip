/**
 * @jest-environment jsdom
 *
 * Unit tests for UsersClient component.
 * Feature: admin-user-management
 * Requirements: 1.1
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock Next.js navigation — must be before component imports
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

// Mock Next.js Link — renders as a plain <a> so href is inspectable
jest.mock('next/link', () => ({
  __esModule: true,
  default: function MockLink({
    children,
    href,
    className,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  },
}));

// AdminTableSkeleton renders nothing special — mock to keep test fast
jest.mock('@/components/admin/AdminTableSkeleton', () => ({
  __esModule: true,
  default: function MockSkeleton() {
    return <div data-testid="skeleton" />;
  },
}));

import UsersClient from '@/components/admin/UsersClient';
import type { PaginatedUsersResponse } from '@/app/admin/users/page';

// Minimal valid props — empty user list, no errors
const emptyData: PaginatedUsersResponse = {
  users: [],
  nextCursor: null,
};

describe('UsersClient — "Buat Pengguna Baru" link', () => {
  it('renders a link with text "Buat Pengguna Baru"', () => {
    render(<UsersClient initialData={emptyData} initialError={null} />);
    expect(screen.getByText(/Buat Pengguna Baru/i)).toBeTruthy();
  });

  it('link href points to /admin/users/new', () => {
    render(<UsersClient initialData={emptyData} initialError={null} />);
    const link = screen.getByText(/Buat Pengguna Baru/i).closest('a');
    expect(link).not.toBeNull();
    expect(link?.getAttribute('href')).toBe('/admin/users/new');
  });
});
