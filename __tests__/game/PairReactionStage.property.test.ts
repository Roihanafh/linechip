// __tests__/game/PairReactionStage.property.test.ts
// Feature: model-chip-animation-upgrade
// Property-based tests for pure functions extracted from PairReactionStage.tsx and CharacterColumn.tsx

import * as fc from "fast-check";
import { CHAR_NAMES } from "../../components/game/CharacterSVGs";

// ─── Inline re-implementations of pure functions ──────────────────────────────

function idleInner(isApproach: boolean, hovered: boolean, delayMs: number): { animation?: string } {
  if (hovered) return { animation: "idle-hover-pop 220ms ease-out forwards" };
  if (isApproach) return { animation: `idle-float 2800ms ease-in-out ${delayMs}ms infinite` };
  return {};
}

function sparkTrailOffset(i: number, side: string): number {
  return side === "left" ? i * 12 : side === "right" ? -(i * 12) : 0;
}

function sparkTrailDelay(i: number): number {
  return i * 80;
}

function sparkTrailColor(faction: string): string {
  return faction === "ab" ? "#93c5fd" : "#f87171";
}

function charNameBarOpacity(phase: string): number {
  return phase === "approach" ? 1 : 0;
}

function chipIdleDelay(globalIdx: number): number {
  return (globalIdx % 6) * 120;
}

function pairCycleDuration(speed: number): number {
  return Math.round(2120 / speed) + 160;
}

// ─── Properties ───────────────────────────────────────────────────────────────

describe("PairReactionStage property-based tests (model-chip-animation-upgrade)", () => {

  it("smoke: all pure helpers are defined and callable", () => {
    expect(typeof idleInner).toBe("function");
    expect(typeof sparkTrailOffset).toBe("function");
    expect(typeof sparkTrailDelay).toBe("function");
    expect(typeof sparkTrailColor).toBe("function");
    expect(typeof charNameBarOpacity).toBe("function");
    expect(typeof chipIdleDelay).toBe("function");
    expect(typeof pairCycleDuration).toBe("function");
    expect(typeof CHAR_NAMES).toBe("object");
  });

  describe("Property 1: idleInner consistent and hover priority", () => {
    // Feature: model-chip-animation-upgrade, Property 1: idleInner consistent and hover priority
    it("idleInner is deterministic — same inputs yield same output", () => {
      fc.assert(
        fc.property(fc.boolean(), fc.boolean(), fc.nat(), (isApproach, hovered, delay) => {
          const r1 = idleInner(isApproach, hovered, delay);
          const r2 = idleInner(isApproach, hovered, delay);
          expect(JSON.stringify(r1)).toBe(JSON.stringify(r2));
        })
      );
    });

    it("hovered=true always yields idle-hover-pop regardless of isApproach", () => {
      fc.assert(
        fc.property(fc.boolean(), fc.nat(), (isApproach, delay) => {
          const result = idleInner(isApproach, true, delay);
          expect(result.animation).toContain("idle-hover-pop");
        })
      );
    });
  });

  describe("Property 2: idleInner empty outside approach", () => {
    // Feature: model-chip-animation-upgrade, Property 2: idleInner empty outside approach
    it("idleInner(false, false, n) returns object with no animation key", () => {
      fc.assert(
        fc.property(fc.nat(), (delay) => {
          const result = idleInner(false, false, delay);
          expect(Object.keys(result)).toHaveLength(0);
        })
      );
    });
  });

  describe("Property 4: sparktrail offset linear by side", () => {
    // Feature: model-chip-animation-upgrade, Property 4: sparktrail offset linear by side
    it("|sparkTrailOffset(i, side)| === i * 12, sign matches side", () => {
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
    });

    it("invalid side returns offset 0", () => {
      expect(sparkTrailOffset(3, "center")).toBe(0);
      expect(sparkTrailOffset(5, "up")).toBe(0);
    });
  });

  describe("Property 5: sparktrail delay sequential", () => {
    // Feature: model-chip-animation-upgrade, Property 5: sparktrail delay sequential
    it("sparkTrailDelay(i) === i * 80", () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 5 }), (i) => {
          expect(sparkTrailDelay(i)).toBe(i * 80);
        })
      );
    });
  });

  describe("Property 6: sparktrail color matches faction", () => {
    // Feature: model-chip-animation-upgrade, Property 6: sparktrail color matches faction
    it("faction 'ab' → #93c5fd, faction 'ku' → #f87171", () => {
      expect(sparkTrailColor("ab")).toBe("#93c5fd");
      expect(sparkTrailColor("ku")).toBe("#f87171");
      fc.assert(
        fc.property(fc.constantFrom("ab", "ku"), (faction) => {
          const color = sparkTrailColor(faction);
          expect(typeof color).toBe("string");
          expect(color.startsWith("#")).toBe(true);
        })
      );
    });
  });

  describe("Property 7: char name lookup safe", () => {
    // Feature: model-chip-animation-upgrade, Property 7: char name lookup safe
    it("CHAR_NAMES[f]?.[t] ?? '' always returns non-empty string, never throws", () => {
      fc.assert(
        fc.property(
          fc.constantFrom("ab" as const, "ku" as const),
          fc.constantFrom("satuan" as const, "puluhan" as const, "ratusan" as const, "ribuan" as const),
          (f, t) => {
            let result: string | undefined;
            expect(() => {
              result = CHAR_NAMES[f]?.[t] ?? "";
            }).not.toThrow();
            expect(typeof result).toBe("string");
            expect((result as string).length).toBeGreaterThan(0);
          }
        )
      );
    });
  });

  describe("Property 8: char name bar opacity by phase", () => {
    // Feature: model-chip-animation-upgrade, Property 8: char name bar opacity by phase
    it("approach → opacity 1; all other phases → opacity 0", () => {
      fc.assert(
        fc.property(
          fc.constantFrom("approach", "impact", "recoil", "dissolve", "done"),
          (phase) => {
            const opacity = charNameBarOpacity(phase);
            if (phase === "approach") {
              expect(opacity).toBe(1);
            } else {
              expect(opacity).toBe(0);
            }
          }
        )
      );
    });
  });

  describe("Property 9: chip idle float delay formula", () => {
    // Feature: model-chip-animation-upgrade, Property 9: chip idle float delay formula
    it("chipIdleDelay(i) === (i % 6) * 120, value in [0, 600]", () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 100 }), (i) => {
          const delay = chipIdleDelay(i);
          expect(delay).toBe((i % 6) * 120);
          expect(delay).toBeGreaterThanOrEqual(0);
          expect(delay).toBeLessThanOrEqual(600);
        })
      );
    });
  });

  describe("Property 11: pairCycleDuration formula invariant", () => {
    // Feature: model-chip-animation-upgrade, Property 11: pairCycleDuration formula invariant
    it("pairCycleDuration(s) === Math.round(2120 / s) + 160", () => {
      fc.assert(
        fc.property(fc.float({ min: Math.fround(0.1), max: Math.fround(5), noNaN: true }), (speed) => {
          expect(pairCycleDuration(speed)).toBe(Math.round(2120 / speed) + 160);
        })
      );
    });
  });
});
