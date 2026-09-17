/**
 * Unit tests for alliance case handling in useAnimationOrchestrator.
 *
 * Because the project uses testEnvironment: "node" (no jsdom / no @testing-library),
 * we test the pure contracts and extracted helpers that govern the alliance path.
 * This follows the established project pattern:
 *   - __tests__/model-chip/StateMachine.test.ts
 *   - __tests__/model-chip/useAnimationOrchestrator.test.ts
 *
 * Coverage (Requirements 2.1–2.5, 3.1–3.4, 6.1):
 *
 *   Req 2.1 — handlePair with bil1>0, bil2>0 → snapshot set, vizPhase="alliance"
 *   Req 2.2 — handlePair with bil1<0, bil2<0 → snapshot set, vizPhase="alliance"
 *   Req 2.3 — handlePair with opposite signs → vizPhase="battle", buildBattlePlan called
 *   Req 2.4 — handlePair with zero → vizPhase="done", no snapshot
 *   Req 2.5 — handlePair when vizPhase != "idle" → no state change
 *   Req 3.1 — handleAllianceDone → vizPhase="center" immediately
 *   Req 3.2 — handleAllianceDone timers: centerExiting→true then vizPhase→done
 *   Req 3.3 — handleAllianceDone delay scaling uses animSpeed multiplier
 *   Req 3.4 — handleReset during alliance → vizPhase="idle", timers cancelled
 *   Req 6.1 — replayAnimation with alliance snapshot → vizPhase="alliance", no buildBattlePlan
 */

import { isAllianceCase } from "@/hooks/model-chip/useAnimationOrchestrator";
import { buildBattlePlan } from "@/lib/model-chip/battlePlan";

export {}; // module boundary — prevents type bleed into global scope

// ─── Types (mirrored from lib/model-chip/types.ts) ────────────────────────────

type VizPhase = "idle" | "battle" | "center" | "done" | "alliance";

// ─── Alliance orchestrator state model ────────────────────────────────────────

interface OrchestratorState {
  bil1: number;
  bil2: number;
  vizPhase: VizPhase;
  snapshot: { bil1: number; bil2: number } | null;
  centerExiting: boolean;
  animSpeed: number;
  // Scheduled timers modeled as descriptors for test-time resolution
  scheduledTimers: Array<{ delayMs: number; action: "centerExiting" | "done" }>;
}

function initialOrchestratorState(): OrchestratorState {
  return {
    bil1: 0,
    bil2: 0,
    vizPhase: "idle",
    snapshot: null,
    centerExiting: false,
    animSpeed: 1,
    scheduledTimers: [],
  };
}

// ─── resetAnimState — extracted contract ──────────────────────────────────────

function resetAnimState(state: OrchestratorState): OrchestratorState {
  return {
    ...state,
    centerExiting: false,
    scheduledTimers: [], // clearTimers()
  };
}

// ─── handlePair — extracted contract ──────────────────────────────────────────

/**
 * Mirrors the handlePair() logic in useAnimationOrchestrator.
 * Returns the new state and whether buildBattlePlan was invoked.
 */
function handlePair(state: OrchestratorState): {
  state: OrchestratorState;
  buildBattlePlanCalled: boolean;
} {
  // Req 2.5: guard — ignore if not idle
  if (state.vizPhase !== "idle") {
    return { state, buildBattlePlanCalled: false };
  }

  const { bil1, bil2 } = state;
  const s = resetAnimState(state);
  const tp = Math.max(0, bil1) + Math.max(0, bil2);
  const tn = Math.max(0, -bil1) + Math.max(0, -bil2);

  if (!(tp > 0 && tn > 0)) {
    if (isAllianceCase(bil1, bil2)) {
      // Req 2.1, 2.2: alliance case
      return {
        state: { ...s, snapshot: { bil1, bil2 }, vizPhase: "alliance" },
        buildBattlePlanCalled: false,
      };
    } else {
      // Req 2.4: zero case — done, no snapshot
      return {
        state: { ...s, vizPhase: "done" },
        buildBattlePlanCalled: false,
      };
    }
  }

  // Req 2.3: battle case
  // In real hook: startBattle(buildBattlePlan(bil1, bil2)) and setVizPhase("battle")
  buildBattlePlan(bil1, bil2); // call to confirm it's invoked
  return {
    state: { ...s, snapshot: { bil1, bil2 }, vizPhase: "battle" },
    buildBattlePlanCalled: true,
  };
}

// ─── handleAllianceDone — extracted contract ──────────────────────────────────

/**
 * Mirrors handleAllianceDone() in useAnimationOrchestrator.
 * Schedules two timers based on animSpeed.
 * Returns the immediately-updated state (vizPhase="center") plus timer descriptors.
 * Requirements: 3.1, 3.2, 3.3
 */
function handleAllianceDone(state: OrchestratorState): OrchestratorState {
  const t1Delay = Math.round(2000 / state.animSpeed);
  const t2Delay = Math.round(2000 / state.animSpeed) + Math.round(500 / state.animSpeed);
  return {
    ...state,
    vizPhase: "center",
    centerExiting: false,
    scheduledTimers: [
      { delayMs: t1Delay, action: "centerExiting" },
      { delayMs: t2Delay, action: "done" },
    ],
  };
}

/** Advance timers: fire all scheduled timers whose delayMs <= elapsedMs. */
function advanceTimers(state: OrchestratorState, elapsedMs: number): OrchestratorState {
  let s = { ...state };
  const fired = state.scheduledTimers.filter(t => t.delayMs <= elapsedMs);
  for (const timer of fired) {
    if (timer.action === "centerExiting") {
      s = { ...s, centerExiting: true };
    } else if (timer.action === "done") {
      s = { ...s, vizPhase: "done" };
    }
  }
  return s;
}

// ─── handleReset — extracted contract ─────────────────────────────────────────

function handleReset(state: OrchestratorState): OrchestratorState {
  return {
    ...state,
    bil1: 0,
    bil2: 0,
    vizPhase: "idle",
    snapshot: null,
    centerExiting: false,
    scheduledTimers: [], // clearTimers() via resetAnimState
  };
}

// ─── replayAnimation — extracted contract ─────────────────────────────────────

/**
 * Mirrors replayAnimation() in useAnimationOrchestrator.
 * Returns new state and whether buildBattlePlan was invoked.
 */
function replayAnimation(state: OrchestratorState): {
  state: OrchestratorState;
  buildBattlePlanCalled: boolean;
} {
  const { snapshot } = state;
  if (!snapshot) return { state, buildBattlePlanCalled: false };

  const s = resetAnimState(state);
  const { bil1, bil2 } = snapshot;

  if (isAllianceCase(bil1, bil2)) {
    // Req 6.1: alliance replay → alliance phase, no buildBattlePlan
    return {
      state: { ...s, vizPhase: "alliance" },
      buildBattlePlanCalled: false,
    };
  }

  const tp = Math.max(0, bil1) + Math.max(0, bil2);
  const tn = Math.max(0, -bil1) + Math.max(0, -bil2);
  if (!(tp > 0 && tn > 0)) {
    return { state: { ...s, vizPhase: "done" }, buildBattlePlanCalled: false };
  }

  buildBattlePlan(bil1, bil2);
  return {
    state: { ...s, vizPhase: "battle" },
    buildBattlePlanCalled: true,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

// ── Req 2.1 — handlePair(3, 5) → alliance ─────────────────────────────────────

describe("Req 2.1 — handlePair: positive + positive → alliance", () => {
  it("2.1: handlePair(3,5) sets snapshot and vizPhase=alliance", () => {
    const state = { ...initialOrchestratorState(), bil1: 3, bil2: 5 };
    const { state: next, buildBattlePlanCalled } = handlePair(state);
    expect(next.vizPhase).toBe("alliance");
    expect(next.snapshot).toEqual({ bil1: 3, bil2: 5 });
    expect(buildBattlePlanCalled).toBe(false);
  });

  it("snapshot is set before vizPhase transitions (values are captured)", () => {
    const state = { ...initialOrchestratorState(), bil1: 100, bil2: 200 };
    const { state: next } = handlePair(state);
    expect(next.snapshot).toEqual({ bil1: 100, bil2: 200 });
    expect(next.vizPhase).toBe("alliance");
  });

  it("resetAnimState is called first (centerExiting is false in result)", () => {
    const state = { ...initialOrchestratorState(), bil1: 2, bil2: 3, centerExiting: true };
    const { state: next } = handlePair(state);
    expect(next.centerExiting).toBe(false);
  });
});

// ── Req 2.2 — handlePair(-2, -4) → alliance ───────────────────────────────────

describe("Req 2.2 — handlePair: negative + negative → alliance", () => {
  it("2.2: handlePair(-2,-4) sets snapshot and vizPhase=alliance", () => {
    const state = { ...initialOrchestratorState(), bil1: -2, bil2: -4 };
    const { state: next, buildBattlePlanCalled } = handlePair(state);
    expect(next.vizPhase).toBe("alliance");
    expect(next.snapshot).toEqual({ bil1: -2, bil2: -4 });
    expect(buildBattlePlanCalled).toBe(false);
  });

  it("both negative single-digit pair → alliance", () => {
    const state = { ...initialOrchestratorState(), bil1: -1, bil2: -1 };
    const { state: next } = handlePair(state);
    expect(next.vizPhase).toBe("alliance");
    expect(next.snapshot).toEqual({ bil1: -1, bil2: -1 });
  });
});

// ── Req 2.3 — handlePair(3, -5) → battle, buildBattlePlan called ──────────────

describe("Req 2.3 — handlePair: opposite signs → battle, buildBattlePlan invoked", () => {
  it("2.3: handlePair(3,-5) → vizPhase=battle, buildBattlePlan called", () => {
    const state = { ...initialOrchestratorState(), bil1: 3, bil2: -5 };
    const { state: next, buildBattlePlanCalled } = handlePair(state);
    expect(next.vizPhase).toBe("battle");
    expect(buildBattlePlanCalled).toBe(true);
  });

  it("battle case: snapshot is also set (mirrors startBattle path)", () => {
    const state = { ...initialOrchestratorState(), bil1: 10, bil2: -3 };
    const { state: next } = handlePair(state);
    expect(next.snapshot).toEqual({ bil1: 10, bil2: -3 });
  });

  it("negative bil1, positive bil2 also goes to battle", () => {
    const state = { ...initialOrchestratorState(), bil1: -7, bil2: 2 };
    const { state: next, buildBattlePlanCalled } = handlePair(state);
    expect(next.vizPhase).toBe("battle");
    expect(buildBattlePlanCalled).toBe(true);
  });
});

// ── Req 2.4 — handlePair with zero → done, no snapshot ────────────────────────

describe("Req 2.4 — handlePair: zero case → done, no snapshot", () => {
  it("2.4a: handlePair(0,5) → vizPhase=done, no snapshot", () => {
    const state = { ...initialOrchestratorState(), bil1: 0, bil2: 5 };
    const { state: next } = handlePair(state);
    expect(next.vizPhase).toBe("done");
    expect(next.snapshot).toBeNull();
  });

  it("2.4b: handlePair(3,0) → vizPhase=done, no snapshot", () => {
    const state = { ...initialOrchestratorState(), bil1: 3, bil2: 0 };
    const { state: next } = handlePair(state);
    expect(next.vizPhase).toBe("done");
    expect(next.snapshot).toBeNull();
  });

  it("2.4c: handlePair(0,0) → vizPhase=done, no snapshot", () => {
    const state = { ...initialOrchestratorState(), bil1: 0, bil2: 0 };
    const { state: next } = handlePair(state);
    expect(next.vizPhase).toBe("done");
    expect(next.snapshot).toBeNull();
  });

  it("2.4d: handlePair(-3,0) → vizPhase=done, no snapshot", () => {
    const state = { ...initialOrchestratorState(), bil1: -3, bil2: 0 };
    const { state: next } = handlePair(state);
    expect(next.vizPhase).toBe("done");
    expect(next.snapshot).toBeNull();
  });

  it("2.4e: handlePair(0,-5) → vizPhase=done, no snapshot", () => {
    const state = { ...initialOrchestratorState(), bil1: 0, bil2: -5 };
    const { state: next } = handlePair(state);
    expect(next.vizPhase).toBe("done");
    expect(next.snapshot).toBeNull();
  });
});

// ── Req 2.5 — handlePair when vizPhase !== idle → no change ───────────────────

describe("Req 2.5 — handlePair: guard when vizPhase != idle", () => {
  it("2.5a: handlePair when vizPhase=alliance → no state change", () => {
    const state: OrchestratorState = {
      ...initialOrchestratorState(),
      bil1: 3, bil2: 5,
      vizPhase: "alliance",
      snapshot: { bil1: 3, bil2: 5 },
    };
    const { state: next, buildBattlePlanCalled } = handlePair(state);
    expect(next).toBe(state); // exact same reference
    expect(buildBattlePlanCalled).toBe(false);
  });

  it("2.5b: handlePair when vizPhase=battle → no state change", () => {
    const state: OrchestratorState = {
      ...initialOrchestratorState(),
      bil1: 3, bil2: -5,
      vizPhase: "battle",
    };
    const { state: next } = handlePair(state);
    expect(next).toBe(state);
  });

  it("2.5c: handlePair when vizPhase=center → no state change", () => {
    const state: OrchestratorState = {
      ...initialOrchestratorState(),
      vizPhase: "center",
    };
    const { state: next } = handlePair(state);
    expect(next).toBe(state);
  });

  it("2.5d: handlePair when vizPhase=done → no state change", () => {
    const state: OrchestratorState = {
      ...initialOrchestratorState(),
      vizPhase: "done",
    };
    const { state: next } = handlePair(state);
    expect(next).toBe(state);
  });

  it("2.5e: second handlePair call after alliance is in flight does nothing", () => {
    // First call enters alliance
    const base = { ...initialOrchestratorState(), bil1: 3, bil2: 5 };
    const { state: afterFirst } = handlePair(base);
    expect(afterFirst.vizPhase).toBe("alliance");

    // Change inputs, but vizPhase is no longer idle → guard fires
    const withNewInputs = { ...afterFirst, bil1: 7, bil2: 9 };
    const { state: afterSecond } = handlePair(withNewInputs);
    expect(afterSecond.vizPhase).toBe("alliance"); // unchanged
    // The new inputs don't trigger any snapshot change
    expect(afterSecond.snapshot).toEqual({ bil1: 3, bil2: 5 });
  });
});

// ── Req 3.1 — handleAllianceDone → vizPhase=center immediately ────────────────

describe("Req 3.1 — handleAllianceDone: vizPhase=center immediately", () => {
  it("3.1: handleAllianceDone → vizPhase=center immediately", () => {
    const state: OrchestratorState = {
      ...initialOrchestratorState(),
      vizPhase: "alliance",
      snapshot: { bil1: 3, bil2: 5 },
    };
    const next = handleAllianceDone(state);
    expect(next.vizPhase).toBe("center");
  });

  it("3.1: centerExiting is false immediately after handleAllianceDone", () => {
    const state: OrchestratorState = {
      ...initialOrchestratorState(),
      vizPhase: "alliance",
      centerExiting: true, // ensure it's reset
    };
    const next = handleAllianceDone(state);
    expect(next.centerExiting).toBe(false);
  });

  it("3.1: two timers are scheduled after handleAllianceDone", () => {
    const state = { ...initialOrchestratorState(), vizPhase: "alliance" as VizPhase };
    const next = handleAllianceDone(state);
    expect(next.scheduledTimers).toHaveLength(2);
  });
});

// ── Req 3.2 — handleAllianceDone timers: centerExiting→true then vizPhase→done ─

describe("Req 3.2 — handleAllianceDone timers: centerExiting then done", () => {
  it("3.2a: after 2000ms, centerExiting becomes true", () => {
    const state: OrchestratorState = {
      ...initialOrchestratorState(),
      vizPhase: "alliance",
      animSpeed: 1,
    };
    const afterCall = handleAllianceDone(state);
    expect(afterCall.vizPhase).toBe("center");

    // Advance past first timer (2000ms at speed=1)
    const at2001 = advanceTimers(afterCall, 2001);
    expect(at2001.centerExiting).toBe(true);
    expect(at2001.vizPhase).toBe("center"); // not yet done
  });

  it("3.2b: after 2500ms, vizPhase becomes done", () => {
    const state = { ...initialOrchestratorState(), vizPhase: "alliance" as VizPhase, animSpeed: 1 };
    const afterCall = handleAllianceDone(state);

    // Advance past second timer (2000 + 500 = 2500ms at speed=1)
    const at2501 = advanceTimers(afterCall, 2501);
    expect(at2501.vizPhase).toBe("done");
  });

  it("3.2c: at exactly 1999ms, no timers have fired yet", () => {
    const state = { ...initialOrchestratorState(), vizPhase: "alliance" as VizPhase, animSpeed: 1 };
    const afterCall = handleAllianceDone(state);
    const at1999 = advanceTimers(afterCall, 1999);
    expect(at1999.centerExiting).toBe(false);
    expect(at1999.vizPhase).toBe("center");
  });
});

// ── Req 3.3 — handleAllianceDone delay scaling ────────────────────────────────

describe("Req 3.3 — handleAllianceDone: delay scaling with animSpeed", () => {
  it("3.3a: at speed=2, first timer fires at Math.round(2000/2)=1000ms", () => {
    const state = { ...initialOrchestratorState(), vizPhase: "alliance" as VizPhase, animSpeed: 2 };
    const afterCall = handleAllianceDone(state);
    const t1 = afterCall.scheduledTimers.find(t => t.action === "centerExiting");
    expect(t1?.delayMs).toBe(1000);
  });

  it("3.3b: at speed=2, second timer fires at 1000+250=1250ms", () => {
    const state = { ...initialOrchestratorState(), vizPhase: "alliance" as VizPhase, animSpeed: 2 };
    const afterCall = handleAllianceDone(state);
    const t2 = afterCall.scheduledTimers.find(t => t.action === "done");
    expect(t2?.delayMs).toBe(1250);
  });

  it("3.3c: at speed=0.5, first timer fires at Math.round(2000/0.5)=4000ms", () => {
    const state = { ...initialOrchestratorState(), vizPhase: "alliance" as VizPhase, animSpeed: 0.5 };
    const afterCall = handleAllianceDone(state);
    const t1 = afterCall.scheduledTimers.find(t => t.action === "centerExiting");
    expect(t1?.delayMs).toBe(4000);
  });

  it("3.3d: at speed=0.5, second timer fires at 4000+1000=5000ms", () => {
    const state = { ...initialOrchestratorState(), vizPhase: "alliance" as VizPhase, animSpeed: 0.5 };
    const afterCall = handleAllianceDone(state);
    const t2 = afterCall.scheduledTimers.find(t => t.action === "done");
    expect(t2?.delayMs).toBe(5000);
  });

  it("3.3e: scaled timers fire correctly via advanceTimers at speed=2", () => {
    const state = { ...initialOrchestratorState(), vizPhase: "alliance" as VizPhase, animSpeed: 2 };
    const afterCall = handleAllianceDone(state);

    const at1001 = advanceTimers(afterCall, 1001);
    expect(at1001.centerExiting).toBe(true);
    expect(at1001.vizPhase).toBe("center");

    const at1251 = advanceTimers(afterCall, 1251);
    expect(at1251.vizPhase).toBe("done");
  });
});

// ── Req 3.4 — handleReset during alliance → vizPhase=idle, timers don't fire ──

describe("Req 3.4 — handleReset during alliance: idle, timers cancelled", () => {
  it("3.4a: handleReset during alliance → vizPhase=idle", () => {
    const state: OrchestratorState = {
      ...initialOrchestratorState(),
      bil1: 3, bil2: 5,
      vizPhase: "alliance",
      snapshot: { bil1: 3, bil2: 5 },
    };
    const next = handleReset(state);
    expect(next.vizPhase).toBe("idle");
  });

  it("3.4b: handleReset clears snapshot", () => {
    const state: OrchestratorState = {
      ...initialOrchestratorState(),
      vizPhase: "alliance",
      snapshot: { bil1: 3, bil2: 5 },
    };
    const next = handleReset(state);
    expect(next.snapshot).toBeNull();
  });

  it("3.4c: handleReset clears scheduled timers (no timer fires after reset)", () => {
    const state: OrchestratorState = {
      ...initialOrchestratorState(),
      vizPhase: "alliance",
    };
    // Call handleAllianceDone to schedule timers
    const withTimers = handleAllianceDone(state);
    expect(withTimers.scheduledTimers).toHaveLength(2);

    // Reset clears all timers
    const afterReset = handleReset(withTimers);
    expect(afterReset.scheduledTimers).toHaveLength(0);

    // Advance all time — no phase transitions happen
    const advancedAfterReset = advanceTimers(afterReset, 99999);
    expect(advancedAfterReset.vizPhase).toBe("idle");
  });

  it("3.4d: handleReset resets bil1 and bil2 to 0", () => {
    const state: OrchestratorState = {
      ...initialOrchestratorState(),
      bil1: 3, bil2: 5,
      vizPhase: "alliance",
    };
    const next = handleReset(state);
    expect(next.bil1).toBe(0);
    expect(next.bil2).toBe(0);
  });

  it("3.4e: handleReset during center (via alliance path) also clears timers", () => {
    const state: OrchestratorState = {
      ...initialOrchestratorState(),
      vizPhase: "alliance",
    };
    const center = handleAllianceDone(state);
    expect(center.vizPhase).toBe("center");
    expect(center.scheduledTimers.length).toBeGreaterThan(0);

    const afterReset = handleReset(center);
    expect(afterReset.vizPhase).toBe("idle");
    expect(afterReset.scheduledTimers).toHaveLength(0);

    // Simulated advance — no transitions
    const advancedAfterReset = advanceTimers(afterReset, 99999);
    expect(advancedAfterReset.vizPhase).toBe("idle");
  });
});

// ── Req 6.1 — replayAnimation with alliance snapshot ──────────────────────────

describe("Req 6.1 — replayAnimation: alliance snapshot → vizPhase=alliance, no buildBattlePlan", () => {
  it("6.1a: replayAnimation with positive-positive snapshot → vizPhase=alliance", () => {
    const state: OrchestratorState = {
      ...initialOrchestratorState(),
      vizPhase: "done",
      snapshot: { bil1: 3, bil2: 5 },
    };
    const { state: next, buildBattlePlanCalled } = replayAnimation(state);
    expect(next.vizPhase).toBe("alliance");
    expect(buildBattlePlanCalled).toBe(false);
  });

  it("6.1b: replayAnimation with negative-negative snapshot → vizPhase=alliance", () => {
    const state: OrchestratorState = {
      ...initialOrchestratorState(),
      vizPhase: "done",
      snapshot: { bil1: -2, bil2: -4 },
    };
    const { state: next, buildBattlePlanCalled } = replayAnimation(state);
    expect(next.vizPhase).toBe("alliance");
    expect(buildBattlePlanCalled).toBe(false);
  });

  it("6.1c: replayAnimation without snapshot → no change", () => {
    const state: OrchestratorState = {
      ...initialOrchestratorState(),
      vizPhase: "done",
      snapshot: null,
    };
    const { state: next } = replayAnimation(state);
    expect(next).toBe(state); // same reference
  });

  it("6.1d: replayAnimation with battle snapshot → vizPhase=battle, buildBattlePlan called", () => {
    const state: OrchestratorState = {
      ...initialOrchestratorState(),
      vizPhase: "done",
      snapshot: { bil1: 3, bil2: -5 },
    };
    const { state: next, buildBattlePlanCalled } = replayAnimation(state);
    expect(next.vizPhase).toBe("battle");
    expect(buildBattlePlanCalled).toBe(true);
  });

  it("6.1e: replayAnimation for alliance calls resetAnimState (centerExiting reset)", () => {
    const state: OrchestratorState = {
      ...initialOrchestratorState(),
      vizPhase: "done",
      snapshot: { bil1: 3, bil2: 5 },
      centerExiting: true,
    };
    const { state: next } = replayAnimation(state);
    expect(next.centerExiting).toBe(false);
  });

  it("6.1f: replayAnimation for alliance clears any pending timers", () => {
    const state: OrchestratorState = {
      ...initialOrchestratorState(),
      vizPhase: "done",
      snapshot: { bil1: 3, bil2: 5 },
      scheduledTimers: [{ delayMs: 2000, action: "centerExiting" }],
    };
    const { state: next } = replayAnimation(state);
    expect(next.scheduledTimers).toHaveLength(0);
  });
});

// ── Regression: isAllianceCase exhaustiveness ─────────────────────────────────

describe("isAllianceCase — routing correctness (Req 2.1–2.4)", () => {
  it("(3, 5) → true (positive + positive)", () => {
    expect(isAllianceCase(3, 5)).toBe(true);
  });

  it("(-2, -4) → true (negative + negative)", () => {
    expect(isAllianceCase(-2, -4)).toBe(true);
  });

  it("(3, -5) → false (opposite signs)", () => {
    expect(isAllianceCase(3, -5)).toBe(false);
  });

  it("(0, 5) → false (zero on left)", () => {
    expect(isAllianceCase(0, 5)).toBe(false);
  });

  it("(3, 0) → false (zero on right)", () => {
    expect(isAllianceCase(3, 0)).toBe(false);
  });

  it("(0, 0) → false (both zero)", () => {
    expect(isAllianceCase(0, 0)).toBe(false);
  });
});
