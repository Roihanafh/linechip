import type { TierGroup } from "./types";

/** Dekomposisi totalPairs ke TierGroup[] besar-ke-kecil. Kembalikan [] jika totalPairs <= 0. */
export function buildTierGroups(totalPairs: number): TierGroup[] {
  if (totalPairs <= 0) return [];
  const allTiers: (1 | 10 | 100 | 1000)[] = [1000, 100, 10, 1];
  const groups: TierGroup[] = [];
  let rem = totalPairs;
  for (const t of allTiers) {
    const c = Math.floor(rem / t);
    if (c > 0) groups.push({ tier: t, count: c });
    rem %= t;
  }
  return groups;
}
