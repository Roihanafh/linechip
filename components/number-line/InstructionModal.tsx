'use client';

import { useEffect, useRef } from 'react';
import type { InstructionModalProps } from '../../lib/number-line/types';

const ADDITION_RULES = [
  'Bilangan pertama positif → mobil bergerak ke kanan dari 0.',
  'Bilangan pertama negatif → mobil bergerak ke kiri dari 0.',
  'Bilangan kedua positif → mobil menghadap kanan dan bergerak ke kanan.',
  'Bilangan kedua negatif → mobil menghadap kiri dan bergerak ke kiri.',
];

const SUBTRACTION_RULES = [
  'Bilangan pertama positif → mobil bergerak ke kanan dari 0.',
  'Bilangan pertama negatif → mobil bergerak ke kiri dari 0.',
  'Bilangan kedua positif → mobil menghadap kiri dan bergerak ke kiri.',
  'Bilangan kedua negatif → mobil menghadap kiri tetapi bergerak mundur ke kanan.',
];

export function InstructionModal({
  operationType,
  isOpen,
  onClose,
}: InstructionModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<Element | null>(null);

  // Save and restore focus
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement;

      // Focus the first focusable element once the modal has rendered
      const frame = requestAnimationFrame(() => {
        const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        focusable?.[0]?.focus();
      });
      return () => cancelAnimationFrame(frame);
    } else {
      (previousFocusRef.current as HTMLElement | null)?.focus();
    }
  }, [isOpen]);

  // Keyboard handling: Escape closes, Tab/Shift+Tab trapped inside modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key !== 'Tab') return;

      const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
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
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const rules = operationType === 'addition' ? ADDITION_RULES : SUBTRACTION_RULES;
  const title =
    operationType === 'addition'
      ? 'Cara Membaca Animasi Penjumlahan'
      : 'Cara Membaca Animasi Pengurangan';

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
      aria-hidden="true"
    >
      {/* Modal container — stop click propagation so backdrop click only closes via wrapper */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="instruction-modal-title"
        className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        aria-hidden={undefined}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2
            id="instruction-modal-title"
            className="text-lg font-bold text-slate-800"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup instruksi"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M6 6L18 18"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-3">
          {/* Phase 1 section */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
              Fase 1 — Bilangan Pertama
            </p>
            <ul className="space-y-2">
              {rules.slice(0, 2).map((rule, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                  <span
                    className={`mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold
                      ${i === 0 ? 'bg-intblue-light text-intblue' : 'bg-intpink-light text-intpink'}`}
                    aria-hidden="true"
                  >
                    {i + 1}
                  </span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-border" />

          {/* Phase 2 section */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
              Fase 2 — Bilangan Kedua
            </p>
            <ul className="space-y-2">
              {rules.slice(2, 4).map((rule, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                  <span
                    className={`mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold
                      ${i === 0 ? 'bg-intblue-light text-intblue' : 'bg-intpink-light text-intpink'}`}
                    aria-hidden="true"
                  >
                    {i + 3}
                  </span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Extra note for subtraction */}
          {operationType === 'subtraction' && (
            <>
              <div className="border-t border-border" />
              <p className="text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                💡 <strong>Ingat:</strong> Mengurangi bilangan negatif sama dengan menambahkan
                kebalikannya. Contoh: 3 − (−5) = 3 + 5 = 8
              </p>
            </>
          )}
          {operationType === 'addition' && (
            <>
              <div className="border-t border-border" />
              <p className="text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                💡 <strong>Ingat:</strong> Menambahkan bilangan negatif sama dengan mengurangi
                kebalikannya. Contoh: 3 + (−5) = 3 − 5 = −2
              </p>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex justify-end">
          <button
            type="button"
            onClick={onClose}
            aria-label="Mengerti, tutup instruksi"
            className="px-5 py-2 bg-intblue text-white text-sm font-semibold rounded-xl hover:bg-intblue-dark transition-colors"
          >
            Mengerti
          </button>
        </div>
      </div>
    </div>
  );
}

export default InstructionModal;
