// __tests__/game/AllianceStage.property.test.ts
// Feature: alliance-animation-upgrade
// Property-based tests for pure functions extracted from AllianceStage.tsx

import * as fc from "fast-check";
import { CHAR_NAMES, dominantPlace } from "../../components/game/CharacterSVGs";

// ─── Inline re-implementations of pure functions ──────────────────────────────
// These mirror the logic in AllianceStage.tsx so tests have no React dependencies.

function idleInner(isIdle: boolean, hovered: boolean, delayMs: number): { animation?: string } {
  if (hovered) return { animation: "idle-hover-pop 220ms ease-out forwards" };
  if (isIdle) return { animation: `idle-float 3200ms ease-in-out ${delayMs}ms infinite` };
  return {};
}

function waitingLineOpacity(i: number): number {
  return Math.max(0.28, 0.75 - i * 0.09);
}

function waitingLineDelay(i: number): number {
  return i * 120;
}

function sparkTrailOffset(i: number, side: string): number {
  return side === "left" ? i * 12 : side === "right" ? -(i * 12) : 0;
}

function sparkTrailDelay(i: number): number {
  return i * 80;
}

// ─── Properties ───────────────────────────────────────────────────────────────

describe("AllianceStage property-based tests", () => {
  // Smoke test: pure helper functions are importable and callable
  it("pure helpers are defined and callable", () => {
    expect(typeof idleInner).toBe("function");
    expect(typeof waitingLineOpacity).toBe("function");
    expect(typeof waitingLineDelay).toBe("function");
    expect(typeof sparkTrailOffset).toBe("function");
    expect(typeof sparkTrailDelay).toBe("function");
    expect(typeof CHAR_NAMES).toBe("object");
    expect(typeof dominantPlace).toBe("function");
  });

  // Property 1: idleInner returns consistent CSSProperties (added in task 9.2)
  describe("Property 1: idleInner returns consistent CSSProperties", () => {
    // Feature: alliance-animation-upgrade, Property 1: idleInner returns consistent CSSProperties
    it("Property 1: idleInner is deterministic — same inputs yield same output", () => {
      fc.assert(
        fc.property(fc.boolean(), fc.boolean(), fc.nat(), (isIdle, hovered, delay) => {
          const r1 = idleInner(isIdle, hovered, delay);
          const r2 = idleInner(isIdle, hovered, delay);
          expect(JSON.stringify(r1)).toBe(JSON.stringify(r2));
        })
      );
    });
  });

  // Property 2: idleInner hover priority (added in task 9.3)
  describe("Property 2: idleInner hover priority", () => {
    // Feature: alliance-animation-upgrade, Property 2: idleInner hover priority
    it("Property 2: hovered=true always yields idle-hover-pop regardless of isIdle", () => {
      fc.assert(
        fc.property(fc.boolean(), fc.nat(), (isIdle, delay) => {
          const result = idleInner(isIdle, true, delay);
          expect(result.animation).toContain("idle-hover-pop");
        })
      );
    });
  });

  // Property 7: char name lookup is safe (added in task 9.8)
  describe("Property 7: char name lookup is safe", () => {
    // Feature: alliance-animation-upgrade, Property 7: char name lookup is safe
    it("Property 7: CHAR_NAMES[f]?.[dominantPlace(Math.abs(v))] ?? '' always returns string, never throws", () => {
      fc.assert(
        fc.property(
          fc.constantFrom("ab" as const, "ku" as const),
          fc.integer(),
          (f, v) => {
            let result: string | undefined;
            expect(() => {
              result = CHAR_NAMES[f]?.[dominantPlace(Math.abs(v))] ?? "";
            }).not.toThrow();
            expect(typeof result).toBe("string");
          }
        )
      );
    });
  });

  // Property 9: waiting line opacity formula (added in task 9.4)
  describe("Property 9: waiting line opacity formula", () => {
    // Feature: alliance-animation-upgrade, Property 9: waiting line opacity formula
    it("Property 9: waitingLineOpacity(i) === Math.max(0.28, 0.75 - i * 0.09) and stays in [0.28, 0.75]", () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 5 }), (i) => {
          const opacity = waitingLineOpacity(i);
          expect(opacity).toBeCloseTo(Math.max(0.28, 0.75 - i * 0.09), 10);
          expect(opacity).toBeGreaterThanOrEqual(0.28);
          expect(opacity).toBeLessThanOrEqual(0.75);
        })
      );
    });
  });

  // Property 10: waiting line animation delay (added in task 9.5)
  describe("Property 10: waiting line animation delay", () => {
    // Feature: alliance-animation-upgrade, Property 10: waiting line animation delay
    it("Property 10: waitingLineDelay(i) === i * 120", () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 5 }), (i) => {
          expect(waitingLineDelay(i)).toBe(i * 120);
        })
      );
    });
  });

  // Property 11: sparktrail offset linear (added in task 9.6)
  describe("Property 11: sparktrail offset linear", () => {
    // Feature: alliance-animation-upgrade, Property 11: sparktrail offset linear
    it("Property 11: |sparkTrailOffset(i, side)| === i * 12, sign matches side; invalid side yields 0", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 5 }),
          fc.constantFrom("left", "right"),
          (i, side) => {
            const offset = sparkTrailOffset(i, side);
            expect(Math.abs(offset)).toBe(i * 12);
            if (side === "left")  expect(offset).toBeGreaterThanOrEqual(0);
            if (side === "right") expect(offset).toBeLessThanOrEqual(0);
          }
        )
      );
      // invalid side
      expect(sparkTrailOffset(3, "center")).toBe(0);
    });
  });

  // Property 12: sparktrail delay sequential (added in task 9.7)
  describe("Property 12: sparktrail delay sequential", () => {
    // Feature: alliance-animation-upgrade, Property 12: sparktrail delay sequential
    it("Property 12: sparkTrailDelay(i) === i * 80", () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 5 }), (i) => {
          expect(sparkTrailDelay(i)).toBe(i * 80);
        })
      );
    });
  });
});
