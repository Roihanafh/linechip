import type { TierGroup } from "./types";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BattleStep {
  /** "decompose": chip tier tinggi luruh; "pair": dua chip bereaksi dan saling netralisasi */
  type: "decompose" | "pair";
  /** Tier chip yang terlibat dalam langkah ini */
  tier: 1 | 10 | 100 | 1000;
  /** Sisi yang memiliki chip ini ("pos" = nilai positif, "neg" = nilai negatif) */
  side: "pos" | "neg";
}

export interface BattlePlan {
  steps: BattleStep[];
  /** Total pasangan yang akan bereaksi = Math.min(totalPos, totalNeg) */
  totalPairs: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ALL_TIERS: (1 | 10 | 100 | 1000)[] = [1000, 100, 10, 1];

/**
 * Dekomposisi nilai non-negatif ke TierGroup[] besar-ke-kecil.
 * Identik dengan `buildTierGroups` di tierUtils.ts, tetapi dilokalkan di sini
 * agar `battlePlan.ts` berdiri sendiri tanpa bergantung pada tierUtils.
 */
export function decomposeToTierGroups(value: number): TierGroup[] {
  if (value <= 0) return [];
  const groups: TierGroup[] = [];
  let rem = Math.floor(value);
  for (const t of ALL_TIERS) {
    const c = Math.floor(rem / t);
    if (c > 0) groups.push({ tier: t, count: c });
    rem %= t;
  }
  return groups;
}

// ─── Core: buildBattlePlan ────────────────────────────────────────────────────

/**
 * Hitung `BattlePlan` dari dua bilangan integer.
 *
 * - Bilangan positif berkontribusi ke sisi "pos" (Antibodi).
 * - Bilangan negatif berkontribusi ke sisi "neg" (Kuman).
 * - Jika keduanya bertanda sama (atau salah satu 0), kembalikan plan kosong.
 *
 * Algoritma anchor-ke-sisi-kecil:
 *  1. Hitung totalPos dan totalNeg dari bil1 dan bil2.
 *  2. Tentukan smallerSide (sisi dengan nilai ≤) dan largerSide.
 *  3. Bangun anchorGroups dari decomposeToTierGroups(smallerValue).reverse()
 *     — ascending: satuan → puluhan → ratusan → ribuan.
 *  4. Untuk setiap { tier: T, count: need } di anchorGroups:
 *     - Luruhkan largerAvail sampai punya `need` chip di tier T.
 *     - Emit `need` langkah pair di tier T.
 *  5. Tidak ada langkah decompose yang tidak diperlukan — sisi besar hanya
 *     diluruhi sejumlah yang dibutuhkan untuk memenuhi kebutuhan sisi kecil.
 *
 * `totalPairs` = jumlah total langkah "pair" yang dihasilkan (chip-level reactions),
 *  sama dengan total count dari `buildTierGroups(Math.min(totalPos, totalNeg))`.
 */
export function buildBattlePlan(bil1: number, bil2: number): BattlePlan {
  const totalPos =
    Math.max(0, bil1) + Math.max(0, bil2);
  const totalNeg =
    Math.max(0, -bil1) + Math.max(0, -bil2);

  if (totalPos === 0 || totalNeg === 0) {
    return { steps: [], totalPairs: 0 };
  }

  const smallerValue = Math.min(totalPos, totalNeg);
  const largerValue  = Math.max(totalPos, totalNeg);
  const smallerSide: "pos" | "neg" = totalPos <= totalNeg ? "pos" : "neg";
  const largerSide:  "pos" | "neg" = smallerSide === "pos" ? "neg" : "pos";

  // anchorGroups: tier groups dari sisi kecil, diurutkan ascending
  // (terkecil ke terbesar: satuan → puluhan → ratusan → ribuan).
  // Ini menentukan tier dan count yang perlu dipasangkan, dengan urutan pedagogis.
  const anchorGroups = decomposeToTierGroups(smallerValue).reverse();

  // largerAvail: map tier → count untuk sisi besar yang akan dimutasi selama simulasi.
  const largerAvail = new Map<1 | 10 | 100 | 1000, number>();
  for (const g of decomposeToTierGroups(largerValue)) largerAvail.set(g.tier, g.count);

  // totalPairs = chip-level count dari sisi kecil
  const totalPairs = anchorGroups.reduce((sum, g) => sum + g.count, 0);

  const steps: BattleStep[] = [];

  for (const { tier: T, count: need } of anchorGroups) {
    // Luruhkan sisi besar sampai punya cukup chip di tier T
    while ((largerAvail.get(T) ?? 0) < need) {
      const sourceTier = highestAvailableAbove(largerAvail, T);
      if (sourceTier === null) break; // safety; seharusnya tidak terjadi
      steps.push({ type: "decompose", tier: sourceTier, side: largerSide });
      largerAvail.set(sourceTier, (largerAvail.get(sourceTier) ?? 0) - 1);
      if ((largerAvail.get(sourceTier) ?? 0) <= 0) largerAvail.delete(sourceTier);
      const lowerTier = (sourceTier / 10) as 1 | 10 | 100;
      largerAvail.set(lowerTier, (largerAvail.get(lowerTier) ?? 0) + 10);
    }

    // Pair sejumlah `need` di tier T
    const pairCount = Math.min(need, largerAvail.get(T) ?? 0);
    for (let i = 0; i < pairCount; i++) {
      steps.push({ type: "pair", tier: T, side: "pos" });
    }
    largerAvail.set(T, (largerAvail.get(T) ?? 0) - pairCount);
    if ((largerAvail.get(T) ?? 0) <= 0) largerAvail.delete(T);
  }

  return { steps, totalPairs };
}

// ─── Private helpers ─────────────────────────────────────────────────────────

/**
 * Kembalikan tier tertinggi yang count-nya > 0 dan nilainya > minTier, atau null.
 * Digunakan oleh inner while-loop untuk menemukan chip sisi besar yang perlu diluruhi.
 */
function highestAvailableAbove(
  avail: Map<1 | 10 | 100 | 1000, number>,
  minTier: number,
): 1 | 10 | 100 | 1000 | null {
  // Return the LOWEST tier above minTier that has chips available.
  // This ensures we decompose step-by-step from nearest tier down,
  // e.g. for need=tier-1: decompose 10?1s before decomposing 100?10s,
  // producing the correct ascending order: decompose-10, pairs-1, decompose-100, pairs-10.
  const ascending = [...ALL_TIERS].reverse() as (1 | 10 | 100 | 1000)[];
  for (const t of ascending) {
    if (t > minTier && (avail.get(t) ?? 0) > 0) return t;
  }
  return null;
}
