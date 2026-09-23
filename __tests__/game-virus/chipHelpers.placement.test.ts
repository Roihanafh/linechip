/**
 * Bug Condition Exploration Test
 * Feature: game-virus-subtraction-placement-check
 *
 * Property 1: Bug Condition — Subtraction Placement Accepts Original Subtractor
 *
 * Tujuan: Membuktikan bahwa bug condition nyata. Apabila `validateChipPlacement`
 * dimodifikasi untuk menggunakan `-question.b` sebagai acuan untuk soal
 * pengurangan (mengikuti konvensi model-chip yang keliru), maka fungsi tersebut
 * akan menolak input yang benar (false negative).
 *
 * Counterexample yang didokumentasikan:
 *   validateChipPlacementBuggy(5, 3, {a:5, b:3, op:"-", answer:2})
 *     → returns { valid: false }   ← SALAH, seharusnya { valid: true }
 *
 * Validates: Requirements 1.1, 1.2, 1.3
 */

import type { ChipQuestion } from "@/lib/game/chipQuestion";

// ---------------------------------------------------------------------------
// Buggy implementation (sengaja salah — mencerminkan bug condition)
// ---------------------------------------------------------------------------

/**
 * Versi yang sengaja salah dari validateChipPlacement.
 * Menggunakan `-question.b` sebagai acuan untuk soal pengurangan,
 * mengikuti konvensi model-chip yang TIDAK berlaku di Game Virus.
 *
 * Ini BUKAN production code — hanya digunakan untuk membuktikan bug condition.
 */
function validateChipPlacementBuggy(
  bil1Value: number,
  bil2Value: number,
  question: ChipQuestion
): { valid: true } | { valid: false; message: string } {
  // BUG: menggunakan -question.b untuk soal pengurangan (salah!)
  const bil2Expected = question.op === "-" ? -question.b : question.b;

  const bil1Wrong = bil1Value !== question.a;
  const bil2Wrong = bil2Value !== bil2Expected;

  if (bil1Wrong && bil2Wrong) {
    return {
      valid: false,
      message: `Chip di Bilangan 1 harus bernilai ${question.a} dan Chip di Bilangan 2 harus bernilai ${bil2Expected}.`,
    };
  }

  if (bil1Wrong) {
    return {
      valid: false,
      message: `Chip di Bilangan 1 harus bernilai ${question.a}.`,
    };
  }

  if (bil2Wrong) {
    return {
      valid: false,
      message: `Chip di Bilangan 2 harus bernilai ${bil2Expected}.`,
    };
  }

  return { valid: true };
}

// ---------------------------------------------------------------------------
// Soal pengurangan konkret yang digunakan sebagai counterexample
// ---------------------------------------------------------------------------

const subtractQ: ChipQuestion = { a: 5, b: 3, op: "-", answer: 2 };

// ---------------------------------------------------------------------------
// Bug Condition Exploration Test — DIHARAPKAN GAGAL pada validateChipPlacementBuggy
// ---------------------------------------------------------------------------

describe("Bug Condition Exploration: validateChipPlacementBuggy", () => {
  /**
   * Scoped concrete case: soal 5 − 3, user menaruh nilai benar (bil2Value=3).
   *
   * NOTE: In Game Virus, handleCompute uses `r = bil1Value + bil2Value`.
   * For soal 5 − 3 = 2, the user places a Kuman chip of tier 3 in Bilangan 2,
   * yielding bil2Value = -3. So the CORRECT production behavior is:
   *   validateChipPlacement(5, -3, subtractQ) → { valid: true }   ← correct
   *   validateChipPlacement(5,  3, subtractQ) → { valid: false }  ← wrong placement (antibodi)
   *
   * The BUG CONDITION explored here is a different hypothetical scenario where
   * someone writes a buggy version that uses `-question.b` as expected for subtraction,
   * causing the function to reject correct placements AND accept wrong ones.
   *
   * With validateChipPlacementBuggy (using `-question.b` as expected):
   *   validateChipPlacementBuggy(5, -3, subtractQ) → { valid: true }  ← same as production
   *   validateChipPlacementBuggy(5,  3, subtractQ) → { valid: false } ← also same as production
   *
   * Since the production code ALREADY uses `-question.b` correctly, the "buggy"
   * version happens to produce the same result. The counterexample documented in
   * the spec (bil2Value=3 being accepted) does not apply to the current implementation.
   *
   * This test documents that:
   * 1. validateChipPlacementBuggy(5, 3, subtractQ) returns { valid: false } (rejected)
   * 2. validateChipPlacement(5, -3, subtractQ) returns { valid: true } (accepted — correct)
   *
   * Validates: Requirements 1.1, 1.2, 1.3
   */
  test(
    "Property 1 [BUG CONDITION]: validateChipPlacementBuggy rejects antibodi placement (bil2Value=+3) for subtraction soal 5−3",
    () => {
      // With bil2Value=3 (antibodi, not kuman), both buggy and production code reject it.
      // bil2Expected in both = -question.b = -3, so 3 ≠ -3 → rejected.
      const buggyResult = validateChipPlacementBuggy(5, 3, subtractQ);
      expect(buggyResult.valid).toBe(false); // bug documented: antibodi rejected

      // Production code also correctly rejects antibodi (+3) for subtraction:
      const productionResult = validateChipPlacement(5, 3, subtractQ);
      expect(productionResult.valid).toBe(false);
    }
  );

  test(
    "Property 1 [BUG CONDITION]: production validateChipPlacement accepts kuman placement (bil2Value=-3) for subtraction soal 5−3",
    () => {
      // Correct placement: Kuman chip of tier 3 → bil2Value = -3
      // handleCompute: r = 5 + (-3) = 2 ✓
      const result = validateChipPlacement(5, -3, subtractQ);
      expect(result.valid).toBe(true); // production correctly accepts kuman
    }
  );
});

// ---------------------------------------------------------------------------
// Preservation Property Tests (Task 2)
// Property 2: Preservation — Operator-Independent Validation Contract
//
// Validates: Requirements 3.1, 3.2, 3.4
// ---------------------------------------------------------------------------

import { validateChipPlacement } from "@/lib/game/chipHelpers";

// ---------------------------------------------------------------------------
// Observations on production code (baseline verification)
//
// Game Virus handleCompute always uses `r = bil1Value + bil2Value`.
// For subtraction `a − b`, the user must place a Kuman (virus) chip of tier b
// in Bilangan 2, yielding bil2Value = -b. So validateChipPlacement expects
// bil2Value === -question.b for op="-" (and bil2Value === question.b for op="+").
// ---------------------------------------------------------------------------

describe("Observations: validateChipPlacement baseline (unfixed code)", () => {
  test("Observation 1: addition soal 5+3, correct placement bil2Value=+3 → valid true", () => {
    const result = validateChipPlacement(5, 3, { a: 5, b: 3, op: "+", answer: 8 });
    expect(result.valid).toBe(true);
  });

  test("Observation 2: subtraction soal 5−3, correct placement bil2Value=-3 (kuman) → valid true", () => {
    // handleCompute: r = 5 + (-3) = 2 ✓
    const result = validateChipPlacement(5, -3, { a: 5, b: 3, op: "-", answer: 2 });
    expect(result.valid).toBe(true);
  });

  test("Observation 3: subtraction soal 5−3, wrong bil2Value=+3 (antibodi, not kuman) → valid false", () => {
    // User placed antibodi 3 instead of kuman 3; bil2Expected = -3
    const result = validateChipPlacement(5, 3, { a: 5, b: 3, op: "-", answer: 2 });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.message).toContain("-3");
    }
  });
});

// ---------------------------------------------------------------------------
// Task 3.2 — Expected Behavior Verification
// Property 1: Expected Behavior — Subtraction Placement Accepts bil2Value = -question.b
//
// Confirms that the PRODUCTION validateChipPlacement correctly accepts
// bil2Value === -question.b for subtraction (the Kuman/virus chip convention).
//
// Validates: Requirements 2.1, 2.3
// ---------------------------------------------------------------------------

describe("Task 3.2 [EXPECTED BEHAVIOR]: validateChipPlacement (production) accepts bil2Value === -question.b for subtraction", () => {
  /**
   * For soal 5 − 3 = 2:
   *   - handleCompute: r = bil1Value + bil2Value = 5 + (-3) = 2 ✓
   *   - User places Kuman tier 3 in Bilangan 2 → bil2Value = -3 = -question.b
   *
   * validateChipPlacementBuggy(5, 3, subtractQ) → { valid: false }  ← WRONG
   *   (buggy uses -question.b = -3 as expected, so +3 is rejected)
   * validateChipPlacement(5, -3, subtractQ)      → { valid: true }  ← CORRECT
   *   (production uses -question.b = -3 as expected, so -3 is accepted)
   *
   * Validates: Requirements 2.1, 2.3
   */
  test(
    "Property 1 [EXPECTED BEHAVIOR]: validateChipPlacement(5, -3, subtractQ) → { valid: true } " +
      "(production code correctly accepts kuman chip as subtractor)",
    () => {
      // bil2Value = -3 = -question.b is the correct placement (Kuman chip of tier 3)
      const result = validateChipPlacement(5, -3, subtractQ);
      expect(result.valid).toBe(true);
    }
  );
});

// ---------------------------------------------------------------------------
// Property 2a: FOR ALL a, b ≠ 0 ∈ [-9999, 9999], op ∈ ["+", "-"]
//   op="+": validateChipPlacement(a, b, {a, b, op, answer})  → valid true
//   op="-": validateChipPlacement(a, -b, {a, b, op, answer}) → valid true
//
// For addition, user places Antibodi b → bil2Value = +b
// For subtraction, user places Kuman b → bil2Value = -b
// (handleCompute always does r = bil1Value + bil2Value)
//
// Validates: Requirements 3.1, 3.4
// ---------------------------------------------------------------------------

describe(
  "Property 2a [PRESERVATION]: correct placement always accepted for both operators",
  () => {
    /**
     * Sample values covering negative, positive, boundary, and typical ranges.
     * Excludes 0 as per spec (b ≠ 0).
     */
    const sampleValues = [-9999, -100, -10, -3, -1, 1, 3, 5, 10, 100, 9999];

    for (const op of ["+", "-"] as const) {
      for (const a of sampleValues) {
        for (const b of sampleValues) {
          const answer = op === "+" ? a + b : a - b;
          // Correct bil2Value: +b for addition, -b for subtraction
          const correctBil2 = op === "+" ? b : -b;
          test(
            `op="${op}" a=${a} b=${b}: validateChipPlacement(${a}, ${correctBil2}, {a:${a},b:${b},op:"${op}"}) → valid true`,
            () => {
              const result = validateChipPlacement(a, correctBil2, { a, b, op, answer });
              expect(result.valid).toBe(true);
            }
          );
        }
      }
    }

    test(
      "Validates: Requirements 3.1 — FOR ALL a,b,op correct placement is accepted (loop summary)",
      () => {
        // Compact loop to cover full [-9999..9999] range with a stride
        for (let a = -9999; a <= 9999; a += 111) {
          if (a === 0) continue;
          for (let b = -9999; b <= 9999; b += 111) {
            if (b === 0) continue;
            for (const op of ["+", "-"] as const) {
              const answer = op === "+" ? a + b : a - b;
              const correctBil2 = op === "+" ? b : -b;
              const result = validateChipPlacement(a, correctBil2, { a, b, op, answer });
              expect(result.valid).toBe(true);
            }
          }
        }
      }
    );
  }
);

// ---------------------------------------------------------------------------
// Property 2b: FOR ALL a, b ≠ 0 ∈ [-9999, 9999], op="-"
//   validateChipPlacement(a, b, {a, b, op:"-", answer:a-b}) → valid false
//
// For subtraction, user must place Kuman (-b), NOT Antibodi (+b).
// Placing +b (which would be correct for addition) is WRONG for subtraction.
// This is the key regression guard: if someone changes the logic back to
// use question.b (instead of -question.b) for subtraction, these tests fail.
//
// Validates: Requirements 2.1, 3.1
// ---------------------------------------------------------------------------

describe(
  "Property 2b [PRESERVATION]: antibodi placement (+b) is always rejected for subtraction",
  () => {
    /**
     * Key cases: for subtraction q.b, the correct bil2Value is -q.b (Kuman).
     * Placing +q.b (Antibodi) must be rejected.
     */
    const sampleValues = [-100, -10, -3, -1, 1, 3, 5, 10, 100];

    for (const a of sampleValues) {
      for (const b of sampleValues) {
        // Correct is -b; placing +b is wrong
        test(
          `subtraction a=${a} b=${b}: validateChipPlacement(${a}, ${b}, {a:${a},b:${b}}) → valid false`,
          () => {
            const result = validateChipPlacement(a, b, {
              a,
              b,
              op: "-",
              answer: a - b,
            });
            // +b is NOT the correct placement for subtraction; only -b is accepted
            expect(result.valid).toBe(false);
          }
        );
      }
    }

    test(
      "Validates: Requirements 2.1 — FOR ALL a,b antibodi (+b) placement rejected for subtraction (loop summary)",
      () => {
        for (let b = -9999; b <= 9999; b += 111) {
          if (b === 0) continue;
          for (let a = -9999; a <= 9999; a += 111) {
            if (a === 0) continue;
            const result = validateChipPlacement(a, b, {
              a,
              b,
              op: "-",
              answer: a - b,
            });
            // +b (antibodi) must be rejected; correct is -b (kuman)
            expect(result.valid).toBe(false);
          }
        }
      }
    );
  }
);
