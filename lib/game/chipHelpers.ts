import type { ChipQuestion } from './chipQuestion';

/**
 * Formats a numeric operand for display.
 * Negative numbers are wrapped in parentheses; positive/zero are shown as-is.
 *
 * Examples:
 *   formatOperand(-5)  → "(−5)"   (uses minus sign U+2212 to match game-virus convention)
 *   formatOperand(3)   → "3"
 *   formatOperand(0)   → "0"
 */
export function formatOperand(n: number): string {
  if (n < 0) {
    return `(${n})`;
  }
  return String(n);
}

/**
 * Returns a Tailwind color class for a numeric operand.
 *   positive → 'text-intblue'
 *   negative → 'text-intpink'
 *   zero     → 'text-gray-500'
 */
export function getOperandColorClass(n: number): string {
  if (n > 0) return 'text-intblue';
  if (n < 0) return 'text-intpink';
  return 'text-gray-500';
}

/**
 * Returns Tailwind utility classes for a feedback panel.
 *   'success' → light green background with green text/border
 *   'error'   → light red background with red text/border
 */
export function getFeedbackClass(type: 'success' | 'error'): string {
  if (type === 'success') {
    return 'bg-success/10 text-success border-success/20';
  }
  return 'bg-error/10 text-error border-error/20';
}

/**
 * Formats a score integer using Indonesian locale (e.g. 1250 → "1.250").
 */
export function formatScore(n: number): string {
  return n.toLocaleString('id-ID');
}

/**
 * Resolves a possibly-nullish score value to a number.
 * Returns 0 if the value is null or undefined; otherwise returns the value.
 */
export function resolveDisplayScore(v: number | null | undefined): number {
  return v ?? 0;
}

/**
 * Validates a chip answer input string against the active question.
 *
 * Cases handled:
 *   - Empty string or only "−"/"-"  → error "Jawaban tidak boleh kosong"
 *   - Non-numeric (NaN after parse) → error "Masukkan angka yang valid"
 *   - Numerically correct           → { correct: true, feedback: "..." }
 *   - Numerically wrong             → error mentioning q.answer
 */
export function validateChipAnswer(
  input: string,
  question: ChipQuestion
): { correct: boolean; feedback: string } {
  const trimmed = input.trim();

  if (trimmed === '' || trimmed === '-') {
    return { correct: false, feedback: 'Jawaban tidak boleh kosong.' };
  }

  const parsed = parseInt(trimmed, 10);

  if (isNaN(parsed)) {
    return { correct: false, feedback: 'Masukkan angka yang valid.' };
  }

  if (parsed === question.answer) {
    const opSymbol = question.op === '+' ? '+' : '−';
    return {
      correct: true,
      feedback: `Benar! ${question.a} ${opSymbol} ${question.b} = ${question.answer}`,
    };
  }

  return {
    correct: false,
    feedback: `Jawaban salah. Hitung lagi dengan seksama! Kamu pasti bisa.`,
  };
}


/**
 * Validates that the chip placement zones match the active question.
 *
 * Rules:
 *   bil1Value must equal q.a
 *   bil2Value must equal:
 *     - q.b        when q.op === "+" (user places antibodi b)
 *     - -q.b       when q.op === "-" (user places virus b, i.e. negative)
 *
 * Game Virus uses the identity  a - b = a + (-b):
 *   For subtraction, the user places a VIRUS chip of value b (bil2Value = -b)
 *   handleCompute always uses  bil1Value + bil2Value  for both operators.
 *
 * Examples:
 *   soal  5 + 3  -> valid when bil2Value = +3  (antibodi 3)
 *   soal  5 - 3  -> valid when bil2Value = -3  (virus 3)
 *
 * @param bil1Value - total chip value placed in Bilangan 1 zone
 * @param bil2Value - total chip value placed in Bilangan 2 zone
 * @param question  - the active ChipQuestion (a, b, op, answer)
 */
export function validateChipPlacement(
  bil1Value: number,
  bil2Value: number,
  question: ChipQuestion
): { valid: true } | { valid: false; message: string } {
  const bil1Wrong = bil1Value !== question.a;
  // For subtraction, user places -b (virus); for addition, user places +b (antibodi)
  const expectedBil2 = question.op === '-' ? -question.b : question.b;
  const bil2Wrong = bil2Value !== expectedBil2;

  if (bil1Wrong && bil2Wrong) {
    return {
      valid: false,
      message: `Chip di Bilangan 1 harus bernilai ${question.a} dan Chip di Bilangan 2 harus bernilai ${expectedBil2}.`,
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
      message: `Chip di Bilangan 2 harus bernilai ${expectedBil2}.`,
    };
  }

  return { valid: true };
}

/**
 * Generates an accessible aria-label for a Chip_Question.
 * Negative values are spoken as "negatif N".
 * Operator is spoken as "ditambah" (+) or "dikurangi" (-).
 *
 * Example:
 *   { a: 5, b: -3, op: '+' } → "Soal: 5 ditambah negatif 3 sama dengan berapa?"
 */
export function generateAriaLabel(question: ChipQuestion): string {
  const verbalise = (n: number): string => {
    if (n < 0) return `negatif ${Math.abs(n)}`;
    return String(n);
  };

  const opWord = question.op === '+' ? 'ditambah' : 'dikurangi';

  return `Soal: ${verbalise(question.a)} ${opWord} ${verbalise(question.b)} sama dengan berapa?`;
}

/**
 * Filters raw keyboard/paste input for the Answer_Input field.
 *
 * Rules:
 *   - Only digits 0-9 and a single leading minus are kept
 *   - Minus is only allowed at position 0
 *   - Maximum 6 characters total (sign + up to 5 digits)
 */
export function filterAnswerInput(raw: string): string {
  // Remove everything that is not a digit or minus
  let filtered = '';

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === '-' && i === 0) {
      filtered += ch;
    } else if (ch >= '0' && ch <= '9') {
      filtered += ch;
    }
  }

  // Enforce 6-character max
  return filtered.slice(0, 6);
}
