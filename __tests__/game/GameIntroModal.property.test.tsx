/**
 * Property-based tests for GameIntroModal (components/game/GameIntroModal.tsx)
 *
 * Feature: game-intro-popup
 * Tasks 2.4–2.7
 *
 * Properties covered:
 *   Property 1: Title selalu tampil di dalam modal      — Validates: Requirements 1.4
 *   Property 2: Instructions selalu mengandung <ol>     — Validates: Requirements 1.5
 *   Property 3: ARIA attributes selalu hadir            — Validates: Requirements 5.1
 *   Property 4: aria-labelledby selalu menunjuk ke judul — Validates: Requirements 5.2
 *
 * NOTE: The component uses ReactDOM.createPortal → document.body, so all
 * assertions use `screen` (whole-document queries) rather than `container`.
 *
 * @jest-environment jsdom
 */

import * as fc from "fast-check";
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import GameIntroModal from "@/components/game/GameIntroModal";

// Clean up the DOM after each test to avoid portal leakage between runs.
afterEach(() => {
  cleanup();
});

// ─── Property 1: Title selalu tampil di dalam modal ───────────────────────────
// Feature: game-intro-popup, Property 1: Title selalu tampil di dalam modal
// Validates: Requirements 1.4

describe("GameIntroModal — Property 1: Title selalu tampil di dalam modal", () => {
  it("teks judul selalu muncul di DOM saat isOpen={true} untuk sembarang string title", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        (title) => {
          render(
            <GameIntroModal
              isOpen={true}
              title={title}
              instructions={<ol><li>Instruksi</li></ol>}
              onStart={() => {}}
            />
          );

          try {
            // Find the dialog element, then get its aria-labelledby target (the h2)
            const dialog = screen.getByRole("dialog");
            const labelledById = dialog.getAttribute("aria-labelledby");
            expect(labelledById).toBeTruthy();

            const titleEl = document.getElementById(labelledById!);
            expect(titleEl).toBeTruthy();
            // The h2 must contain the title text
            expect(titleEl!.textContent).toBe(title);
          } finally {
            cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 2: Instructions selalu mengandung elemen list terurut ───────────
// Feature: game-intro-popup, Property 2: Instructions selalu mengandung elemen list terurut
// Validates: Requirements 1.5

describe("GameIntroModal — Property 2: Instructions selalu mengandung <ol>", () => {
  it("elemen <ol> selalu ada di DOM saat instructions berisi <ol> untuk sembarang konten", () => {
    fc.assert(
      fc.property(
        fc.string(),
        (content) => {
          render(
            <GameIntroModal
              isOpen={true}
              title="Test Modal"
              instructions={<ol><li>{content}</li></ol>}
              onStart={() => {}}
            />
          );

          try {
            // Portal is in document.body — query from there
            const ol = document.body.querySelector("ol");
            expect(ol).toBeTruthy();
          } finally {
            cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 3: ARIA attributes selalu hadir ─────────────────────────────────
// Feature: game-intro-popup, Property 3: ARIA attributes selalu hadir
// Validates: Requirements 5.1

describe("GameIntroModal — Property 3: ARIA attributes selalu hadir", () => {
  it("role=dialog dan aria-modal=true selalu ada untuk sembarang string title", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        (title) => {
          render(
            <GameIntroModal
              isOpen={true}
              title={title}
              instructions={<ol><li>Langkah satu</li></ol>}
              onStart={() => {}}
            />
          );

          try {
            // screen.getByRole queries the full document including portals
            const dialog = screen.getByRole("dialog");
            expect(dialog).toBeTruthy();
            expect(dialog.getAttribute("aria-modal")).toBe("true");
          } finally {
            cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 4: aria-labelledby selalu menunjuk ke elemen judul ──────────────
// Feature: game-intro-popup, Property 4: aria-labelledby selalu menunjuk ke elemen judul yang valid
// Validates: Requirements 5.2

describe("GameIntroModal — Property 4: aria-labelledby selalu menunjuk ke elemen judul", () => {
  it("aria-labelledby pada dialog selalu sama dengan id elemen yang berisi teks judul", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        (title) => {
          render(
            <GameIntroModal
              isOpen={true}
              title={title}
              instructions={<ol><li>Langkah satu</li></ol>}
              onStart={() => {}}
            />
          );

          try {
            const dialog = screen.getByRole("dialog");
            const labelledById = dialog.getAttribute("aria-labelledby");

            // labelledById must be non-empty
            expect(labelledById).toBeTruthy();

            // The element with that id must exist in the document
            const titleEl = document.getElementById(labelledById!);
            expect(titleEl).toBeTruthy();

            // That element must contain the title text
            expect(titleEl!.textContent).toBe(title);
          } finally {
            cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
