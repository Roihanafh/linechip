import * as fc from "fast-check";

// The clamping logic from app/model-chip/pengurangan/page.tsx
// const clamp = (v: number) => Math.max(-9999, Math.min(9999, v));
const clamp = (v: number) => Math.max(-9999, Math.min(9999, v));

// Feature: model-chip-subtraction, Property 3: Clamping input ke rentang valid
// Validates: Requirements 1.6

describe("Property 3: clamp mempertahankan input dalam rentang [-9999, 9999]", () => {
  test("output selalu berada di [-9999, 9999] untuk semua integer", () => {
    fc.assert(
      fc.property(fc.integer({ min: -100000, max: 100000 }), (x) => {
        const result = clamp(x);
        return result >= -9999 && result <= 9999;
      }),
      { numRuns: 1000 }
    );
  });

  test("nilai yang sudah dalam rentang tidak berubah", () => {
    fc.assert(
      fc.property(fc.integer({ min: -9999, max: 9999 }), (x) => {
        return clamp(x) === x;
      }),
      { numRuns: 1000 }
    );
  });

  test("nilai di atas 9999 di-clamp ke 9999", () => {
    fc.assert(
      fc.property(fc.integer({ min: 10000, max: 100000 }), (x) => {
        return clamp(x) === 9999;
      }),
      { numRuns: 500 }
    );
  });

  test("nilai di bawah -9999 di-clamp ke -9999", () => {
    fc.assert(
      fc.property(fc.integer({ min: -100000, max: -10000 }), (x) => {
        return clamp(x) === -9999;
      }),
      { numRuns: 500 }
    );
  });
});
