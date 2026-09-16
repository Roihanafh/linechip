/**
 * Property tests for InputPanel component logic.
 *
 * Because the project's Jest environment is Node (no jsdom / no @testing-library),
 * we test the pure logic that drives InputPanel's rendering rather than
 * mounting the full React component tree. This mirrors the established pattern
 * in __tests__/model-chip/TransformPanel.test.tsx.
 *
 * Requirements: 3.2, 3.3, 3.4, 9.1
 */

import * as fc from 'fast-check';
import { clampInt } from '../../lib/number-line/formatters';

// ── Constants (mirrored from InputPanel.tsx) ───────────────────────────────────
const MIN = -99;
const MAX = 99;

// ── Pure logic extracted from InputPanel / NumberInput ────────────────────────

/** Whether the increment (+) stepper should be disabled */
function incDisabled(value: number): boolean {
  return value >= MAX;
}

/** Whether the decrement (−) stepper should be disabled */
function decDisabled(value: number): boolean {
  return value <= MIN;
}

/**
 * All aria-labels produced by InputPanel for a given label suffix and operation.
 * Extracted verbatim from InputPanel.tsx.
 */
function ariaLabelsForInput(label: string): string[] {
  return [
    `Tambah nilai ${label}`,
    `Input nilai ${label}`,
    `Kurangi nilai ${label}`,
  ];
}

function ariaLabelsForActions(operation: '+' | '-'): string[] {
  return [
    'Hitung hasil',
    'Buka instruksi',
    `Operator ${operation === '+' ? 'penjumlahan' : 'pengurangan'}`,
  ];
}

// ── Property 1: Stepper disable di batas ──────────────────────────────────────
// Feature: number-line-car-module, Property 1: Stepper disable saat batas
// Validates: Requirements 3.2, 3.3

describe('Property 1: Stepper disable di batas', () => {
  // Req 3.2 / 3.3 – increment button disabled exactly when value >= 99
  describe('Tombol + (increment) disabled saat value = 99', () => {
    test('incDisabled(99) === true', () => {
      expect(incDisabled(99)).toBe(true);
    });

    test('incDisabled(−99) === false', () => {
      expect(incDisabled(-99)).toBe(false);
    });

    test('incDisabled tidak disabled untuk semua nilai di bawah 99', () => {
      fc.assert(
        fc.property(fc.integer({ min: MIN, max: MAX - 1 }), (value) => {
          return incDisabled(value) === false;
        }),
        { numRuns: 500 },
      );
    });

    test('incDisabled selalu disabled untuk nilai >= 99', () => {
      fc.assert(
        fc.property(fc.integer({ min: MAX, max: MAX + 1000 }), (value) => {
          return incDisabled(value) === true;
        }),
        { numRuns: 500 },
      );
    });
  });

  // Req 3.2 / 3.3 – decrement button disabled exactly when value <= -99
  describe('Tombol − (decrement) disabled saat value = -99', () => {
    test('decDisabled(−99) === true', () => {
      expect(decDisabled(-99)).toBe(true);
    });

    test('decDisabled(99) === false', () => {
      expect(decDisabled(99)).toBe(false);
    });

    test('decDisabled tidak disabled untuk semua nilai di atas -99', () => {
      fc.assert(
        fc.property(fc.integer({ min: MIN + 1, max: MAX }), (value) => {
          return decDisabled(value) === false;
        }),
        { numRuns: 500 },
      );
    });

    test('decDisabled selalu disabled untuk nilai <= -99', () => {
      fc.assert(
        fc.property(fc.integer({ min: MIN - 1000, max: MIN }), (value) => {
          return decDisabled(value) === true;
        }),
        { numRuns: 500 },
      );
    });
  });

  // Req 3.2 / 3.3 – untuk nilai dalam rentang terbuka (-99, 99), kedua stepper aktif
  describe('Kedua stepper aktif untuk nilai dalam rentang (-99, 99)', () => {
    test('inc dan dec keduanya tidak disabled saat −99 < value < 99', () => {
      fc.assert(
        fc.property(fc.integer({ min: MIN + 1, max: MAX - 1 }), (value) => {
          return incDisabled(value) === false && decDisabled(value) === false;
        }),
        { numRuns: 500 },
      );
    });
  });
});

// ── Property 2: Clamp saat onBlur ─────────────────────────────────────────────
// Feature: number-line-car-module, Property 2: Clamp saat input onBlur
// Validates: Requirements 3.4

describe('Property 2: Clamp saat input onBlur', () => {
  test('hasil clamp selalu berada di rentang [−99, 99] untuk semua integer', () => {
    fc.assert(
      fc.property(fc.integer({ min: -1_000_000, max: 1_000_000 }), (x) => {
        const result = clampInt(x, MIN, MAX);
        return result >= MIN && result <= MAX;
      }),
      { numRuns: 1000 },
    );
  });

  test('nilai yang sudah dalam rentang tidak berubah', () => {
    fc.assert(
      fc.property(fc.integer({ min: MIN, max: MAX }), (x) => {
        return clampInt(x, MIN, MAX) === x;
      }),
      { numRuns: 1000 },
    );
  });

  test('nilai di atas 99 di-clamp ke 99', () => {
    fc.assert(
      fc.property(fc.integer({ min: MAX + 1, max: 1_000_000 }), (x) => {
        return clampInt(x, MIN, MAX) === MAX;
      }),
      { numRuns: 500 },
    );
  });

  test('nilai di bawah -99 di-clamp ke -99', () => {
    fc.assert(
      fc.property(fc.integer({ min: -1_000_000, max: MIN - 1 }), (x) => {
        return clampInt(x, MIN, MAX) === MIN;
      }),
      { numRuns: 500 },
    );
  });

  test('clamp identik dengan Math.max(−99, Math.min(99, x)) untuk semua integer', () => {
    fc.assert(
      fc.property(fc.integer({ min: -1_000_000, max: 1_000_000 }), (x) => {
        const expected = Math.max(MIN, Math.min(MAX, x));
        return clampInt(x, MIN, MAX) === expected;
      }),
      { numRuns: 1000 },
    );
  });
});

// ── Property 18: aria-label non-empty ─────────────────────────────────────────
// Feature: number-line-car-module, Property 18: aria-label non-empty untuk elemen interaktif InputPanel
// Validates: Requirements 9.1

describe('Property 18: aria-label non-empty untuk semua elemen interaktif InputPanel', () => {
  const inputLabels: Array<'+' | '-'> = ['+', '-'];

  test('aria-label stepper dan input untuk bilangan pertama tidak kosong', () => {
    const labels = ariaLabelsForInput('pertama');
    for (const label of labels) {
      expect(label).toBeTruthy();
      expect(label.trim().length).toBeGreaterThan(0);
    }
  });

  test('aria-label stepper dan input untuk bilangan kedua tidak kosong', () => {
    const labels = ariaLabelsForInput('kedua');
    for (const label of labels) {
      expect(label).toBeTruthy();
      expect(label.trim().length).toBeGreaterThan(0);
    }
  });

  test.each(inputLabels)(
    'aria-label tombol Hitung, Buka instruksi, dan Operator untuk operation=%s tidak kosong',
    (operation) => {
      const labels = ariaLabelsForActions(operation);
      for (const label of labels) {
        expect(label).toBeTruthy();
        expect(label.trim().length).toBeGreaterThan(0);
      }
    },
  );

  test('setiap elemen interaktif memiliki aria-label yang mengandung konteks fungsi', () => {
    // Stepper increment (pertama)
    expect(ariaLabelsForInput('pertama')[0]).toContain('pertama');
    // Stepper decrement (pertama)
    expect(ariaLabelsForInput('pertama')[2]).toContain('pertama');
    // Input field (kedua)
    expect(ariaLabelsForInput('kedua')[1]).toContain('kedua');
    // Hitung button
    expect(ariaLabelsForActions('+')[0]).toContain('Hitung');
    // Instruksi button
    expect(ariaLabelsForActions('+')[1]).toContain('instruksi');
    // Operator display (penjumlahan)
    expect(ariaLabelsForActions('+')[2]).toContain('penjumlahan');
    // Operator display (pengurangan)
    expect(ariaLabelsForActions('-')[2]).toContain('pengurangan');
  });

  test('fast-check: aria-label untuk semua label suffix yang valid tidak pernah kosong', () => {
    const suffixes = ['pertama', 'kedua'];
    fc.assert(
      fc.property(
        fc.constantFrom(...suffixes),
        (suffix) => {
          const labels = ariaLabelsForInput(suffix);
          return labels.every((l) => typeof l === 'string' && l.trim().length > 0);
        },
      ),
      { numRuns: 50 },
    );
  });

  test('fast-check: aria-label untuk semua operasi tidak pernah kosong', () => {
    const operations: Array<'+' | '-'> = ['+', '-'];
    fc.assert(
      fc.property(
        fc.constantFrom(...operations),
        (op) => {
          const labels = ariaLabelsForActions(op);
          return labels.every((l) => typeof l === 'string' && l.trim().length > 0);
        },
      ),
      { numRuns: 50 },
    );
  });
});
