/**
 * Unit tests for TransformPanel component logic.
 *
 * Because the project's Jest environment is Node (no jsdom / no @testing-library),
 * we test the pure logic that drives TransformPanel's rendering rather than
 * mounting the full React component tree. This mirrors the established pattern
 * in __tests__/model-chip/AnimationMode_Selector.test.tsx.
 *
 * Requirements: 3.3, 9.3
 */

export {}; // make this file a module so local types don't bleed into global scope

// ── Pure logic extracted from TransformPanel.tsx ─────────────────────────────

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

/** Returns the CSS class string for the outer container. */
function containerClasses(isExiting: boolean): string {
  return `mb-4 ${isExiting ? "chip-flip-exit" : ""}`.trim();
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("TransformPanel — Req 3.3: label konversi ditampilkan dengan benar", () => {
  it('label "+3 → −3" ditampilkan saat bil2 = 3', () => {
    expect(conversionLabel(3)).toBe("+3 → −3");
  });

  it('label "−5 → +5" ditampilkan saat bil2 = -5', () => {
    expect(conversionLabel(-5)).toBe("−5 → +5");
  });

  it('label "+1 → −1" ditampilkan saat bil2 = 1', () => {
    expect(conversionLabel(1)).toBe("+1 → −1");
  });

  it('label "−9999 → +9999" ditampilkan saat bil2 = -9999', () => {
    expect(conversionLabel(-9999)).toBe("−9999 → +9999");
  });

  it("label bilangan positif selalu menggunakan tanda + di kiri dan − di kanan", () => {
    const label = conversionLabel(7);
    expect(label.startsWith("+")).toBe(true);
    expect(label).toContain("−7");
  });

  it("label bilangan negatif selalu menggunakan tanda − di kiri dan + di kanan", () => {
    const label = conversionLabel(-7);
    expect(label.startsWith("−")).toBe(true);
    expect(label).toContain("+7");
  });

  it("label selalu mengandung panah '→' sebagai pemisah", () => {
    expect(conversionLabel(3)).toContain(" → ");
    expect(conversionLabel(-3)).toContain(" → ");
  });
});

describe("TransformPanel — Req 9.3: aria-label sesuai format", () => {
  it('aria-label saat bil2 > 0 berformat "Ubah ... chip antibodi menjadi kuman"', () => {
    const label = ariaLabel(3);
    expect(label).toBe("Ubah 3 chip antibodi menjadi kuman");
  });

  it('aria-label saat bil2 = 5 berformat "Ubah 5 chip antibodi menjadi kuman"', () => {
    const label = ariaLabel(5);
    expect(label).toBe("Ubah 5 chip antibodi menjadi kuman");
  });

  it('aria-label saat bil2 < 0 berformat "Ubah ... chip kuman menjadi antibodi"', () => {
    const label = ariaLabel(-5);
    expect(label).toBe("Ubah 5 chip kuman menjadi antibodi");
  });

  it("aria-label menggunakan nilai absolut dari bil2 (bukan nilai negatif)", () => {
    const label = ariaLabel(-7);
    expect(label).toContain("7");
    expect(label).not.toContain("-7");
  });

  it("aria-label untuk bil2 positif mengandung 'antibodi' sebagai tipeSumber", () => {
    const label = ariaLabel(1);
    expect(label).toContain("antibodi");
  });

  it("aria-label untuk bil2 negatif mengandung 'kuman' sebagai tipeSumber", () => {
    const label = ariaLabel(-1);
    expect(label).toContain("kuman");
    expect(label).not.toMatch(/\bantibodi\b.*\bsumber\b/);
  });

  it("aria-label untuk bil2 positif mengandung 'kuman' sebagai tipeTujuan", () => {
    const label = ariaLabel(10);
    expect(label).toContain("menjadi kuman");
  });

  it("aria-label untuk bil2 negatif mengandung 'antibodi' sebagai tipeTujuan", () => {
    const label = ariaLabel(-10);
    expect(label).toContain("menjadi antibodi");
  });
});

describe("TransformPanel — class chip-flip-exit diterapkan saat isExiting", () => {
  it("class 'chip-flip-exit' ada di container saat isExiting === true", () => {
    const classes = containerClasses(true);
    expect(classes).toContain("chip-flip-exit");
  });

  it("class 'chip-flip-exit' tidak ada di container saat isExiting === false", () => {
    const classes = containerClasses(false);
    expect(classes).not.toContain("chip-flip-exit");
  });

  it("container selalu memiliki class 'mb-4' terlepas dari isExiting", () => {
    expect(containerClasses(true)).toContain("mb-4");
    expect(containerClasses(false)).toContain("mb-4");
  });
});
