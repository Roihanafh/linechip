/**
 * arrowHelpers.test.ts
 *
 * Unit tests (example-based) untuk validateArrowPlacement.
 * Requirements: 4.2, 4.3, 4.4
 */

import { validateArrowPlacement } from '@/lib/game/arrowHelpers';
import type { GameArrow, GameQuestion } from '@/components/game-line/useGameLineState';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeArrows(
  a1: { start: number; length: number },
  a2: { start: number; length: number },
): { 1: GameArrow; 2: GameArrow } {
  return {
    1: { start: a1.start, length: a1.length },
    2: { start: a2.start, length: a2.length },
  };
}

function makeQuestion(a: number, b: number, op: '+' | '-'): GameQuestion {
  const answer = op === '+' ? a + b : a - b;
  return { a, b, op, answer };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('validateArrowPlacement', () => {
  // 1. Valid placement op='+'
  it('returns { valid: true } for correct addition placement', () => {
    const arrows = makeArrows({ start: 0, length: 3 }, { start: 3, length: 4 });
    const question = makeQuestion(3, 4, '+');
    const result = validateArrowPlacement(arrows, question);
    expect(result).toEqual({ valid: true });
  });

  // 2. Invalid Arrow 1: start !== 0
  it('returns { valid: false } and mentions "Arrow 1" when Arrow 1 start !== 0', () => {
    const arrows = makeArrows({ start: 2, length: 3 }, { start: 3, length: 4 });
    const question = makeQuestion(3, 4, '+');
    const result = validateArrowPlacement(arrows, question);
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/Arrow 1/);
  });

  // 2b. Invalid Arrow 1: length !== q.a
  it('returns { valid: false } and mentions "Arrow 1" when Arrow 1 length !== q.a', () => {
    const arrows = makeArrows({ start: 0, length: 5 }, { start: 3, length: 4 });
    const question = makeQuestion(3, 4, '+');
    const result = validateArrowPlacement(arrows, question);
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/Arrow 1/);
  });

  // 3. Valid placement op='-': Arrow 2 length === -b
  it('returns { valid: true } for correct subtraction placement (Arrow 2 length === -b)', () => {
    // q: a=5, b=3, op='-' → Arrow 2 length should be -3
    const arrows = makeArrows({ start: 0, length: 5 }, { start: 5, length: -3 });
    const question = makeQuestion(5, 3, '-');
    const result = validateArrowPlacement(arrows, question);
    expect(result).toEqual({ valid: true });
  });

  // 4. Invalid op='-': Arrow 2 length === +b (positive, not -b)
  it('returns { valid: false } when op="-" but Arrow 2 length is +b instead of -b', () => {
    // q: a=5, b=3, op='-' → Arrow 2 length should be -3, but we set +3
    const arrows = makeArrows({ start: 0, length: 5 }, { start: 5, length: 3 });
    const question = makeQuestion(5, 3, '-');
    const result = validateArrowPlacement(arrows, question);
    expect(result.valid).toBe(false);
  });

  // 5. Arrow 2 start !== q.a → { valid: false }, message mentions "Arrow 2"
  it('returns { valid: false } and mentions "Arrow 2" when Arrow 2 start !== q.a', () => {
    // Arrow 1 is valid, but Arrow 2 starts at wrong position
    const arrows = makeArrows({ start: 0, length: 3 }, { start: 1, length: 4 });
    const question = makeQuestion(3, 4, '+');
    const result = validateArrowPlacement(arrows, question);
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/Arrow 2/);
  });

  // Additional: negative operands work correctly with op='+'
  it('handles negative operands correctly for op="+"', () => {
    // q: a=-4, b=-3, op='+' → Arrow 1 start=0, length=-4; Arrow 2 start=-4, length=-3
    const arrows = makeArrows({ start: 0, length: -4 }, { start: -4, length: -3 });
    const question = makeQuestion(-4, -3, '+');
    const result = validateArrowPlacement(arrows, question);
    expect(result).toEqual({ valid: true });
  });

  // Additional: validateArrowPlacement checks Arrow 1 before Arrow 2
  it('reports Arrow 1 error even when Arrow 2 is also wrong', () => {
    const arrows = makeArrows({ start: 1, length: 5 }, { start: 0, length: 0 });
    const question = makeQuestion(3, 4, '+');
    const result = validateArrowPlacement(arrows, question);
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/Arrow 1/);
  });
});
