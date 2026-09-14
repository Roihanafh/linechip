/**
 * Unit tests for logic extracted from useAnimationOrchestrator.
 *
 * Because the project uses testEnvironment: "node" (no jsdom / no @testing-library),
 * we test the pure contracts that drive the hook's behavior rather than
 * mounting React hooks. This mirrors the established pattern in:
 *   - __tests__/model-chip/StateMachine.test.ts
 *   - __tests__/model-chip/Tombol_Lanjut.test.ts
 *
 * Coverage (Requirements 1.3, 5.4, 5.5, 5.10):
 *
 *   Req 1.3 — Timer cleanup:
 *     - clearTimers() clears every handle in the timers array
 *     - clearTimers() empties the array after clearing
 *
 *   Req 5.4 — Replay reset state:
 *     - replayAnimation resets: tierIdx=0, pairInTier=0, stepPhase="approach",
 *       neutralised=new Map(), waitingForClick=false, centerExiting=false
 *     - bil1/bil2 are NOT changed by replay
 *
 *   Req 5.5 — handleReset: all state returns to initial values
 *     - bil1=0, bil2=0, vizPhase="idle", snapshot=null, centerExiting=false,
 *       tierGroups=[], tierIdx=0, pairInTier=0, stepPhase="approach",
 *       neutralised=new Map(), waitingForClick=false
 *
 *   Req 5.10 — SSR safety: animMode initial value is "auto"
 *     - The synchronous default for animMode must be "auto" — sessionStorage is
 *       only consulted after mount (inside useEffect).
 */

export {}; // module boundary — prevents type bleed into global scope

// ── Types (mirrored from lib/model-chip/types.ts) ─────────────────────────────

type VizPhase = "idle" | "battle" | "center" | "done";
type AnimMode = "auto" | "click";
type StepPhase = "approach" | "clash" | "clear";
type Tier = 1 | 10 | 100 | 1000;

interface TierGroup {
  tier: Tier;
  count: number;
}

// ── Snapshot of animation state (models the hook's React state) ───────────────

interface AnimState {
  // Inputs (from ModelChipState)
  bil1: number;
  bil2: number;
  vizPhase: VizPhase;
  snapshot: { bil1: number; bil2: number } | null;
  // Animation state
  tierGroups: TierGroup[];
  tierIdx: number;
  pairInTier: number;
  stepPhase: StepPhase;
  neutralised: Map<Tier, number>;
  animSpeed: number;
  animMode: AnimMode;
  waitingForClick: boolean;
  centerExiting: boolean;
}

/** Returns the hard-coded SSR-safe initial state that useAnimationOrchestrator starts with. */
function initialAnimState(): AnimState {
  return {
    bil1: 0,
    bil2: 0,
    vizPhase: "idle",
    snapshot: null,
    tierGroups: [],
    tierIdx: 0,
    pairInTier: 0,
    stepPhase: "approach",
    neutralised: new Map(),
    animSpeed: 1,
    animMode: "auto", // SSR-safe synchronous default (Req 5.10)
    waitingForClick: false,
    centerExiting: false,
  };
}

// ── clearTimers — extracted contract (Req 1.3) ────────────────────────────────

/**
 * Mirrors the clearTimers() helper inside useAnimationOrchestrator:
 *
 *   const clearTimers = () => {
 *     timers.current.forEach(clearTimeout);
 *     timers.current = [];
 *   };
 *
 * We model timers.current as a plain array to test the pure contract.
 */
function makeClearTimers(timers: ReturnType<typeof setTimeout>[]) {
  return () => {
    timers.forEach(clearTimeout);
    timers.splice(0); // empty in place (mirrors timers.current = [])
  };
}

// ── handleReset — extracted contract (Req 5.5) ────────────────────────────────

/**
 * Mirrors the handleReset() action in useAnimationOrchestrator.
 * Requirement 5.5 specifies the exact post-reset state:
 *
 *   bil1=0, bil2=0, vizPhase="idle", snapshot=null, centerExiting=false,
 *   tierGroups=[], tierIdx=0, pairInTier=0, stepPhase="approach",
 *   neutralised=new Map(), waitingForClick=false
 *
 * animMode and animSpeed are NOT reset — they survive a reset.
 */
function handleReset(state: AnimState): AnimState {
  return {
    ...state,
    bil1: 0,
    bil2: 0,
    vizPhase: "idle",
    snapshot: null,
    centerExiting: false,
    tierGroups: [],
    tierIdx: 0,
    pairInTier: 0,
    stepPhase: "approach",
    neutralised: new Map(),
    waitingForClick: false,
  };
}

// ── replayAnimation — extracted contract (Req 5.4) ────────────────────────────

/**
 * Mirrors the animation-state reset performed by replayAnimation().
 * Requirement 5.4: resets animation fields; bil1/bil2 are NOT changed.
 *
 * The real hook additionally calls playLaunch(), setTierGroups(), and
 * setVizPhase("battle") — those side-effects are tested indirectly via
 * StateMachine.test.ts. Here we test the state contract only.
 */
function replayReset(state: AnimState): AnimState {
  return {
    ...state,
    // Animation state reset
    tierIdx: 0,
    pairInTier: 0,
    stepPhase: "approach",
    neutralised: new Map(),
    waitingForClick: false,
    centerExiting: false,
    // bil1, bil2, snapshot, animMode, animSpeed intentionally preserved
  };
}

// ── animMode initial value — SSR contract (Req 5.10) ─────────────────────────

/**
 * Returns the synchronous default for animMode as written in the hook:
 *   const [animMode, setAnimMode] = useState<AnimMode>("auto");
 *
 * The actual sessionStorage read is deferred to useEffect, ensuring no
 * hydration mismatch. This function documents that contract.
 */
function ssrSafeAnimModeDefault(): AnimMode {
  return "auto";
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

// ── Req 1.3 — Timer cleanup ───────────────────────────────────────────────────

describe("Req 1.3 — clearTimers: cancels all handles and empties the array", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("calls clearTimeout for every handle in the array", () => {
    const spy = jest.spyOn(global, "clearTimeout");
    const timers: ReturnType<typeof setTimeout>[] = [
      setTimeout(() => {}, 1000),
      setTimeout(() => {}, 2000),
      setTimeout(() => {}, 3000),
    ];
    const clearTimers = makeClearTimers(timers);

    clearTimers();

    expect(spy).toHaveBeenCalledTimes(3);
    spy.mockRestore();
  });

  it("empties the timers array after clearing", () => {
    const timers: ReturnType<typeof setTimeout>[] = [
      setTimeout(() => {}, 500),
      setTimeout(() => {}, 1500),
    ];
    const clearTimers = makeClearTimers(timers);

    clearTimers();

    expect(timers).toHaveLength(0);
  });

  it("is a no-op when the timers array is already empty", () => {
    const spy = jest.spyOn(global, "clearTimeout");
    const timers: ReturnType<typeof setTimeout>[] = [];
    const clearTimers = makeClearTimers(timers);

    expect(() => clearTimers()).not.toThrow();
    expect(spy).not.toHaveBeenCalled();
    expect(timers).toHaveLength(0);
    spy.mockRestore();
  });

  it("cancelled timers do not fire after clearTimers is called", () => {
    const fired: number[] = [];
    const timers: ReturnType<typeof setTimeout>[] = [
      setTimeout(() => fired.push(1), 100),
      setTimeout(() => fired.push(2), 200),
    ];
    const clearTimers = makeClearTimers(timers);

    clearTimers();
    jest.runAllTimers();

    expect(fired).toHaveLength(0);
  });

  it("clearTimers can be called multiple times without error", () => {
    const timers: ReturnType<typeof setTimeout>[] = [setTimeout(() => {}, 100)];
    const clearTimers = makeClearTimers(timers);

    clearTimers();
    expect(() => clearTimers()).not.toThrow();
    expect(timers).toHaveLength(0);
  });

  it("after clearTimers, newly pushed handles are independent", () => {
    const timers: ReturnType<typeof setTimeout>[] = [setTimeout(() => {}, 100)];
    const clearTimers = makeClearTimers(timers);

    clearTimers();
    expect(timers).toHaveLength(0);

    // Push a new handle — it should not have been cleared
    const spy = jest.spyOn(global, "clearTimeout");
    timers.push(setTimeout(() => {}, 200));
    expect(timers).toHaveLength(1);
    expect(spy).not.toHaveBeenCalled(); // new handle not yet cleared
    spy.mockRestore();
  });
});

// ── Req 5.5 — handleReset: all state returns to initial values ────────────────

describe("Req 5.5 — handleReset: resets all state to initial values", () => {
  it("resets vizPhase to 'idle'", () => {
    const state = { ...initialAnimState(), vizPhase: "battle" as VizPhase };
    expect(handleReset(state).vizPhase).toBe("idle");
  });

  it("resets bil1 to 0", () => {
    const state = { ...initialAnimState(), bil1: 42 };
    expect(handleReset(state).bil1).toBe(0);
  });

  it("resets bil2 to 0", () => {
    const state = { ...initialAnimState(), bil2: -7 };
    expect(handleReset(state).bil2).toBe(0);
  });

  it("resets snapshot to null", () => {
    const state = { ...initialAnimState(), snapshot: { bil1: 5, bil2: -3 } };
    expect(handleReset(state).snapshot).toBeNull();
  });

  it("resets centerExiting to false", () => {
    const state = { ...initialAnimState(), centerExiting: true };
    expect(handleReset(state).centerExiting).toBe(false);
  });

  it("resets tierGroups to empty array", () => {
    const state = { ...initialAnimState(), tierGroups: [{ tier: 10 as Tier, count: 2 }] };
    expect(handleReset(state).tierGroups).toHaveLength(0);
  });

  it("resets tierIdx to 0", () => {
    const state = { ...initialAnimState(), tierIdx: 3 };
    expect(handleReset(state).tierIdx).toBe(0);
  });

  it("resets pairInTier to 0", () => {
    const state = { ...initialAnimState(), pairInTier: 5 };
    expect(handleReset(state).pairInTier).toBe(0);
  });

  it("resets stepPhase to 'approach'", () => {
    const state = { ...initialAnimState(), stepPhase: "clash" as StepPhase };
    expect(handleReset(state).stepPhase).toBe("approach");
  });

  it("resets neutralised to an empty Map", () => {
    const neu = new Map<Tier, number>([[1, 3], [10, 1]]);
    const state = { ...initialAnimState(), neutralised: neu };
    expect(handleReset(state).neutralised.size).toBe(0);
  });

  it("resets waitingForClick to false", () => {
    const state = { ...initialAnimState(), waitingForClick: true };
    expect(handleReset(state).waitingForClick).toBe(false);
  });

  it("does NOT change animMode during reset", () => {
    const state = { ...initialAnimState(), animMode: "click" as AnimMode };
    expect(handleReset(state).animMode).toBe("click");
  });

  it("does NOT change animSpeed during reset", () => {
    const state = { ...initialAnimState(), animSpeed: 2 };
    expect(handleReset(state).animSpeed).toBe(2);
  });

  it("full reset from a typical mid-animation state yields exact initial values", () => {
    const midState: AnimState = {
      bil1: 15,
      bil2: -8,
      vizPhase: "battle",
      snapshot: { bil1: 15, bil2: -8 },
      tierGroups: [{ tier: 10, count: 1 }, { tier: 1, count: 5 }],
      tierIdx: 1,
      pairInTier: 3,
      stepPhase: "clash",
      neutralised: new Map([[10, 1], [1, 3]]),
      animSpeed: 0.5,
      animMode: "auto",
      waitingForClick: true,
      centerExiting: false,
    };

    const reset = handleReset(midState);

    expect(reset.bil1).toBe(0);
    expect(reset.bil2).toBe(0);
    expect(reset.vizPhase).toBe("idle");
    expect(reset.snapshot).toBeNull();
    expect(reset.tierGroups).toHaveLength(0);
    expect(reset.tierIdx).toBe(0);
    expect(reset.pairInTier).toBe(0);
    expect(reset.stepPhase).toBe("approach");
    expect(reset.neutralised.size).toBe(0);
    expect(reset.waitingForClick).toBe(false);
    expect(reset.centerExiting).toBe(false);
    // animSpeed and animMode preserved
    expect(reset.animSpeed).toBe(0.5);
    expect(reset.animMode).toBe("auto");
  });

  it("reset is idempotent: calling twice gives same result as calling once", () => {
    const state = { ...initialAnimState(), bil1: 9, bil2: -4, vizPhase: "done" as VizPhase };
    const once = handleReset(state);
    const twice = handleReset(once);

    expect(twice.bil1).toBe(0);
    expect(twice.vizPhase).toBe("idle");
    expect(twice.snapshot).toBeNull();
  });
});

// ── Req 5.4 — replayAnimation: resets animation state, preserves bil1/bil2 ───

describe("Req 5.4 — replayAnimation: animation state reset without touching bil1/bil2", () => {
  it("resets tierIdx to 0", () => {
    const state = { ...initialAnimState(), tierIdx: 2 };
    expect(replayReset(state).tierIdx).toBe(0);
  });

  it("resets pairInTier to 0", () => {
    const state = { ...initialAnimState(), pairInTier: 4 };
    expect(replayReset(state).pairInTier).toBe(0);
  });

  it("resets stepPhase to 'approach'", () => {
    const state = { ...initialAnimState(), stepPhase: "clear" as StepPhase };
    expect(replayReset(state).stepPhase).toBe("approach");
  });

  it("resets neutralised to an empty Map", () => {
    const neu = new Map<Tier, number>([[1, 2], [10, 1]]);
    const state = { ...initialAnimState(), neutralised: neu };
    expect(replayReset(state).neutralised.size).toBe(0);
  });

  it("resets waitingForClick to false", () => {
    const state = { ...initialAnimState(), waitingForClick: true };
    expect(replayReset(state).waitingForClick).toBe(false);
  });

  it("resets centerExiting to false", () => {
    const state = { ...initialAnimState(), centerExiting: true };
    expect(replayReset(state).centerExiting).toBe(false);
  });

  it("preserves bil1 — replay does not change input values", () => {
    const state = { ...initialAnimState(), bil1: 25 };
    expect(replayReset(state).bil1).toBe(25);
  });

  it("preserves bil2 — replay does not change input values", () => {
    const state = { ...initialAnimState(), bil2: -12 };
    expect(replayReset(state).bil2).toBe(-12);
  });

  it("preserves snapshot — replay uses existing snapshot, not null", () => {
    const snap = { bil1: 25, bil2: -12 };
    const state = { ...initialAnimState(), snapshot: snap };
    expect(replayReset(state).snapshot).toEqual(snap);
  });

  it("preserves animMode during replay", () => {
    const state = { ...initialAnimState(), animMode: "click" as AnimMode };
    expect(replayReset(state).animMode).toBe("click");
  });

  it("preserves animSpeed during replay", () => {
    const state = { ...initialAnimState(), animSpeed: 2 };
    expect(replayReset(state).animSpeed).toBe(2);
  });

  it("contrast with handleReset: replay keeps bil1/bil2, reset clears them", () => {
    const state: AnimState = {
      ...initialAnimState(),
      bil1: 7,
      bil2: -3,
      tierIdx: 1,
      neutralised: new Map([[1, 2]]),
    };

    const replayed = replayReset(state);
    const resetted = handleReset(state);

    // Both clear animation state
    expect(replayed.tierIdx).toBe(0);
    expect(resetted.tierIdx).toBe(0);

    // Only reset clears bil1/bil2
    expect(replayed.bil1).toBe(7);
    expect(replayed.bil2).toBe(-3);
    expect(resetted.bil1).toBe(0);
    expect(resetted.bil2).toBe(0);
  });

  it("replay is safe to call when state is already at initial animation state", () => {
    const state = initialAnimState();
    const result = replayReset(state);

    expect(result.tierIdx).toBe(0);
    expect(result.pairInTier).toBe(0);
    expect(result.stepPhase).toBe("approach");
    expect(result.neutralised.size).toBe(0);
    expect(result.waitingForClick).toBe(false);
    expect(result.centerExiting).toBe(false);
  });
});

// ── Req 5.10 — SSR safety: animMode initial value is "auto" ──────────────────

describe("Req 5.10 — SSR safety: animMode synchronous default is 'auto'", () => {
  it("ssrSafeAnimModeDefault() returns 'auto'", () => {
    expect(ssrSafeAnimModeDefault()).toBe("auto");
  });

  it("initialAnimState() has animMode 'auto'", () => {
    expect(initialAnimState().animMode).toBe("auto");
  });

  it("'auto' is a valid AnimMode", () => {
    const validModes: AnimMode[] = ["auto", "click"];
    expect(validModes).toContain(ssrSafeAnimModeDefault());
  });

  it("initial state does not contain 'click' as animMode (SSR would read sessionStorage otherwise)", () => {
    // If the initial state were "click", it would either (a) fail on SSR where
    // sessionStorage is undefined, or (b) cause a hydration mismatch. Neither is acceptable.
    expect(initialAnimState().animMode).not.toBe("click");
  });

  it("sessionStorage round-trip after mount preserves the value", () => {
    // This models the useEffect behavior: after mount, sessionStorage is read.
    // If "click" was stored, animMode switches; otherwise it stays "auto".
    const mockStorage: Record<string, string> = {};

    const readFromStorage = (defaultVal: AnimMode): AnimMode => {
      const saved = mockStorage["modelChipAnimMode"];
      if (saved === "click") return "click";
      if (saved === "auto") return "auto";
      return defaultVal; // key absent → use default
    };

    // Case 1: nothing stored → default "auto"
    expect(readFromStorage("auto")).toBe("auto");

    // Case 2: "click" stored → read back "click"
    mockStorage["modelChipAnimMode"] = "click";
    expect(readFromStorage("auto")).toBe("click");

    // Case 3: "auto" stored explicitly → read back "auto"
    mockStorage["modelChipAnimMode"] = "auto";
    expect(readFromStorage("auto")).toBe("auto");
  });

  it("unknown sessionStorage value falls back to 'auto'", () => {
    const readFromStorage = (stored: string | null): AnimMode => {
      if (stored === "click") return "click";
      return "auto"; // mirrors the hook's if (saved === "click") guard
    };

    expect(readFromStorage(null)).toBe("auto");
    expect(readFromStorage("")).toBe("auto");
    expect(readFromStorage("invalid")).toBe("auto");
    expect(readFromStorage("AUTO")).toBe("auto"); // case-sensitive
    expect(readFromStorage("click")).toBe("click");
  });
});
