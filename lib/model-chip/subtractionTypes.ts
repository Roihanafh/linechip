/**
 * Fase visualisasi halaman pengurangan.
 * Extends VizPhase dengan fase tambahan "transform" (konversi pengurang).
 */
export type VizPhaseSub = "idle" | "transform" | "alliance" | "battle" | "center" | "done";

/**
 * Snapshot nilai-nilai saat animasi pengurangan dimulai.
 * - bil1: minuend (bilangan yang dikurangi)
 * - bil2_original: pengurang asli yang dimasukkan pengguna
 * - bil2_converted: nilai setelah konversi, yaitu -bil2_original
 */
export interface SubtractionSnapshot {
  bil1: number;
  bil2_original: number;
  bil2_converted: number;
}
