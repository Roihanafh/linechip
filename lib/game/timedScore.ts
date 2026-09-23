/**
 * lib/game/timedScore.ts
 *
 * Pure function untuk kalkulasi poin berbasis kecepatan jawaban.
 * Tidak ada dependency eksternal — mudah diuji secara exhaustive.
 */

export const MIN_POINTS = 5;
export const BASE_POINTS = 10;
export const MAX_POINTS = 50;   // poin maksimum selama grace period
export const BONUS_WINDOW = 90; // detik — setelah ini, nilai = MIN_POINTS
export const GRACE_PERIOD = 5;  // detik — nilai tetap MAX_POINTS selama rentang ini

/**
 * Menghitung Timed_Score berdasarkan elapsed time dalam detik.
 *
 * - t ≤ GRACE_PERIOD (5 dtk): MAX_POINTS (50)  — grace period
 * - t ∈ (5, 89]:  interpolasi linear turun ke MIN_POINTS+1 (6)
 * - t ≥ BONUS_WINDOW (90): MIN_POINTS (5)       — plateau minimum
 *
 * Edge cases:
 * - Input negatif, NaN, atau Infinity → kembalikan MIN_POINTS (tidak throw)
 * - Float → Math.floor sebelum kalkulasi
 *
 * @param elapsedTime - Waktu yang telah berlalu dalam detik (≥ 0)
 * @returns Timed_Score sebagai integer dalam rentang [MIN_POINTS, MAX_POINTS] ([5, 50])
 */
export function computeTimedScore(elapsedTime: number): number {
  // Tangani input tidak valid: negatif, NaN, Infinity
  if (!Number.isFinite(elapsedTime) || elapsedTime < 0) {
    return MIN_POINTS;
  }

  // Bulatkan ke bawah untuk nilai float
  const t = Math.floor(elapsedTime);

  // Grace period: t ≤ 5 → MAX_POINTS (50)
  if (t <= GRACE_PERIOD) {
    return MAX_POINTS;
  }

  // Plateau minimum: t ≥ 90 → MIN_POINTS (5)
  if (t >= BONUS_WINDOW) {
    return MIN_POINTS;
  }

  // Interpolasi linear: t ∈ (5, 89] → turun dari 47 ke 6
  // Gunakan Math.floor agar nilai turun secara monoton (sesuai tabel sampel requirement)
  // Formula: Math.max(MIN_POINTS + 1, Math.floor(50 - ((t - 5) / 84) * 44))
  return Math.max(MIN_POINTS + 1, Math.floor(50 - ((t - 5) / 84) * 44));
}
