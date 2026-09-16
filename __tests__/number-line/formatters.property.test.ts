import * as fc from "fast-check";
import {
  formatIntDisplay,
  formatIntInput,
  getNumberColorClass,
} from "../../lib/number-line/formatters";

// Feature: number-line-car-module, Property 3: Format tanda kurung untuk bilangan negatif
// Validates: Requirements 1.3

describe("Property 3: Format tanda kurung untuk bilangan negatif", () => {
  describe("formatIntDisplay", () => {
    test("bilangan negatif diformat dengan tanda kurung", () => {
      fc.assert(
        fc.property(fc.integer({ min: -100000, max: -1 }), (n) => {
          return formatIntDisplay(n) === `(${n})`;
        }),
        { numRuns: 1000 }
      );
    });

    test("bilangan non-negatif diformat tanpa tanda kurung", () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 100000 }), (n) => {
          return formatIntDisplay(n) === `${n}`;
        }),
        { numRuns: 1000 }
      );
    });
  });

  describe("formatIntInput", () => {
    test("bilangan negatif diformat dengan tanda kurung", () => {
      fc.assert(
        fc.property(fc.integer({ min: -100000, max: -1 }), (n) => {
          return formatIntInput(n) === `(${n})`;
        }),
        { numRuns: 1000 }
      );
    });

    test("bilangan non-negatif diformat tanpa tanda kurung", () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 100000 }), (n) => {
          return formatIntInput(n) === `${n}`;
        }),
        { numRuns: 1000 }
      );
    });
  });
});

// Feature: number-line-car-module, Property 4: Warna input berdasarkan tanda
// Validates: Requirements 1.4

describe("Property 4: Warna input berdasarkan tanda bilangan", () => {
  test("bilangan negatif menggunakan warna text-intpink", () => {
    fc.assert(
      fc.property(fc.integer({ min: -100000, max: -1 }), (n) => {
        return getNumberColorClass(n) === "text-intpink";
      }),
      { numRuns: 1000 }
    );
  });

  test("bilangan non-negatif menggunakan warna text-intblue", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100000 }), (n) => {
        return getNumberColorClass(n) === "text-intblue";
      }),
      { numRuns: 1000 }
    );
  });
});
