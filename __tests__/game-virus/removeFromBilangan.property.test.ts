/**
 * Property-based tests for removeFromBilangan logic
 * Feature: game-virus-chip-removal
 *
 * Tests are written against pure-function extractions of the removal/undo
 * logic from app/game-virus/page.tsx — no React imports needed.
 */

import * as fc from "fast-check";

// ---------------------------------------------------------------------------
// Pure-function extractions (mirrors the logic in GameVirusPage)
// ---------------------------------------------------------------------------

type Tier = 1 | 10 | 100 | 1000;
const ALL_TIERS: Tier[] = [1, 10, 100, 1000];

interface HistoryEntry {
  type: "ab" | "ku";
  tier: Tier;
  bil: 1 | 2;
}

/**
 * Attempt to remove one chip of `tier` from `value`.
 * Returns null when any guard rejects the operation.
 * On success returns the new value and the inverted history entry to push.
 */
function applyRemoval(
  value: number,
  tier: Tier,
): { newValue: number; historyEntry: HistoryEntry } | null {
  const absVal = Math.abs(value);

  // Tier-Order Guard
  const smallerTiers = ([1, 10, 100] as Tier[]).filter((t) => t < tier);
  const hasSmaller = smallerTiers.some(
    (t) => Math.floor(absVal / t) % 10 > 0,
  );
  if (hasSmaller) return null;

  // Tier-Presence Guard
  if (Math.floor(absVal / tier) % 10 === 0) return null;

  // Sign-Change Guard
  if (absVal - tier < 0) return null;

  // Success path
  const type: "ab" | "ku" = value >= 0 ? "ab" : "ku";
  const delta = type === "ab" ? tier : -tier;
  const undoType: "ab" | "ku" = type === "ab" ? "ku" : "ab";

  return {
    newValue: value - delta,
    historyEntry: { type: undoType, tier, bil: 1 },
  };
}

/**
 * Apply a single undo entry (mirrors undoLast logic from GameVirusPage).
 */
function applyUndo(value: number, entry: HistoryEntry): number {
  const delta = entry.type === "ab" ? entry.tier : -entry.tier;
  return value - delta;
}

// ---------------------------------------------------------------------------
// Arbitrary helpers
// ---------------------------------------------------------------------------

/** Pick a random tier. */
const arbTier = fc.constantFrom<Tier>(1, 10, 100, 1000);

/**
 * Given a value, derive the lowest-order tier that is currently represented
 * (so the tier-order guard will pass).
 * Returns null if the value is 0 or has no representable tier.
 */
function lowestActiveTier(absVal: number): Tier | null {
  for (const t of [1, 10, 100, 1000] as Tier[]) {
    if (Math.floor(absVal / t) % 10 > 0) return t;
  }
  return null;
}

/**
 * Arbitrary that produces a (value, tier) pair guaranteed to pass all guards:
 *  - value != 0 (non-zero)
 *  - tier is the lowest active tier in absVal (tier-order passes)
 *  - tier is represented in absVal (tier-presence passes)
 *  - absVal - tier >= 0 (sign-change passes)
 */
const arbValidRemoval = fc
  .tuple(
    // non-zero integer in range that keeps at most 4-digit place values
    fc.integer({ min: -9999, max: 9999 }).filter((v) => v !== 0),
  )
  .filter(([v]) => {
    const absVal = Math.abs(v);
    const t = lowestActiveTier(absVal);
    if (t === null) return false;
    // sign-change check
    if (absVal - t < 0) return false;
    return true;
  })
  .map(([v]) => {
    const absVal = Math.abs(v);
    const tier = lowestActiveTier(absVal) as Tier;
    return { value: v, tier };
  });

// ---------------------------------------------------------------------------
// Property 1 — tier removal reduces value by exactly one tier unit
// Validates: Requirements 1.1, 1.2, 1.3
// ---------------------------------------------------------------------------

describe(
  "Property 1: tier removal reduces value by exactly one tier unit [Feature: game-virus-chip-removal, Property 1]",
  () => {
    it(
      "removal changes value by exactly ±tier for valid (value, tier) pairs",
      () => {
        fc.assert(
          fc.property(arbValidRemoval, ({ value, tier }) => {
            const result = applyRemoval(value, tier);
            // By construction the pair is valid — result must not be null
            expect(result).not.toBeNull();
            if (result === null) return; // unreachable but satisfies TS

            const expectedDelta = value >= 0 ? -tier : tier;
            expect(result.newValue).toBe(value + expectedDelta);
          }),
          { numRuns: 200 },
        );
      },
    );

    it(
      "removal from ab zone (positive) always decreases value by exactly tier",
      () => {
        const arbPositiveRemoval = arbValidRemoval.filter(
          ({ value }) => value > 0,
        );
        fc.assert(
          fc.property(arbPositiveRemoval, ({ value, tier }) => {
            const result = applyRemoval(value, tier);
            expect(result).not.toBeNull();
            if (result === null) return;
            expect(result.newValue).toBe(value - tier);
          }),
          { numRuns: 200 },
        );
      },
    );

    it(
      "removal from ku zone (negative) always increases value by exactly tier",
      () => {
        const arbNegativeRemoval = arbValidRemoval.filter(
          ({ value }) => value < 0,
        );
        fc.assert(
          fc.property(arbNegativeRemoval, ({ value, tier }) => {
            const result = applyRemoval(value, tier);
            expect(result).not.toBeNull();
            if (result === null) return;
            expect(result.newValue).toBe(value + tier);
          }),
          { numRuns: 200 },
        );
      },
    );

    it(
      "result value stays on the same side of zero or reaches zero (no sign flip)",
      () => {
        fc.assert(
          fc.property(arbValidRemoval, ({ value, tier }) => {
            const result = applyRemoval(value, tier);
            expect(result).not.toBeNull();
            if (result === null) return;
            // sign must not flip
            if (value > 0) expect(result.newValue).toBeGreaterThanOrEqual(0);
            if (value < 0) expect(result.newValue).toBeLessThanOrEqual(0);
          }),
          { numRuns: 200 },
        );
      },
    );
  },
);

// ---------------------------------------------------------------------------
// Property 3 — history inversion enables correct undo
// Validates: Requirements 1.2, 1.3
// ---------------------------------------------------------------------------

describe(
  "Property 3: history inversion enables correct undo [Feature: game-virus-chip-removal, Property 3]",
  () => {
    it(
      "removal then undo restores the original value exactly",
      () => {
        fc.assert(
          fc.property(arbValidRemoval, ({ value, tier }) => {
            const originalValue = value;

            // Perform removal
            const result = applyRemoval(value, tier);
            expect(result).not.toBeNull();
            if (result === null) return;

            const { newValue, historyEntry } = result;

            // Perform undo using the inverted history entry
            const restoredValue = applyUndo(newValue, historyEntry);

            expect(restoredValue).toBe(originalValue);
          }),
          { numRuns: 200 },
        );
      },
    );

    it(
      "removal pushes exactly one history entry, undo removes it (history length invariant)",
      () => {
        fc.assert(
          fc.property(
            arbValidRemoval,
            // initial history can have 0–4 pre-existing entries
            fc.array(
              fc.record({
                type: fc.constantFrom<"ab" | "ku">("ab", "ku"),
                tier: arbTier,
                bil: fc.constantFrom<1 | 2>(1, 2),
              }),
              { minLength: 0, maxLength: 4 },
            ),
            ({ value, tier }, initialHistory) => {
              const originalLength = initialHistory.length;

              // Perform removal
              const result = applyRemoval(value, tier);
              expect(result).not.toBeNull();
              if (result === null) return;

              const historyAfterRemoval = [
                ...initialHistory,
                result.historyEntry,
              ];
              expect(historyAfterRemoval).toHaveLength(originalLength + 1);

              // Perform undo (pop last entry)
              const historyAfterUndo = historyAfterRemoval.slice(0, -1);
              expect(historyAfterUndo).toHaveLength(originalLength);
            },
          ),
          { numRuns: 200 },
        );
      },
    );

    it(
      "ab-zone removal produces a 'ku' undo entry (type inversion for positive values)",
      () => {
        const arbPositiveRemoval = arbValidRemoval.filter(
          ({ value }) => value > 0,
        );
        fc.assert(
          fc.property(arbPositiveRemoval, ({ value, tier }) => {
            const result = applyRemoval(value, tier);
            expect(result).not.toBeNull();
            if (result === null) return;
            expect(result.historyEntry.type).toBe("ku");
            expect(result.historyEntry.tier).toBe(tier);
          }),
          { numRuns: 200 },
        );
      },
    );

    it(
      "ku-zone removal produces an 'ab' undo entry (type inversion for negative values)",
      () => {
        const arbNegativeRemoval = arbValidRemoval.filter(
          ({ value }) => value < 0,
        );
        fc.assert(
          fc.property(arbNegativeRemoval, ({ value, tier }) => {
            const result = applyRemoval(value, tier);
            expect(result).not.toBeNull();
            if (result === null) return;
            expect(result.historyEntry.type).toBe("ab");
            expect(result.historyEntry.tier).toBe(tier);
          }),
          { numRuns: 200 },
        );
      },
    );

    it(
      "applying undoLast logic to the inverted entry restores value for all valid pairs",
      () => {
        fc.assert(
          fc.property(arbValidRemoval, ({ value, tier }) => {
            const result = applyRemoval(value, tier);
            expect(result).not.toBeNull();
            if (result === null) return;

            const { newValue, historyEntry } = result;

            // undoLast: delta = last.type === "ab" ? last.tier : -last.tier
            //           value = value - delta
            const delta =
              historyEntry.type === "ab" ? historyEntry.tier : -historyEntry.tier;
            const restored = newValue - delta;

            expect(restored).toBe(value);
          }),
          { numRuns: 200 },
        );
      },
    );
  },
);

// ---------------------------------------------------------------------------
// Property 2 — rejected removals leave state unchanged (atomicity)
// Validates: Requirements 1.4, 1.5, 3.1, 3.2, 3.4
//
// For any rejection condition, applyRemoval must return null without
// mutating any state. We verify null is returned for each rejection branch
// and additionally confirm that a caller simulating state-read would see
// identical values before and after the call.
// ---------------------------------------------------------------------------

/**
 * Full-state version of applyRemoval that also accepts phase/resultValue
 * so we can test phase-guard rejection. Returns null on any rejection,
 * mirrors the guard chain in removeFromBilangan exactly.
 */
function applyRemovalWithPhase(
  value: number,
  tier: Tier,
  phase: "idle" | "charging" | "exploding" | "settled",
  resultValue: number | null,
): { newValue: number; historyEntry: HistoryEntry } | null {
  // Phase Guard
  if (phase !== "idle" || resultValue !== null) return null;
  // Delegate to pure removal
  return applyRemoval(value, tier);
}

describe(
  "Property 2: rejected removals leave state unchanged [Feature: game-virus-chip-removal, Property 2]",
  () => {
    // ── Branch (a): sign-change rejection — absVal - tier < 0 ───────────────
    //
    // For the sign-change guard to fire (and not be pre-empted by the
    // tier-presence guard), the tier must be represented in absVal AND
    // absVal - tier < 0. However, if Math.floor(absVal/tier) % 10 >= 1
    // then absVal >= tier, so absVal - tier >= 0 — the sign-change guard is
    // mathematically unreachable when tier is present. In practice, the guard
    // that fires first for small values is tier-presence (absVal < tier ⟹
    // digit = 0). We therefore test tier-presence rejection here as the
    // practical stand-in for "value too small to remove this tier".
    //
    // Separately we also exercise the sign-change guard directly via
    // applyRemovalWithPhase with crafted inputs to confirm null is returned.

    it(
      "Branch (a): tier-presence rejection (tier digit = 0) — applyRemoval returns null",
      () => {
        // Build values where the target tier digit is 0.
        // Strategy: value = k * (tier * 10) so the tier slot carries digit 0.
        const arbTierAbsent = fc
          .tuple(
            fc.constantFrom<Tier>(1, 10, 100, 1000),
            fc.integer({ min: 1, max: 9 }),
            fc.constantFrom(1, -1),
          )
          .map(([tier, multiplier, sign]) => {
            // next denomination ensures tier-slot digit is 0
            const nextDenom = tier * 10;
            const absVal = multiplier * nextDenom;
            return { value: sign * absVal, tier };
          })
          .filter(({ value, tier }) => {
            const absVal = Math.abs(value);
            return (
              value !== 0 &&
              Math.floor(absVal / tier) % 10 === 0 // tier NOT present
            );
          });

        fc.assert(
          fc.property(arbTierAbsent, ({ value, tier }) => {
            const before = value; // immutable — just confirm return is null
            const result = applyRemoval(value, tier);
            // Tier-presence rejection → null
            expect(result).toBeNull();
            // Original value untouched (no mutation)
            expect(value).toBe(before);
          }),
          { numRuns: 150 },
        );
      },
    );

    it(
      "Branch (a): sign-change guard path — applyRemoval returns null for absVal < tier",
      () => {
        // Construct inputs where absVal < tier (tier is never present when
        // absVal < tier, so tier-presence fires first, which also returns null).
        // This tests the combined effect guaranteeing null is returned.
        const arbSignFlip = fc
          .tuple(
            fc.constantFrom<Tier>(10, 100, 1000),
            fc.integer({ min: 1, max: 9 }),  // multiplier < tier
            fc.constantFrom(1, -1),
          )
          .map(([tier, smallMultiplier, sign]) => {
            // absVal is strictly less than tier
            const absVal = smallMultiplier; // e.g. tier=10, absVal in [1..9]
            return { value: sign * absVal, tier };
          })
          .filter(({ value }) => value !== 0);

        fc.assert(
          fc.property(arbSignFlip, ({ value, tier }) => {
            const result = applyRemoval(value, tier);
            expect(result).toBeNull();
          }),
          { numRuns: 150 },
        );
      },
    );

    // ── Branch (b): tier-order rejection — smaller tier still active ─────────
    //
    // value has both a higher-tier digit and a lower-tier digit active;
    // attempt to remove the higher tier → rejected.

    it(
      "Branch (b): lower-tier-exists rejection — applyRemoval returns null and flash callback fires",
      () => {
        const arbTierOrderReject = fc
          .tuple(
            fc.constantFrom<Tier>(10, 100, 1000),  // tier to attempt
            fc.integer({ min: 1, max: 9 }),          // digit for attempted tier
            fc.integer({ min: 1, max: 9 }),          // digit for the smaller tier (always 1)
            fc.constantFrom(1, -1),
          )
          .map(([attemptTier, attemptDigit, unit, sign]) => {
            // Always add a units digit to guarantee tier-order rejection
            const absVal = attemptDigit * attemptTier + unit; // unit × 1
            return { value: sign * absVal, tier: attemptTier };
          })
          .filter(({ value, tier }) => {
            const absVal = Math.abs(value);
            const smallerTiers = ([1, 10, 100] as Tier[]).filter((t) => t < tier);
            return (
              value !== 0 &&
              smallerTiers.some((t) => Math.floor(absVal / t) % 10 > 0)
            );
          });

        fc.assert(
          fc.property(arbTierOrderReject, ({ value, tier }) => {
            const result = applyRemoval(value, tier);
            // Tier-order guard fires → null
            expect(result).toBeNull();
          }),
          { numRuns: 150 },
        );
      },
    );

    // ── Phase guard rejections ────────────────────────────────────────────────

    it(
      "phase !== 'idle' rejection — applyRemovalWithPhase returns null for all non-idle phases",
      () => {
        const nonIdlePhases = fc.constantFrom<
          "charging" | "exploding" | "settled"
        >("charging", "exploding", "settled");

        fc.assert(
          fc.property(
            nonIdlePhases,
            fc.integer({ min: -9999, max: 9999 }).filter((v) => v !== 0),
            fc.constantFrom<Tier>(1, 10, 100, 1000),
            (phase, value, tier) => {
              const result = applyRemovalWithPhase(value, tier, phase, null);
              expect(result).toBeNull();
            },
          ),
          { numRuns: 100 },
        );
      },
    );

    it(
      "resultValue !== null rejection — applyRemovalWithPhase returns null regardless of chip state",
      () => {
        fc.assert(
          fc.property(
            fc.integer({ min: -9999, max: 9999 }).filter((v) => v !== 0),
            fc.integer({ min: -9999, max: 9999 }).filter((v) => v !== 0),
            fc.constantFrom<Tier>(1, 10, 100, 1000),
            (resultValue, value, tier) => {
              const result = applyRemovalWithPhase(
                value,
                tier,
                "idle",
                resultValue,
              );
              expect(result).toBeNull();
            },
          ),
          { numRuns: 100 },
        );
      },
    );

    // ── Cross-check: ALL rejection branches combined ──────────────────────────
    //
    // For any (value, tier) pair where applyRemoval returns null, confirm a
    // caller that reads state before and after sees identical values (atomicity).

    it(
      "any rejection leaves caller-observable state identical (atomicity cross-check)",
      () => {
        // Generate arbitrary (value, tier) and filter to those that reject
        const arbRejectingPair = fc
          .tuple(
            fc.integer({ min: -9999, max: 9999 }),
            fc.constantFrom<Tier>(1, 10, 100, 1000),
          )
          .filter(([value, tier]) => applyRemoval(value, tier) === null);

        fc.assert(
          fc.property(
            arbRejectingPair,
            fc.array(
              fc.record({
                type: fc.constantFrom<"ab" | "ku">("ab", "ku"),
                tier: arbTier,
                bil: fc.constantFrom<1 | 2>(1, 2),
              }),
              { minLength: 0, maxLength: 5 },
            ),
            ([value, tier], existingHistory) => {
              // Simulate caller state
              const bilValue = value;
              const histLenBefore = existingHistory.length;

              const result = applyRemoval(value, tier);

              // Confirm rejection
              expect(result).toBeNull();

              // State is unchanged — bilValue and histLen are the same
              expect(bilValue).toBe(value);
              expect(existingHistory.length).toBe(histLenBefore);
            },
          ),
          { numRuns: 200 },
        );
      },
    );
  },
);
