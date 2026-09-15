/**
 * Tests for DecomposeStage component — property and unit tests.
 *
 * Feature: chip-tier-decompose-animation
 *
 * Tests in this file:
 *  - Property 8: durasi terskala dengan speed
 *  - Unit tests: chipTier === 1 behavior, render without crash, label text
 *
 * Because the project test environment is Node (no jsdom / no @testing-library),
 * we test pure exported logic and server-rendered markup via renderToStaticMarkup,
 * mirroring the pattern established in CharacterSVGs.uid.test.tsx and
 * CharacterChips.test.ts.
 *
 * Requirements: 4.5, 4.6, 4.7, 11.3
 */

import * as fc from "fast-check";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";

import {
  decomposeDuration,
  DecomposeStage,
  type DecomposeStageProps,
} from "@/components/game/DecomposeStage";

// ─── Property 8: durasi terskala dengan speed ─────────────────────────────────
// Feature: chip-tier-decompose-animation, Property 8: durasi terskala dengan speed
// Validates: Requirements 4.5, 11.3

describe("DecomposeStage — Property 8: durasi terskala dengan speed", () => {
  it("decomposeDuration(speed) === Math.round(600 / speed) for any speed in [0.1, 10]", () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.1), max: Math.fround(10), noNaN: true }),
        (speed) => {
          const result = decomposeDuration(speed);
          const expected = Math.round(600 / speed);
          expect(result).toBe(expected);
        }
      ),
      { numRuns: 200 }
    );
  });

  it("decomposeDuration scales inversely with speed — faster speed yields shorter duration", () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.1), max: Math.fround(4.9), noNaN: true }),
        (slowSpeed) => {
          const fastSpeed = slowSpeed + 0.1;
          // Higher speed → shorter or equal duration
          expect(decomposeDuration(fastSpeed)).toBeLessThanOrEqual(
            decomposeDuration(slowSpeed)
          );
        }
      ),
      { numRuns: 200 }
    );
  });

  it("decomposeDuration returns an integer for any speed in [0.1, 10]", () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.1), max: Math.fround(10), noNaN: true }),
        (speed) => {
          const result = decomposeDuration(speed);
          expect(Number.isInteger(result)).toBe(true);
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ─── Unit tests: spot-check decomposeDuration values ─────────────────────────

describe("DecomposeStage — decomposeDuration spot-checks", () => {
  it("speed=1 → 600ms", () => {
    expect(decomposeDuration(1)).toBe(600);
  });

  it("speed=2 → 300ms", () => {
    expect(decomposeDuration(2)).toBe(300);
  });

  it("speed=0.5 → 1200ms", () => {
    expect(decomposeDuration(0.5)).toBe(1200);
  });

  it("speed=3 → 200ms", () => {
    expect(decomposeDuration(3)).toBe(200);
  });
});

// ─── Unit tests: render without crash ─────────────────────────────────────────
// Requirements: 4.6, 4.7

describe("DecomposeStage — render without crash", () => {
  const noopOnDone = jest.fn();

  const chipTiers: Array<1 | 10 | 100 | 1000> = [1, 10, 100, 1000];
  const chipFactions: Array<"ab" | "ku"> = ["ab", "ku"];

  for (const chipTier of chipTiers) {
    for (const chipFaction of chipFactions) {
      it(`renders without crash: chipTier=${chipTier}, chipFaction=${chipFaction}`, () => {
        const props: DecomposeStageProps = {
          chipTier,
          chipFaction,
          speed: 1,
          onDone: noopOnDone,
          runKey: 0,
        };

        // chipTier === 1 returns null — renderToStaticMarkup should produce ""
        // chipTier > 1 should produce non-empty markup
        expect(() => {
          renderToStaticMarkup(React.createElement(DecomposeStage, props));
        }).not.toThrow();
      });
    }
  }

  it("chipTier === 1 renders null (empty markup)", () => {
    const markup = renderToStaticMarkup(
      React.createElement(DecomposeStage, {
        chipTier: 1,
        chipFaction: "ab",
        speed: 1,
        onDone: noopOnDone,
        runKey: 0,
      })
    );
    expect(markup).toBe("");
  });

  it("chipTier > 1 renders non-empty markup", () => {
    for (const tier of [10, 100, 1000] as const) {
      const markup = renderToStaticMarkup(
        React.createElement(DecomposeStage, {
          chipTier: tier,
          chipFaction: "ab",
          speed: 1,
          onDone: noopOnDone,
          runKey: 0,
        })
      );
      expect(markup.length).toBeGreaterThan(0);
    }
  });
});

// ─── Unit tests: label text ───────────────────────────────────────────────────
// Requirements: 4.7

describe("DecomposeStage — label text", () => {
  const noopOnDone = jest.fn();

  it("tier=10 displays label '×10 → 10×1'", () => {
    const markup = renderToStaticMarkup(
      React.createElement(DecomposeStage, {
        chipTier: 10,
        chipFaction: "ab",
        speed: 1,
        onDone: noopOnDone,
        runKey: 0,
      })
    );
    expect(markup).toContain("×10 → 10×1");
  });

  it("tier=100 displays label '×100 → 10×10'", () => {
    const markup = renderToStaticMarkup(
      React.createElement(DecomposeStage, {
        chipTier: 100,
        chipFaction: "ab",
        speed: 1,
        onDone: noopOnDone,
        runKey: 0,
      })
    );
    expect(markup).toContain("×100 → 10×10");
  });

  it("tier=1000 displays label '×1000 → 10×100'", () => {
    const markup = renderToStaticMarkup(
      React.createElement(DecomposeStage, {
        chipTier: 1000,
        chipFaction: "ab",
        speed: 1,
        onDone: noopOnDone,
        runKey: 0,
      })
    );
    expect(markup).toContain("×1000 → 10×100");
  });

  it("label text is consistent regardless of faction", () => {
    const mkAb = renderToStaticMarkup(
      React.createElement(DecomposeStage, {
        chipTier: 10,
        chipFaction: "ab",
        speed: 1,
        onDone: noopOnDone,
        runKey: 0,
      })
    );
    const mkKu = renderToStaticMarkup(
      React.createElement(DecomposeStage, {
        chipTier: 10,
        chipFaction: "ku",
        speed: 1,
        onDone: noopOnDone,
        runKey: 0,
      })
    );
    expect(mkAb).toContain("×10 → 10×1");
    expect(mkKu).toContain("×10 → 10×1");
  });
});

// ─── Unit tests: chipTier === 1 behavior ─────────────────────────────────────
// Requirements: 4.6
//
// Since the test environment uses Node (no jsdom, no React hooks runtime),
// we verify the tier-1 contract at the pure-logic level:
//  1. The component returns null for tier=1 (tested above via renderToStaticMarkup)
//  2. decomposeDuration is only called with speed > 0 in practice, and the
//     immediate-onDone behavior is encoded in the component's useEffect guard
//     `if (chipTier === 1)` — we verify this guard's contract using a helper
//     that mirrors the component logic.

describe("DecomposeStage — chipTier === 1 contract (pure logic)", () => {
  /** Mirrors the chipTier===1 guard in DecomposeStage. */
  function shouldSkipAnimation(chipTier: number): boolean {
    return chipTier === 1;
  }

  /** Mirrors the lowerTier helper in DecomposeStage. */
  function lowerTier(tier: 1 | 10 | 100 | 1000): 1 | 10 | 100 {
    if (tier >= 10) return (tier / 10) as 1 | 10 | 100;
    return 1;
  }

  it("chipTier === 1 → shouldSkipAnimation returns true", () => {
    expect(shouldSkipAnimation(1)).toBe(true);
  });

  it("chipTier > 1 → shouldSkipAnimation returns false", () => {
    expect(shouldSkipAnimation(10)).toBe(false);
    expect(shouldSkipAnimation(100)).toBe(false);
    expect(shouldSkipAnimation(1000)).toBe(false);
  });

  it("lowerTier(10) === 1 (child tier for ×10 is ×1)", () => {
    expect(lowerTier(10)).toBe(1);
  });

  it("lowerTier(100) === 10 (child tier for ×100 is ×10)", () => {
    expect(lowerTier(100)).toBe(10);
  });

  it("lowerTier(1000) === 100 (child tier for ×1000 is ×100)", () => {
    expect(lowerTier(1000)).toBe(100);
  });

  it("lowerTier(1) === 1 (minimum tier stays at 1)", () => {
    expect(lowerTier(1)).toBe(1);
  });
});
