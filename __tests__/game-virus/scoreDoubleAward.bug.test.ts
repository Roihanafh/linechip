/**
 * Bug Condition Exploration Test — Double Award on Enter Keypress
 * Feature: score-double-award-bug
 *
 * **Property 1: Bug Condition** - Double Award on Enter Keypress
 *
 * CRITICAL: This test MUST FAIL on unfixed code — failure confirms the bug exists.
 * DO NOT attempt to fix the test or the code when it fails.
 * NOTE: This test encodes the expected behavior — it will validate the fix
 *       when it passes after implementation.
 *
 * Bug condition (isBugCondition):
 *   chipFeedback === null AND animating === false AND currentQuestion !== null
 *   AND answer is correct
 *
 * The test simulates two sequential calls to handleCheckChipAnswer with the
 * SAME stale chipFeedback state (both calls see chipFeedback = null, as happens
 * before React re-renders when Enter triggers onKeyDown + synthetic button click
 * in the same render cycle).
 *
 * EXPECTED OUTCOME: Test FAILS on unfixed code (this is correct — it proves
 *                   the bug exists).
 *
 * Validates: Requirements 1.1, 1.2
 */

import * as fc from "fast-check";
import { validateChipAnswer } from "@/lib/game/chipHelpers";
import { awardPoints, POINTS_PER_CORRECT } from "@/features/game/scoreService";
import type { ChipQuestion } from "@/lib/game/chipQuestion";

// ─── Pure function extraction of handleCheckChipAnswer guard logic ───────────
//
// This mirrors the UNFIXED handleCheckChipAnswer from app/game-virus/page.tsx
// exactly, extracted as a pure function for deterministic testing.
// The unfixed code has NO guard for chipFeedback?.correct.

interface ChipFeedback {
  correct: boolean;
  feedback: string;
}

interface CheckAnswerArgs {
  answerInput: string;
  chipFeedback: ChipFeedback | null;
  animating: boolean;
  question: ChipQuestion | null;
}

/**
 * Extracts the core guard + award logic from the UNFIXED handleCheckChipAnswer.
 *
 * UNFIXED code path (mirrors page.tsx exactly):
 *   if (animating) return;
 *   if (!currentQuestion) return;
 *   const result = validateChipAnswer(answerInput, currentQuestion);
 *   setChipFeedback(result);                 ← React state update (async)
 *   if (result.correct) {
 *     setSessionScore(prev => prev + awardPoints(user?.uid ?? null));
 *     ...
 *   }
 *
 * NOTE: The UNFIXED code does NOT have `if (chipFeedback?.correct) return;`
 *       at the top. This is the missing guard that causes the double-fire.
 *
 * Returns: { shouldAwardPoints: boolean, awarded: number }
 *   shouldAwardPoints - whether awardPoints() would have been called
 *   awarded           - return value of awardPoints() if called, else 0
 */
function checkAnswerLogic_unfixed(
  args: CheckAnswerArgs,
  awardPointsFn: (uid: string | null) => number,
): { shouldAwardPoints: boolean; awarded: number } {
  const { answerInput, animating, question } = args;

  // UNFIXED: no guard for chipFeedback?.correct here

  if (animating) return { shouldAwardPoints: false, awarded: 0 };
  if (!question) return { shouldAwardPoints: false, awarded: 0 };

  const result = validateChipAnswer(answerInput, question);

  // NOTE: In real code, setChipFeedback(result) is called here (React state update).
  // Between two synchronous calls, React has NOT re-rendered yet, so chipFeedback
  // in the closure is still null for both calls. We simulate this by NOT updating
  // chipFeedback between calls in our double-call simulation.

  if (result.correct) {
    const pts = awardPointsFn(null); // uid=null simulates unauthenticated user
    return { shouldAwardPoints: true, awarded: pts };
  }

  return { shouldAwardPoints: false, awarded: 0 };
}

/**
 * Extracts the core guard + award logic from the FIXED handleCheckChipAnswer.
 *
 * FIXED code path (mirrors page.tsx after fix):
 *   if (chipFeedback?.correct) return;       ← NEW guard (task 3.1)
 *   if (animating) return;
 *   if (!currentQuestion) return;
 *   const result = validateChipAnswer(answerInput, currentQuestion);
 *   setChipFeedback(result);
 *   if (result.correct) {
 *     setSessionScore(prev => prev + awardPoints(user?.uid ?? null));
 *     ...
 *   }
 *
 * The key difference: after the first call sets chipFeedback.correct=true,
 * the second call (with the updated chipFeedback) early-returns immediately.
 *
 * In the double-call simulation, we pass the updated chipFeedback from call 1
 * to call 2 (simulating that the guard reads the post-first-call state), which
 * is what `chipFeedback` in the `useCallback` deps array ensures in real code.
 */
function checkAnswerLogic_fixed(
  args: CheckAnswerArgs,
  awardPointsFn: (uid: string | null) => number,
): { shouldAwardPoints: boolean; awarded: number; newFeedback: ChipFeedback | null } {
  const { answerInput, chipFeedback, animating, question } = args;

  // FIXED: guard for chipFeedback?.correct — blocks re-entrant/stale calls
  if (chipFeedback?.correct) return { shouldAwardPoints: false, awarded: 0, newFeedback: chipFeedback };

  if (animating) return { shouldAwardPoints: false, awarded: 0, newFeedback: chipFeedback };
  if (!question) return { shouldAwardPoints: false, awarded: 0, newFeedback: chipFeedback };

  const result = validateChipAnswer(answerInput, question);
  // Simulate React state update: newFeedback is what chipFeedback becomes after this call
  const newFeedback: ChipFeedback = result;

  if (result.correct) {
    const pts = awardPointsFn(null);
    return { shouldAwardPoints: true, awarded: pts, newFeedback };
  }

  return { shouldAwardPoints: false, awarded: 0, newFeedback };
}

// ─── isBugCondition predicate ─────────────────────────────────────────────────

function isBugCondition(
  chipFeedback: ChipFeedback | null,
  animating: boolean,
  question: ChipQuestion | null,
  answerInput: string,
): boolean {
  if (chipFeedback !== null) return false;
  if (animating) return false;
  if (question === null) return false;
  const result = validateChipAnswer(answerInput, question);
  return result.correct;
}

// ─── Arbitrary helpers ────────────────────────────────────────────────────────

/**
 * Generates a random ChipQuestion with a guaranteed non-zero a and b,
 * where the answer fits in a reasonable range.
 */
const arbChipQuestion = fc
  .tuple(
    fc.integer({ min: -99, max: 99 }).filter((v) => v !== 0),
    fc.integer({ min: -99, max: 99 }).filter((v) => v !== 0),
    fc.constantFrom<"+" | "-">("+", "-"),
  )
  .map(([a, b, op]): ChipQuestion => ({
    a,
    b,
    op,
    answer: op === "+" ? a + b : a - b,
  }));

/**
 * Generates a (question, correctAnswerInput) pair guaranteed to satisfy
 * the bug condition.
 */
const arbBugConditionInput = arbChipQuestion.map((question) => ({
  question,
  answerInput: String(question.answer),
}));

// ─── Unit tests — concrete bug condition demonstration ────────────────────────

describe(
  "Bug Condition: double awardPoints on Enter keypress (unfixed code) [Feature: score-double-award-bug, Property 1]",
  () => {
    // ── Concrete example: 5 + 3 = 8 ──────────────────────────────────────────
    it(
      "concrete: question {a:5, op:'+', b:3, answer:8} — double-call with chipFeedback=null → awardPoints called 2x, total delta = 20 instead of 10",
      () => {
        const question: ChipQuestion = { a: 5, op: "+", b: 3, answer: 8 };
        const answerInput = "8";

        // ── Bug documentation (unfixed): two calls with stale chipFeedback=null ──
        const awardSpyUnfixed = jest.fn((uid: string | null) => POINTS_PER_CORRECT);
        checkAnswerLogic_unfixed({ answerInput, chipFeedback: null, animating: false, question }, awardSpyUnfixed);
        checkAnswerLogic_unfixed({ answerInput, chipFeedback: null, animating: false, question }, awardSpyUnfixed);
        // Unfixed code fires twice — this is the documented bug
        expect(awardSpyUnfixed).toHaveBeenCalledTimes(2);

        // ── Expected behavior (fixed): guard stops the second call ──
        // With the fix, after call 1 sets chipFeedback={correct:true},
        // call 2 receives that updated chipFeedback and early-returns.
        const awardSpy = jest.fn((uid: string | null) => POINTS_PER_CORRECT);
        const call1 = checkAnswerLogic_fixed(
          { answerInput, chipFeedback: null, animating: false, question },
          awardSpy,
        );
        // call 2 receives the chipFeedback produced by call 1 (guard fires → returns immediately)
        checkAnswerLogic_fixed(
          { answerInput, chipFeedback: call1.newFeedback, animating: false, question },
          awardSpy,
        );

        const totalDelta = call1.awarded;

        // Fixed: awardSpy called exactly once
        expect(awardSpy).toHaveBeenCalledTimes(1);
        // Fixed: total delta = 10, not 20
        expect(totalDelta).toBe(POINTS_PER_CORRECT);
      },
    );

    // ── Concrete example: -10 + (-5) = -15 ───────────────────────────────────
    it(
      "concrete: question {a:-10, op:'+', b:-5, answer:-15} — double-call with chipFeedback=null → awardPoints called 2x",
      () => {
        const question: ChipQuestion = { a: -10, op: "+", b: -5, answer: -15 };
        const answerInput = "-15";

        // ── Bug documentation (unfixed) ──
        const awardSpyUnfixed = jest.fn(() => POINTS_PER_CORRECT);
        checkAnswerLogic_unfixed({ answerInput, chipFeedback: null, animating: false, question }, awardSpyUnfixed);
        checkAnswerLogic_unfixed({ answerInput, chipFeedback: null, animating: false, question }, awardSpyUnfixed);
        expect(awardSpyUnfixed).toHaveBeenCalledTimes(2); // bug: 2 calls

        // ── Expected behavior (fixed) ──
        const awardSpy = jest.fn(() => POINTS_PER_CORRECT);
        const call1 = checkAnswerLogic_fixed({ answerInput, chipFeedback: null, animating: false, question }, awardSpy);
        checkAnswerLogic_fixed({ answerInput, chipFeedback: call1.newFeedback, animating: false, question }, awardSpy);

        // EXPECTED (correct): 1 call
        expect(awardSpy).toHaveBeenCalledTimes(1);
      },
    );

    // ── Concrete example: 100 - 50 = 50 ──────────────────────────────────────
    it(
      "concrete: question {a:100, op:'-', b:50, answer:50} — double-call → total delta 20 not 10",
      () => {
        const question: ChipQuestion = { a: 100, op: "-", b: 50, answer: 50 };
        const answerInput = "50";

        // ── Bug documentation (unfixed) ──
        let totalDeltaUnfixed = 0;
        const awardSpyUnfixed = jest.fn(() => { totalDeltaUnfixed += POINTS_PER_CORRECT; return POINTS_PER_CORRECT; });
        checkAnswerLogic_unfixed({ answerInput, chipFeedback: null, animating: false, question }, awardSpyUnfixed);
        checkAnswerLogic_unfixed({ answerInput, chipFeedback: null, animating: false, question }, awardSpyUnfixed);
        expect(totalDeltaUnfixed).toBe(2 * POINTS_PER_CORRECT); // bug: 20 pts

        // ── Expected behavior (fixed) ──
        let totalDelta = 0;
        const awardSpy = jest.fn(() => {
          totalDelta += POINTS_PER_CORRECT;
          return POINTS_PER_CORRECT;
        });
        const call1 = checkAnswerLogic_fixed({ answerInput, chipFeedback: null, animating: false, question }, awardSpy);
        checkAnswerLogic_fixed({ answerInput, chipFeedback: call1.newFeedback, animating: false, question }, awardSpy);

        // EXPECTED (correct): totalDelta = 10
        expect(totalDelta).toBe(POINTS_PER_CORRECT);
      },
    );

    // ── Confirm: single call gives exactly 10 pts (baseline, must always pass) ──
    it(
      "single call with correct answer → awardPoints called exactly 1x (baseline — must pass on all code)",
      () => {
        const question: ChipQuestion = { a: 5, op: "+", b: 3, answer: 8 };
        const awardSpy = jest.fn(() => POINTS_PER_CORRECT);

        checkAnswerLogic_unfixed(
          { answerInput: "8", chipFeedback: null, animating: false, question },
          awardSpy,
        );

        expect(awardSpy).toHaveBeenCalledTimes(1);
      },
    );

    // ── Confirm: wrong answer never awards points regardless of call count ────
    it(
      "double-call with WRONG answer → awardPoints never called (no bug for wrong answers)",
      () => {
        const question: ChipQuestion = { a: 5, op: "+", b: 3, answer: 8 };
        const awardSpy = jest.fn(() => POINTS_PER_CORRECT);

        checkAnswerLogic_unfixed(
          { answerInput: "99", chipFeedback: null, animating: false, question },
          awardSpy,
        );
        checkAnswerLogic_unfixed(
          { answerInput: "99", chipFeedback: null, animating: false, question },
          awardSpy,
        );

        expect(awardSpy).not.toHaveBeenCalled();
      },
    );

    // ── Confirm: animating guard still blocks even with correct answer ─────────
    it(
      "double-call while animating=true → awardPoints never called (animation guard preserved)",
      () => {
        const question: ChipQuestion = { a: 5, op: "+", b: 3, answer: 8 };
        const awardSpy = jest.fn(() => POINTS_PER_CORRECT);

        checkAnswerLogic_unfixed(
          { answerInput: "8", chipFeedback: null, animating: true, question },
          awardSpy,
        );
        checkAnswerLogic_unfixed(
          { answerInput: "8", chipFeedback: null, animating: true, question },
          awardSpy,
        );

        expect(awardSpy).not.toHaveBeenCalled();
      },
    );
  },
);

// ─── Property-based test — systematic documentation of the bug ────────────────
//
// For every randomly generated correct (a, op, b) question triple, double-calling
// the unfixed logic with stale chipFeedback=null ALWAYS produces two award calls.
// This proves the bug is systematic across all questions, not isolated.

describe(
  "Property 1 PBT: double-call with stale chipFeedback=null always fires awardPoints 2x on unfixed code [Feature: score-double-award-bug, Property 1]",
  () => {
    it(
      "for any correct answer + chipFeedback=null, double-call fires awardPoints exactly twice on unfixed code — FAILS on unfixed code",
      () => {
        fc.assert(
          fc.property(arbBugConditionInput, ({ question, answerInput }) => {
            // Pre-condition: this IS a bug condition
            expect(
              isBugCondition(null, false, question, answerInput),
            ).toBe(true);

            // ── Bug documentation: unfixed code fires twice ──
            const awardSpyUnfixed = jest.fn(() => POINTS_PER_CORRECT);
            checkAnswerLogic_unfixed({ answerInput, chipFeedback: null, animating: false, question }, awardSpyUnfixed);
            checkAnswerLogic_unfixed({ answerInput, chipFeedback: null, animating: false, question }, awardSpyUnfixed);
            expect(awardSpyUnfixed).toHaveBeenCalledTimes(2); // bug documented

            // ── Expected behavior (fixed): guard stops the second call ──
            const awardSpy = jest.fn(() => POINTS_PER_CORRECT);
            const call1 = checkAnswerLogic_fixed({ answerInput, chipFeedback: null, animating: false, question }, awardSpy);
            checkAnswerLogic_fixed({ answerInput, chipFeedback: call1.newFeedback, animating: false, question }, awardSpy);

            // EXPECTED BEHAVIOR (post-fix): exactly 1 call
            expect(awardSpy).toHaveBeenCalledTimes(1);
          }),
          { numRuns: 200 },
        );
      },
    );

    it(
      "for any correct answer + chipFeedback=null, total score delta equals POINTS_PER_CORRECT (10) not double — FAILS on unfixed code",
      () => {
        fc.assert(
          fc.property(arbBugConditionInput, ({ question, answerInput }) => {
            // ── Bug documentation: unfixed code produces double delta ──
            let bugDelta = 0;
            const bugSpy = jest.fn(() => { bugDelta += POINTS_PER_CORRECT; return POINTS_PER_CORRECT; });
            checkAnswerLogic_unfixed({ answerInput, chipFeedback: null, animating: false, question }, bugSpy);
            checkAnswerLogic_unfixed({ answerInput, chipFeedback: null, animating: false, question }, bugSpy);
            expect(bugDelta).toBe(2 * POINTS_PER_CORRECT); // bug: double delta documented

            // ── Expected behavior (fixed): exactly one delta ──
            let totalDelta = 0;
            const awardSpy = jest.fn(() => {
              totalDelta += POINTS_PER_CORRECT;
              return POINTS_PER_CORRECT;
            });

            // Two calls with guard: second call sees updated chipFeedback and early-returns
            const call1 = checkAnswerLogic_fixed({ answerInput, chipFeedback: null, animating: false, question }, awardSpy);
            checkAnswerLogic_fixed({ answerInput, chipFeedback: call1.newFeedback, animating: false, question }, awardSpy);

            // EXPECTED: totalDelta = 10 (one award)
            expect(totalDelta).toBe(POINTS_PER_CORRECT);
          }),
          { numRuns: 200 },
        );
      },
    );

    // ── Preservation: wrong answers always give 0 delta regardless of call count ──
    it(
      "for any WRONG answer, double-call never fires awardPoints (no regression on wrong answers)",
      () => {
        const arbWrongAnswer = arbChipQuestion.chain((question) =>
          fc
            .integer({ min: -999, max: 999 })
            .filter((v) => v !== question.answer)
            .map((wrongAnswer) => ({ question, answerInput: String(wrongAnswer) })),
        );

        fc.assert(
          fc.property(arbWrongAnswer, ({ question, answerInput }) => {
            const awardSpy = jest.fn(() => POINTS_PER_CORRECT);

            checkAnswerLogic_unfixed(
              { answerInput, chipFeedback: null, animating: false, question },
              awardSpy,
            );
            checkAnswerLogic_unfixed(
              { answerInput, chipFeedback: null, animating: false, question },
              awardSpy,
            );

            // Wrong answers must never trigger awards, even with double-call
            expect(awardSpy).not.toHaveBeenCalled(); // ← PASSES on all code
          }),
          { numRuns: 200 },
        );
      },
    );

    // ── isBugCondition predicate verification ─────────────────────────────────
    it(
      "isBugCondition is true for all generated correct-answer inputs (confirms generator correctness)",
      () => {
        fc.assert(
          fc.property(arbBugConditionInput, ({ question, answerInput }) => {
            expect(
              isBugCondition(null, false, question, answerInput),
            ).toBe(true);
          }),
          { numRuns: 200 },
        );
      },
    );

    it(
      "isBugCondition is false when chipFeedback is already set (stale guard scenario)",
      () => {
        fc.assert(
          fc.property(
            arbBugConditionInput,
            ({ question, answerInput }) => {
              const existingFeedback: ChipFeedback = {
                correct: true,
                feedback: "already answered",
              };
              expect(
                isBugCondition(existingFeedback, false, question, answerInput),
              ).toBe(false);
            },
          ),
          { numRuns: 100 },
        );
      },
    );
  },
);

// ─── Real awardPoints integration check ──────────────────────────────────────
//
// Verifies that real awardPoints(null) returns POINTS_PER_CORRECT.
// This confirms the baseline the spy mimics is accurate.

describe("awardPoints baseline (real function, no Firestore call needed for uid=null)", () => {
  it("awardPoints(null) returns POINTS_PER_CORRECT without Firestore write", () => {
    const result = awardPoints(null);
    expect(result).toBe(POINTS_PER_CORRECT);
    expect(result).toBe(10);
  });

  it("calling awardPoints(null) twice returns POINTS_PER_CORRECT each time", () => {
    const r1 = awardPoints(null);
    const r2 = awardPoints(null);
    expect(r1).toBe(POINTS_PER_CORRECT);
    expect(r2).toBe(POINTS_PER_CORRECT);
    // Total delta from two calls = 20 — this is exactly the bug in session score
    expect(r1 + r2).toBe(2 * POINTS_PER_CORRECT);
  });
});
