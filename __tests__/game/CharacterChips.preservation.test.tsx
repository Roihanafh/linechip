/**
 * Preservation Property Tests — CharacterChips
 *
 * **Property 2: Preservation** — Non-Overflow and Non-Buggy Input Behavior
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4
 *
 * These tests encode BASELINE behavior observed on UNFIXED code.
 * They must PASS on unfixed code AND on fixed code.
 * They guard against regressions introduced by the bug fix.
 *
 * Strategy: only test inputs where `count <= maxPerTier` for every tier,
 * i.e. the bug condition is NOT triggered. In this safe zone the output
 * must be identical before and after the fix.
 */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as fc from "fast-check";
import { CharacterChips } from "../../components/game/CharacterSVGs";

// ─── Render helper ────────────────────────────────────────────────────────────

type Phase = "idle" | "charging" | "exploding" | "settled";

function renderChips(props: {
  value: number;
  type?: "ab" | "ku";
  maxPerTier?: number;
  phase?: Phase;
  dimmed?: boolean;
}): string {
  const {
    value,
    type = "ab",
    maxPerTier = 9,
    phase = "idle",
    dimmed = false,
  } = props;
  return renderToStaticMarkup(
    React.createElement(CharacterChips, { value, type, maxPerTier, phase, dimmed })
  );
}

// ─── DOM inspection helpers ───────────────────────────────────────────────────

/** True if the rendered HTML contains the overflow label span (font-mono class). */
function hasOverflowSpan(markup: string): boolean {
  return /font-mono/.test(markup);
}

/** Count the number of chip wrapper <div> elements (identified by shrink-0 class). */
function countChipDivs(markup: string): number {
  return (markup.match(/shrink-0/g) ?? []).length;
}

/** True if every chip wrapper div carries the dimmed classes. */
function allChipsDimmed(markup: string): boolean {
  // Each chip div gets both "opacity-30" and "grayscale" when dimmed=true.
  // Compare occurrence counts — they must both equal the chip count.
  const opacity30 = (markup.match(/opacity-30/g) ?? []).length;
  const grayscale = (markup.match(/\bgrayscale\b/g) ?? []).length;
  const chips = countChipDivs(markup);
  return chips > 0 && opacity30 === chips && grayscale === chips;
}

/** True if ALL chip wrapper divs carry the exploding classes (scale-0 opacity-0). */
function allChipsExploding(markup: string): boolean {
  const scale0 = (markup.match(/\bscale-0\b/g) ?? []).length;
  const opacity0 = (markup.match(/\bopacity-0\b/g) ?? []).length;
  const chips = countChipDivs(markup);
  return chips > 0 && scale0 === chips && opacity0 === chips;
}

/** True if ALL chip wrapper divs carry the charging animation class. */
function allChipsCharging(markup: string): boolean {
  const pulse = (markup.match(/animate-pulse/g) ?? []).length;
  const chips = countChipDivs(markup);
  return chips > 0 && pulse === chips;
}

// ─── Decomposition helper (mirrors CharacterChips internals) ──────────────────

/**
 * Returns the tier groups and their counts exactly as CharacterChips does.
 * Used to compute the expected chip count for a given (value, maxPerTier).
 */
function expectedChipCount(value: number, maxPerTier: number): number {
  let rem = Math.floor(Math.abs(value));
  let total = 0;
  for (const t of [1000, 100, 10, 1] as (1 | 10 | 100 | 1000)[]) {
    const c = Math.floor(rem / t);
    if (c > 0) total += Math.min(c, maxPerTier);
    rem %= t;
  }
  return total;
}

/**
 * Returns true if every tier count is <= maxPerTier (no overflow anywhere).
 * This is the condition under which the preservation property applies.
 */
function isNonOverflow(value: number, maxPerTier: number): boolean {
  let rem = Math.floor(Math.abs(value));
  for (const t of [1000, 100, 10, 1] as const) {
    const c = Math.floor(rem / t);
    if (c > maxPerTier) return false;
    rem %= t;
  }
  return true;
}

// ─── Observed concrete cases ──────────────────────────────────────────────────
// Observation-first: manually verify these on unfixed code before writing
// property tests.

describe("CharacterChips Preservation — observed concrete cases", () => {
  it("value=7, maxPerTier=9, phase=idle: no overflow span, 7 chips rendered", () => {
    const markup = renderChips({ value: 7, maxPerTier: 9, phase: "idle" });

    expect(hasOverflowSpan(markup)).toBe(false);
    expect(countChipDivs(markup)).toBe(7);
  });

  it("value=9, maxPerTier=9, phase=exploding: dissolve classes present, no overflow span", () => {
    const markup = renderChips({ value: 9, maxPerTier: 9, phase: "exploding" });

    expect(hasOverflowSpan(markup)).toBe(false);
    expect(allChipsExploding(markup)).toBe(true);
  });

  it("value=5, maxPerTier=9, phase=idle, dimmed=true: opacity-30 and grayscale on every chip", () => {
    const markup = renderChips({ value: 5, maxPerTier: 9, phase: "idle", dimmed: true });

    expect(allChipsDimmed(markup)).toBe(true);
  });

  it("value=123, maxPerTier=9, phase=idle: three tiers rendered, no overflow span", () => {
    // 123 = 1 ratusan + 2 puluhan + 3 satuan → 6 chips total
    const markup = renderChips({ value: 123, maxPerTier: 9, phase: "idle" });

    expect(hasOverflowSpan(markup)).toBe(false);
    expect(countChipDivs(markup)).toBe(1 + 2 + 3); // 6
  });

  it("value=1, maxPerTier=9, phase=charging: animate-pulse class on chip", () => {
    const markup = renderChips({ value: 1, maxPerTier: 9, phase: "charging" });

    expect(hasOverflowSpan(markup)).toBe(false);
    expect(allChipsCharging(markup)).toBe(true);
  });

  it("value=9, maxPerTier=9, phase=settled: no overflow span, 9 chips rendered", () => {
    const markup = renderChips({ value: 9, maxPerTier: 9, phase: "settled" });

    expect(hasOverflowSpan(markup)).toBe(false);
    expect(countChipDivs(markup)).toBe(9);
  });
});

// ─── Property 2a: No overflow span when count ≤ maxPerTier (any phase) ────────
//
// Validates: Requirements 3.1, 3.2
//
// For all (value, maxPerTier) where every tier's count <= maxPerTier, and for
// any phase value, CharacterChips must NOT render an overflow label span.

describe("CharacterChips Preservation — Property 2a: no overflow span when count ≤ maxPerTier", () => {
  /**
   * Validates: Requirements 3.1, 3.2
   *
   * Strategy: generate value in [1..35] (keeps tier counts small so they stay
   * under a wide range of maxPerTier), then pick maxPerTier >= max tier count
   * to guarantee no overflow. This keeps the generator simple and deterministic.
   */
  it("for all non-overflow (value, maxPerTier, phase): no overflow span in DOM", () => {
    const phaseArb = fc.constantFrom<Phase>(
      "idle",
      "charging",
      "exploding",
      "settled"
    );
    const typeArb = fc.constantFrom<"ab" | "ku">("ab", "ku");

    // Use value in [1..9] so single-tier satuan count = value,
    // and maxPerTier = 9 guarantees no overflow.
    const safeValueArb = fc.integer({ min: 1, max: 9 });

    fc.assert(
      fc.property(safeValueArb, phaseArb, typeArb, (value, phase, type) => {
        const markup = renderChips({ value, maxPerTier: 9, phase, type });
        return !hasOverflowSpan(markup);
      }),
      { numRuns: 100 }
    );
  });

  it("multi-tier values with maxPerTier=9: no overflow span across all tiers", () => {
    // Values in [1..9999] where each tier digit is <= 9 is always true for
    // standard decimal decomposition. maxPerTier=9 covers all normal values.
    const phaseArb = fc.constantFrom<Phase>(
      "idle",
      "charging",
      "exploding",
      "settled"
    );
    const valueArb = fc.integer({ min: 1, max: 9999 });

    fc.assert(
      fc.property(valueArb, phaseArb, (value, phase) => {
        const markup = renderChips({ value, maxPerTier: 9, phase });
        // For maxPerTier=9, standard decomposition never exceeds 9 per tier
        // (each tier count is 1-9 by construction of decimal decomposition)
        return !hasOverflowSpan(markup);
      }),
      { numRuns: 200 }
    );
  });

  it("explicit non-overflow with small maxPerTier: only chips with count<=maxPerTier are rendered", () => {
    // value in [1..3], maxPerTier in [3..9] → always count <= maxPerTier for satuan tier
    const phaseArb = fc.constantFrom<Phase>("idle", "charging", "exploding", "settled");

    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3 }),
        fc.integer({ min: 3, max: 9 }),
        phaseArb,
        (value, maxPerTier, phase) => {
          const markup = renderChips({ value, maxPerTier, phase });
          return !hasOverflowSpan(markup);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 2b: Dimmed chips carry opacity-30 grayscale (any phase/value) ──
//
// Validates: Requirement 3.4
//
// For dimmed=true, every rendered chip wrapper must have opacity-30 and grayscale
// classes regardless of phase or value.

describe("CharacterChips Preservation — Property 2b: dimmed=true applies grayscale/opacity to all chips", () => {
  /**
   * Validates: Requirements 3.4
   *
   * Strategy: generate value in [1..9] (single-tier, simple chip count),
   * any phase, any type — all chips must carry dimmed styling.
   */
  it("for all (value, phase): dimmed=true applies opacity-30 and grayscale to every chip", () => {
    const phaseArb = fc.constantFrom<Phase>(
      "idle",
      "charging",
      "exploding",
      "settled"
    );
    const valueArb = fc.integer({ min: 1, max: 9 });

    fc.assert(
      fc.property(valueArb, phaseArb, (value, phase) => {
        const markup = renderChips({
          value,
          maxPerTier: 9,
          phase,
          dimmed: true,
        });
        return allChipsDimmed(markup);
      }),
      { numRuns: 100 }
    );
  });

  it("dimmed=true on multi-tier value: all chips across all tiers carry dimmed classes", () => {
    // 123 → 6 chips across 3 tiers
    const markup = renderChips({ value: 123, maxPerTier: 9, phase: "idle", dimmed: true });
    expect(allChipsDimmed(markup)).toBe(true);
    expect(countChipDivs(markup)).toBe(6);
  });

  it("dimmed=false: no opacity-30 / grayscale on chips", () => {
    const markup = renderChips({ value: 5, maxPerTier: 9, phase: "idle", dimmed: false });
    expect(markup).not.toContain("opacity-30");
    expect(markup).not.toMatch(/\bgrayscale\b/);
  });
});

// ─── Property 2c: Exploding phase still applies dissolve classes (no overflow) ─
//
// Validates: Requirement 3.3
//
// When phase="exploding" and count <= maxPerTier (no overflow), chips must carry
// scale-0 and opacity-0 dissolve animation classes.

describe("CharacterChips Preservation — Property 2c: exploding phase applies dissolve classes", () => {
  /**
   * Validates: Requirements 3.3
   */
  it("for all non-overflow values, phase=exploding: every chip carries scale-0 and opacity-0", () => {
    const valueArb = fc.integer({ min: 1, max: 9 });

    fc.assert(
      fc.property(valueArb, (value) => {
        const markup = renderChips({ value, maxPerTier: 9, phase: "exploding" });
        return allChipsExploding(markup) && !hasOverflowSpan(markup);
      }),
      { numRuns: 100 }
    );
  });

  it("phase=charging: animate-pulse present on all chips", () => {
    const valueArb = fc.integer({ min: 1, max: 9 });

    fc.assert(
      fc.property(valueArb, (value) => {
        const markup = renderChips({ value, maxPerTier: 9, phase: "charging" });
        return allChipsCharging(markup) && !hasOverflowSpan(markup);
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Property 2d: Chip count matches expected decomposition ──────────────────
//
// Validates: Requirements 3.1, 3.2
//
// For non-overflow inputs, the number of rendered chip divs must equal the sum
// of min(tierCount, maxPerTier) across all tiers.

describe("CharacterChips Preservation — Property 2d: chip count matches decomposition", () => {
  /**
   * Validates: Requirements 3.1, 3.2
   */
  it("for all non-overflow (value, maxPerTier): chip div count equals expected", () => {
    // Only test where value produces no overflow (every tier count <= maxPerTier).
    // Standard decimal decomposition always has tier counts 1-9, so maxPerTier=9 is safe.
    const valueArb = fc.integer({ min: 1, max: 9999 });
    const phaseArb = fc.constantFrom<Phase>(
      "idle",
      "charging",
      "exploding",
      "settled"
    );

    fc.assert(
      fc.property(valueArb, phaseArb, (value, phase) => {
        const maxPerTier = 9; // guaranteed non-overflow for standard decimal
        const markup = renderChips({ value, maxPerTier, phase });
        const expected = expectedChipCount(value, maxPerTier);
        const actual = countChipDivs(markup);
        return actual === expected;
      }),
      { numRuns: 200 }
    );
  });

  it("value=1234 with maxPerTier=9: 1+2+3+4 = 10 chips rendered", () => {
    const markup = renderChips({ value: 1234, maxPerTier: 9, phase: "idle" });
    expect(countChipDivs(markup)).toBe(10);
    expect(hasOverflowSpan(markup)).toBe(false);
  });
});
