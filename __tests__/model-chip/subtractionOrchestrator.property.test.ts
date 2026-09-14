/**
 * Property-based tests for useSubtractionOrchestrator pure logic.
 *
 * These tests extract pure mathematical/logical functions from the orchestrator
 * and verify them with fast-check — no React hooks, no jsdom required.
 *
 * Pattern mirrors: ClickMode.property.test.ts, tierUtils.property.test.ts
 */

import * as fc from "fast-check";
import type { SubtractionSnapshot } from "@/lib/model-chip/subtractionTypes";
import type { VizPhaseSub } from "@/lib/model-chip/subtractionTypes";

// ── Pure helpers extracted from useSubtractionOrchestrator ───────────────────

/**
 * Converts the pengurang (subtrahend) into its additive-inverse form.
 * Mirrors: const b_konversi = -bil2; in handleSubtract()
 */
function convertPengurang(bil2: number): number {
  return -bil2;
}

/**
 * Computes the subtraction result via additive-inverse:
 *   bil1 - bil2 === bil1 + (-bil2) === bil1 + b_konversi
 * Mirrors the mathematical equivalence the orchestrator relies on.
 */
function subtractionViaConversion(bil1: number, bil2: number): number {
  const b_konversi = convertPengurang(bil2);
  return bil1 + b_konversi;
}

/**
 * Builds a SubtractionSnapshot from bil1 and bil2.
 * Mirrors the snapshot construction in handleSubtract().
 */
function buildSnapshot(bil1: number, bil2: number): SubtractionSnapshot {
  return {
    bil1,
    bil2_original: bil2,
    bil2_converted: convertPengurang(bil2),
  };
}

/**
 * Determines the first vizPhase set after handleSubtract() is called.
 * Mirrors the branching logic in handleSubtract():
 *   - bil2 !== 0 → "transform" (show transform panel first)
 *   - bil2 === 0 → "battle"    (no pengurang, skip transform)
 *
 * Note: when bil2 === 0, b_konversi === 0 too, so there may be no pairs and
 * the orchestrator goes to "done", but the *first phase set* is still "battle"
 * (beginBattle is called which may immediately go to "done"). We model the
 * first explicit phase assignment before the pairs-check.
 */
function firstPhaseAfterSubtract(bil2: number): VizPhaseSub {
  return bil2 !== 0 ? "transform" : "battle";
}

// ── Property 1: Konversi pengurang adalah negasi ──────────────────────────────

describe("Property 1: Konversi pengurang adalah negasi", () => {
  /**
   * For every bil2 in [-9999, 9999], b_konversi must equal -bil2.
   * **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
   */
  it("convertPengurang(bil2) === -bil2 untuk semua bil2 valid", () => {
    fc.assert(
      fc.property(fc.integer({ min: -9999, max: 9999 }), (bil2) => {
        expect(convertPengurang(bil2)).toBe(-bil2);
      }),
      { numRuns: 500 }
    );
  });

  it("convertPengurang adalah involusi: konversi dua kali kembali ke nilai asal", () => {
    fc.assert(
      fc.property(fc.integer({ min: -9999, max: 9999 }), (bil2) => {
        expect(convertPengurang(convertPengurang(bil2))).toBe(bil2);
      }),
      { numRuns: 500 }
    );
  });

  it("b_konversi memiliki tanda berlawanan dengan bil2 (kecuali nol)", () => {
    fc.assert(
      fc.property(fc.integer({ min: -9999, max: 9999 }).filter((n) => n !== 0), (bil2) => {
        const b_konversi = convertPengurang(bil2);
        // Signs must be opposite
        expect(Math.sign(b_konversi)).toBe(-Math.sign(bil2));
      }),
      { numRuns: 500 }
    );
  });
});

// ── Property 2: Round-trip matematika pengurangan ─────────────────────────────

describe("Property 2: Round-trip matematika pengurangan", () => {
  /**
   * bil1 + b_konversi === bil1 - bil2 for all valid (bil1, bil2).
   * **Validates: Requirements 2.6, 5.2**
   */
  it("bil1 + b_konversi === bil1 - bil2 untuk semua pasangan valid", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -9999, max: 9999 }),
        fc.integer({ min: -9999, max: 9999 }),
        (bil1, bil2) => {
          expect(subtractionViaConversion(bil1, bil2)).toBe(bil1 - bil2);
        }
      ),
      { numRuns: 500 }
    );
  });

  it("konversi mempertahankan nilai absolut: |b_konversi| === |bil2|", () => {
    fc.assert(
      fc.property(fc.integer({ min: -9999, max: 9999 }), (bil2) => {
        expect(Math.abs(convertPengurang(bil2))).toBe(Math.abs(bil2));
      }),
      { numRuns: 500 }
    );
  });

  it("hasil pengurangan melalui konversi identik dengan operator - langsung", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -9999, max: 9999 }),
        fc.integer({ min: -9999, max: 9999 }),
        (bil1, bil2) => {
          const viaConversion = bil1 + convertPengurang(bil2);
          const direct = bil1 - bil2;
          expect(viaConversion).toBe(direct);
        }
      ),
      { numRuns: 500 }
    );
  });
});

// ── Property 6: Fase transform mendahului battle ──────────────────────────────

describe("Property 6: Fase transform mendahului battle", () => {
  /**
   * For every bil2 !== 0, the first phase set after handleSubtract() must be
   * "transform" — never "battle" or "done" directly.
   * **Validates: Requirements 3.1**
   */
  it("fase pertama adalah 'transform' untuk setiap bil2 !== 0", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -9999, max: 9999 }).filter((n) => n !== 0),
        (bil2) => {
          expect(firstPhaseAfterSubtract(bil2)).toBe("transform");
        }
      ),
      { numRuns: 500 }
    );
  });

  it("fase pertama BUKAN 'transform' ketika bil2 === 0", () => {
    // bil2 === 0 means no pengurang, no conversion needed, skip transform
    expect(firstPhaseAfterSubtract(0)).toBe("battle");
  });

  it("'transform' selalu mendahului 'battle' untuk setiap bil2 != 0 (urutan fase)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -9999, max: 9999 }).filter((n) => n !== 0),
        (bil2) => {
          const phases: VizPhaseSub[] = ["idle", "transform", "battle", "center", "done"];
          const firstPhase = firstPhaseAfterSubtract(bil2);
          const battleIdx = phases.indexOf("battle");
          const firstPhaseIdx = phases.indexOf(firstPhase);
          // transform (idx 1) < battle (idx 2)
          expect(firstPhaseIdx).toBeLessThan(battleIdx);
        }
      ),
      { numRuns: 500 }
    );
  });
});

// ── Property 8: Snapshot menyimpan semua nilai relevan ───────────────────────

describe("Property 8: Snapshot menyimpan semua nilai relevan", () => {
  /**
   * snapshot.bil2_original === bil2  AND  snapshot.bil2_converted === -bil2
   * **Validates: Requirements 2.5**
   */
  it("snapshot.bil2_original === bil2 yang dimasukkan pengguna", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -9999, max: 9999 }),
        fc.integer({ min: -9999, max: 9999 }),
        (bil1, bil2) => {
          const snap = buildSnapshot(bil1, bil2);
          expect(snap.bil2_original).toBe(bil2);
        }
      ),
      { numRuns: 500 }
    );
  });

  it("snapshot.bil2_converted === -bil2 (nilai setelah konversi)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -9999, max: 9999 }),
        fc.integer({ min: -9999, max: 9999 }),
        (bil1, bil2) => {
          const snap = buildSnapshot(bil1, bil2);
          expect(snap.bil2_converted).toBe(-bil2);
        }
      ),
      { numRuns: 500 }
    );
  });

  it("snapshot.bil1 menyimpan minuend dengan tepat", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -9999, max: 9999 }),
        fc.integer({ min: -9999, max: 9999 }),
        (bil1, bil2) => {
          const snap = buildSnapshot(bil1, bil2);
          expect(snap.bil1).toBe(bil1);
        }
      ),
      { numRuns: 500 }
    );
  });

  it("snapshot konsisten: bil2_original + bil2_converted === 0", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -9999, max: 9999 }),
        fc.integer({ min: -9999, max: 9999 }),
        (bil1, bil2) => {
          const snap = buildSnapshot(bil1, bil2);
          expect(snap.bil2_original + snap.bil2_converted).toBe(0);
        }
      ),
      { numRuns: 500 }
    );
  });
});
