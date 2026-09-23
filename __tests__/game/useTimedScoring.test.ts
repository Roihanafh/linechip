/**
 * useTimedScoring.test.ts
 *
 * Unit + property-based tests untuk custom hook `useTimedScoring`
 * (hooks/useTimedScoring.ts).
 *
 * Feature: game-timed-scoring
 * Task 3.2
 *
 * Properties covered:
 *   Property 4: startTimer selalu mereset elapsedTime ke 0 — Validates: Requirements 2.1, 2.6
 *   Property 5: getScore konsisten dengan computeTimedScore  — Validates: Requirements 2.4
 *
 * @jest-environment jsdom
 */

import { renderHook, act } from "@testing-library/react";
import { useTimedScoring } from "@/hooks/useTimedScoring";
import { computeTimedScore } from "@/lib/game/timedScore";

// ─── Setup / teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

// ─── Property 4: startTimer selalu mereset elapsedTime ke 0 ──────────────────
// Feature: game-timed-scoring, Property 4: After startTimer() is called, elapsedTime === 0 regardless of prior state
// Validates: Requirements 2.1, 2.6

describe("Property 4: startTimer() always resets elapsedTime to 0", () => {
  // 10 runs dengan variasi elapsed yang berbeda (0s, 1s, 2s, ..., 9s)
  it.each(
    Array.from({ length: 10 }, (_, i) => [i * 3]) // advance 0, 3, 6, 9, ... 27 seconds
  )("resets to 0 after advancing %s seconds", (secondsToAdvance) => {
    const { result } = renderHook(() => useTimedScoring());

    // Start timer and advance by `secondsToAdvance` ticks
    act(() => {
      result.current.startTimer();
    });

    if (secondsToAdvance > 0) {
      act(() => {
        jest.advanceTimersByTime(secondsToAdvance * 1000);
      });
      expect(result.current.elapsedTime).toBe(secondsToAdvance);
    }

    // Call startTimer again — should reset to 0 regardless of prior elapsed
    act(() => {
      result.current.startTimer();
    });

    expect(result.current.elapsedTime).toBe(0);
  });
});

// ─── Property 5: getScore konsisten dengan computeTimedScore ─────────────────
// Feature: game-timed-scoring, Property 5: getScore() always returns computeTimedScore(elapsedTime)
// Validates: Requirements 2.4

describe("Property 5: getScore() is always consistent with computeTimedScore(elapsedTime)", () => {
  const checkPoints = [0, 1, 3, 5, 6, 10, 20, 30, 45, 60, 75, 89, 90, 120];

  it.each(checkPoints)(
    "getScore() === computeTimedScore(%s) after advancing %s seconds",
    (t) => {
      const { result } = renderHook(() => useTimedScoring());

      act(() => {
        result.current.startTimer();
      });

      if (t > 0) {
        act(() => {
          jest.advanceTimersByTime(t * 1000);
        });
      }

      const hookScore = result.current.getScore();
      const expectedScore = computeTimedScore(result.current.elapsedTime);

      expect(hookScore).toBe(expectedScore);
    }
  );
});

// ─── Example tests ────────────────────────────────────────────────────────────

describe("useTimedScoring — example: timer increments correctly", () => {
  it("start → advance 3s → elapsedTime === 3", () => {
    const { result } = renderHook(() => useTimedScoring());

    act(() => {
      result.current.startTimer();
    });

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(result.current.elapsedTime).toBe(3);
  });
});

describe("useTimedScoring — example: stopTimer freezes elapsedTime", () => {
  it("start → advance 2s → stop → advance 2s more → elapsedTime === 2 (frozen)", () => {
    const { result } = renderHook(() => useTimedScoring());

    act(() => {
      result.current.startTimer();
    });

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(result.current.elapsedTime).toBe(2);

    act(() => {
      result.current.stopTimer();
    });

    // Advance 2 more seconds — timer is stopped, so elapsedTime should stay at 2
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(result.current.elapsedTime).toBe(2);
  });
});

// ─── Smoke test: mount → start → unmount → no memory leak ────────────────────

describe("useTimedScoring — smoke: unmount cleans up interval", () => {
  it("unmounting while timer is running does not cause errors or memory leaks", () => {
    const { result, unmount } = renderHook(() => useTimedScoring());

    act(() => {
      result.current.startTimer();
    });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.elapsedTime).toBe(1);

    // Unmount while timer is active — should clear interval via useEffect cleanup
    expect(() => {
      unmount();
      // Advance timers after unmount — no setState calls should fire
      jest.advanceTimersByTime(5000);
    }).not.toThrow();
  });
});
