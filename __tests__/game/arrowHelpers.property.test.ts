import * as fc from "fast-check";
import { validateArrowPlacement } from "@/lib/game/arrowHelpers";
import type { GameArrow, GameQuestion } from "@/components/game-line/useGameLineState";

// ─── Arbitraries ──────────────────────────────────────────────────────────────

/** Arrow dengan start dan length acak dalam rentang yang masuk akal */
const arbArrow = (): fc.Arbitrary<GameArrow> =>
  fc.record({
    start: fc.integer({ min: -200, max: 200 }),
    length: fc.integer({ min: -200, max: 200 }),
  });

/** Soal valid dengan a, b, op, answer konsisten */
const arbQuestion = (): fc.Arbitrary<GameQuestion> =>
  fc
    .record({
      a: fc.integer({ min: -99, max: 99 }),
      b: fc.integer({ min: -99, max: 99 }),
      op: fc.constantFrom<"+" | "-">("+", "-"),
    })
    .map(({ a, b, op }) => ({
      a,
      b,
      op,
      answer: op === "+" ? a + b : a - b,
    }));

/** Soal valid dengan a dan b ≠ 0 (untuk kasus pengurangan yang lebih bermakna) */
const arbQuestionNonZeroB = (): fc.Arbitrary<GameQuestion> =>
  fc
    .record({
      a: fc.integer({ min: -99, max: 99 }),
      b: fc.oneof(
        fc.integer({ min: -99, max: -1 }),
        fc.integer({ min: 1, max: 99 })
      ),
      op: fc.constant<"-">("-"),
    })
    .map(({ a, b, op }) => ({
      a,
      b,
      op,
      answer: a - b,
    }));

// ─── Property 5: validateArrowPlacement correctness ──────────────────────────
// Validates: Requirements 4.2, 4.3, 4.4

describe("Property 5: validateArrowPlacement correctness", () => {
  test(
    "valid === true iff Arrow 1 dan Arrow 2 memenuhi semua kondisi (op='+')",
    () => {
      fc.assert(
        fc.property(
          fc.record({
            a: fc.integer({ min: -99, max: 99 }),
            b: fc.integer({ min: -99, max: 99 }),
          }),
          ({ a, b }) => {
            const q: GameQuestion = { a, b, op: "+", answer: a + b };

            // Konfigurasi tepat — harus valid
            const validArrows = {
              1: { start: 0, length: a },
              2: { start: a, length: b },
            };
            if (!validateArrowPlacement(validArrows, q).valid) return false;

            return true;
          }
        ),
        { numRuns: 200 }
      );
    }
  );

  test(
    "valid === true iff Arrow 1 dan Arrow 2 memenuhi semua kondisi (op='-')",
    () => {
      fc.assert(
        fc.property(
          fc.record({
            a: fc.integer({ min: -99, max: 99 }),
            b: fc.integer({ min: -99, max: 99 }),
          }),
          ({ a, b }) => {
            const q: GameQuestion = { a, b, op: "-", answer: a - b };

            // Konfigurasi tepat — harus valid
            const validArrows = {
              1: { start: 0, length: a },
              2: { start: a, length: -b },
            };
            if (!validateArrowPlacement(validArrows, q).valid) return false;

            return true;
          }
        ),
        { numRuns: 200 }
      );
    }
  );

  test(
    "valid === false jika Arrow 1 start !== 0 (semua op)",
    () => {
      fc.assert(
        fc.property(
          arbQuestion(),
          // start bukan 0
          fc.oneof(
            fc.integer({ min: -200, max: -1 }),
            fc.integer({ min: 1, max: 200 })
          ),
          (q, wrongStart) => {
            const arrows = {
              1: { start: wrongStart, length: q.a },
              2: { start: q.a, length: q.op === "+" ? q.b : -q.b },
            };
            return !validateArrowPlacement(arrows, q).valid;
          }
        ),
        { numRuns: 200 }
      );
    }
  );

  test(
    "valid === false jika Arrow 1 length !== q.a (semua op)",
    () => {
      fc.assert(
        fc.property(
          arbQuestion(),
          // length bukan q.a
          fc.integer({ min: -200, max: 200 }),
          (q, wrongLength) => {
            fc.pre(wrongLength !== q.a);
            const arrows = {
              1: { start: 0, length: wrongLength },
              2: { start: q.a, length: q.op === "+" ? q.b : -q.b },
            };
            return !validateArrowPlacement(arrows, q).valid;
          }
        ),
        { numRuns: 200 }
      );
    }
  );

  test(
    "valid === false jika Arrow 2 start !== q.a (semua op)",
    () => {
      fc.assert(
        fc.property(
          arbQuestion(),
          fc.integer({ min: -200, max: 200 }),
          (q, wrongStart) => {
            fc.pre(wrongStart !== q.a);
            const arrows = {
              1: { start: 0, length: q.a },
              2: { start: wrongStart, length: q.op === "+" ? q.b : -q.b },
            };
            return !validateArrowPlacement(arrows, q).valid;
          }
        ),
        { numRuns: 200 }
      );
    }
  );

  test(
    "valid === false jika Arrow 2 length tidak sesuai operasi",
    () => {
      fc.assert(
        fc.property(
          arbQuestion(),
          fc.integer({ min: -200, max: 200 }),
          (q, wrongLength) => {
            const expectedLen = q.op === "+" ? q.b : -q.b;
            fc.pre(wrongLength !== expectedLen);
            const arrows = {
              1: { start: 0, length: q.a },
              2: { start: q.a, length: wrongLength },
            };
            return !validateArrowPlacement(arrows, q).valid;
          }
        ),
        { numRuns: 200 }
      );
    }
  );
});

// ─── Property 6: validateArrowPlacement subtraction direction ─────────────────
// Validates: Requirements 4.3

describe("Property 6: validateArrowPlacement subtraction direction", () => {
  test(
    "op='-': Arrow 2 length === -b → valid",
    () => {
      fc.assert(
        fc.property(arbQuestionNonZeroB(), (q) => {
          const arrows = {
            1: { start: 0, length: q.a },
            2: { start: q.a, length: -q.b },
          };
          return validateArrowPlacement(arrows, q).valid === true;
        }),
        { numRuns: 100 }
      );
    }
  );

  test(
    "op='-': Arrow 2 length === +b (positif) → invalid (kecuali b === 0)",
    () => {
      fc.assert(
        fc.property(arbQuestionNonZeroB(), (q) => {
          // b !== 0 dijamin oleh arbQuestionNonZeroB, sehingga +b !== -b
          const arrows = {
            1: { start: 0, length: q.a },
            2: { start: q.a, length: q.b }, // positif, bukan negatif
          };
          return validateArrowPlacement(arrows, q).valid === false;
        }),
        { numRuns: 100 }
      );
    }
  );

  test(
    "op='-': setiap Arrow 2 length selain -b menghasilkan invalid",
    () => {
      fc.assert(
        fc.property(
          arbQuestionNonZeroB(),
          fc.integer({ min: -200, max: 200 }),
          (q, wrongLen) => {
            fc.pre(wrongLen !== -q.b);
            const arrows = {
              1: { start: 0, length: q.a },
              2: { start: q.a, length: wrongLen },
            };
            return validateArrowPlacement(arrows, q).valid === false;
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});

// ─── Additional: valid === false selalu memiliki message string tidak kosong ──
// Validates: Requirements 4.4

describe("Additional: valid === false selalu memiliki message string tidak kosong", () => {
  test(
    "setiap hasil invalid selalu menghasilkan message yang tidak kosong (200 runs)",
    () => {
      fc.assert(
        fc.property(
          arbArrow(),
          arbArrow(),
          arbQuestion(),
          (arrow1, arrow2, q) => {
            const result = validateArrowPlacement({ 1: arrow1, 2: arrow2 }, q);
            if (!result.valid) {
              // message harus ada dan tidak kosong
              return (
                typeof result.message === "string" && result.message.length > 0
              );
            }
            // valid === true: tidak ada syarat message
            return true;
          }
        ),
        { numRuns: 200 }
      );
    }
  );
});
