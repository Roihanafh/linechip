export interface ChipQuestion {
  a: number;
  b: number;
  op: '+' | '-';
  answer: number;
}

/**
 * Generates a random chip arithmetic question.
 * - Both operands are non-zero integers in [-9999, 9999]
 * - Operator is chosen 50/50 between '+' and '-'
 * - Answer is computed from the operands and operator
 */
export function generateChipQuestion(): ChipQuestion {
  let a = 0;
  while (a === 0) {
    a = Math.floor(Math.random() * 19999) - 9999; // [-9999, 9999] \ {0}
  }

  let b = 0;
  while (b === 0) {
    b = Math.floor(Math.random() * 19999) - 9999;
  }

  const op: '+' | '-' = Math.random() < 0.5 ? '+' : '-';
  const answer = op === '+' ? a + b : a - b;

  return { a, b, op, answer };
}
