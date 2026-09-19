/**
 * arrowHelpers.ts
 *
 * Pure functions untuk validasi arrow placement di Game Line (/intline-run).
 * Tidak ada side effect — dapat diuji secara independen.
 */

import type { GameArrow, GameQuestion } from '../../components/game-line/useGameLineState';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ArrowPlacementResult {
  valid: boolean;
  message?: string;
  /** Nilai length Arrow 2 yang diharapkan, berguna untuk pesan atau hint UI */
  expectedArrow2Length?: number;
}

// ─── validateArrowPlacement ───────────────────────────────────────────────────

/**
 * Memvalidasi penempatan Arrow 1 dan Arrow 2 terhadap soal yang sedang aktif.
 *
 * Aturan:
 *  - Arrow 1: `start === 0` dan `length === q.a`
 *  - Arrow 2: `start === q.a` dan `length === q.b`  (jika `op === '+'`)
 *             `start === q.a` dan `length === -q.b` (jika `op === '-'`)
 *
 * Jika Arrow 1 tidak valid, langsung kembalikan error Arrow 1 (tanpa cek Arrow 2).
 * Jika Arrow 1 valid tetapi Arrow 2 tidak valid, kembalikan error Arrow 2.
 *
 * @param arrows  Record dengan key `1` (Arrow 1) dan `2` (Arrow 2)
 * @param q       Soal aktif
 */
export function validateArrowPlacement(
  arrows: { 1: GameArrow; 2: GameArrow },
  q: GameQuestion,
): ArrowPlacementResult {
  const arrow1 = arrows[1];
  const arrow2 = arrows[2];

  // ── Validasi Arrow 1 ──────────────────────────────────────────────────────
  if (arrow1.start !== 0) {
    return {
      valid: false,
      message: `Arrow 1 harus dimulai dari 0 (saat ini dimulai dari ${arrow1.start}).`,
    };
  }

  if (arrow1.length !== q.a) {
    return {
      valid: false,
      message: `Arrow 1 harus memiliki panjang ${q.a} (saat ini ${arrow1.length}).`,
    };
  }

  // ── Validasi Arrow 2 ──────────────────────────────────────────────────────
  const expectedArrow2Length = q.op === '+' ? q.b : -q.b;

  if (arrow2.start !== q.a) {
    return {
      valid: false,
      message: `Arrow 2 harus dimulai dari ${q.a} (saat ini dimulai dari ${arrow2.start}).`,
      expectedArrow2Length,
    };
  }

  if (arrow2.length !== expectedArrow2Length) {
    return {
      valid: false,
      message: `Arrow 2 harus memiliki panjang ${expectedArrow2Length} (saat ini ${arrow2.length}).`,
      expectedArrow2Length,
    };
  }

  // ── Semua valid ───────────────────────────────────────────────────────────
  return { valid: true };
}
