/**
 * Unit tests: chipHelpers pure functions
 *
 * Feature: game-module-integration
 * Task 10.1
 *
 * Requirements: 1.6, 1.7, 2.2, 2.4, 2.5, 2.7, 2.8, 7.5, 8.3
 */

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
import type { ChipQuestion } from '@/lib/game/chipQuestion';

// ─── formatOperand ────────────────────────────────────────────────────────────

describe('formatOperand', () => {
  it('returns the number as a string for positive values — no parentheses', () => {
    expect(formatOperand(7)).toBe('7');
    expect(formatOperand(1000)).toBe('1000');
  });

  it('returns the number as a string for zero — no parentheses', () => {
    expect(formatOperand(0)).toBe('0');
  });

  it('wraps negative values in parentheses', () => {
    expect(formatOperand(-5)).toBe('(-5)');
    expect(formatOperand(-9999)).toBe('(-9999)');
  });
});

// ─── getOperandColorClass ─────────────────────────────────────────────────────

describe('getOperandColorClass', () => {
  it('returns text-intblue for positive numbers', () => {
    expect(getOperandColorClass(3)).toBe('text-intblue');
    expect(getOperandColorClass(9999)).toBe('text-intblue');
  });

  it('returns text-intpink for negative numbers', () => {
    expect(getOperandColorClass(-1)).toBe('text-intpink');
    expect(getOperandColorClass(-9999)).toBe('text-intpink');
  });

  it('returns the neutral class for zero', () => {
    const cls = getOperandColorClass(0);
    // Must not be blue or pink
    expect(cls).not.toBe('text-intblue');
    expect(cls).not.toBe('text-intpink');
    // Must be a non-empty string (some neutral class exists)
    expect(cls.length).toBeGreaterThan(0);
  });
});

// ─── getFeedbackClass ─────────────────────────────────────────────────────────

describe('getFeedbackClass', () => {
  it("'success' type contains 'bg-success'", () => {
    expect(getFeedbackClass('success')).toContain('bg-success');
  });

  it("'error' type contains 'bg-error'", () => {
    expect(getFeedbackClass('error')).toContain('bg-error');
  });
});

// ─── formatScore ─────────────────────────────────────────────────────────────

describe('formatScore', () => {
  it('formats 1250 as 1.250 (Indonesian locale uses period as thousands separator)', () => {
    expect(formatScore(1250)).toBe('1.250');
  });

  it('formats 0 as "0"', () => {
    expect(formatScore(0)).toBe('0');
  });
});

// ─── resolveDisplayScore ──────────────────────────────────────────────────────

describe('resolveDisplayScore', () => {
  it('returns 0 for undefined', () => {
    expect(resolveDisplayScore(undefined)).toBe(0);
  });

  it('returns 0 for null', () => {
    expect(resolveDisplayScore(null)).toBe(0);
  });

  it('returns the value itself when a valid number is given', () => {
    expect(resolveDisplayScore(500)).toBe(500);
    expect(resolveDisplayScore(0)).toBe(0);
  });
});

// ─── validateChipAnswer ───────────────────────────────────────────────────────

describe('validateChipAnswer', () => {
  const question: ChipQuestion = { a: 4, b: 3, op: '+', answer: 7 };

  it('returns an error for an empty string', () => {
    const result = validateChipAnswer('', question);
    expect(result.correct).toBe(false);
    expect(result.feedback.length).toBeGreaterThan(0);
  });

  it('returns an error for a lone minus sign', () => {
    const result = validateChipAnswer('-', question);
    expect(result.correct).toBe(false);
    expect(result.feedback.length).toBeGreaterThan(0);
  });

  it('returns correct: true when the input matches the answer', () => {
    const result = validateChipAnswer('7', question);
    expect(result.correct).toBe(true);
  });

  it('returns correct: false and non-empty feedback for a wrong input', () => {
    const result = validateChipAnswer('5', question);
    expect(result.correct).toBe(false);
    expect(result.feedback.length).toBeGreaterThan(0);
  });

  it('handles a subtraction question correctly', () => {
    const subQ: ChipQuestion = { a: 10, b: 3, op: '-', answer: 7 };
    expect(validateChipAnswer('7', subQ).correct).toBe(true);
    const wrong = validateChipAnswer('3', subQ);
    expect(wrong.correct).toBe(false);
    expect(wrong.feedback.length).toBeGreaterThan(0);
  });
});

// ─── validateChipPlacement ────────────────────────────────────────────────────

describe('validateChipPlacement', () => {
  const question: ChipQuestion = { a: 5, b: -3, op: '+', answer: 2 };

  it('returns { valid: true } when both values exactly match the question', () => {
    const result = validateChipPlacement(5, -3, question);
    expect(result.valid).toBe(true);
  });

  it('returns valid: false and mentions "Bilangan 1" when only bil1 is wrong', () => {
    const result = validateChipPlacement(99, -3, question);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.message).toContain('Bilangan 1');
    }
  });

  it('returns valid: false and mentions "Bilangan 2" when only bil2 is wrong', () => {
    const result = validateChipPlacement(5, 99, question);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.message).toContain('Bilangan 2');
    }
  });

  it('returns valid: false and mentions "Bilangan 1" first when both are wrong', () => {
    const result = validateChipPlacement(99, 99, question);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      const bil1Index = result.message.indexOf('Bilangan 1');
      const bil2Index = result.message.indexOf('Bilangan 2');
      expect(bil1Index).toBeGreaterThanOrEqual(0);
      expect(bil2Index).toBeGreaterThan(bil1Index);
    }
  });
});

// ─── generateAriaLabel ────────────────────────────────────────────────────────

describe('generateAriaLabel', () => {
  it('contains "negatif 3" and "ditambah" for { a: 5, b: -3, op: "+" }', () => {
    const q: ChipQuestion = { a: 5, b: -3, op: '+', answer: 2 };
    const label = generateAriaLabel(q);
    expect(label).toContain('negatif 3');
    expect(label).toContain('ditambah');
  });

  it('contains "dikurangi" for subtraction operator', () => {
    const q: ChipQuestion = { a: 8, b: 2, op: '-', answer: 6 };
    const label = generateAriaLabel(q);
    expect(label).toContain('dikurangi');
  });

  it('contains "negatif N" for a negative a operand', () => {
    const q: ChipQuestion = { a: -4, b: 2, op: '+', answer: -2 };
    const label = generateAriaLabel(q);
    expect(label).toContain('negatif 4');
  });
});

// ─── filterAnswerInput ────────────────────────────────────────────────────────

describe('filterAnswerInput', () => {
  it('strips non-digit, non-minus characters', () => {
    expect(filterAnswerInput('12a3')).toBe('123');
    expect(filterAnswerInput('abc')).toBe('');
  });

  it('allows a single leading minus sign', () => {
    expect(filterAnswerInput('-5')).toBe('-5');
    expect(filterAnswerInput('-123')).toBe('-123');
  });

  it('removes a minus sign that is not at position 0', () => {
    expect(filterAnswerInput('1-2')).toBe('12');
    expect(filterAnswerInput('12-')).toBe('12');
  });

  it('allows only one minus (any extra minus is stripped)', () => {
    expect(filterAnswerInput('--5')).toBe('-5');
  });

  it('enforces a maximum of 6 characters', () => {
    const long = '-12345678';
    const result = filterAnswerInput(long);
    expect(result.length).toBeLessThanOrEqual(6);
  });

  it('returns an empty string for an empty input', () => {
    expect(filterAnswerInput('')).toBe('');
  });
});
