/**
 * Property-based tests for computeTimedScore (lib/game/timedScore.ts)
 *
 * Feature: game-timed-scoring
 *
 * Properties covered:
 *   Property 1:  Monotone non-increasing — Validates: Requirements 1.3, 1.7
 *   Property 2:  Output always integer in [MIN_POINTS, MAX_POINTS] — Validates: Requirements 1.1, 1.5, 1.6
 *   Property 3:  Plateau minimum at t >= 90 — Validates: Requirements 1.4
 *   Property 11: Grace period at t in [0, 5] — Validates: Requirements 1.2
 */

import * as fc from "fast-check";
import {
  computeTimedScore,
  MIN_POINTS,
  MAX_POINTS,
  BONUS_WINDOW,
  GRACE_PERIOD,
} from "@/lib/game/timedScore";

// ─── Property 1: Monotone non-increasing ─────────────────────────────────────
// Feature: game-timed-scoring, Property 1: For any t1 < t2 >= 0, computeTimedScore(t1) >= computeTimedScore(t2)
// Validates: Requirements 1.3, 1.7

describe("Property 1: computeTimedScore is monotone non-increasing", () => {
  it("score(t1) >= score(t2) for all t1 < t2 in [0, 999]", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 998 }),
        fc.integer({ min: 1, max: 999 }),
        (a, b) => {
          // Ensure t1 < t2
          const t1 = Math.min(a, b - 1);
          const t2 = Math.max(a + 1, b);
          return computeTimedScore(t1) >= computeTimedScore(t2);
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ─── Property 2: Output always integer in [MIN_POINTS, MAX_POINTS] ───────────
// Feature: game-timed-scoring, Property 2: For any t >= 0, computeTimedScore returns integer in [5, 50]
// Validates: Requirements 1.1, 1.5, 1.6

describe("Property 2: computeTimedScore always returns integer in [MIN_POINTS, MAX_POINTS]", () => {
  it("result is integer, >= 5, and <= 50 for t in [0, 999]", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 999 }), (t) => {
        const score = computeTimedScore(t);
        return (
          Number.isInteger(score) &&
          score >= MIN_POINTS &&
          score <= MAX_POINTS
        );
      }),
      { numRuns: 200 }
    );
  });
});

// ─── Property 3: Plateau minimum at t >= BONUS_WINDOW ────────────────────────
// Feature: game-timed-scoring, Property 3: For any t >= 90, computeTimedScore(t) === 5
// Validates: Requirements 1.4

describe("Property 3: computeTimedScore returns MIN_POINTS for t >= 90", () => {
  it("score(t) === 5 for all t in [90, 999]", () => {
    fc.assert(
      fc.property(fc.integer({ min: BONUS_WINDOW, max: 999 }), (t) => {
        return computeTimedScore(t) === MIN_POINTS;
      }),
      { numRuns: 200 }
    );
  });
});

// ─── Property 11: Grace period ───────────────────────────────────────────────
// Feature: game-timed-scoring, Property 11: For any t in [0, 5], computeTimedScore(t) === 50
// Validates: Requirements 1.2

describe("Property 11: computeTimedScore returns MAX_POINTS during grace period", () => {
  it("score(t) === 50 for all t in [0, 5]", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: GRACE_PERIOD }), (t) => {
        return computeTimedScore(t) === MAX_POINTS;
      }),
      { numRuns: 200 }
    );
  });
});

// ─── Example tests ───────────────────────────────────────────────────────────

describe("computeTimedScore — example tests from requirements table", () => {
  it("score(0) === 50 (grace period start)", () => {
    expect(computeTimedScore(0)).toBe(50);
  });

  it("score(5) === 50 (grace period end)", () => {
    expect(computeTimedScore(5)).toBe(50);
  });

  it("score(10) === 47 (interpolation)", () => {
    expect(computeTimedScore(10)).toBe(47);
  });

  it("score(89) === 6 (last interpolation point)", () => {
    expect(computeTimedScore(89)).toBe(6);
  });

  it("score(90) === 5 (plateau start)", () => {
    expect(computeTimedScore(90)).toBe(5);
  });
});
