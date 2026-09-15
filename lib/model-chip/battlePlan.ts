import type { TierGroup } from "./types";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BattleStep {
  /** "decompose": chip tier tinggi luruh; "pair": dua chip bereaksi dan saling netralisasi;
   *  "approach-wait": chip naik tapi belum ada pasangannya (sebelum luruh) */
  type: "decompose" | "pair" | "approach-wait";
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

export function buildInitialChipMap(value: number): Map<1 | 10 | 100 | 1000, number> {
  const map = new Map<1 | 10 | 100 | 1000, number>();
  if (value <= 0) return map;
  let rem = Math.floor(value);
  for (const t of ALL_TIERS) {
    const c = Math.floor(rem / t);
    if (c > 0) map.set(t, c);
    rem %= t;
  }
  return map;
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
  const anchorGroups = decomposeToTierGroups(smallerValue).reverse();
  const totalPairs = anchorGroups.reduce((sum, g) => sum + g.count, 0);

  const posAvail = buildInitialChipMap(totalPos);
  const negAvail = buildInitialChipMap(totalNeg);

  const steps: BattleStep[] = [];

  for (const { tier: T, count: needTotal } of anchorGroups) {
    let needRemaining = needTotal;

    while (needRemaining > 0) {
      const availPos = posAvail.get(T) ?? 0;
      const availNeg = negAvail.get(T) ?? 0;
      const directPairs = Math.min(availPos, availNeg, needRemaining);

      if (directPairs > 0) {
        for (let i = 0; i < directPairs; i++) {
          steps.push({ type: "pair", tier: T, side: "pos" });
        }
        posAvail.set(T, availPos - directPairs);
        if ((posAvail.get(T) ?? 0) <= 0) posAvail.delete(T);
        negAvail.set(T, availNeg - directPairs);
        if ((negAvail.get(T) ?? 0) <= 0) negAvail.delete(T);

        needRemaining -= directPairs;
      }

      if (needRemaining > 0) {
        // Target the side missing chips at tier T
        const targetSide: "pos" | "neg" =
          (posAvail.get(T) ?? 0) < (negAvail.get(T) ?? 0) ? "pos" : "neg";
        const targetAvail = targetSide === "pos" ? posAvail : negAvail;
        // The OTHER side (waitingSide) has chips at T and is waiting for a partner
        const waitingSide: "pos" | "neg" = targetSide === "pos" ? "neg" : "pos";
        const sourceTier = highestAvailableAbove(targetAvail, T);

        if (sourceTier === null) {
          // Fallback to other side if target side has no higher tier available
          const otherSide: "pos" | "neg" = targetSide === "pos" ? "neg" : "pos";
          const otherAvail = otherSide === "pos" ? posAvail : negAvail;
          const fallbackSource = highestAvailableAbove(otherAvail, T);
          if (fallbackSource === null) break;
          // Show the waiting chip approaching before luruh
          steps.push({ type: "approach-wait", tier: T, side: targetSide });
          steps.push({ type: "decompose", tier: fallbackSource, side: otherSide });
          otherAvail.set(fallbackSource, (otherAvail.get(fallbackSource) ?? 0) - 1);
          if ((otherAvail.get(fallbackSource) ?? 0) <= 0) otherAvail.delete(fallbackSource);
          const lowerTier = (fallbackSource / 10) as 1 | 10 | 100;
          otherAvail.set(lowerTier, (otherAvail.get(lowerTier) ?? 0) + 10);
        } else {
          // Show the waiting chip approaching before luruh
          steps.push({ type: "approach-wait", tier: T, side: waitingSide });
          steps.push({ type: "decompose", tier: sourceTier, side: targetSide });
          targetAvail.set(sourceTier, (targetAvail.get(sourceTier) ?? 0) - 1);
          if ((targetAvail.get(sourceTier) ?? 0) <= 0) targetAvail.delete(sourceTier);
          const lowerTier = (sourceTier / 10) as 1 | 10 | 100;
          targetAvail.set(lowerTier, (targetAvail.get(lowerTier) ?? 0) + 10);
        }
      }
    }
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
