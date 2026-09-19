'use client';

/**
 * useGameLineState.ts
 *
 * Hook untuk semua state dan actions di halaman Game Line (/intline-run).
 *
 * Pure functions (generateQuestion, simulateCheckAnswer) diekspor terpisah
 * agar bisa diuji secara independen dengan fast-check tanpa harus me-mount hook.
 *
 * clampSpacing diimpor dari gameLineRenderer (sudah ada di sana).
 */

import { useState, useCallback, useRef } from 'react';
import { clampSpacing } from '../../lib/canvas/gameLineRenderer';

// ─── Exported Interfaces ──────────────────────────────────────────────────────

export interface GameQuestion {
  a: number;         // Operan pertama, rentang [-99, 99]
  b: number;         // Operan kedua, rentang [-99, 99]
  op: '+' | '-';     // Operator
  answer: number;    // Jawaban benar: a op b
}

export interface GameArrow {
  start: number;           // Posisi awal arrow pada garis bilangan
  length: number;          // Panjang / jarak (bisa negatif untuk ke kiri)
  target?: number;         // Target akhir untuk animasi (sama dengan length setelah commit)
  visualLength?: number;   // Transient value selama animasi (tidak diekspos ke UI sebagai final)
}

// ─── Exported Pure Functions (for testability / PBT) ─────────────────────────

/**
 * Menghasilkan soal baru secara acak.
 * a dan b: integer random [-99, 99]
 * op: '+' atau '-' (50/50)
 * answer: a op b
 */
export function generateQuestion(): GameQuestion {
  const randomInRange = () => Math.floor(Math.random() * 199) - 99; // -99 … +99
  const a = randomInRange();
  const b = randomInRange();
  const op: '+' | '-' = Math.random() >= 0.5 ? '+' : '-';
  const answer = op === '+' ? a + b : a - b;
  return { a, b, op, answer };
}

/**
 * Mensimulasikan logika checkAnswer tanpa side effect — dipakai untuk PBT.
 *
 * @returns `{ result: boolean, feedback: { type, message } | null }`
 */
export function simulateCheckAnswer(
  question: GameQuestion,
  userAnswerStr: string,
): { result: boolean; feedback: { type: 'success' | 'error'; message: string } | null } {
  const trimmed = userAnswerStr.trim();

  // Kosong atau hanya tanda minus
  if (trimmed === '' || trimmed === '-') {
    return {
      result: false,
      feedback: { type: 'error', message: 'Jawaban tidak boleh kosong!' },
    };
  }

  const parsed = parseInt(trimmed, 10);

  // NaN (tidak mungkin dari keypad, tapi guard tetap diperlukan)
  if (Number.isNaN(parsed)) {
    return {
      result: false,
      feedback: { type: 'error', message: 'Jawaban tidak boleh kosong!' },
    };
  }

  if (parsed === question.answer) {
    return {
      result: true,
      feedback: {
        type: 'success',
        message: `✨ Benar! ${question.a} ${question.op} ${question.b} = ${parsed}`,
      },
    };
  }

  return {
    result: false,
    feedback: {
      type: 'error',
      message: `❌ Salah! Jawaban yang benar adalah ${question.answer}`,
    },
  };
}

// ─── Initial State Helpers ────────────────────────────────────────────────────

const INITIAL_ARROWS: Record<1 | 2, GameArrow> = {
  1: { start: 0, length: 0 },
  2: { start: 0, length: 0 },
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGameLineState() {
  // Generate initial question at mount time
  const [currentQuestion, setCurrentQuestion] = useState<GameQuestion>(() => generateQuestion());

  const [arrows, setArrows] = useState<Record<1 | 2, GameArrow>>({ ...INITIAL_ARROWS });

  const [userAnswer, setUserAnswer] = useState('');

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const [isAnimating, setIsAnimating] = useState(false);

  const [spacing, setSpacing] = useState(50);   // pixels per unit, clamped [20, 80]

  const [offsetX, setOffsetX] = useState(0);    // horizontal viewport pan in pixels

  // Ref to cancel animation frames on unmount or re-trigger
  const animFrameRef = useRef<number | null>(null);


  // ── newQuestion ─────────────────────────────────────────────────────────────
  const newQuestion = useCallback(() => {
    setCurrentQuestion(generateQuestion());
    setUserAnswer('');
    setFeedback(null);
    setArrows({
      1: { start: 0, length: 0 },
      2: { start: 0, length: 0 },
    });
  }, []);

  // ── addDigit ────────────────────────────────────────────────────────────────
  /**
   * Menambah karakter ke userAnswer:
   *   '0'-'9' → append
   *   '-'     → hanya boleh di posisi 0, dan hanya sekali
   *   '←'     → hapus karakter terakhir (backspace)
   */
  const addDigit = useCallback((digit: string) => {
    if (digit === '←') {
      setUserAnswer((prev) => prev.slice(0, -1));
      return;
    }

    if (digit === '-') {
      setUserAnswer((prev) => (prev === '' ? '-' : prev));
      return;
    }

    // digit '0'-'9'
    setUserAnswer((prev) => prev + digit);
  }, []);

  // ── clearAnswer ─────────────────────────────────────────────────────────────
  const clearAnswer = useCallback(() => {
    setUserAnswer('');
    setFeedback(null);
  }, []);

  // ── checkAnswer ─────────────────────────────────────────────────────────────
  const checkAnswer = useCallback((): boolean => {
    // Defense-in-depth: jika animasi berjalan, tolak
    if (isAnimating) return false;

    const { result, feedback: fb } = simulateCheckAnswer(currentQuestion, userAnswer);
    setFeedback(fb);
    return result;
  }, [isAnimating, currentQuestion, userAnswer]);

  // ── Arrow controls ──────────────────────────────────────────────────────────
  const changeArrow = useCallback(
    (num: 1 | 2, property: 'start' | 'length', delta: number) => {
      setArrows((prev) => {
        const arrow = { ...prev[num] };
        arrow[property] = arrow[property] + delta;
        if (property === 'length') {
          arrow.target = arrow.length;
        }
        return { ...prev, [num]: arrow };
      });
    },
    [],
  );

  const setArrowValue = useCallback(
    (num: 1 | 2, property: 'start' | 'length', value: number) => {
      setArrows((prev) => {
        const arrow = { ...prev[num], [property]: value };
        if (property === 'length') {
          arrow.target = value;
        }
        return { ...prev, [num]: arrow };
      });
    },
    [],
  );

  const resetArrows = useCallback(() => {
    setArrows({
      1: { start: 0, length: 0 },
      2: { start: 0, length: 0 },
    });
  }, []);

  // ── playArrows ──────────────────────────────────────────────────────────────
  /**
   * Animasi sekuensial: Arrow 1 → selesai → Arrow 2 → selesai → isAnimating = false.
   * Setiap fase 1000 ms dengan easeOutCubic.
   * visualLength diset secara transient selama animasi; setelah selesai dihapus.
   */
  const playArrows = useCallback(() => {
    // Prevent re-entry
    setIsAnimating((current) => {
      if (current) return current; // already animating, no-op
      return true;
    });

    // Read committed lengths before starting
    setArrows((snapshot) => {
      const target1 = snapshot[1].length;
      const target2 = snapshot[2].length;

      // Reset visualLength to 0 for both arrows
      const initial: Record<1 | 2, GameArrow> = {
        1: { ...snapshot[1], visualLength: 0, target: target1 },
        2: { ...snapshot[2], visualLength: 0, target: target2 },
      };

      const DURATION = 1000; // ms per arrow
      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

      const animateArrow = (
        arrowNum: 1 | 2,
        target: number,
        onDone: () => void,
      ) => {
        let startTime: number | null = null;

        const step = (timestamp: number) => {
          if (startTime === null) startTime = timestamp;
          const elapsed = timestamp - startTime;
          const rawT = Math.min(1, elapsed / DURATION);
          const easedT = easeOutCubic(rawT);
          const visualLen = target * easedT;

          setArrows((prev) => ({
            ...prev,
            [arrowNum]: { ...prev[arrowNum], visualLength: visualLen },
          }));

          if (rawT < 1) {
            animFrameRef.current = requestAnimationFrame(step);
          } else {
            onDone();
          }
        };

        animFrameRef.current = requestAnimationFrame(step);
      };

      // Kick off animation after state is committed
      setTimeout(() => {
        animateArrow(1, target1, () => {
          // Short pause between arrows
          setTimeout(() => {
            animateArrow(2, target2, () => {
              // Remove transient visualLength, restore committed lengths
              setArrows((prev) => ({
                1: { ...prev[1], visualLength: undefined },
                2: { ...prev[2], visualLength: undefined },
              }));
              // Brief delay before clearing isAnimating for visual polish
              setTimeout(() => setIsAnimating(false), 80);
            });
          }, 120);
        });
      }, 10);

      return initial;
    });
  }, []); // no deps — reads snapshot inside setArrows

  // ── changeSpacing ───────────────────────────────────────────────────────────
  const changeSpacing = useCallback((delta: number) => {
    setSpacing((prev) => clampSpacing(prev, delta));
  }, []);

  // ── handleCanvasDrag ────────────────────────────────────────────────────────
  /**
   * Dipanggil oleh GameLineCanvas dengan raw pixel delta.
   * Sensitivitas (x0.05 dll) dilakukan di GameLineCanvas sebelum memanggil ini.
   */
  const handleCanvasDrag = useCallback((deltaX: number) => {
    setOffsetX((prev) => prev + deltaX);
  }, []);

  // ── Return ──────────────────────────────────────────────────────────────────
  return {
    currentQuestion,
    newQuestion,
    arrows,
    changeArrow,
    setArrowValue,
    resetArrows,
    playArrows,
    isAnimating,
    userAnswer,
    addDigit,
    clearAnswer,
    checkAnswer,
    feedback,
    spacing,
    changeSpacing,
    offsetX,
    handleCanvasDrag,
  };
}
