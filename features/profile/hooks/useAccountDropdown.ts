'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { logout } from '@/features/auth/services/authService';
import type { UseAccountDropdownReturn } from '../types';

/**
 * Hook untuk mengelola state Account Dropdown di Navbar.
 *
 * Menangani:
 * - Open/close state dropdown
 * - Logout dengan redirect ke `/`
 * - Close on outside click (mousedown pada document)
 * - Close on Escape key dengan return focus ke trigger
 *
 * Requirements: 6.6, 6.7, 6.8, 9.6
 */
export function useAccountDropdown(): UseAccountDropdownReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const router = useRouter();

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  // Requirement 6.6: logout → redirect ke '/'
  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      // Graceful degradation — jangan crash UI karena logout error
      console.error('[handleLogout] Logout gagal:', error);
    } finally {
      setIsLoggingOut(false);
    }
    // Always redirect and close, even if logout() throws
    close();
    router.push('/');
  }, [close, router]);

  // Requirement 6.7: close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;

      const clickedInsideDropdown =
        dropdownRef.current?.contains(target) ?? false;
      const clickedTrigger =
        triggerRef.current?.contains(target) ?? false;

      if (!clickedInsideDropdown && !clickedTrigger) {
        close();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [isOpen, close]);

  // Requirement 6.8 & 9.6: Escape key — close dan return focus ke trigger
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, close]);

  return {
    isOpen,
    open,
    close,
    toggle,
    isLoggingOut,
    handleLogout,
    triggerRef,
    dropdownRef,
  };
}
