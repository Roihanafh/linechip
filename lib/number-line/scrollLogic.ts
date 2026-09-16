export const TICK_SPACING = 60;      // px per unit bilangan bulat (default)
export const MIN_TICK_SPACING = 30;  // px minimum
export const MIN_VISIBLE_TICKS = 10; // minimum tick dalam viewport

/**
 * Hitung lebar canvas virtual dari jumlah tick unik.
 * Rumus: (n + 2) × tickSpacing — dua tick ekstra untuk padding kiri/kanan.
 */
export function computeVirtualWidth(
  uniqueTicks: number[],
  tickSpacing: number,
): number {
  return (uniqueTicks.length + 2) * tickSpacing;
}

/**
 * Tentukan tick spacing adaptif berdasarkan lebar viewport.
 * Menjamin minimal MIN_VISIBLE_TICKS (10) tick muat dalam viewport,
 * dengan batas bawah MIN_TICK_SPACING (30px) dan batas atas TICK_SPACING (60px).
 */
export function computeAdaptiveSpacing(viewportWidth: number): number {
  const minForTenTicks = viewportWidth / MIN_VISIBLE_TICKS;
  return Math.max(MIN_TICK_SPACING, Math.min(TICK_SPACING, minForTenTicks));
}

/**
 * Hitung scroll offset baru agar posisi piksel mobil (carX) berada
 * di dalam viewport dengan margin 60px di kiri dan kanan.
 *
 * Jika mobil sudah dalam viewport, kembalikan scrollOffset yang sama.
 */
export function computeAutoScroll(
  carX: number,
  scrollOffset: number,
  viewportWidth: number,
  maxScroll: number,
): number {
  const margin = TICK_SPACING; // 60px
  const lo = scrollOffset + margin;
  const hi = scrollOffset + viewportWidth - margin;

  if (carX < lo) {
    return Math.max(0, carX - margin);
  } else if (carX > hi) {
    return Math.min(maxScroll, carX - viewportWidth + margin);
  }
  return scrollOffset; // sudah dalam viewport
}
