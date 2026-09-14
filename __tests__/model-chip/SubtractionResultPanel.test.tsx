/**
 * Unit tests for SubtractionResultPanel component logic.
 *
 * Because the project's Jest environment is Node (no jsdom / no @testing-library),
 * we test the pure logic that drives SubtractionResultPanel's rendering rather
 * than mounting the full React component tree. This mirrors the established
 * pattern in __tests__/model-chip/TransformPanel.test.tsx.
 *
 * Coverage:
 *   - Persamaan menampilkan operator '−' (U+2212) bukan '+'
 *   - Placeholder '?' ditampilkan saat vizPhase !== "done"
 *   - Hasil aktual ditampilkan saat vizPhase === "done"
 *
 * Requirements: 5.1, 5.6
 */

export {}; // make this file a module so local types don't bleed into global scope

import type { VizPhaseSub } from "@/lib/model-chip/subtractionTypes";

// ── Pure logic extracted from SubtractionResultPanel.tsx ─────────────────────

/**
 * Returns the result display value for the "Hasil" box.
 * Mirrors the JSX expression used for the result text inside the panel.
 */
function resultDisplay(vizPhase: VizPhaseSub, remaining: number): string {
  const isDone = vizPhase === "done";
  if (!isDone) return "?";
  if (remaining > 0) return `+${remaining}`;
  if (remaining === 0) return "0";
  return String(remaining);
}

/**
 * Returns the equation string rendered in the bottom equation row.
 * Mirrors the text content of the equation bar in SubtractionResultPanel:
 *   "{bil1} − {bil2} = {hasil}"
 *
 * Uses U+2212 '−' (same as the component JSX) as the operator.
 */
function equationText(
  eqBil1: number,
  eqBil2Original: number,
  vizPhase: VizPhaseSub,
  remaining: number
): string {
  const isDone = vizPhase === "done";

  const bil1Str =
    eqBil1 >= 0
      ? `+${eqBil1.toLocaleString("id-ID")}`
      : eqBil1.toLocaleString("id-ID");

  const bil2Str =
    eqBil2Original >= 0
      ? `+${eqBil2Original.toLocaleString("id-ID")}`
      : `(${eqBil2Original.toLocaleString("id-ID")})`;

  const hasilStr = isDone
    ? remaining > 0
      ? `+${remaining.toLocaleString("id-ID")}`
      : remaining.toLocaleString("id-ID")
    : "?";

  // U+2212 minus sign — same character the component uses in JSX
  return `${bil1Str} − ${bil2Str} = ${hasilStr}`;
}

/**
 * Returns the summary line text shown above the equation row.
 * Mirrors the <p> with "+bil1 − bil2" format from SubtractionResultPanel.
 */
function summaryLine(eqBil1: number, eqBil2Original: number): string {
  const bil1Str =
    eqBil1 >= 0
      ? `+${eqBil1.toLocaleString("id-ID")}`
      : eqBil1.toLocaleString("id-ID");

  const bil2Str =
    eqBil2Original >= 0
      ? `+${eqBil2Original.toLocaleString("id-ID")}`
      : `(${eqBil2Original.toLocaleString("id-ID")})`;

  return `${bil1Str} − ${bil2Str}`;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("SubtractionResultPanel — Req 5.1: operator − digunakan (bukan +)", () => {
  it("equationText mengandung karakter '−' (U+2212) di antara bil1 dan bil2", () => {
    const text = equationText(5, 3, "done", 2);
    // Must contain the minus sign character U+2212
    expect(text).toContain("\u2212");
  });

  it("equationText tidak mengandung '+' sebagai operator di antara bil1 dan bil2", () => {
    // The operator between bil1 and bil2 must be '−', never '+'
    // We extract just the operator by looking at the structure: "+5 − +3 = ..."
    const text = equationText(5, 3, "done", 2);
    // The full equation should use '−' separator between the two operands
    expect(text).toMatch(/\+5 \u2212 \+3/);
  });

  it("summaryLine mengandung karakter '−' (U+2212) sebagai operator", () => {
    const line = summaryLine(5, 3);
    expect(line).toContain("\u2212");
  });

  it("summaryLine tidak pernah menggunakan '+' sebagai operator di antara kedua nilai", () => {
    const line = summaryLine(7, 2);
    // Should be "+7 − +2", not "+7 + +2"
    expect(line).toBe("+7 \u2212 +2");
  });

  it("equationText untuk bil1 negatif dan bil2 positif tetap menggunakan − sebagai operator", () => {
    const text = equationText(-3, 5, "done", -8);
    expect(text).toContain("\u2212");
    // Operator (U+2212) should appear between the two operands
    // bil1 negative uses locale format (hyphen-minus '-3'), bil2 positive uses '+5'
    expect(text).toMatch(/-3 \u2212 \+5/);
  });

  it("equationText untuk bil1 dan bil2 keduanya negatif tetap menggunakan − sebagai operator", () => {
    const text = equationText(-4, -2, "done", -2);
    expect(text).toContain("\u2212");
    // bil2 negatif ditampilkan dalam tanda kurung: (-2)
    expect(text).toContain("(");
  });
});

describe("SubtractionResultPanel — Req 5.6: placeholder '?' saat vizPhase !== 'done'", () => {
  const nonDonePhases: VizPhaseSub[] = ["idle", "transform", "battle", "center"];

  for (const phase of nonDonePhases) {
    it(`resultDisplay mengembalikan '?' saat vizPhase = "${phase}"`, () => {
      expect(resultDisplay(phase, 5)).toBe("?");
    });
  }

  it("equationText menampilkan '?' sebagai hasil saat vizPhase = 'idle'", () => {
    const text = equationText(5, 3, "idle", 2);
    expect(text).toContain("?");
    // Actual value should NOT appear in place of '?'
    expect(text).not.toMatch(/= \+2/);
  });

  it("equationText menampilkan '?' sebagai hasil saat vizPhase = 'transform'", () => {
    const text = equationText(5, 3, "transform", 2);
    expect(text).toContain("?");
  });

  it("equationText menampilkan '?' sebagai hasil saat vizPhase = 'battle'", () => {
    const text = equationText(5, 3, "battle", 2);
    expect(text).toContain("?");
  });

  it("equationText menampilkan '?' sebagai hasil saat vizPhase = 'center'", () => {
    const text = equationText(5, 3, "center", 2);
    expect(text).toContain("?");
  });
});

describe("SubtractionResultPanel — Req 5.6: hasil aktual tampil saat vizPhase === 'done'", () => {
  it("resultDisplay mengembalikan nilai positif dengan tanda '+' saat remaining > 0", () => {
    expect(resultDisplay("done", 5)).toBe("+5");
  });

  it("resultDisplay mengembalikan '0' saat remaining === 0", () => {
    expect(resultDisplay("done", 0)).toBe("0");
  });

  it("resultDisplay mengembalikan nilai negatif (tanpa '+') saat remaining < 0", () => {
    expect(resultDisplay("done", -3)).toBe("-3");
  });

  it("resultDisplay tidak mengembalikan '?' saat vizPhase === 'done'", () => {
    expect(resultDisplay("done", 7)).not.toBe("?");
    expect(resultDisplay("done", 0)).not.toBe("?");
    expect(resultDisplay("done", -2)).not.toBe("?");
  });

  it("equationText menampilkan hasil aktual (bukan '?') saat vizPhase = 'done'", () => {
    const text = equationText(7, 3, "done", 4);
    expect(text).not.toContain("?");
    expect(text).toContain("+4");
  });

  it("equationText saat done dan remaining positif: format '+{remaining}'", () => {
    const text = equationText(8, 3, "done", 5);
    expect(text).toMatch(/= \+5/);
  });

  it("equationText saat done dan remaining negatif: format '{remaining}' tanpa tanda '+'", () => {
    const text = equationText(2, 7, "done", -5);
    expect(text).toMatch(/= -5/);
  });

  it("equationText saat done dan remaining === 0: format '0'", () => {
    const text = equationText(3, 3, "done", 0);
    expect(text).toMatch(/= 0/);
  });
});

describe("SubtractionResultPanel — konsistensi operator dan hasil bersama", () => {
  it("persamaan lengkap: '+5 − +3 = +2' saat done dengan bil1=5, bil2=3, remaining=2", () => {
    const text = equationText(5, 3, "done", 2);
    expect(text).toBe("+5 \u2212 +3 = +2");
  });

  it("persamaan lengkap: '+3 − +5 = -2' saat done dengan bil1=3, bil2=5, remaining=-2", () => {
    const text = equationText(3, 5, "done", -2);
    expect(text).toBe("+3 \u2212 +5 = -2");
  });

  it("persamaan lengkap: '-4 − (-2) = -2' saat done dengan bil1=-4, bil2=-2, remaining=-2", () => {
    const text = equationText(-4, -2, "done", -2);
    expect(text).toBe("-4 \u2212 (-2) = -2");
  });

  it("persamaan dengan placeholder: '+5 − +3 = ?' saat vizPhase = 'idle'", () => {
    const text = equationText(5, 3, "idle", 2);
    expect(text).toBe("+5 \u2212 +3 = ?");
  });
});
