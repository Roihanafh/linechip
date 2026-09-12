/**
 * Property-based tests for InteractionAnimation — classifyInteraction function.
 *
 * Property 3: Klasifikasi Battle untuk semua pasangan tanda berbeda
 * Property 4: Klasifikasi Alliance-ab untuk semua pasangan positif
 * Property 5: Klasifikasi Alliance-ku untuk semua pasangan negatif
 * Property 6: Perfect neutralization terdeteksi untuk semua pasangan zero-sum
 * Property 7: Error untuk semua input dengan salah satu nilai nol
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**
 */

import * as fc from "fast-check";
import { classifyInteraction } from "@/components/game/InteractionAnimation";

// ─── Property 3 ───────────────────────────────────────────────────────────────

describe("Property 3: Klasifikasi Battle untuk semua pasangan tanda berbeda", () => {
  it("classifyInteraction(pos, neg) → type === 'battle'", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 9999 }),
        fc.integer({ min: -9999, max: -1 }),
        (a, b) => {
          expect(classifyInteraction(a, b).type).toBe("battle");
        }
      )
    );
  });

  it("classifyInteraction(neg, pos) → type === 'battle'", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -9999, max: -1 }),
        fc.integer({ min: 1, max: 9999 }),
        (a, b) => {
          expect(classifyInteraction(a, b).type).toBe("battle");
        }
      )
    );
  });
});

// ─── Property 4 ───────────────────────────────────────────────────────────────

describe("Property 4: Klasifikasi Alliance-ab untuk semua pasangan positif", () => {
  it("classifyInteraction(pos, pos) → type === 'alliance' dengan faction === 'ab'", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 9999 }),
        fc.integer({ min: 1, max: 9999 }),
        (a, b) => {
          const result = classifyInteraction(a, b);
          expect(result.type).toBe("alliance");
          expect(result.faction).toBe("ab");
        }
      )
    );
  });
});

// ─── Property 5 ───────────────────────────────────────────────────────────────

describe("Property 5: Klasifikasi Alliance-ku untuk semua pasangan negatif", () => {
  it("classifyInteraction(neg, neg) → type === 'alliance' dengan faction === 'ku'", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -9999, max: -1 }),
        fc.integer({ min: -9999, max: -1 }),
        (a, b) => {
          const result = classifyInteraction(a, b);
          expect(result.type).toBe("alliance");
          expect(result.faction).toBe("ku");
        }
      )
    );
  });
});

// ─── Property 6 ───────────────────────────────────────────────────────────────

describe("Property 6: Perfect neutralization terdeteksi untuk semua pasangan zero-sum", () => {
  it("classifyInteraction(n, -n) → type === 'battle' dengan isPerfectNeutralization === true", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 9999 }),
        (n) => {
          const result = classifyInteraction(n, -n);
          expect(result.type).toBe("battle");
          expect(result.isPerfectNeutralization).toBe(true);
        }
      )
    );
  });

  it("classifyInteraction(-n, n) → isPerfectNeutralization === true", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 9999 }),
        (n) => {
          const result = classifyInteraction(-n, n);
          expect(result.type).toBe("battle");
          expect(result.isPerfectNeutralization).toBe(true);
        }
      )
    );
  });

  it("non-zero-sum battle → isPerfectNeutralization === false", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 9999 }),
        fc.integer({ min: 1, max: 9998 }),
        (a, b) => {
          // Ensure a ≠ b so that a + (-b) ≠ 0
          fc.pre(a !== b);
          const result = classifyInteraction(a, -b);
          expect(result.isPerfectNeutralization).toBe(false);
        }
      )
    );
  });
});

// ─── Property 7 ───────────────────────────────────────────────────────────────

describe("Property 7: Error untuk semua input dengan salah satu nilai nol", () => {
  /**
   * Validates: Requirements 1.5
   *
   * Untuk setiap v ≠ 0, classifyInteraction(0, v) dan classifyInteraction(v, 0)
   * keduanya harus throw error.
   */

  it("classifyInteraction(0, v) throws untuk setiap v ≠ 0", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -9999, max: 9999 }).filter((v) => v !== 0),
        (v) => {
          expect(() => classifyInteraction(0, v)).toThrow();
        }
      )
    );
  });

  it("classifyInteraction(v, 0) throws untuk setiap v ≠ 0", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -9999, max: 9999 }).filter((v) => v !== 0),
        (v) => {
          expect(() => classifyInteraction(v, 0)).toThrow();
        }
      )
    );
  });
});
