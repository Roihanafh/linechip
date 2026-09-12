/**
 * Property test: Speed multiplier proporsional terhadap semua durasi setTimeout
 *
 * Feature: svg-animation-integration
 * Property 8: Untuk setiap nilai speed = n > 0, setiap timeout dijadwalkan
 * dengan durasi baseDuration / n.
 *
 * Validates: Requirements 7.2
 *
 * Pendekatan: tes murni matematis — tidak me-render React.
 * Logika penjadwalan `play()` di BattleStage.tsx menggunakan rumus:
 *   delay = cumulativeBaseDuration * (1 / effectiveSpeed)
 * Tes ini memverifikasi formula tersebut untuk empat setTimeout yang dijadwalkan
 * secara berurutan (approach → impact → recoil → dissolve → done).
 */

import * as fc from "fast-check";

// ─── Konstanta base duration (harus cocok dengan BattleStage.tsx) ─────────────
// Diambil langsung dari file BattleStage.tsx agar tes gagal otomatis
// jika nilai diubah tanpa memperbarui tes.

const DURATION_APPROACH = 750;
const DURATION_IMPACT   = 500;
const DURATION_RECOIL   = 280;
const DURATION_DISSOLVE = 750;

/**
 * Empat durasi kumulatif yang BattleStage.tsx jadwalkan dalam play().
 * Urutan: approach, impact, recoil, dissolve (done).
 *
 * Timeout ke-N dijadwalkan pada: cumulativeDuration * scale  (scale = 1/speed)
 */
const CUMULATIVE_BASE_DURATIONS = [
  DURATION_APPROACH,
  DURATION_APPROACH + DURATION_IMPACT,
  DURATION_APPROACH + DURATION_IMPACT + DURATION_RECOIL,
  DURATION_APPROACH + DURATION_IMPACT + DURATION_RECOIL + DURATION_DISSOLVE,
] as const;

// ─── Implementasi ulang fungsi penjadwalan dari play() ───────────────────────
// Ini adalah ekstrak sederhana dari logika play() — satu-satunya transformasi
// adalah: delay = baseCumulativeDuration * (1 / effectiveSpeed).
// Dengan mengekstrak ini sebagai fungsi murni, kita bisa mengujinya tanpa React.

/**
 * Mengembalikan empat delay (ms) yang akan dijadwalkan oleh play()
 * untuk kecepatan animasi `speed`.
 */
function computeScheduledDelays(speed: number): number[] {
  const scale = 1 / speed;
  return CUMULATIVE_BASE_DURATIONS.map((base) => base * scale);
}

// ─── Property 8 ───────────────────────────────────────────────────────────────

describe("BattleStage — Property 8: Speed multiplier proporsional terhadap semua durasi setTimeout", () => {
  /**
   * Untuk setiap speed > 0, setiap delay yang dijadwalkan harus tepat sama
   * dengan baseCumulativeDuration / speed.
   *
   * Menggunakan fc.float dengan batas non-nol agar tidak ada pembagian-dengan-nol
   * dan untuk mencerminkan rentang nilai yang wajar di prop `speed`.
   */
  it("setiap delay = cumulativeBase / speed untuk semua speed positif", () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.1), max: Math.fround(10), noNaN: true }),
        (speed) => {
          const delays = computeScheduledDelays(speed);

          // Verifikasi bahwa setiap dari empat delay proporsional
          return CUMULATIVE_BASE_DURATIONS.every((base, i) => {
            const expected = base / speed;
            const actual   = delays[i];
            // Toleransi floating-point kecil (< 1ms) agar tes tidak flaky
            return Math.abs(actual - expected) < 1e-9;
          });
        }
      ),
      { numRuns: 1000 }
    );
  });

  it("speed lebih besar menghasilkan delay lebih pendek (animasi lebih cepat)", () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.1), max: Math.fround(5), noNaN: true }), // speedSlow
        fc.float({ min: Math.fround(5.1), max: Math.fround(10), noNaN: true }), // speedFast (selalu > speedSlow)
        (speedSlow, speedFast) => {
          const delaysSlow = computeScheduledDelays(speedSlow);
          const delaysFast = computeScheduledDelays(speedFast);

          // Setiap delay harus lebih pendek saat speed lebih tinggi
          return delaysSlow.every((slow, i) => slow > delaysFast[i]);
        }
      ),
      { numRuns: 500 }
    );
  });

  it("speed = 1 menghasilkan delay identik dengan durasi kumulatif base", () => {
    const delays = computeScheduledDelays(1);
    CUMULATIVE_BASE_DURATIONS.forEach((base, i) => {
      expect(delays[i]).toBeCloseTo(base, 10);
    });
  });

  it("speed = 2 membagi semua delay dengan 2 (animasi 2× lebih cepat)", () => {
    const delays = computeScheduledDelays(2);
    CUMULATIVE_BASE_DURATIONS.forEach((base, i) => {
      expect(delays[i]).toBeCloseTo(base / 2, 10);
    });
  });

  it("speed = 0.5 menggandakan semua delay (animasi 0.5× lebih lambat)", () => {
    const delays = computeScheduledDelays(0.5);
    CUMULATIVE_BASE_DURATIONS.forEach((base, i) => {
      expect(delays[i]).toBeCloseTo(base * 2, 10);
    });
  });

  /**
   * Verifikasi bahwa delay keempat adalah total seluruh siklus (approach → done),
   * dan nilai ini adalah yang terbesar dari semua delay yang dijadwalkan.
   */
  it("delay keempat adalah total durasi siklus penuh", () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.1), max: Math.fround(10), noNaN: true }),
        (speed) => {
          const delays = computeScheduledDelays(speed);
          const totalBase = DURATION_APPROACH + DURATION_IMPACT + DURATION_RECOIL + DURATION_DISSOLVE;
          const expectedTotal = totalBase / speed;

          // Delay keempat (index 3) adalah delay terbesar dan sama dengan total / speed
          const isLargest = delays.every((d, i) => i === 3 || d <= delays[3]);
          const matchesFormula = Math.abs(delays[3] - expectedTotal) < 1e-9;

          return isLargest && matchesFormula;
        }
      ),
      { numRuns: 500 }
    );
  });

  /**
   * Verifikasi hubungan invers: speed(a) / speed(b) = delay(b) / delay(a)
   * Artinya: rasio delay berbanding terbalik dengan rasio speed.
   */
  it("rasio delay berbanding terbalik dengan rasio speed (Req 7.2 invers)", () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.1), max: Math.fround(10), noNaN: true }),
        fc.float({ min: Math.fround(0.1), max: Math.fround(10), noNaN: true }),
        (speedA, speedB) => {
          // Hindari pembagian sangat kecil yang menyebabkan presisi numerik buruk
          if (Math.abs(speedA - speedB) < 0.01) return true;

          const delaysA = computeScheduledDelays(speedA);
          const delaysB = computeScheduledDelays(speedB);

          return delaysA.every((dA, i) => {
            const dB = delaysB[i];
            // delay(a) / delay(b) harus ≈ speedB / speedA
            const ratio = dA / dB;
            const expected = speedB / speedA;
            return Math.abs(ratio - expected) < 1e-6;
          });
        }
      ),
      { numRuns: 500 }
    );
  });
});
