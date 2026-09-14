/**
 * Property-based tests for Mode_Klik logic in app/model-chip/page.tsx.
 *
 * Tests pure state-machine logic extracted from the page — no React rendering,
 * no jsdom. Mirrors the established pattern in:
 *   - __tests__/game/InteractionAnimation.property.test.ts
 *   - __tests__/model-chip/AnimationMode_Selector.test.tsx
 *
 * **Property 6: onDone di Mode_Klik mengaktifkan Tombol_Lanjut**
 * **Validates: Requirements 3.3**
 *
 * **Property 7: runPair di Mode_Klik menonaktifkan Tombol_Lanjut saat dimulai**
 * **Validates: Requirements 3.2, 3.4**
 */

import * as fc from "fast-check";

// ── Types (mirrored from page.tsx) ────────────────────────────────────────────

type AnimMode = "auto" | "click";
type Tier = 1 | 10 | 100 | 1000;

interface TierGroup {
  tier: Tier;
  count: number;
}

/**
 * Pending-next context stored in pendingNextRef when Mode_Klik waits for the
 * user to press "Lanjut ▶".
 */
interface PendingNext {
  groups: TierGroup[];
  tIdx: number;
  pIdx: number;
  neu: Map<Tier, number>;
}

// ── Pure helper: buildTierGroups (mirrored from page.tsx) ─────────────────────

/**
 * Decomposes totalPairs into tier groups large-to-small, exactly as in page.tsx.
 */
function buildTierGroups(totalPairs: number): TierGroup[] {
  if (totalPairs <= 0) return [];
  const allTiers: Tier[] = [1000, 100, 10, 1];
  const groups: TierGroup[] = [];
  let rem = totalPairs;
  for (const t of allTiers) {
    const c = Math.floor(rem / t);
    if (c > 0) groups.push({ tier: t, count: c });
    rem %= t;
  }
  return groups;
}

// ── Minimal state model for the Mode_Klik state machine ───────────────────────
//
// We model the relevant parts of page.tsx as a plain object that we mutate via
// pure functions. Each function mirrors the logic of the corresponding handler
// in the page and returns the new state (immutable-style).

interface ClickModeState {
  waitingForClick: boolean;
  pendingNext: PendingNext | null;
  neutralised: Map<Tier, number>;
  vizPhase: "idle" | "battle" | "center" | "done";
}

function initialState(): ClickModeState {
  return {
    waitingForClick: false,
    pendingNext: null,
    neutralised: new Map(),
    vizPhase: "idle",
  };
}

/**
 * Simulates `runPair(groups, tIdx, pIdx, neu)` — the START of a pair cycle.
 *
 * According to page.tsx design:
 *   - Sets waitingForClick = false  (locks Tombol_Lanjut during animation)
 *   - Advances past exhausted tiers recursively (pIdx >= group.count → next tier)
 *   - If all tiers are exhausted, transitions to "center"
 *
 * Returns the resulting state immediately after runPair is called (before
 * PairReactionStage fires its onDone callback).
 */
function runPairStart(
  state: ClickModeState,
  groups: TierGroup[],
  tIdx: number,
  pIdx: number,
  neu: Map<Tier, number>
): ClickModeState {
  // Recursive tier-advance logic (mirrors page.tsx)
  let curTIdx = tIdx;
  let curPIdx = pIdx;
  while (curTIdx < groups.length && curPIdx >= groups[curTIdx].count) {
    curTIdx += 1;
    curPIdx = 0;
  }

  if (curTIdx >= groups.length) {
    // All tiers exhausted → transition to center (auto-advance, no click needed)
    return { ...state, waitingForClick: false, pendingNext: null, vizPhase: "center" };
  }

  // A valid pair to run: lock Tombol_Lanjut
  return {
    ...state,
    waitingForClick: false,
    pendingNext: null,
    vizPhase: "battle",
    neutralised: neu,
  };
}

/**
 * Simulates the `onDone` callback dispatched by PairReactionStage in Mode_Klik,
 * when there are still pairs remaining after this one.
 *
 * According to page.tsx design:
 *   - Updates neutralised map (+1 for curGroup.tier)
 *   - Determines next (nTIdx, nPIdx)
 *   - If more pairs remain: stores pendingNext, sets waitingForClick = true
 *   - If no more pairs remain: transitions to "center" (no click needed)
 *
 * Returns the resulting state after onDone fires.
 */
function onDoneClickMode(
  state: ClickModeState,
  groups: TierGroup[],
  tIdx: number,
  pIdx: number
): ClickModeState {
  // Update neutralised
  const curGroup = groups[tIdx];
  const next = new Map(state.neutralised);
  next.set(curGroup.tier, (next.get(curGroup.tier) ?? 0) + 1);

  // Determine next (nTIdx, nPIdx) — same advancement logic used in page.tsx onDone
  let nTIdx = tIdx;
  let nPIdx = pIdx + 1;
  while (nTIdx < groups.length && nPIdx >= groups[nTIdx].count) {
    nTIdx += 1;
    nPIdx = 0;
  }

  if (nTIdx >= groups.length) {
    // Last pair: auto-advance to center (Req 3.5 — no extra click needed)
    return { ...state, neutralised: next, waitingForClick: false, pendingNext: null, vizPhase: "center" };
  }

  // More pairs remain: enable Tombol_Lanjut (Req 3.3)
  const pendingNext: PendingNext = { groups, tIdx: nTIdx, pIdx: nPIdx, neu: next };
  return { ...state, neutralised: next, waitingForClick: true, pendingNext };
}

/**
 * Simulates `handleNextClick()` in Mode_Klik.
 *
 * Guard: returns unchanged state if !waitingForClick or pendingNext is null.
 * Otherwise: clears waitingForClick + pendingNext, then calls runPairStart.
 */
function handleNextClick(state: ClickModeState): ClickModeState {
  if (!state.waitingForClick || !state.pendingNext) return state; // guard
  const { groups, tIdx, pIdx, neu } = state.pendingNext;
  const cleared: ClickModeState = { ...state, waitingForClick: false, pendingNext: null };
  return runPairStart(cleared, groups, tIdx, pIdx, neu);
}

// ── Arbitraries ───────────────────────────────────────────────────────────────

/**
 * Generates a valid TierGroup list with at least 1 pair and at most 4 tiers.
 * We use small values to keep test execution fast.
 */
const validTierGroupsArb = fc.integer({ min: 1, max: 999 }).map(buildTierGroups);

/**
 * Generates a valid (tIdx, pIdx) pair within a given TierGroup list such that
 * there is at least one more pair after (tIdx, pIdx) — i.e. the "middle" of
 * the sequence (not the very last pair).
 *
 * Returns null if the groups list has only a single pair total.
 */
function midPairIndexArb(groups: TierGroup[]): fc.Arbitrary<{ tIdx: number; pIdx: number } | null> {
  // Flatten all (tIdx, pIdx) pairs
  const all: Array<{ tIdx: number; pIdx: number }> = [];
  for (let t = 0; t < groups.length; t++) {
    for (let p = 0; p < groups[t].count; p++) {
      all.push({ tIdx: t, pIdx: p });
    }
  }
  // "mid" means not the last pair (must have a successor)
  const midPairs = all.slice(0, -1);
  if (midPairs.length === 0) return fc.constant(null);
  return fc.constantFrom(...midPairs);
}

// ── Property 6 ────────────────────────────────────────────────────────────────

describe("Property 6: onDone di Mode_Klik mengaktifkan Tombol_Lanjut", () => {
  /**
   * For any valid (groups, tIdx, pIdx) where a next pair still exists after
   * (tIdx, pIdx), invoking onDone in Mode_Klik must set waitingForClick = true
   * (Tombol_Lanjut enabled).
   *
   * **Validates: Requirements 3.3**
   */

  it(
    "waitingForClick === true setelah onDone ketika masih ada pasangan berikutnya",
    () => {
      fc.assert(
        fc.property(
          validTierGroupsArb.chain((groups) =>
            midPairIndexArb(groups).map((mid) => ({ groups, mid }))
          ),
          ({ groups, mid }) => {
            // Skip if groups has only one total pair (no mid pair exists)
            fc.pre(mid !== null);

            const { tIdx, pIdx } = mid!;
            const state = { ...initialState(), vizPhase: "battle" as const };
            const after = onDoneClickMode(state, groups, tIdx, pIdx);

            // Core property: Tombol_Lanjut must be enabled
            expect(after.waitingForClick).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  it(
    "pendingNext tidak null setelah onDone ketika masih ada pasangan berikutnya",
    () => {
      fc.assert(
        fc.property(
          validTierGroupsArb.chain((groups) =>
            midPairIndexArb(groups).map((mid) => ({ groups, mid }))
          ),
          ({ groups, mid }) => {
            fc.pre(mid !== null);

            const { tIdx, pIdx } = mid!;
            const state = { ...initialState(), vizPhase: "battle" as const };
            const after = onDoneClickMode(state, groups, tIdx, pIdx);

            // pendingNext must be populated so handleNextClick can advance
            expect(after.pendingNext).not.toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  it(
    "vizPhase tetap 'battle' (bukan 'center') setelah onDone jika masih ada pasangan",
    () => {
      fc.assert(
        fc.property(
          validTierGroupsArb.chain((groups) =>
            midPairIndexArb(groups).map((mid) => ({ groups, mid }))
          ),
          ({ groups, mid }) => {
            fc.pre(mid !== null);

            const { tIdx, pIdx } = mid!;
            const state = { ...initialState(), vizPhase: "battle" as const };
            const after = onDoneClickMode(state, groups, tIdx, pIdx);

            // Still in battle — not yet advanced to center
            expect(after.vizPhase).toBe("battle");
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  it(
    "waitingForClick === false (auto ke 'center') setelah onDone di pasangan TERAKHIR",
    () => {
      fc.assert(
        fc.property(
          validTierGroupsArb,
          (groups) => {
            // Deterministically find the last (tIdx, pIdx) pair
            const tIdx = groups.length - 1;
            const pIdx = groups[tIdx].count - 1;

            const state = { ...initialState(), vizPhase: "battle" as const };
            const after = onDoneClickMode(state, groups, tIdx, pIdx);

            // Last pair: must NOT enable waitingForClick — Req 3.5: auto-advance
            expect(after.waitingForClick).toBe(false);
            expect(after.vizPhase).toBe("center");
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});

// ── Property 7 ────────────────────────────────────────────────────────────────

describe("Property 7: runPair di Mode_Klik menonaktifkan Tombol_Lanjut saat dimulai", () => {
  /**
   * For any call to runPair (whether it's the first pair or triggered by
   * handleNextClick), waitingForClick must be false immediately after runPair
   * starts — while PairReactionStage is animating.
   *
   * **Validates: Requirements 3.2, 3.4**
   */

  it(
    "runPairStart selalu menghasilkan waitingForClick === false untuk pasangan valid manapun",
    () => {
      fc.assert(
        fc.property(
          validTierGroupsArb,
          fc.integer({ min: 0, max: 3 }),  // tIdx hint
          fc.integer({ min: 0, max: 8 }),  // pIdx hint
          (groups, tIdxHint, pIdxHint) => {
            // Clamp to valid indices
            const tIdx = Math.min(tIdxHint, groups.length - 1);
            const pIdx = Math.min(pIdxHint, groups[tIdx].count - 1);

            // Start from a state where Tombol_Lanjut is enabled (worst-case)
            const state: ClickModeState = {
              ...initialState(),
              waitingForClick: true,
              vizPhase: "battle",
            };

            const after = runPairStart(state, groups, tIdx, pIdx, new Map());

            // Core property: lock Tombol_Lanjut during animation
            expect(after.waitingForClick).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  it(
    "handleNextClick menghasilkan waitingForClick === false segera setelah ditekan",
    () => {
      fc.assert(
        fc.property(
          validTierGroupsArb.chain((groups) =>
            midPairIndexArb(groups).map((mid) => ({ groups, mid }))
          ),
          ({ groups, mid }) => {
            // Need a mid pair to have a valid pendingNext to click through
            fc.pre(mid !== null);

            const { tIdx, pIdx } = mid!;

            // Simulate: onDone has just fired → waitingForClick=true, pendingNext set
            const { tIdx: nTIdx, pIdx: nPIdx } = (() => {
              let t = tIdx;
              let p = pIdx + 1;
              while (t < groups.length && p >= groups[t].count) { t++; p = 0; }
              return { tIdx: t, pIdx: p };
            })();

            const stateWaiting: ClickModeState = {
              waitingForClick: true,
              pendingNext: { groups, tIdx: nTIdx, pIdx: nPIdx, neu: new Map() },
              neutralised: new Map(),
              vizPhase: "battle",
            };

            const after = handleNextClick(stateWaiting);

            // Core property: Tombol_Lanjut locked immediately after click
            expect(after.waitingForClick).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  it(
    "handleNextClick guard: tidak mengubah state jika waitingForClick === false",
    () => {
      fc.assert(
        fc.property(
          validTierGroupsArb,
          (groups) => {
            const state: ClickModeState = {
              waitingForClick: false,
              pendingNext: { groups, tIdx: 0, pIdx: 0, neu: new Map() },
              neutralised: new Map(),
              vizPhase: "battle",
            };

            const after = handleNextClick(state);

            // Guard must return state unchanged (Req 3.4: guard check)
            expect(after).toBe(state);
            expect(after.waitingForClick).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  it(
    "handleNextClick guard: tidak mengubah state jika pendingNext === null",
    () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          (waitingForClick) => {
            const state: ClickModeState = {
              waitingForClick,
              pendingNext: null,
              neutralised: new Map(),
              vizPhase: "battle",
            };

            const after = handleNextClick(state);

            // Guard: if pendingNext is null, no-op
            expect(after).toBe(state);
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  it(
    "siklus lengkap: runPair → onDone → handleNextClick menghasilkan waitingForClick false→true→false",
    () => {
      fc.assert(
        fc.property(
          validTierGroupsArb.chain((groups) =>
            midPairIndexArb(groups).map((mid) => ({ groups, mid }))
          ),
          ({ groups, mid }) => {
            fc.pre(mid !== null);

            const { tIdx, pIdx } = mid!;

            // Step 1: runPair starts → waitingForClick must be false
            let state = runPairStart(initialState(), groups, tIdx, pIdx, new Map());
            expect(state.waitingForClick).toBe(false); // Prop 7

            // Step 2: PairReactionStage fires onDone → waitingForClick must be true
            state = onDoneClickMode(state, groups, tIdx, pIdx);
            expect(state.waitingForClick).toBe(true);  // Prop 6

            // Step 3: User presses Tombol_Lanjut → waitingForClick must be false again
            state = handleNextClick(state);
            expect(state.waitingForClick).toBe(false); // Prop 7
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});
