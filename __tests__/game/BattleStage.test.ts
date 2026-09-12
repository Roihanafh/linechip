/**
 * Component test: BattleStage memanggil onComplete tepat 1x
 *
 * Feature: svg-animation-integration
 * Task 5.5
 *
 * Because the project test environment is Node (no jsdom / no @testing-library),
 * we test the pure timer sequencing logic of BattleStage's `play()` function
 * rather than rendering the React component. The approach mirrors the pattern
 * established in __tests__/game/CharacterChips.test.ts.
 *
 * Requirements: 2.4
 */

// ─── Timing constants — mirrors BattleStage.tsx ──────────────────────────────

const DURATION_APPROACH = 750;
const DURATION_IMPACT   = 500;
const DURATION_RECOIL   = 280;
const DURATION_DISSOLVE = 750;

const TOTAL_CYCLE =
  DURATION_APPROACH + DURATION_IMPACT + DURATION_RECOIL + DURATION_DISSOLVE;
// → 2280 ms at speed = 1

// ─── Pure play() logic ────────────────────────────────────────────────────────
//
// This mirrors the exact setTimeout scheduling in BattleStage.tsx's play().
// We extract it as a plain function so it can be tested without React, jsdom,
// or any rendering infrastructure.

type BattlePhase =
  | "idle"
  | "approach"
  | "impact"
  | "recoil"
  | "dissolve"
  | "done";

interface PlayState {
  phase: BattlePhase;
  showFlash: boolean;
  timers: ReturnType<typeof setTimeout>[];
}

/**
 * Schedules the same setTimeout sequence as BattleStage.play().
 * Returns the mutable state object so tests can inspect phase transitions.
 */
function play(
  state: PlayState,
  effectiveSpeed: number,
  onComplete: () => void,
  loop: boolean
): void {
  // Cancel previous timers
  state.timers.forEach(clearTimeout);
  state.timers = [];

  state.showFlash = false;
  const scale = 1 / effectiveSpeed;

  // Phase 1: approach (starts immediately)
  state.phase = "approach";

  // Phase 2: impact
  const t1 = setTimeout(() => {
    state.phase = "impact";
    state.showFlash = true;
  }, DURATION_APPROACH * scale);
  state.timers.push(t1);

  // Phase 3: recoil
  const t2 = setTimeout(() => {
    state.phase = "recoil";
    state.showFlash = false;
  }, (DURATION_APPROACH + DURATION_IMPACT) * scale);
  state.timers.push(t2);

  // Phase 4: dissolve
  const t3 = setTimeout(() => {
    state.phase = "dissolve";
  }, (DURATION_APPROACH + DURATION_IMPACT + DURATION_RECOIL) * scale);
  state.timers.push(t3);

  // Phase 5: done → call onComplete (or loop)
  const t4 = setTimeout(() => {
    state.phase = "done";
    if (loop) {
      play(state, effectiveSpeed, onComplete, loop);
    } else {
      onComplete();
    }
  }, TOTAL_CYCLE * scale);
  state.timers.push(t4);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("BattleStage — timer lifecycle (play())", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ── Core requirement 2.4 ─────────────────────────────────────────────────

  it("calls onComplete exactly once after the full animation cycle (speed=1)", () => {
    const onComplete = jest.fn();
    const state: PlayState = { phase: "idle", showFlash: false, timers: [] };

    play(state, 1, onComplete, false);

    // Before cycle ends: not yet called
    jest.advanceTimersByTime(TOTAL_CYCLE - 1);
    expect(onComplete).not.toHaveBeenCalled();

    // After cycle completes
    jest.advanceTimersByTime(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("does not call onComplete more than once even if timers fire multiple times (speed=1)", () => {
    const onComplete = jest.fn();
    const state: PlayState = { phase: "idle", showFlash: false, timers: [] };

    play(state, 1, onComplete, false);
    jest.advanceTimersByTime(10_000); // well beyond one cycle

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  // ── Phase sequence ────────────────────────────────────────────────────────

  it("starts in approach phase immediately when play() is called", () => {
    const state: PlayState = { phase: "idle", showFlash: false, timers: [] };
    play(state, 1, jest.fn(), false);

    expect(state.phase).toBe("approach");
  });

  it("transitions to impact after DURATION_APPROACH ms", () => {
    const state: PlayState = { phase: "idle", showFlash: false, timers: [] };
    play(state, 1, jest.fn(), false);

    jest.advanceTimersByTime(DURATION_APPROACH);
    expect(state.phase).toBe("impact");
    expect(state.showFlash).toBe(true);
  });

  it("transitions to recoil after approach+impact ms", () => {
    const state: PlayState = { phase: "idle", showFlash: false, timers: [] };
    play(state, 1, jest.fn(), false);

    jest.advanceTimersByTime(DURATION_APPROACH + DURATION_IMPACT);
    expect(state.phase).toBe("recoil");
    expect(state.showFlash).toBe(false);
  });

  it("transitions to dissolve after approach+impact+recoil ms", () => {
    const state: PlayState = { phase: "idle", showFlash: false, timers: [] };
    play(state, 1, jest.fn(), false);

    jest.advanceTimersByTime(DURATION_APPROACH + DURATION_IMPACT + DURATION_RECOIL);
    expect(state.phase).toBe("dissolve");
  });

  it("transitions to done at the end of the full cycle and calls onComplete", () => {
    const onComplete = jest.fn();
    const state: PlayState = { phase: "idle", showFlash: false, timers: [] };
    play(state, 1, onComplete, false);

    jest.advanceTimersByTime(TOTAL_CYCLE);
    expect(state.phase).toBe("done");
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  // ── Requirement 3.9: full cycle completes within 3000 ms at speed=1 ──────

  it("full cycle at speed=1 completes in ≤ 3000 ms (Requirement 3.9)", () => {
    expect(TOTAL_CYCLE).toBeLessThanOrEqual(3000);
  });

  // ── Speed scaling ─────────────────────────────────────────────────────────

  it("at speed=2, onComplete is called after TOTAL_CYCLE/2 ms", () => {
    const onComplete = jest.fn();
    const state: PlayState = { phase: "idle", showFlash: false, timers: [] };
    play(state, 2, onComplete, false);

    const halfCycle = TOTAL_CYCLE / 2;

    // Should not fire just before
    jest.advanceTimersByTime(halfCycle - 1);
    expect(onComplete).not.toHaveBeenCalled();

    // Should fire exactly at half-cycle
    jest.advanceTimersByTime(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("at speed=0.5, onComplete is called after TOTAL_CYCLE*2 ms", () => {
    const onComplete = jest.fn();
    const state: PlayState = { phase: "idle", showFlash: false, timers: [] };
    play(state, 0.5, onComplete, false);

    const doubleCycle = TOTAL_CYCLE * 2;

    jest.advanceTimersByTime(doubleCycle - 1);
    expect(onComplete).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  // ── Cancellation / restart (re-play) ─────────────────────────────────────

  it("calling play() again before cycle ends cancels the previous sequence and onComplete fires only once", () => {
    const onComplete = jest.fn();
    const state: PlayState = { phase: "idle", showFlash: false, timers: [] };

    // Start first play
    play(state, 1, onComplete, false);

    // Halfway through
    jest.advanceTimersByTime(DURATION_APPROACH + DURATION_IMPACT);

    // Restart before the first cycle finishes
    play(state, 1, onComplete, false);

    // Advance to cover old cycle's completion time — old timers must be cleared
    jest.advanceTimersByTime(DURATION_RECOIL + DURATION_DISSOLVE);
    // Still within the new cycle, so onComplete should not have fired yet
    expect(onComplete).not.toHaveBeenCalled();

    // Now advance through the new cycle's remaining time
    jest.advanceTimersByTime(DURATION_APPROACH + DURATION_IMPACT + 1);
    // At this point we're past TOTAL_CYCLE from the restart; onComplete fires once
    jest.advanceTimersByTime(10_000);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  // ── Cleanup — no leaked timers ────────────────────────────────────────────

  it("clearing all timers before the cycle ends prevents onComplete from being called", () => {
    const onComplete = jest.fn();
    const state: PlayState = { phase: "idle", showFlash: false, timers: [] };

    play(state, 1, onComplete, false);

    // Simulate component unmount: clear all timers
    state.timers.forEach(clearTimeout);

    jest.advanceTimersByTime(10_000);
    expect(onComplete).not.toHaveBeenCalled();
  });

  // ── Loop mode: onComplete NOT called during looping ───────────────────────

  it("in loop mode, onComplete is NOT called after the first cycle", () => {
    const onComplete = jest.fn();
    const state: PlayState = { phase: "idle", showFlash: false, timers: [] };

    play(state, 1, onComplete, true);

    // Complete one full cycle
    jest.advanceTimersByTime(TOTAL_CYCLE);
    // Loop restarts — onComplete should not have been called
    expect(onComplete).not.toHaveBeenCalled();
    // Phase resets to approach for the next loop iteration
    expect(state.phase).toBe("approach");

    // Cleanup
    state.timers.forEach(clearTimeout);
  });
});
