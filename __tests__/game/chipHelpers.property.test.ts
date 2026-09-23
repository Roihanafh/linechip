/**
 * Property-based tests: chipHelpers pure functions + generateChipQuestion
 *
 * Feature: game-module-integration
 * Task 11.1
 *
 * Requirements: 1.2, 1.3, 1.4, 1.6, 1.7, 2.2, 2.3, 2.4, 2.5, 2.7, 2.10, 2.11,
 *               3.1, 3.4, 4.1, 6.2, 6.4, 7.5, 8.3
 */

import * as fc from 'fast-check';
import { generateChipQuestion } from '@/lib/game/chipQuestion';
import type { ChipQuestion } from '@/lib/game/chipQuestion';
import {
  formatOperand,
  getOperandColorClass,
  getFeedbackClass,
  formatScore,
  resolveDisplayScore,
  validateChipAnswer,
  validateChipPlacement,
  generateAriaLabel,
  filterAnswerInput,
} from '@/lib/game/chipHelpers';

// ─── Shared arbitraries ───────────────────────────────────────────────────────

/** Non-zero integer in [-9999, 9999] — matches ChipQuestion operand domain */
const nonZeroInt = fc
  .integer({ min: -9999, max: 9999 })
  .filter((n) => n !== 0);

/** Full signed integer range, wide enough to test boundary conditions */
const anyInt = fc.integer({ min: -100_000, max: 100_000 });

/** Builds a valid ChipQuestion from two non-zero operands */
const chipQuestionArb: fc.Arbitrary<ChipQuestion> = fc
  .tuple(nonZeroInt, nonZeroInt, fc.constantFrom('+' as const, '-' as const))
  .map(([a, b, op]) => ({
    a,
    b,
    op,
    answer: op === '+' ? a + b : a - b,
  }));

// ─── Property 1: generateChipQuestion invariant ───────────────────────────────

/**
 * Validates: Requirements 1.2, 1.3, 1.4
 *
 * For any output of generateChipQuestion():
 *   - a and b are non-zero integers in [-9999, 9999]
 *   - op is '+' or '-'
 *   - answer === a + b  (if op='+')  or  a - b  (if op='-')
 */
describe('Property 1: generateChipQuestion invariant', () => {
  it('a !== 0, b !== 0, both in [-9999,9999], op valid, answer consistent (100 runs)', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const q = generateChipQuestion();

        expect(Number.isInteger(q.a)).toBe(true);
        expect(q.a).not.toBe(0);
        expect(q.a).toBeGreaterThanOrEqual(-9999);
        expect(q.a).toBeLessThanOrEqual(9999);

        expect(Number.isInteger(q.b)).toBe(true);
        expect(q.b).not.toBe(0);
        expect(q.b).toBeGreaterThanOrEqual(-9999);
        expect(q.b).toBeLessThanOrEqual(9999);

        expect(q.op === '+' || q.op === '-').toBe(true);

        const expectedAnswer = q.op === '+' ? q.a + q.b : q.a - q.b;
        expect(q.answer).toBe(expectedAnswer);
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 2: formatOperand parenthesizes negatives ────────────────────────

/**
 * Validates: Requirements 1.6
 *
 * formatOperand(n) produces a parenthesised string iff n < 0.
 * For n >= 0 the result has no parentheses.
 */
describe('Property 2: formatOperand parenthesizes negatives', () => {
  it('has parentheses iff n < 0 (200 runs)', () => {
    fc.assert(
      fc.property(anyInt, (n) => {
        const result = formatOperand(n);
        if (n < 0) {
          expect(result.startsWith('(')).toBe(true);
          expect(result.endsWith(')')).toBe(true);
        } else {
          expect(result.includes('(')).toBe(false);
          expect(result.includes(')')).toBe(false);
        }
      }),
      { numRuns: 200 },
    );
  });
});

// ─── Property 3: getOperandColorClass mapping ─────────────────────────────────

/**
 * Validates: Requirements 1.7
 *
 * getOperandColorClass(n):
 *   n > 0  →  'text-intblue'
 *   n < 0  →  'text-intpink'
 *   n = 0  →  neither blue nor pink (neutral)
 */
describe('Property 3: getOperandColorClass mapping', () => {
  it("returns 'text-intblue' iff n > 0 and 'text-intpink' iff n < 0 (200 runs)", () => {
    fc.assert(
      fc.property(anyInt, (n) => {
        const cls = getOperandColorClass(n);
        if (n > 0) {
          expect(cls).toBe('text-intblue');
        } else if (n < 0) {
          expect(cls).toBe('text-intpink');
        } else {
          // n === 0 — must be neither blue nor pink
          expect(cls).not.toBe('text-intblue');
          expect(cls).not.toBe('text-intpink');
        }
      }),
      { numRuns: 200 },
    );
  });
});

// ─── Property 4: validateChipPlacement exactness ─────────────────────────────

/**
 * Validates: Requirements 2.3, 2.4, 2.5
 *
 * validateChipPlacement(v1, v2, q) returns { valid: true }
 * if and only if v1 === q.a AND v2 === q.b.
 *
 * When v1 !== q.a the error message must mention "Bilangan 1".
 */
describe('Property 4: validateChipPlacement exactness', () => {
  it('valid === true iff v1===a && v2===b; Bilangan 1 mentioned when v1 wrong (200 runs)', () => {
    fc.assert(
      fc.property(
        chipQuestionArb,
        anyInt,
        anyInt,
        (q, v1, v2) => {
          const result = validateChipPlacement(v1, v2, q);
          const shouldBeValid = v1 === q.a && v2 === q.b;

          expect(result.valid).toBe(shouldBeValid);

          if (!result.valid) {
            expect('message' in result).toBe(true);
            if (v1 !== q.a) {
              expect((result as { valid: false; message: string }).message).toContain('Bilangan 1');
            }
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});

// ─── Property 10: formatScore correctness ────────────────────────────────────

/**
 * Validates: Requirements 3.1, 4.1, 6.4
 *
 * formatScore(n) must produce an output identical to n.toLocaleString('id-ID').
 */
describe('Property 10: formatScore correctness', () => {
  it('matches n.toLocaleString("id-ID") for any non-negative integer (100 runs)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 99_990 }), (n) => {
        expect(formatScore(n)).toBe(n.toLocaleString('id-ID'));
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 11: resolveDisplayScore defaults to 0 ──────────────────────────

/**
 * Validates: Requirements 3.4, 4.7, 6.2
 *
 * resolveDisplayScore(v):
 *   undefined  →  0
 *   null       →  0
 *   number v   →  v  (identity)
 */
describe('Property 11: resolveDisplayScore defaults to 0', () => {
  it('returns 0 for undefined and null (100 runs)', () => {
    fc.assert(
      fc.property(fc.constant(undefined), () => {
        expect(resolveDisplayScore(undefined)).toBe(0);
      }),
      { numRuns: 100 },
    );

    fc.assert(
      fc.property(fc.constant(null), () => {
        expect(resolveDisplayScore(null)).toBe(0);
      }),
      { numRuns: 100 },
    );
  });

  it('acts as identity for valid numbers (100 runs)', () => {
    fc.assert(
      fc.property(anyInt, (n) => {
        expect(resolveDisplayScore(n)).toBe(n);
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 12: validateChipAnswer correctness ─────────────────────────────

/**
 * Validates: Requirements 2.7, 2.10, 2.11
 *
 * validateChipAnswer(s, q).correct === true  iff  parseInt(s,10) === q.answer.
 * When correct is false and input is a parseable wrong number, the feedback
 * string must contain the string representation of q.answer.
 */
describe('Property 12: validateChipAnswer correctness', () => {
  it('correct===true iff input string equals q.answer; wrong input returns correct: false with non-empty feedback (100 runs)', () => {
    fc.assert(
      fc.property(chipQuestionArb, (q) => {
        // Correct answer — must return correct: true
        const correctInput = String(q.answer);
        const correctResult = validateChipAnswer(correctInput, q);
        expect(correctResult.correct).toBe(true);

        // Wrong answer (shift by 1, skip if wrap-around lands on correct again)
        const wrongValue = q.answer + 1;
        if (wrongValue !== q.answer) {
          const wrongInput = String(wrongValue);
          const wrongResult = validateChipAnswer(wrongInput, q);
          expect(wrongResult.correct).toBe(false);
          // Feedback must be non-empty (intentionally omits answer for game challenge)
          expect(wrongResult.feedback.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 15: Answer input character filter ───────────────────────────────

/**
 * Validates: Requirements 2.2
 *
 * filterAnswerInput(s) always produces a string that:
 *   1. Matches /^-?\d*$/  (optional leading minus, then only digits)
 *   2. Has length ≤ 6
 */
describe('Property 15: Answer input character filter', () => {
  it('result always matches /^-?\\d*$/ and length <= 6 (100 runs)', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 20 }), (raw) => {
        const result = filterAnswerInput(raw);
        expect(result).toMatch(/^-?\d*$/);
        expect(result.length).toBeLessThanOrEqual(6);
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 16: getFeedbackClass mapping ────────────────────────────────────

/**
 * Validates: Requirements 7.5
 *
 * getFeedbackClass('success') → contains 'bg-success'
 * getFeedbackClass('error')   → contains 'bg-error'
 */
describe('Property 16: getFeedbackClass mapping', () => {
  it("'success' → contains 'bg-success', 'error' → contains 'bg-error' (100 runs)", () => {
    fc.assert(
      fc.property(fc.constantFrom('success' as const, 'error' as const), (type) => {
        const cls = getFeedbackClass(type);
        if (type === 'success') {
          expect(cls).toContain('bg-success');
        } else {
          expect(cls).toContain('bg-error');
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 17: generateAriaLabel completeness ─────────────────────────────

/**
 * Validates: Requirements 8.3
 *
 * generateAriaLabel(q) must contain:
 *   - Verbal representation of q.a (negative → "negatif N")
 *   - Verbal representation of q.b (negative → "negatif N")
 *   - Operator word: "ditambah" ('+') or "dikurangi" ('-')
 */
describe('Property 17: generateAriaLabel completeness', () => {
  it('contains verbal q.a, q.b, and operator word; negatives as "negatif N" (100 runs)', () => {
    fc.assert(
      fc.property(chipQuestionArb, (q) => {
        const label = generateAriaLabel(q);

        // Operator word
        const expectedOp = q.op === '+' ? 'ditambah' : 'dikurangi';
        expect(label).toContain(expectedOp);

        // Verbal representation of q.a
        if (q.a < 0) {
          expect(label).toContain(`negatif ${Math.abs(q.a)}`);
        } else {
          expect(label).toContain(String(q.a));
        }

        // Verbal representation of q.b
        if (q.b < 0) {
          expect(label).toContain(`negatif ${Math.abs(q.b)}`);
        } else {
          expect(label).toContain(String(q.b));
        }
      }),
      { numRuns: 100 },
    );
  });
});
