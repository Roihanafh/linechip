'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import type { UserProfile } from '@/features/auth/types';

interface AccountDropdownProps {
  user: UserProfile;
  onClose: () => void;
  onLogout: () => Promise<void>;
  isLoggingOut: boolean;
}

export default function AccountDropdown({
  user,
  onClose,
  onLogout,
  isLoggingOut,
}: AccountDropdownProps) {
  const firstItemRef = useRef<HTMLAnchorElement>(null);

  // Focus the first menu item on mount for keyboard accessibility
  useEffect(() => {
    firstItemRef.current?.focus();
  }, []);

  // Trap Tab and handle Arrow keys within menu
  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      onClose();
    }
  }

  return (
    <div
      role="menu"
      aria-label="Menu akun"
      onKeyDown={handleKeyDown}
      className="rise-in min-w-[220px] rounded-xl border border-border bg-white shadow-sm"
    >
      {/* Header: name + email (non-interactive) */}
      <div className="px-4 py-3">
        <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
        <p className="truncate text-xs text-slate-500">{user.email}</p>
      </div>

      <hr className="border-border" />

      {/* Profile link */}
      <Link
        href="/profile"
        role="menuitem"
        ref={firstItemRef}
        onClick={onClose}
        className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 transition-colors hover:bg-surface focus:bg-surface focus:outline-none"
      >
        {/* Person icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
        </svg>
        Profil Saya
      </Link>

      <hr className="border-border" />

      {/* Logout button */}
      <button
        type="button"
        role="menuitem"
        onClick={onLogout}
        disabled={isLoggingOut}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-error transition-colors hover:bg-red-50 focus:bg-red-50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoggingOut ? (
          <>
            {/* Spinner */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-spin"
              aria-hidden="true"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            Keluar...
          </>
        ) : (
          <>
            {/* Log-out icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Keluar
          </>
        )}
      </button>
    </div>
  );
}
