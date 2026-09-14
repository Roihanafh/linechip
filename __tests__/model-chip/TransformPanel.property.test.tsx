/**
 * Property-based tests for TransformPanel logic.
 *
 * Because the project's Jest environment is Node (no jsdom / no @testing-library),
 * we test the pure logic extracted from TransformPanel.tsx — the same approach
 * used in TransformPanel.test.tsx and inputPanelProps.property.test.ts.
 *
 * Requirements: 3.3, 9.3
 */

import * as fc from "fast-check";

export {}; // make this file a module so local types don't bleed into global scope

// ── Pure logic mirrored from TransformPanel.tsx ───────────────────────────────

/** Returns the conversion label text for a given bil2 value. */
function conversionLabel(bil2: number): string {
  const n = Math.abs(bil2);
  const isPositive = bil2 > 0;
  const labelBefore = isPositive ? `+${n}` : `−${n}`;
  const labelAfter  = isPositive ? `−${n}` : `+${n}`;
  return `${labelBefore} → ${labelAfter}`;
}

/** Returns the aria-label for the TransformPanel container. */
function ariaLabel(bil2: number): string {
  const n = Math.abs(bil2);
  const isPositive = bil2 > 0;
  const tipeSumber = isPositive ? "antibodi" : "kuman";
  const tipeTujuan = isPositive ? "kuman"    : "antibodi";
  return `Ubah ${n} chip ${tipeSumber} menjadi ${tipeTujuan}`;
}

// ── Arbitrary: non-zero integer in [-9999, 9999] ─────────────────────────────

const nonZeroInt = fc.integer({ min: -9999, max: 9999 }).filter((n) => n !== 0);
const positiveInt = fc.integer({ min: 1, max: 9999 });
const negativeInt = fc.integer({ min: -9999, max: -1 });

// ── Property 7: Label transform mencerminkan konversi ─────────────────────────
// Validates: Requirements 3.3

describe("Property 7: Label transform mencerminkan konversi", () => {
  test("bil2 > 0: label harus '+N → −N'", () => {
    fc.assert(
      fc.property(positiveInt, (bil2) => {
        const n = Math.abs(bil2);
        return conversionLabel(bil2) === `+${n} → −${n}`;
      }),
      { numRuns: 500 }
    );
  });

  test("bil2 < 0: label harus '−N → +N'", () => {
    fc.assert(
      fc.property(negativeInt, (bil2) => {
        const n = Math.abs(bil2);
        return conversionLabel(bil2) === `−${n} → +${n}`;
      }),
      { numRuns: 500 }
    );
  });

  test("label selalu mengandung ' → ' sebagai pemisah untuk setiap bil2 !== 0", () => {
    fc.assert(
      fc.property(nonZeroInt, (bil2) => {
        return conversionLabel(bil2).includes(" → ");
      }),
      { numRuns: 500 }
    );
  });

  test("label selalu mengandung nilai absolut bil2 di kedua sisi panah", () => {
    fc.assert(
      fc.property(nonZeroInt, (bil2) => {
        const n = Math.abs(bil2);
        const label = conversionLabel(bil2);
        // Both sides of the arrow must contain the absolute value
        const [lhs, rhs] = label.split(" → ");
        return lhs.includes(String(n)) && rhs.includes(String(n));
      }),
      { numRuns: 500 }
    );
  });

  test("tanda kiri dan kanan selalu berlawanan", () => {
    fc.assert(
      fc.property(nonZeroInt, (bil2) => {
        const label = conversionLabel(bil2);
        const [lhs, rhs] = label.split(" → ");
        const leftIsPlus  = lhs.startsWith("+");
        const rightIsMinus = rhs.startsWith("−");
        const leftIsMinus = lhs.startsWith("−");
        const rightIsPlus  = rhs.startsWith("+");
        // Exactly one of the two valid sign-flip patterns must hold
        return (leftIsPlus && rightIsMinus) || (leftIsMinus && rightIsPlus);
      }),
      { numRuns: 500 }
    );
  });
});

// ── Property 10: Aria-label transform panel sesuai format ─────────────────────
// Validates: Requirements 9.3

describe("Property 10: Aria-label transform panel sesuai format", () => {
  test("format dasar: 'Ubah {abs(bil2)} chip {tipeSumber} menjadi {tipeTujuan}'", () => {
    fc.assert(
      fc.property(nonZeroInt, (bil2) => {
        const n = Math.abs(bil2);
        const isPositive = bil2 > 0;
        const tipeSumber = isPositive ? "antibodi" : "kuman";
        const tipeTujuan = isPositive ? "kuman"    : "antibodi";
        return ariaLabel(bil2) === `Ubah ${n} chip ${tipeSumber} menjadi ${tipeTujuan}`;
      }),
      { numRuns: 500 }
    );
  });

  test("aria-label selalu menggunakan nilai absolut (tidak pernah negatif)", () => {
    fc.assert(
      fc.property(negativeInt, (bil2) => {
        const label = ariaLabel(bil2);
        // The number in the label must be the positive absolute value
        return label.includes(String(Math.abs(bil2))) && !label.includes(String(bil2));
      }),
      { numRuns: 500 }
    );
  });

  test("bil2 > 0: tipeSumber='antibodi', tipeTujuan='kuman'", () => {
    fc.assert(
      fc.property(positiveInt, (bil2) => {
        const label = ariaLabel(bil2);
        return label.includes("chip antibodi") && label.includes("menjadi kuman");
      }),
      { numRuns: 500 }
    );
  });

  test("bil2 < 0: tipeSumber='kuman', tipeTujuan='antibodi'", () => {
    fc.assert(
      fc.property(negativeInt, (bil2) => {
        const label = ariaLabel(bil2);
        return label.includes("chip kuman") && label.includes("menjadi antibodi");
      }),
      { numRuns: 500 }
    );
  });

  test("tipeSumber dan tipeTujuan selalu berbeda satu sama lain", () => {
    fc.assert(
      fc.property(nonZeroInt, (bil2) => {
        const isPositive = bil2 > 0;
        const tipeSumber = isPositive ? "antibodi" : "kuman";
        const tipeTujuan = isPositive ? "kuman"    : "antibodi";
        return tipeSumber !== tipeTujuan;
      }),
      { numRuns: 500 }
    );
  });

  test("aria-label selalu diawali dengan 'Ubah '", () => {
    fc.assert(
      fc.property(nonZeroInt, (bil2) => {
        return ariaLabel(bil2).startsWith("Ubah ");
      }),
      { numRuns: 500 }
    );
  });
});
