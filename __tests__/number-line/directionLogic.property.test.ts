import * as fc from "fast-check";
import {
  getPhase1Direction,
  getPhase2FacingDirection,
  getPhase2MovementDirection,
} from "../../lib/number-line/directionLogic";

// Feature: number-line-car-module, Property 5: Phase 1 direction matches num1 sign
// Validates: Requirements 4.1, 4.2
describe("Property 5: Phase 1 direction matches num1 sign", () => {
  test("num1 >= 0 → 'right'", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 99 }), (num1) => {
        return getPhase1Direction(num1) === "right";
      }),
      { numRuns: 100 }
    );
  });

  test("num1 < 0 → 'left'", () => {
    fc.assert(
      fc.property(fc.integer({ min: -99, max: -1 }), (num1) => {
        return getPhase1Direction(num1) === "left";
      }),
      { numRuns: 100 }
    );
  });

  test("output selalu 'right' atau 'left' untuk semua num1 di [-99, 99]", () => {
    fc.assert(
      fc.property(fc.integer({ min: -99, max: 99 }), (num1) => {
        const dir = getPhase1Direction(num1);
        return dir === "right" || dir === "left";
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: number-line-car-module, Property 6: Phase 2 facing direction per tabel operasi
// Validates: Requirements 4.3, 4.5
describe("Property 6: Phase 2 facing direction per tabel operasi", () => {
  test("op='+', num2 >= 0 → 'right'", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 99 }), (num2) => {
        return getPhase2FacingDirection(num2, "+") === "right";
      }),
      { numRuns: 100 }
    );
  });

  test("op='+', num2 < 0 → 'left'", () => {
    fc.assert(
      fc.property(fc.integer({ min: -99, max: -1 }), (num2) => {
        return getPhase2FacingDirection(num2, "+") === "left";
      }),
      { numRuns: 100 }
    );
  });

  test("op='-', num2 > 0 → 'right' (hadap kanan, gerak kiri = mundur)", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 99 }), (num2) => {
        return getPhase2FacingDirection(num2, "-") === "right";
      }),
      { numRuns: 100 }
    );
  });

  test("op='-', num2 < 0 → 'left' (hadap kiri, gerak kanan = mundur)", () => {
    fc.assert(
      fc.property(fc.integer({ min: -99, max: -1 }), (num2) => {
        return getPhase2FacingDirection(num2, "-") === "left";
      }),
      { numRuns: 100 }
    );
  });

  test("op='-', num2 = 0 → 'right'", () => {
    expect(getPhase2FacingDirection(0, "-")).toBe("right");
  });
});

// Feature: number-line-car-module, Property 7: Phase 2 movement direction sesuai arah perubahan
// Validates: Requirements 4.4, 4.6
describe("Property 7: Phase 2 movement direction sesuai arah perubahan", () => {
  test("result > num1 → 'right' (penjumlahan: num2 > 0)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -99, max: 99 }),
        fc.integer({ min: 1, max: 99 }),
        (num1, num2) => {
          // result = num1 + num2 > num1 when num2 > 0
          return getPhase2MovementDirection(num1, num2, "+") === "right";
        }
      ),
      { numRuns: 100 }
    );
  });

  test("result < num1 → 'left' (penjumlahan: num2 < 0)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -99, max: 99 }),
        fc.integer({ min: -99, max: -1 }),
        (num1, num2) => {
          // result = num1 + num2 < num1 when num2 < 0
          return getPhase2MovementDirection(num1, num2, "+") === "left";
        }
      ),
      { numRuns: 100 }
    );
  });

  test("result < num1 → 'left' (pengurangan: num2 > 0)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -99, max: 99 }),
        fc.integer({ min: 1, max: 99 }),
        (num1, num2) => {
          // result = num1 - num2 < num1 when num2 > 0
          return getPhase2MovementDirection(num1, num2, "-") === "left";
        }
      ),
      { numRuns: 100 }
    );
  });

  test("result > num1 → 'right' (pengurangan: num2 < 0)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -99, max: 99 }),
        fc.integer({ min: -99, max: -1 }),
        (num1, num2) => {
          // result = num1 - num2 > num1 when num2 < 0
          return getPhase2MovementDirection(num1, num2, "-") === "right";
        }
      ),
      { numRuns: 100 }
    );
  });

  test("result = num1 → 'right' (num2 = 0, diam — default kanan)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -99, max: 99 }),
        fc.constantFrom<"+" | "-">("+", "-"),
        (num1, op) => {
          // num2 = 0: result === num1, default 'right'
          return getPhase2MovementDirection(num1, 0, op) === "right";
        }
      ),
      { numRuns: 100 }
    );
  });

  test("output selalu 'right' atau 'left' untuk semua kombinasi input", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -99, max: 99 }),
        fc.integer({ min: -99, max: 99 }),
        fc.constantFrom<"+" | "-">("+", "-"),
        (num1, num2, op) => {
          const dir = getPhase2MovementDirection(num1, num2, op);
          return dir === "right" || dir === "left";
        }
      ),
      { numRuns: 100 }
    );
  });
});
