/**
 * Unit tests for state machine transitions in app/model-chip/page.tsx.
 *
 * Tests pure state-machine logic extracted from the page — no React rendering,
 * no jsdom. Mirrors the established pattern in:
 *   - __tests__/model-chip/ClickMode.property.test.ts
 *
 * Coverage:
 *   - Mode Otomatis: last pair onDone → vizPhase becomes "center" (Req 2.5)
 *   - Mode Klik: last pair onDone → vizPhase becomes "center" WITHOUT a click (Req 3.5)
 *   - Mode Klik: handleNextClick starts next pair and disables Tombol_Lanjut (Req 3.4)
 *
 * Requirements: 2.5, 3.4, 3.5
 */

export {}; // make this file a module so local types don't bleed into global scope

// ── Types (mirrored from page.tsx) ────────────────────────────────────────────

type AnimMode = "auto" | "click";
type Tier = 1 | 10 | 100 | 1000;

interface TierGroup {
  tier: Tier;
  count: number;
}

interface PendingNext {
  groups: TierGroup[];
  tIdx: number;
  pIdx: number;
  neu: Map<Tier, number>;
}

// ── Pure helpers (mirrored / extended from ClickMode.property.test.ts) ────────

/**
 * Decomposes totalPairs into tier groups large-to-small (mirrors page.tsx).
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

// ── State model ───────────────────────────────────────────────────────────────

interface StateMachineState {
  waitingForClick: boolean;
  pendingNext: PendingNext | null;
  neutralised: Map<Tier, number>;
  vizPhase: "idle" | "battle" | "center" | "done";
  /** Scheduled timers: [{delayMs, nextPhase}] — used to simulate setTimeout in tests */
  scheduledTimers: Array<{ delayMs: number; targetPhase: "center" | "done" }>;
}

function initialState(): StateMachineState {
  return {
    waitingForClick: false,
    pendingNext: null,
    neutralised: new Map(),
    vizPhase: "idle",
    scheduledTimers: [],
  };
}

// ── runPairStart ──────────────────────────────────────────────────────────────

/**
 * Simulates `runPair(groups, tIdx, pIdx, neu)` — the START of a pair cycle.
 * Advances past exhausted tiers recursively. If all tiers exhausted, transitions
 * to "center" (auto-advance; callers should also fire timers for "done").
 */
function runPairStart(
  state: StateMachineState,
  groups: TierGroup[],
  tIdx: number,
  pIdx: number,
  neu: Map<Tier, number>
): StateMachineState {
  let curTIdx = tIdx;
  let curPIdx = pIdx;
  while (curTIdx < groups.length && curPIdx >= groups[curTIdx].count) {
    curTIdx += 1;
    curPIdx = 0;
  }

  if (curTIdx >= groups.length) {
    // All tiers exhausted → schedule center + done timers (model synchronously)
    return {
      ...state,
      waitingForClick: false,
      pendingNext: null,
      vizPhase: "center",
      scheduledTimers: [
        { delayMs: 2000, targetPhase: "center" },
        { delayMs: 2500, targetPhase: "done" },
      ],
    };
  }

  return {
    ...state,
    waitingForClick: false,
    pendingNext: null,
    vizPhase: "battle",
    neutralised: neu,
  };
}

// ── onDoneAutoMode ────────────────────────────────────────────────────────────

/**
 * Simulates the `onDone` callback in **Mode Otomatis**.
 *
 * In the real page, onDone fires a 100ms setTimeout that calls runPair(next).
 * Here we model that synchronously: we immediately advance to the next pair
 * (or to "center" if this was the last pair).
 *
 * Design (Req 2.1, 2.5):
 *   - Updates neutralised map (+1 for curGroup.tier)
 *   - Calls runPairStart for the next (tIdx, pIdx) synchronously
 *   - If next is past all groups, vizPhase becomes "center" and timers are scheduled
 */
function onDoneAutoMode(
  state: StateMachineState,
  groups: TierGroup[],
  tIdx: number,
  pIdx: number
): StateMachineState {
  const curGroup = groups[tIdx];
  const next = new Map(state.neutralised);
  next.set(curGroup.tier, (next.get(curGroup.tier) ?? 0) + 1);

  const intermediate: StateMachineState = { ...state, neutralised: next };
  return runPairStart(intermediate, groups, tIdx, pIdx + 1, next);
}

// ── onDoneClickMode ───────────────────────────────────────────────────────────

/**
 * Simulates the `onDone` callback in **Mode Klik**.
 *
 * Design (Req 3.3, 3.5):
 *   - Updates neutralised map (+1 for curGroup.tier)
 *   - If more pairs remain: sets pendingNext and waitingForClick = true
 *   - If last pair: transitions vizPhase to "center" (auto-advance, no click)
 */
function onDoneClickMode(
  state: StateMachineState,
  groups: TierGroup[],
  tIdx: number,
  pIdx: number
): StateMachineState {
  const curGroup = groups[tIdx];
  const next = new Map(state.neutralised);
  next.set(curGroup.tier, (next.get(curGroup.tier) ?? 0) + 1);

  // Determine next (nTIdx, nPIdx)
  let nTIdx = tIdx;
  let nPIdx = pIdx + 1;
  while (nTIdx < groups.length && nPIdx >= groups[nTIdx].count) {
    nTIdx += 1;
    nPIdx = 0;
  }

  if (nTIdx >= groups.length) {
    // Last pair: auto-advance to center (Req 3.5 — no extra click needed)
    return {
      ...state,
      neutralised: next,
      waitingForClick: false,
      pendingNext: null,
      vizPhase: "center",
      scheduledTimers: [
        { delayMs: 2000, targetPhase: "center" },
        { delayMs: 2500, targetPhase: "done" },
      ],
    };
  }

  // More pairs remain: enable Tombol_Lanjut (Req 3.3)
  const pendingNext: PendingNext = { groups, tIdx: nTIdx, pIdx: nPIdx, neu: next };
  return { ...state, neutralised: next, waitingForClick: true, pendingNext };
}

// ── handleNextClick ───────────────────────────────────────────────────────────

/**
 * Simulates `handleNextClick()` in Mode Klik.
 * Guard: returns unchanged state if !waitingForClick or pendingNext is null.
 */
function handleNextClick(state: StateMachineState): StateMachineState {
  if (!state.waitingForClick || !state.pendingNext) return state;
  const { groups, tIdx, pIdx, neu } = state.pendingNext;
  const cleared: StateMachineState = { ...state, waitingForClick: false, pendingNext: null };
  return runPairStart(cleared, groups, tIdx, pIdx, neu);
}

/**
 * Fires the scheduled timer with the highest delayMs that is ≤ elapsedMs,
 * returning the vizPhase it would advance to.
 * In the real page, these are real setTimeout calls. Here we resolve them
 * synchronously based on elapsed time for testing purposes.
 */
function advanceTimers(state: StateMachineState, elapsedMs: number): StateMachineState {
  const fired = state.scheduledTimers.filter((t) => t.delayMs <= elapsedMs);
  if (fired.length === 0) return state;
  // Last fired timer wins (latest targetPhase = "done" supersedes "center")
  const last = fired.reduce((a, b) => (a.delayMs >= b.delayMs ? a : b));
  return { ...state, vizPhase: last.targetPhase };
}

// ── Helper: build single-pair groups ─────────────────────────────────────────

/** Creates a TierGroup list with exactly 1 pair (simplest case). */
const singlePairGroups = buildTierGroups(1); // [{ tier: 1, count: 1 }]

/** Creates a TierGroup list with exactly 2 pairs (allows mid + last). */
const twoPairGroups = buildTierGroups(2); // [{ tier: 1, count: 2 }]

/** Creates a TierGroup list with exactly 11 pairs: [{tier:10, count:1}, {tier:1, count:1}] */
const elevenPairGroups = buildTierGroups(11); // multi-tier

// ── Tests ─────────────────────────────────────────────────────────────────────

// ── Requirement 2.5: Mode Otomatis — last pair → center → done ───────────────

describe("Req 2.5 — Mode Otomatis: last pair onDone → center → done (auto-advance)", () => {
  it("single pair: onDone immediately transitions vizPhase to 'center'", () => {
    const state = { ...initialState(), vizPhase: "battle" as const };
    const after = onDoneAutoMode(state, singlePairGroups, 0, 0);

    expect(after.vizPhase).toBe("center");
  });

  it("single pair: after 2500ms timers resolve, vizPhase becomes 'done'", () => {
    const state = { ...initialState(), vizPhase: "battle" as const };
    const afterDone = onDoneAutoMode(state, singlePairGroups, 0, 0);
    expect(afterDone.vizPhase).toBe("center");

    // Advance past 2500ms to fire the "done" timer
    const finalState = advanceTimers(afterDone, 2500);
    expect(finalState.vizPhase).toBe("done");
  });

  it("two pairs: first pair onDone keeps vizPhase 'battle'", () => {
    const state = { ...initialState(), vizPhase: "battle" as const };
    const after = onDoneAutoMode(state, twoPairGroups, 0, 0);

    expect(after.vizPhase).toBe("battle");
  });

  it("two pairs: second (last) pair onDone transitions to 'center'", () => {
    const state = { ...initialState(), vizPhase: "battle" as const };
    // First pair done → still battle
    const afterFirst = onDoneAutoMode(state, twoPairGroups, 0, 0);
    expect(afterFirst.vizPhase).toBe("battle");

    // Second (last) pair done → center
    const afterLast = onDoneAutoMode(afterFirst, twoPairGroups, 0, 1);
    expect(afterLast.vizPhase).toBe("center");
  });

  it("two pairs: timers after last onDone eventually yield 'done'", () => {
    const state = { ...initialState(), vizPhase: "battle" as const };
    const afterFirst = onDoneAutoMode(state, twoPairGroups, 0, 0);
    const afterLast = onDoneAutoMode(afterFirst, twoPairGroups, 0, 1);

    expect(afterLast.vizPhase).toBe("center");
    const finalState = advanceTimers(afterLast, 2500);
    expect(finalState.vizPhase).toBe("done");
  });

  it("multi-tier (11 pairs): final pair across tier boundary → center", () => {
    // elevenPairGroups = [{tier:10,count:1},{tier:1,count:1}]
    // Process all pairs automatically
    let state: StateMachineState = { ...initialState(), vizPhase: "battle" as const };

    // Tier 0 (×10), pair 0
    state = onDoneAutoMode(state, elevenPairGroups, 0, 0);
    expect(state.vizPhase).toBe("battle");

    // Tier 1 (×1), pair 0 — last pair
    state = onDoneAutoMode(state, elevenPairGroups, 1, 0);
    expect(state.vizPhase).toBe("center");

    // Fire done timer
    const done = advanceTimers(state, 2500);
    expect(done.vizPhase).toBe("done");
  });

  it("waitingForClick remains false throughout auto mode", () => {
    const state = { ...initialState(), vizPhase: "battle" as const };
    const afterFirst = onDoneAutoMode(state, twoPairGroups, 0, 0);
    const afterLast = onDoneAutoMode(afterFirst, twoPairGroups, 0, 1);

    expect(afterFirst.waitingForClick).toBe(false);
    expect(afterLast.waitingForClick).toBe(false);
  });

  it("scheduledTimers are present after last pair in auto mode", () => {
    const state = { ...initialState(), vizPhase: "battle" as const };
    const after = onDoneAutoMode(state, singlePairGroups, 0, 0);

    // Two timers: one for center (2000ms), one for done (2500ms)
    expect(after.scheduledTimers).toHaveLength(2);
    expect(after.scheduledTimers.some((t) => t.targetPhase === "center")).toBe(true);
    expect(after.scheduledTimers.some((t) => t.targetPhase === "done")).toBe(true);
  });

  it("at 2000ms only the 'center' timer fires (not yet 'done')", () => {
    const state = { ...initialState(), vizPhase: "battle" as const };
    const center = onDoneAutoMode(state, singlePairGroups, 0, 0);
    // Already at "center" from transition; advancing to 2000ms should not flip to "done"
    // because the 2000ms timer targets "center" (which is already the phase)
    const at2000 = advanceTimers(center, 2000);
    // The 2500ms "done" timer hasn't fired yet
    expect(at2000.vizPhase).toBe("center");
  });
});

// ── Requirement 3.5: Mode Klik — last pair onDone → center (no click needed) ─

describe("Req 3.5 — Mode Klik: last pair onDone → center without a click", () => {
  it("single pair: last pair onDone in click mode sets vizPhase 'center'", () => {
    const state = { ...initialState(), vizPhase: "battle" as const };
    const after = onDoneClickMode(state, singlePairGroups, 0, 0);

    expect(after.vizPhase).toBe("center");
  });

  it("single pair: waitingForClick remains false (no click required for center)", () => {
    const state = { ...initialState(), vizPhase: "battle" as const };
    const after = onDoneClickMode(state, singlePairGroups, 0, 0);

    expect(after.waitingForClick).toBe(false);
  });

  it("single pair: pendingNext is null (nothing queued)", () => {
    const state = { ...initialState(), vizPhase: "battle" as const };
    const after = onDoneClickMode(state, singlePairGroups, 0, 0);

    expect(after.pendingNext).toBeNull();
  });

  it("single pair: timers scheduled for done after center", () => {
    const state = { ...initialState(), vizPhase: "battle" as const };
    const center = onDoneClickMode(state, singlePairGroups, 0, 0);
    expect(center.scheduledTimers).toHaveLength(2);

    const done = advanceTimers(center, 2500);
    expect(done.vizPhase).toBe("done");
  });

  it("two pairs: last pair onDone goes to center without click", () => {
    // First pair done → waitingForClick=true (Req 3.3)
    let state: StateMachineState = { ...initialState(), vizPhase: "battle" as const };
    state = onDoneClickMode(state, twoPairGroups, 0, 0);
    expect(state.waitingForClick).toBe(true);

    // User clicks → start pair 2
    state = handleNextClick(state);
    expect(state.waitingForClick).toBe(false);
    expect(state.vizPhase).toBe("battle");

    // Last pair done → center WITHOUT a click
    state = onDoneClickMode(state, twoPairGroups, 0, 1);
    expect(state.vizPhase).toBe("center");
    expect(state.waitingForClick).toBe(false);
  });

  it("multi-tier last pair in click mode auto-advances to center", () => {
    let state: StateMachineState = { ...initialState(), vizPhase: "battle" as const };

    // elevenPairGroups = [{tier:10,count:1},{tier:1,count:1}]
    // Pair at tier 0, index 0 — not last
    state = onDoneClickMode(state, elevenPairGroups, 0, 0);
    expect(state.vizPhase).toBe("battle");
    expect(state.waitingForClick).toBe(true);

    // User clicks → start tier 1 pair 0
    state = handleNextClick(state);
    expect(state.vizPhase).toBe("battle");
    expect(state.waitingForClick).toBe(false);

    // Last pair done → center auto
    state = onDoneClickMode(state, elevenPairGroups, 1, 0);
    expect(state.vizPhase).toBe("center");
    expect(state.waitingForClick).toBe(false);
  });

  it("done timer fires after center in click mode (same timing as auto)", () => {
    const state = { ...initialState(), vizPhase: "battle" as const };
    const center = onDoneClickMode(state, singlePairGroups, 0, 0);

    const at2000 = advanceTimers(center, 2000);
    expect(at2000.vizPhase).toBe("center"); // not yet "done"

    const at2500 = advanceTimers(center, 2500);
    expect(at2500.vizPhase).toBe("done");
  });
});

// ── Requirement 3.4: Mode Klik — handleNextClick starts next pair, disables button

describe("Req 3.4 — Mode Klik: handleNextClick starts next pair and disables Tombol_Lanjut", () => {
  it("handleNextClick sets waitingForClick to false immediately", () => {
    const stateWaiting: StateMachineState = {
      ...initialState(),
      vizPhase: "battle",
      waitingForClick: true,
      pendingNext: { groups: twoPairGroups, tIdx: 0, pIdx: 1, neu: new Map() },
    };

    const after = handleNextClick(stateWaiting);

    expect(after.waitingForClick).toBe(false);
  });

  it("handleNextClick clears pendingNext", () => {
    const stateWaiting: StateMachineState = {
      ...initialState(),
      vizPhase: "battle",
      waitingForClick: true,
      pendingNext: { groups: twoPairGroups, tIdx: 0, pIdx: 1, neu: new Map() },
    };

    const after = handleNextClick(stateWaiting);

    expect(after.pendingNext).toBeNull();
  });

  it("handleNextClick keeps vizPhase 'battle' when the next pair is valid", () => {
    const stateWaiting: StateMachineState = {
      ...initialState(),
      vizPhase: "battle",
      waitingForClick: true,
      pendingNext: { groups: twoPairGroups, tIdx: 0, pIdx: 1, neu: new Map() },
    };

    const after = handleNextClick(stateWaiting);

    // pIdx=1 is valid for twoPairGroups (count=2), so we stay in battle
    expect(after.vizPhase).toBe("battle");
  });

  it("handleNextClick guard: does nothing when waitingForClick is false", () => {
    const state: StateMachineState = {
      ...initialState(),
      vizPhase: "battle",
      waitingForClick: false,
      pendingNext: { groups: twoPairGroups, tIdx: 0, pIdx: 1, neu: new Map() },
    };

    const after = handleNextClick(state);

    expect(after).toBe(state); // same reference — state unchanged
  });

  it("handleNextClick guard: does nothing when pendingNext is null", () => {
    const state: StateMachineState = {
      ...initialState(),
      vizPhase: "battle",
      waitingForClick: true,
      pendingNext: null,
    };

    const after = handleNextClick(state);

    expect(after).toBe(state);
  });

  it("full cycle: onDone → waitingForClick true → handleNextClick → waitingForClick false", () => {
    let state: StateMachineState = { ...initialState(), vizPhase: "battle" as const };

    // onDone for first pair (not last)
    state = onDoneClickMode(state, twoPairGroups, 0, 0);
    expect(state.waitingForClick).toBe(true); // Tombol_Lanjut enabled

    // User presses "Lanjut ▶"
    state = handleNextClick(state);
    expect(state.waitingForClick).toBe(false); // Tombol_Lanjut disabled (Req 3.4)
    expect(state.vizPhase).toBe("battle");     // still in battle
  });

  it("handleNextClick when pendingNext points to exhausted tier advances to center", () => {
    // If pendingNext.tIdx is past all groups, clicking Lanjut should still
    // result in a transition (via runPairStart). We model this by pointing
    // pendingNext.tIdx past the end of singlePairGroups.
    const stateWaiting: StateMachineState = {
      ...initialState(),
      vizPhase: "battle",
      waitingForClick: true,
      pendingNext: {
        groups: singlePairGroups,
        tIdx: 1, // past end
        pIdx: 0,
        neu: new Map(),
      },
    };

    const after = handleNextClick(stateWaiting);

    // runPairStart detects all groups exhausted → center
    expect(after.vizPhase).toBe("center");
    expect(after.waitingForClick).toBe(false);
  });

  it("repeated handleNextClick without onDone between does not re-advance", () => {
    // After first click, waitingForClick becomes false. Subsequent clicks are no-ops.
    const stateWaiting: StateMachineState = {
      ...initialState(),
      vizPhase: "battle",
      waitingForClick: true,
      pendingNext: { groups: twoPairGroups, tIdx: 0, pIdx: 1, neu: new Map() },
    };

    const after1 = handleNextClick(stateWaiting);
    expect(after1.waitingForClick).toBe(false);

    const after2 = handleNextClick(after1); // guard fires: waitingForClick=false
    expect(after2).toBe(after1); // same reference — no change
  });

  it("three-pair sequence: correct waitingForClick transitions across all pairs", () => {
    const groups = buildTierGroups(3); // [{tier:1, count:3}]
    let state: StateMachineState = { ...initialState(), vizPhase: "battle" as const };

    // Pair 0
    state = onDoneClickMode(state, groups, 0, 0);
    expect(state.waitingForClick).toBe(true); // pair 1 pending

    state = handleNextClick(state);
    expect(state.waitingForClick).toBe(false); // animating pair 1

    // Pair 1
    state = onDoneClickMode(state, groups, 0, 1);
    expect(state.waitingForClick).toBe(true); // pair 2 pending

    state = handleNextClick(state);
    expect(state.waitingForClick).toBe(false); // animating pair 2

    // Pair 2 — last
    state = onDoneClickMode(state, groups, 0, 2);
    expect(state.waitingForClick).toBe(false); // auto to center, no click needed
    expect(state.vizPhase).toBe("center");
  });
});

// ── Cross-mode: neutralised map integrity ─────────────────────────────────────

describe("Neutralised map integrity across both modes", () => {
  it("auto mode: neutralised count increments correctly after each onDone", () => {
    const groups = buildTierGroups(3); // [{tier:1, count:3}]
    let state: StateMachineState = { ...initialState(), vizPhase: "battle" as const };

    state = onDoneAutoMode(state, groups, 0, 0);
    expect(state.neutralised.get(1)).toBe(1);

    state = onDoneAutoMode(state, groups, 0, 1);
    expect(state.neutralised.get(1)).toBe(2);

    state = onDoneAutoMode(state, groups, 0, 2);
    expect(state.neutralised.get(1)).toBe(3);
  });

  it("click mode: neutralised count increments correctly after each onDone", () => {
    const groups = buildTierGroups(3);
    let state: StateMachineState = { ...initialState(), vizPhase: "battle" as const };

    state = onDoneClickMode(state, groups, 0, 0);
    expect(state.neutralised.get(1)).toBe(1);

    state = handleNextClick(state);
    state = onDoneClickMode(state, groups, 0, 1);
    expect(state.neutralised.get(1)).toBe(2);

    state = handleNextClick(state);
    state = onDoneClickMode(state, groups, 0, 2);
    expect(state.neutralised.get(1)).toBe(3);
  });

  it("multi-tier auto: each tier's neutralised count increments independently", () => {
    // elevenPairGroups = [{tier:10,count:1},{tier:1,count:1}]
    let state: StateMachineState = { ...initialState(), vizPhase: "battle" as const };

    state = onDoneAutoMode(state, elevenPairGroups, 0, 0);
    expect(state.neutralised.get(10)).toBe(1);
    expect(state.neutralised.get(1)).toBeUndefined();

    state = onDoneAutoMode(state, elevenPairGroups, 1, 0);
    expect(state.neutralised.get(10)).toBe(1);
    expect(state.neutralised.get(1)).toBe(1);
  });
});
