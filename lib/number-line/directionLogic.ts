import type { CarDirection, Operation } from './types';

/**
 * Phase 1 — arah hadap dan gerak sama, ditentukan oleh tanda num1.
 * num1 >= 0 → kanan (termasuk 0 sebagai default; animasi dilewati jika num1 === 0)
 * num1 < 0  → kiri
 */
export function getPhase1Direction(num1: number): CarDirection {
  return num1 >= 0 ? 'right' : 'left';
}

/**
 * Phase 2 — Facing direction (arah hadap mobil):
 *
 * PENJUMLAHAN (+):
 *   num2 >= 0 → hadap kanan
 *   num2 < 0  → hadap kiri
 *
 * PENGURANGAN (−):
 *   num2 > 0  → hadap kanan (maju ke kanan, gerak kiri — mundur)
 *   num2 < 0  → hadap kiri  (maju ke kiri, gerak kanan — mundur)
 *   num2 = 0  → hadap kanan (diam, default kanan)
 *
 * Truth table:
 * | op | num2 | Facing | Movement |
 * |----|------|--------|----------|
 * | +  | >=0  | right  | right    |
 * | +  | <0   | left   | left     |
 * | -  | >0   | right  | left     |
 * | -  | <0   | left   | right    |
 * | -  | =0   | right  | (diam)   |
 */
export function getPhase2FacingDirection(num2: number, op: Operation): CarDirection {
  if (op === '+') {
    return num2 >= 0 ? 'right' : 'left';
  }
  // op === '-'
  if (num2 > 0) return 'right'; // hadap kanan, gerak kiri (mundur ke kiri)
  if (num2 < 0) return 'left';  // hadap kiri, gerak kanan (mundur ke kanan)
  return 'right'; // num2 === 0: diam, hadap kanan sebagai default
}

/**
 * Phase 2 — Movement direction (arah gerak aktual):
 * Ditentukan oleh perbandingan result vs num1.
 *   result > num1 → kanan
 *   result < num1 → kiri
 *   result = num1 → kanan (num2 = 0, tidak bergerak — default kanan)
 *
 * Truth table:
 * | op | num2 | Movement |
 * |----|------|----------|
 * | +  | >0   | right    |
 * | +  | <0   | left     |
 * | +  | =0   | right    |
 * | -  | >0   | left     |
 * | -  | <0   | right    |
 * | -  | =0   | right    |
 */
export function getPhase2MovementDirection(
  num1: number,
  num2: number,
  op: Operation,
): CarDirection {
  const result = op === '+' ? num1 + num2 : num1 - num2;
  if (result > num1) return 'right';
  if (result < num1) return 'left';
  return 'right'; // result === num1 (num2 = 0): diam, default kanan
}
