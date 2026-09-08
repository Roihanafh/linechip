import * as fc from "fast-check";
import {
  computeTickLayout,
  derivePhase2Color,
} from "../../lib/canvas/numberLineRenderer";

// Mock canvas for computeTickLayout (no DOM needed)
const mockCanvas = { width: 800, height: 280 } as HTMLCanvasElement;

// ─── Property 1 ───────────────────────────────────────────────────────────────
// Feature: add-sub-game-integration, Property 1: computeTickLayout mencakup 0, num1, result
describe("computeTickLayout", () => {
  it("Property 1: mencakup 0, num1, dan result saat tidak idle", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -99, max: 99 }), // num1
        fc.integer({ min: -99, max: 99 }), // num2
        fc.constantFrom("+", "-") as fc.Arbitrary<"+" | "-">,
        (num1, num2, op) => {
          const result = op === "+" ? num1 + num2 : num1 - num2;

          // Idle state: skip the check
          if (num1 === 0 && num2 === 0) return true;

          const { uniqueTicks } = computeTickLayout(mockCanvas, num1, num2, result);

          return (
            uniqueTicks.includes(0) &&
            uniqueTicks.includes(num1) &&
            uniqueTicks.includes(result)
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 2 ───────────────────────────────────────────────────────────────
// Feature: add-sub-game-integration, Property 2: warna trail sesuai arah gerak
describe("derivePhase2Color", () => {
  it("Property 2: warna trail sesuai aturan arah pergerakan", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -99, max: 99 }), // num2
        fc.constantFrom("+", "-") as fc.Arbitrary<"+" | "-">,
        (num2, op) => {
          const color = derivePhase2Color(num2, op);

          if (op === "+") {
            return num2 >= 0
              ? color === "#2F6FED"  // intblue — moves right
              : color === "#EC4899"; // intpink — moves left
          } else {
            return num2 >= 0
              ? color === "#EC4899"  // intpink — subtract positive = moves left
              : color === "#2F6FED"; // intblue — subtract negative = moves right
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
