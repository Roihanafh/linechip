/**
 * Property-based test for Tombol_Lanjut visibility logic in app/model-chip/page.tsx.
 *
 * Because the project's Jest environment is Node (no jsdom / no @testing-library),
 * we test the pure boolean predicate that controls whether Tombol_Lanjut is
 * rendered into the DOM. This mirrors the established pattern in:
 *   - __tests__/model-chip/ClickMode.property.test.ts
 *   - __tests__/model-chip/AnimationMode_Selector.test.tsx
 *   - __tests__/game/AnimationEffects.property.test.tsx
 *
 * The predicate under test mirrors the JSX guard in page.tsx:
 *
 *   {animMode === "click" && vizPhase === "battle" && (
 *     <button aria-label="Mulai animasi pasangan berikutnya" ...>Lanjut ▶</button>
 *   )}
 *
 * **Property 2: Tombol_Lanjut tersembunyi di luar (Mode_Klik ∩ battle)**
 * **Validates: Requirements 5.3**
 */

import * as fc from "fast-check";

// ── Types (mirrored from page.tsx) ────────────────────────────────────────────

type VizPhase = "idle" | "battle" | "center" | "done";
type AnimMode = "auto" | "click";

// ── Pure predicate extracted from page.tsx render ────────────────────────────

/**
 * Returns true if Tombol_Lanjut should be present in the DOM.
 *
 * Mirrors the conditional render guard in app/model-chip/page.tsx:
 *   animMode === "click" && vizPhase === "battle"
 *
 * This is the single source of truth for Requirement 5.3:
 *   "IF Mode_Klik tidak aktif ATAU VizPhase tidak bernilai 'battle', THEN
 *    THE Page SHALL menyembunyikan Tombol_Lanjut sepenuhnya sehingga tidak
 *    terlihat dan tidak dapat difokus melalui keyboard."
 */
function shouldRenderTombolLanjut(animMode: AnimMode, vizPhase: VizPhase): boolean {
  return animMode === "click" && vizPhase === "battle";
}

// ── Arbitraries ───────────────────────────────────────────────────────────────

const animModeArb = fc.constantFrom<AnimMode>("auto", "click");
const vizPhaseArb = fc.constantFrom<VizPhase>("idle", "battle", "center", "done");

/**
 * All (animMode, vizPhase) pairs that are OUTSIDE the (click ∩ battle) region.
 * This is the domain for Property 2.
 */
const outsideClickBattleArb = fc
  .record({ animMode: animModeArb, vizPhase: vizPhaseArb })
  .filter(({ animMode, vizPhase }) => !(animMode === "click" && vizPhase === "battle"));

// ── Property 2 ────────────────────────────────────────────────────────────────

describe(
  "Property 2: Tombol_Lanjut tersembunyi di luar (Mode_Klik ∩ battle)",
  () => {
    /**
     * Core property: for any (animMode, vizPhase) pair where it is NOT
     * simultaneously true that animMode === "click" AND vizPhase === "battle",
     * shouldRenderTombolLanjut must return false.
     *
     * **Validates: Requirements 5.3**
     */
    it(
      "shouldRenderTombolLanjut === false untuk semua kombinasi di luar (click ∩ battle)",
      () => {
        fc.assert(
          fc.property(outsideClickBattleArb, ({ animMode, vizPhase }) => {
            expect(shouldRenderTombolLanjut(animMode, vizPhase)).toBe(false);
          }),
          { numRuns: 100 }
        );
      }
    );

    it(
      "mode 'auto' tidak pernah menampilkan Tombol_Lanjut, di vizPhase manapun",
      () => {
        fc.assert(
          fc.property(vizPhaseArb, (vizPhase) => {
            expect(shouldRenderTombolLanjut("auto", vizPhase)).toBe(false);
          }),
          { numRuns: 100 }
        );
      }
    );

    it(
      "vizPhase 'idle' tidak pernah menampilkan Tombol_Lanjut, di animMode manapun",
      () => {
        fc.assert(
          fc.property(animModeArb, (animMode) => {
            expect(shouldRenderTombolLanjut(animMode, "idle")).toBe(false);
          }),
          { numRuns: 100 }
        );
      }
    );

    it(
      "vizPhase 'center' tidak pernah menampilkan Tombol_Lanjut, di animMode manapun",
      () => {
        fc.assert(
          fc.property(animModeArb, (animMode) => {
            expect(shouldRenderTombolLanjut(animMode, "center")).toBe(false);
          }),
          { numRuns: 100 }
        );
      }
    );

    it(
      "vizPhase 'done' tidak pernah menampilkan Tombol_Lanjut, di animMode manapun",
      () => {
        fc.assert(
          fc.property(animModeArb, (animMode) => {
            expect(shouldRenderTombolLanjut(animMode, "done")).toBe(false);
          }),
          { numRuns: 100 }
        );
      }
    );

    /**
     * Inverse / positive: verify the predicate is true ONLY for the one valid
     * combination (click, battle). This confirms the predicate is not trivially
     * always-false.
     */
    it(
      "shouldRenderTombolLanjut === true hanya untuk (click, battle) — kondisi positif",
      () => {
        expect(shouldRenderTombolLanjut("click", "battle")).toBe(true);
      }
    );

    it(
      "shouldRenderTombolLanjut === false untuk semua 7 kombinasi di luar (click, battle) secara eksplisit",
      () => {
        const outside: Array<[AnimMode, VizPhase]> = [
          ["auto", "idle"],
          ["auto", "battle"],
          ["auto", "center"],
          ["auto", "done"],
          ["click", "idle"],
          ["click", "center"],
          ["click", "done"],
        ];
        for (const [mode, phase] of outside) {
          expect(shouldRenderTombolLanjut(mode, phase)).toBe(false);
        }
      }
    );

    /**
     * Exhaustive sweep of the full 2×4 input space to ensure complete coverage
     * with the property framework.
     */
    it(
      "pemindaian lengkap seluruh ruang input 2×4 — hanya (click, battle) yang benar",
      () => {
        fc.assert(
          fc.property(animModeArb, vizPhaseArb, (animMode, vizPhase) => {
            const result = shouldRenderTombolLanjut(animMode, vizPhase);
            const expected = animMode === "click" && vizPhase === "battle";
            expect(result).toBe(expected);
          }),
          { numRuns: 100 }
        );
      }
    );
  }
);

// ── Requirement 5.3 verbal contract tests ────────────────────────────────────
//
// These example-based tests document the exact wording of the requirement so
// the intent is unambiguous alongside the property test above.

describe("Req 5.3 — Tombol_Lanjut tidak ada di DOM di luar (Mode_Klik ∩ battle)", () => {
  it("Mode_Otomatis + battle → Tombol_Lanjut tidak ada", () => {
    expect(shouldRenderTombolLanjut("auto", "battle")).toBe(false);
  });

  it("Mode_Klik + idle → Tombol_Lanjut tidak ada", () => {
    expect(shouldRenderTombolLanjut("click", "idle")).toBe(false);
  });

  it("Mode_Klik + center → Tombol_Lanjut tidak ada", () => {
    expect(shouldRenderTombolLanjut("click", "center")).toBe(false);
  });

  it("Mode_Klik + done → Tombol_Lanjut tidak ada", () => {
    expect(shouldRenderTombolLanjut("click", "done")).toBe(false);
  });

  it("Mode_Klik + battle → Tombol_Lanjut ada (satu-satunya kondisi valid)", () => {
    expect(shouldRenderTombolLanjut("click", "battle")).toBe(true);
  });
});
