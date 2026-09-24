// components/admin/ConfirmationDialog.tsx
// Reusable accessible confirmation dialog with focus trap and portal rendering.
'use client';

import { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

export interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  /** Descriptive text explaining the action that will be taken */
  description: string;
  /** Label for the confirm button */
  confirmLabel: string;
  /** Visual variant for the confirm button */
  confirmVariant: 'danger' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
  /** When true, both buttons are disabled (action in progress) */
  isLoading?: boolean;
}

export default function ConfirmationDialog({
  isOpen,
  title,
  description,
  confirmLabel,
  confirmVariant,
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmationDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  // Stores the element that triggered the dialog so focus can be restored
  const triggerRef = useRef<Element | null>(null);

  // Capture the currently focused element when dialog opens
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement;
      // Move focus to the first button (cancel) in < 100 ms
      const id = setTimeout(() => {
        cancelBtnRef.current?.focus();
      }, 0);
      return () => clearTimeout(id);
    } else {
      // Restore focus to trigger when dialog closes
      if (triggerRef.current && triggerRef.current instanceof HTMLElement) {
        triggerRef.current.focus();
      }
    }
  }, [isOpen]);

  // Focus trap: keep Tab / Shift+Tab within the dialog
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        onCancel();
        return;
      }

      if (e.key === 'Tab') {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable || focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    },
    [onCancel]
  );

  if (!isOpen) return null;

  const confirmButtonClasses =
    confirmVariant === 'danger'
      ? 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-500 text-white'
      : 'bg-amber-500 hover:bg-amber-600 focus-visible:ring-amber-400 text-white';

  const dialog = (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)' }}
      onClick={(e) => {
        // Close when clicking the backdrop (not the dialog itself)
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      {/* Dialog panel */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-desc"
        onKeyDown={handleKeyDown}
        className="rise-in w-full max-w-md rounded-2xl border border-border bg-white shadow-xl"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <h2
            id="dialog-title"
            className="text-lg font-semibold text-slate-900 font-['Baloo_2',system-ui,sans-serif]"
          >
            {title}
          </h2>
          <p
            id="dialog-desc"
            className="mt-2 text-sm text-slate-600 leading-relaxed"
          >
            {description}
          </p>
        </div>

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Actions */}
        <div className="flex justify-end gap-3 px-6 py-4">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-intblue focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Batal
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${confirmButtonClasses}`}
          >
            {isLoading && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="animate-spin"
                aria-hidden="true"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}
