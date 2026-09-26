// components/game/GameIntroModal.tsx
// Intro modal displayed before a game starts.
// Blocks game interaction and prevents timer from starting until user clicks "Mulai".
"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

export interface GameIntroModalProps {
  /** Controls visibility — true = shown, false = hidden */
  isOpen: boolean;
  /** Game title shown in the modal header (also the aria-labelledby target) */
  title: string;
  /** How-to-play content — should contain an <ol> */
  instructions: React.ReactNode;
  /** Callback fired when the Start_Button is pressed */
  onStart: () => void;
}

/**
 * Full-screen intro modal for game pages.
 *
 * - Renders via ReactDOM.createPortal into document.body to avoid
 *   z-index stacking issues with the game canvas layers.
 * - Returns null on the server (SSR guard) and when isOpen is false.
 * - Uses React 18+ useId() for a stable aria-labelledby relationship.
 * - Focus trap and focus restoration are added in task 2.3.
 * - DOM structure and styling are added in task 2.2.
 */
export default function GameIntroModal({
  isOpen,
  title,
  instructions,
  onStart,
}: GameIntroModalProps) {
  // SSR guard — createPortal requires document to exist
  if (typeof document === "undefined") return null;

  // Hide entirely when closed — no DOM overhead
  if (!isOpen) return null;

  return (
    <GameIntroModalInner
      title={title}
      instructions={instructions}
      onStart={onStart}
    />
  );
}

/**
 * Inner component separated so that useId() is only called when
 * the modal is actually open (avoids the lint rule violation of
 * calling hooks after early returns).
 */
function GameIntroModalInner({
  title,
  instructions,
  onStart,
}: Omit<GameIntroModalProps, "isOpen">) {
  const uid = useId();
  const titleId = `modal-title-${uid}`;
  const panelRef = useRef<HTMLDivElement>(null);

  // Focus restoration: capture the currently focused element before the modal
  // opens, then return focus to it when the modal unmounts.
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    return () => {
      previousFocus?.focus();
    };
  }, []);

  // Focus trap: intercept Tab / Shift+Tab so focus cycles only within the
  // dialog panel and never escapes to elements behind the overlay.
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const focusableSelectors =
      'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(focusableSelectors)
      ).filter((el) => !el.hasAttribute("disabled"));

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        // Shift+Tab — going backwards
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab — going forwards
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop — semi-transparent overlay, blocks interaction below */}
      <div className="fixed inset-0 bg-black/60" aria-hidden="true" />

      {/* Dialog panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="modal-enter relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl shadow-black/20 ring-1 ring-black/8 overflow-hidden"
      >
        {/* Header — intblue gradient strip */}
        <div className="bg-gradient-to-r from-intblue to-intblue-dark px-6 py-4">
          <h2
            id={titleId}
            className="text-xl font-extrabold text-white tracking-tight font-[var(--font-heading)]"
          >
            {title}
          </h2>
          <p className="mt-0.5 text-sm text-blue-100 font-medium">
            Baca instruksi sebelum mulai bermain
          </p>
        </div>

        {/* Instructions section */}
        <div className="px-6 py-5">
          {instructions}
        </div>

        {/* Footer — Start button */}
        <div className="px-6 pb-6 pt-1">
          <button
            autoFocus
            onClick={onStart}
            className="w-full rounded-xl bg-intblue px-6 py-3 text-base font-extrabold text-white shadow-md shadow-intblue/30 transition-all duration-150 hover:bg-intblue-dark hover:shadow-lg hover:shadow-intblue/40 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-intblue focus-visible:ring-offset-2"
          >
            Mulai
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
