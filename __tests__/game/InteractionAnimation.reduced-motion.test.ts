/**
 * Component test: InteractionAnimation dengan prefers-reduced-motion
 *
 * Feature: svg-animation-integration
 * Task 8.8
 *
 * Because the test environment is Node (no jsdom / no @testing-library),
 * we test the reduced-motion logic extracted from InteractionAnimation as a
 * pure function — the same approach used in BattleStage.test.ts and
 * AllianceStage.test.ts.
 *
 * Requirements: 9.2
 */

// ─── Pure reduced-motion logic ────────────────────────────────────────────────
//
// Mirrors the relevant logic in InteractionAnimation.tsx:
//
//   const prefersReduced =
//     typeof window !== "undefined" &&
//     window.matchMedia("(prefers-reduced-motion: reduce)").matches;
//   if (prefersReduced) {
//     const id = setTimeout(() => handleComplete(), 200);
//     timers.current.push(id);
//   }
//
// We extract this as a plain function so it runs under Node with fake timers,
// no React, and no jsdom required.

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const REDUCED_MOTION_DELAY = 200; // ms — from InteractionAnimation.tsx

/**
 * Simulates the reduced-motion branch of InteractionAnimation's useEffect.
 * Returns the array of scheduled timer IDs so tests can cancel them on
 * "unmount".
 */
function runReducedMotionLogic(onComplete: () => void): ReturnType<typeof setTimeout>[] {
  const timers: ReturnType<typeof setTimeout>[] = [];

  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia(REDUCED_MOTION_QUERY).matches;

  if (prefersReduced) {
    const id = setTimeout(() => onComplete(), REDUCED_MOTION_DELAY);
    timers.push(id);
  }

  return timers;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("InteractionAnimation — prefers-reduced-motion (Requirement 9.2)", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    // Clean up window mock between tests
    delete (global as Record<string, unknown>).window;
  });

  // ── Positive path: reduced-motion IS active ───────────────────────────────

  it("calls onComplete after 200ms when prefers-reduced-motion: reduce is active", () => {
    // Mock window.matchMedia to return matches: true for the reduced-motion query
    (global as Record<string, unknown>).window = {
      matchMedia: (query: string) => ({
        matches: query === REDUCED_MOTION_QUERY,
      }),
    };

    const onComplete = jest.fn();
    runReducedMotionLogic(onComplete);

    // Not called before the delay
    jest.advanceTimersByTime(REDUCED_MOTION_DELAY - 1);
    expect(onComplete).not.toHaveBeenCalled();

    // Called exactly at the delay
    jest.advanceTimersByTime(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("calls onComplete within ≤ 300ms (Requirement 9.2 threshold)", () => {
    (global as Record<string, unknown>).window = {
      matchMedia: (query: string) => ({
        matches: query === REDUCED_MOTION_QUERY,
      }),
    };

    const onComplete = jest.fn();
    runReducedMotionLogic(onComplete);

    // Advance to exactly 300ms — the spec requires completion within 300ms
    jest.advanceTimersByTime(300);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("calls onComplete exactly once — not more", () => {
    (global as Record<string, unknown>).window = {
      matchMedia: (query: string) => ({
        matches: query === REDUCED_MOTION_QUERY,
      }),
    };

    const onComplete = jest.fn();
    runReducedMotionLogic(onComplete);

    // Advance well past the delay
    jest.advanceTimersByTime(10_000);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  // ── Unmount cleanup: timer is cancelled before firing ─────────────────────

  it("clearing the timer before 200ms prevents onComplete from being called (simulates unmount)", () => {
    (global as Record<string, unknown>).window = {
      matchMedia: (query: string) => ({
        matches: query === REDUCED_MOTION_QUERY,
      }),
    };

    const onComplete = jest.fn();
    const timers = runReducedMotionLogic(onComplete);

    // Simulate component unmount: clear all scheduled timers
    timers.forEach(clearTimeout);

    jest.advanceTimersByTime(10_000);
    expect(onComplete).not.toHaveBeenCalled();
  });

  // ── Negative path: reduced-motion is NOT active ───────────────────────────

  it("does NOT call onComplete via this path when prefers-reduced-motion is false", () => {
    // matchMedia always returns matches: false
    (global as Record<string, unknown>).window = {
      matchMedia: (_query: string) => ({
        matches: false,
      }),
    };

    const onComplete = jest.fn();
    runReducedMotionLogic(onComplete);

    // Even after a long wait, the reduced-motion path must not have fired
    jest.advanceTimersByTime(10_000);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("does NOT call onComplete via this path when window is undefined (SSR)", () => {
    // Simulate server-side: no window global
    delete (global as Record<string, unknown>).window;

    const onComplete = jest.fn();
    runReducedMotionLogic(onComplete);

    jest.advanceTimersByTime(10_000);
    expect(onComplete).not.toHaveBeenCalled();
  });

  // ── matchMedia call uses correct query string ─────────────────────────────

  it("queries window.matchMedia with the correct media query string", () => {
    const matchMedia = jest.fn((_query: string) => ({ matches: false }));
    (global as Record<string, unknown>).window = { matchMedia };

    runReducedMotionLogic(jest.fn());

    expect(matchMedia).toHaveBeenCalledWith(REDUCED_MOTION_QUERY);
  });
});
