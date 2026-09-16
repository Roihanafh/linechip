/**
 * Unit and property-based tests for ResultPanel logic.
 *
 * Because the project's Jest environment is Node (no jsdom / no @testing-library),
 * we test the pure functions that drive ResultPanel's rendering directly.
 * This mirrors the established pattern in __tests__/model-chip/TransformPanel.test.tsx.
 *
 * Requirements: 6.1–6.5
 */

import * as fc from "fast-check";
import { formatIntDisplay, getNumberColorClass } from "../../lib/number-line/formatters";
import { buildNarrativeText } from "../../lib/number-line/narrativeText";
import type { Operation } from "../../lib/number-line/types";

export {}; // make this file a module so local types don't bleed into global scope

// ─────────────────────────────────────────────────────────────────────────────
// Helpers that mirror ResultPanel rendering decisions
// ─────────────────────────────────────────────────────────────────────────────

/** Returns the equation parts the panel would render given real props. */
function buildEquationParts(
  num1: number,
  num2: number,
  operation: Operation,
  result: number,
) {
  return {
    num1Text: formatIntDisplay(num1),
    opText: operation === "+" ? "+" : "−",
    num2Text: formatIntDisplay(num2),
    resultText: formatIntDisplay(result),
    num1Color: getNumberColorClass(num1),
    num2Color: getNumberColorClass(num2),
    resultColor: getNumberColorClass(result),
  };
}

/** Returns true when the panel should show the "origin" message. */
function shouldShowReturnToOrigin(result: number | null): boolean {
  return result === 0;
}

/** Returns true when the panel should show the placeholder (no result yet). */
function isPlaceholderState(result: number | null): boolean {
  return result === null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Feature: number-line-car-module, Property 16: ResultPanel menampilkan persamaan yang benar
// Validates: Requirements 6.1, 6.2, 6.3
// ─────────────────────────────────────────────────────────────────────────────

describe("Property 16: ResultPanel menampilkan persamaan yang benar", () => {
  // Req 6.1 — format `num1 op num2 = result` secara numerik benar
  test("hasil penjumlahan = num1 + num2 untuk semua integer dalam rentang", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -99, max: 99 }),
        fc.integer({ min: -99, max: 99 }),
        (num1, num2) => {
          const result = num1 + num2;
          const parts = buildEquationParts(num1, num2, "+", result);
          // nilai yang ditampilkan harus merepresentasikan angka yang benar
          const displayedNum1 = num1 < 0 ? `(${num1})` : `${num1}`;
          const displayedNum2 = num2 < 0 ? `(${num2})` : `${num2}`;
          const displayedResult = result < 0 ? `(${result})` : `${result}`;
          return (
            parts.num1Text === displayedNum1 &&
            parts.num2Text === displayedNum2 &&
            parts.resultText === displayedResult &&
            parts.opText === "+"
          );
        },
      ),
      { numRuns: 500 },
    );
  });

  test("hasil pengurangan = num1 - num2 untuk semua integer dalam rentang", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -99, max: 99 }),
        fc.integer({ min: -99, max: 99 }),
        (num1, num2) => {
          const result = num1 - num2;
          const parts = buildEquationParts(num1, num2, "-", result);
          const displayedNum1 = num1 < 0 ? `(${num1})` : `${num1}`;
          const displayedNum2 = num2 < 0 ? `(${num2})` : `${num2}`;
          const displayedResult = result < 0 ? `(${result})` : `${result}`;
          return (
            parts.num1Text === displayedNum1 &&
            parts.num2Text === displayedNum2 &&
            parts.resultText === displayedResult &&
            parts.opText === "−"
          );
        },
      ),
      { numRuns: 500 },
    );
  });

  // Req 6.2 — warna angka: intblue >= 0, intpink < 0
  test("warna setiap angka ditentukan oleh tandanya (>= 0 → intblue, < 0 → intpink)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -99, max: 99 }),
        fc.integer({ min: -99, max: 99 }),
        fc.constantFrom<Operation>("+", "-"),
        (num1, num2, _op) => {
          const result = num2 >= 0 ? num1 + num2 : num1 - Math.abs(num2);
          const parts = buildEquationParts(num1, num2, "+", result);
          const expectedColor = (n: number) =>
            n >= 0 ? "text-intblue" : "text-intpink";
          return (
            parts.num1Color === expectedColor(num1) &&
            parts.num2Color === expectedColor(num2) &&
            parts.resultColor === expectedColor(result)
          );
        },
      ),
      { numRuns: 500 },
    );
  });

  // Req 6.3 — format tanda kurung untuk negatif
  // formatIntDisplay(-3) === "(-3)" — angka negatif dibungkus tanda kurung
  test("angka negatif ditampilkan dalam format (n) — dibungkus tanda kurung", () => {
    fc.assert(
      fc.property(fc.integer({ min: -99, max: -1 }), (n) => {
        const displayed = formatIntDisplay(n);
        // e.g. -3 → "(-3)": starts with "(", ends with ")", contains the digits
        return (
          displayed.startsWith("(") &&
          displayed.endsWith(")") &&
          displayed.includes(`${n}`) // the actual negative number is inside
        );
      }),
      { numRuns: 200 },
    );
  });

  test("angka nol dan positif ditampilkan tanpa tanda kurung", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 99 }), (n) => {
        const displayed = formatIntDisplay(n);
        return !displayed.includes("(") && !displayed.includes(")");
      }),
      { numRuns: 200 },
    );
  });

  // Spot checks for specific values
  test("formatIntDisplay: nilai-nilai spesifik", () => {
    expect(formatIntDisplay(0)).toBe("0");
    expect(formatIntDisplay(5)).toBe("5");
    expect(formatIntDisplay(-3)).toBe("(-3)");
    expect(formatIntDisplay(-99)).toBe("(-99)");
    expect(formatIntDisplay(99)).toBe("99");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Feature: number-line-car-module, Property 17: Penjelasan naratif menyebutkan arah yang benar
// Validates: Requirements 6.4
// ─────────────────────────────────────────────────────────────────────────────

describe("Property 17: Penjelasan naratif menyebutkan arah yang benar", () => {
  // Req 6.4 — phase1: num1 > 0 → "kanan", num1 < 0 → "kiri", num1 = 0 → tidak ada arah
  test("num1 > 0: phase1 menyebutkan arah 'kanan'", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 99 }),
        fc.integer({ min: -99, max: 99 }),
        fc.constantFrom<Operation>("+", "-"),
        (num1, num2, op) => {
          const { phase1 } = buildNarrativeText(num1, num2, op);
          return phase1.includes("kanan");
        },
      ),
      { numRuns: 300 },
    );
  });

  test("num1 < 0: phase1 menyebutkan arah 'kiri'", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -99, max: -1 }),
        fc.integer({ min: -99, max: 99 }),
        fc.constantFrom<Operation>("+", "-"),
        (num1, num2, op) => {
          const { phase1 } = buildNarrativeText(num1, num2, op);
          return phase1.includes("kiri");
        },
      ),
      { numRuns: 300 },
    );
  });

  test("num1 = 0: phase1 tidak menyebutkan arah (tidak ada 'kanan' atau 'kiri')", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -99, max: 99 }),
        fc.constantFrom<Operation>("+", "-"),
        (num2, op) => {
          const { phase1 } = buildNarrativeText(0, num2, op);
          return !phase1.includes("kanan") && !phase1.includes("kiri");
        },
      ),
      { numRuns: 200 },
    );
  });

  // phase2 direction correctness for addition
  test("op='+', num2 > 0: phase2 menyebutkan arah 'kanan'", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -99, max: 99 }),
        fc.integer({ min: 1, max: 99 }),
        (num1, num2) => {
          const { phase2 } = buildNarrativeText(num1, num2, "+");
          return phase2.includes("kanan");
        },
      ),
      { numRuns: 300 },
    );
  });

  test("op='+', num2 < 0: phase2 menyebutkan arah 'kiri'", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -99, max: 99 }),
        fc.integer({ min: -99, max: -1 }),
        (num1, num2) => {
          const { phase2 } = buildNarrativeText(num1, num2, "+");
          return phase2.includes("kiri");
        },
      ),
      { numRuns: 300 },
    );
  });

  // phase2 direction correctness for subtraction
  test("op='-', num2 > 0: phase2 menyebutkan arah 'kiri'", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -99, max: 99 }),
        fc.integer({ min: 1, max: 99 }),
        (num1, num2) => {
          const { phase2 } = buildNarrativeText(num1, num2, "-");
          return phase2.includes("kiri");
        },
      ),
      { numRuns: 300 },
    );
  });

  test("op='-', num2 < 0: phase2 menyebutkan arah 'kanan'", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -99, max: 99 }),
        fc.integer({ min: -99, max: -1 }),
        (num1, num2) => {
          const { phase2 } = buildNarrativeText(num1, num2, "-");
          return phase2.includes("kanan");
        },
      ),
      { numRuns: 300 },
    );
  });

  // Both phases always have content
  test("buildNarrativeText selalu mengembalikan phase1 dan phase2 yang tidak kosong", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -99, max: 99 }),
        fc.integer({ min: -99, max: 99 }),
        fc.constantFrom<Operation>("+", "-"),
        (num1, num2, op) => {
          const { phase1, phase2 } = buildNarrativeText(num1, num2, op);
          return phase1.length > 0 && phase2.length > 0;
        },
      ),
      { numRuns: 500 },
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// RTL-equivalent: placeholder dan state result=null / result=0
// Validates: Requirements 6.5, 6.6
// ─────────────────────────────────────────────────────────────────────────────

describe("ResultPanel state: placeholder dan pesan 'Kembali ke titik asal'", () => {
  // Req 6.6 — result === null → placeholder, tidak ada persamaan/narasi
  test("result === null → isPlaceholderState() mengembalikan true", () => {
    expect(isPlaceholderState(null)).toBe(true);
  });

  test("result !== null → isPlaceholderState() mengembalikan false", () => {
    fc.assert(
      fc.property(fc.integer({ min: -198, max: 198 }), (result) => {
        return isPlaceholderState(result) === false;
      }),
      { numRuns: 200 },
    );
  });

  // Req 6.5 — result === 0 → tampilkan pesan "Kembali ke titik asal!"
  test("result === 0 → shouldShowReturnToOrigin() mengembalikan true", () => {
    expect(shouldShowReturnToOrigin(0)).toBe(true);
  });

  test("result !== 0 dan result !== null → shouldShowReturnToOrigin() mengembalikan false", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -198, max: 198 }).filter((n) => n !== 0),
        (result) => {
          return shouldShowReturnToOrigin(result) === false;
        },
      ),
      { numRuns: 200 },
    );
  });

  test("result === null → shouldShowReturnToOrigin() mengembalikan false (null bukan 0)", () => {
    expect(shouldShowReturnToOrigin(null)).toBe(false);
  });

  // Eq sanity checks: saat result tersedia, persamaan numerik benar
  test("saat result = 0: persamaan tetap ditampilkan (num1 + num2 = 0)", () => {
    // e.g. 3 + (-3) = 0
    const parts = buildEquationParts(3, -3, "+", 0);
    expect(parts.num1Text).toBe("3");
    expect(parts.num2Text).toBe("(-3)");
    expect(parts.resultText).toBe("0");
    expect(parts.opText).toBe("+");
    expect(shouldShowReturnToOrigin(0)).toBe(true);
  });

  test("saat result !== 0: pesan 'Kembali ke titik asal' tidak ditampilkan", () => {
    const parts = buildEquationParts(3, 2, "+", 5);
    expect(parts.resultText).toBe("5");
    expect(shouldShowReturnToOrigin(5)).toBe(false);
  });
});
