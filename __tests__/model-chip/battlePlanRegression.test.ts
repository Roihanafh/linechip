import * as fc from "fast-check";
import { buildBattlePlan } from "@/lib/model-chip/battlePlan";
import { buildTierGroups } from "@/lib/model-chip/tierUtils";

// ─── Regression Suite ─────────────────────────────────────────────────────────
// Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7

describe("buildBattlePlan — regression suite", () => {
  // Case 1: buildBattlePlan(11, -1)
  // totalPos=11, totalNeg=1, smallerValue=1, largerValue=11
  // largerAvail from 11: {10:1, 1:1}; anchorGroups=[{tier:1,count:1}]
  // tier-1 need 1: largerAvail[1]=1 >= 1 → direct pair, no decompose
  test("(11, -1): totalPairs=1, direct pair at tier-1, no decompose", () => {
    const plan = buildBattlePlan(11, -1);
    expect(plan.totalPairs).toBe(1);
    expect(plan.steps).toEqual([
      { type: "pair", tier: 1, side: "pos" },
    ]);
  });

  // Case 2: buildBattlePlan(11, -2)
  // totalPos=11, totalNeg=2, smallerValue=2, largerValue=11
  // pos: {10:1, 1:1}, neg: {1:2}
  // tier-1 direct pair 1 → approach-wait neg-1 → decompose pos-10 → pair 1
  test("(11, -2): totalPairs=2, pair×1 then decompose pos-10 then pair×1", () => {
    const plan = buildBattlePlan(11, -2);
    expect(plan.totalPairs).toBe(2);
    expect(plan.steps).toEqual([
      { type: "pair", tier: 1, side: "pos" },
      { type: "approach-wait", tier: 1, side: "neg" },
      { type: "decompose", tier: 10, side: "pos" },
      { type: "pair", tier: 1, side: "pos" },
    ]);
  });

  // Case 3: buildBattlePlan(15, -3)
  // totalPos=15, totalNeg=3, smallerValue=3, largerValue=15
  // largerAvail from 15: {10:1, 1:5}; anchorGroups=[{tier:1,count:3}]
  // tier-1 need 3: largerAvail[1]=5 >= 3 → direct pair×3, no decompose
  test("(15, -3): totalPairs=3, direct pair×3 at tier-1, no decompose", () => {
    const plan = buildBattlePlan(15, -3);
    expect(plan.totalPairs).toBe(3);
    expect(plan.steps).toEqual([
      { type: "pair", tier: 1, side: "pos" },
      { type: "pair", tier: 1, side: "pos" },
      { type: "pair", tier: 1, side: "pos" },
    ]);
  });

  // Case 4: buildBattlePlan(43, -28)
  // totalPos=43, totalNeg=28, smallerValue=28, largerValue=43
  // pos: {10:4, 1:3}, neg: {10:2, 1:8}
  // tier-1 direct pair×3 → approach-wait neg-1 → decompose pos-10 → pair×5
  // tier-10 direct pair×2
  test("(43, -28): totalPairs=10, [pair-1×3, decompose-10, pair-1×5, pair-10×2]", () => {
    const plan = buildBattlePlan(43, -28);
    expect(plan.totalPairs).toBe(10);
    expect(plan.steps).toEqual([
      { type: "pair", tier: 1, side: "pos" },
      { type: "pair", tier: 1, side: "pos" },
      { type: "pair", tier: 1, side: "pos" },
      { type: "approach-wait", tier: 1, side: "neg" },
      { type: "decompose", tier: 10, side: "pos" },
      { type: "pair", tier: 1, side: "pos" },
      { type: "pair", tier: 1, side: "pos" },
      { type: "pair", tier: 1, side: "pos" },
      { type: "pair", tier: 1, side: "pos" },
      { type: "pair", tier: 1, side: "pos" },
      { type: "pair", tier: 10, side: "pos" },
      { type: "pair", tier: 10, side: "pos" },
    ]);
  });

  // Case 5: buildBattlePlan(352, -178)
  // totalPos=352={100:3,10:5,1:2}, totalNeg=178={100:1,10:7,1:8}
  // tier-1 direct pair×2 → approach-wait neg-1 → decompose-10 → pair×6
  // tier-10 direct pair×4 → approach-wait neg-10 → decompose-100 → pair×3
  // tier-100 direct pair×1
  test("(352, -178): totalPairs=16, correct step sequence with ascending tiers", () => {
    const plan = buildBattlePlan(352, -178);
    expect(plan.totalPairs).toBe(16);
    expect(plan.steps).toEqual([
      { type: "pair", tier: 1, side: "pos" },
      { type: "pair", tier: 1, side: "pos" },
      { type: "approach-wait", tier: 1, side: "neg" },
      { type: "decompose", tier: 10, side: "pos" },
      { type: "pair", tier: 1, side: "pos" },
      { type: "pair", tier: 1, side: "pos" },
      { type: "pair", tier: 1, side: "pos" },
      { type: "pair", tier: 1, side: "pos" },
      { type: "pair", tier: 1, side: "pos" },
      { type: "pair", tier: 1, side: "pos" },
      { type: "pair", tier: 10, side: "pos" },
      { type: "pair", tier: 10, side: "pos" },
      { type: "pair", tier: 10, side: "pos" },
      { type: "pair", tier: 10, side: "pos" },
      { type: "approach-wait", tier: 10, side: "neg" },
      { type: "decompose", tier: 100, side: "pos" },
      { type: "pair", tier: 10, side: "pos" },
      { type: "pair", tier: 10, side: "pos" },
      { type: "pair", tier: 10, side: "pos" },
      { type: "pair", tier: 100, side: "pos" },
    ]);
  });

  // Case 6: buildBattlePlan(4002, -1587)
  // totalPos=4002={1000:4, 1:2}, totalNeg=1587={1000:1,100:5,10:8,1:7}
  // tier-1 direct pair×2 → approach-wait neg-1 → decompose-1000 → approach-wait neg-1 → decompose-100 → approach-wait neg-1 → decompose-10 → pair×5
  // tier-10 direct pair×8
  // tier-100 direct pair×5
  // tier-1000 direct pair×1
  test("(4002, -1587): totalPairs=21, chain decompose 1000→100→10 then pairs ascending", () => {
    const plan = buildBattlePlan(4002, -1587);
    expect(plan.totalPairs).toBe(21);
    expect(plan.steps).toEqual([
      { type: "pair", tier: 1, side: "pos" },
      { type: "pair", tier: 1, side: "pos" },
      { type: "approach-wait", tier: 1, side: "neg" },
      { type: "decompose", tier: 1000, side: "pos" },
      { type: "approach-wait", tier: 1, side: "neg" },
      { type: "decompose", tier: 100, side: "pos" },
      { type: "approach-wait", tier: 1, side: "neg" },
      { type: "decompose", tier: 10, side: "pos" },
      { type: "pair", tier: 1, side: "pos" },
      { type: "pair", tier: 1, side: "pos" },
      { type: "pair", tier: 1, side: "pos" },
      { type: "pair", tier: 1, side: "pos" },
      { type: "pair", tier: 1, side: "pos" },
      { type: "pair", tier: 10, side: "pos" },
      { type: "pair", tier: 10, side: "pos" },
      { type: "pair", tier: 10, side: "pos" },
      { type: "pair", tier: 10, side: "pos" },
      { type: "pair", tier: 10, side: "pos" },
      { type: "pair", tier: 10, side: "pos" },
      { type: "pair", tier: 10, side: "pos" },
      { type: "pair", tier: 10, side: "pos" },
      { type: "pair", tier: 100, side: "pos" },
      { type: "pair", tier: 100, side: "pos" },
      { type: "pair", tier: 100, side: "pos" },
      { type: "pair", tier: 100, side: "pos" },
      { type: "pair", tier: 100, side: "pos" },
      { type: "pair", tier: 1000, side: "pos" },
    ]);
  });

  // Case 7: buildBattlePlan(-11, 1)
  // totalPos=1, totalNeg=11, smallerSide=pos, largerSide=neg
  // largerAvail from 11: {10:1, 1:1}; anchorGroups=[{tier:1,count:1}]
  // tier-1 need 1: largerAvail[1]=1 >= 1 → direct pair, no decompose
  test("(-11, 1): totalPairs=1, direct pair at tier-1, no decompose (neg side larger)", () => {
    const plan = buildBattlePlan(-11, 1);
    expect(plan.totalPairs).toBe(1);
    expect(plan.steps).toEqual([
      { type: "pair", tier: 1, side: "pos" },
    ]);
  });

  // Case 8: buildBattlePlan(-11, 2)
  // totalPos=2, totalNeg=11, smallerSide=pos, largerSide=neg
  // pos: {1:2}, neg: {10:1, 1:1}
  // tier-1 direct pair 1 → approach-wait pos-1 → decompose neg-10 → pair 1
  test("(-11, 2): totalPairs=2, pair×1 then decompose neg-10 then pair×1", () => {
    const plan = buildBattlePlan(-11, 2);
    expect(plan.totalPairs).toBe(2);
    expect(plan.steps).toEqual([
      { type: "pair", tier: 1, side: "pos" },
      { type: "approach-wait", tier: 1, side: "pos" },
      { type: "decompose", tier: 10, side: "neg" },
      { type: "pair", tier: 1, side: "pos" },
    ]);
  });

  // Case 9: buildBattlePlan(1, -10)
  // totalPos=1, totalNeg=10, smallerSide=pos, largerSide=neg
  // largerAvail from 10: {10:1}; anchorGroups=[{tier:1,count:1}]
  // tier-1 need 1: avail[1]=0<1 → approach-wait pos-1 → decompose neg-10 → avail={1:10}; 10>=1 → pair×1
  test("(1, -10): totalPairs=1, decompose neg-10 then pair×1 (neg side decomposes)", () => {
    const plan = buildBattlePlan(1, -10);
    expect(plan.totalPairs).toBe(1);
    expect(plan.steps).toEqual([
      { type: "approach-wait", tier: 1, side: "pos" },
      { type: "decompose", tier: 10, side: "neg" },
      { type: "pair", tier: 1, side: "pos" },
    ]);
  });

  // Cases 10 & 11 from the table: (11,-1) and (11,-2) are duplicates of cases 1 & 2
  // The table lists them as "11+(-1)" and "11+(-2)" — identical buildBattlePlan arguments
  // Already covered by cases 1 and 2 above; no separate test needed.
});

// ─── PBT Properties ───────────────────────────────────────────────────────────
// Validates: Requirements 1.1, 2.1, 3.1, 5.1, 5.2, 5.3, 5.4

describe("buildBattlePlan — PBT properties", () => {
  // PBT 1: pair tiers are non-decreasing
  // Validates: Requirements 1.1
  test("PBT 1: pair steps have non-decreasing tiers", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 9999 }),
        fc.integer({ min: 1, max: 9999 }),
        (pos, neg) => {
          const plan = buildBattlePlan(pos, -neg);
          const pairTiers = plan.steps
            .filter((s) => s.type === "pair")
            .map((s) => s.tier);
          for (let i = 0; i < pairTiers.length - 1; i++) {
            if (pairTiers[i] > pairTiers[i + 1]) return false;
          }
          return true;
        }
      ),
      { numRuns: 200 }
    );
  });

  // PBT 2: all decompose steps have side === largerSide
  // Validates: Requirements 2.1
  test("PBT 2: all decompose steps belong to largerSide", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 9999 }),
        fc.integer({ min: 1, max: 9999 }),
        (pos, neg) => {
          const plan = buildBattlePlan(pos, -neg);
          const largerSide: "pos" | "neg" = pos >= neg ? "pos" : "neg";
          return plan.steps
            .filter((s) => s.type === "decompose")
            .every((s) => s.side === largerSide);
        }
      ),
      { numRuns: 200 }
    );
  });

  // PBT 3: consecutive same-side decompose steps have s1.tier / s2.tier === 10
  // Validates: Requirements 3.1
  test("PBT 3: consecutive same-side decompose steps decrease tier by factor 10", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 9999 }),
        fc.integer({ min: 1, max: 9999 }),
        (pos, neg) => {
          const plan = buildBattlePlan(pos, -neg);
          for (let i = 0; i < plan.steps.length - 1; i++) {
            const s1 = plan.steps[i];
            const s2 = plan.steps[i + 1];
            if (
              s1.type === "decompose" &&
              s2.type === "decompose" &&
              s1.side === s2.side
            ) {
              if (s1.tier / s2.tier !== 10) return false;
            }
          }
          return true;
        }
      ),
      { numRuns: 200 }
    );
  });

  // PBT 4: number of pair steps equals plan.totalPairs
  // Validates: Requirements 5.2
  test("PBT 4: pair step count equals totalPairs", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 9999 }),
        fc.integer({ min: 1, max: 9999 }),
        (pos, neg) => {
          const plan = buildBattlePlan(pos, -neg);
          const pairCount = plan.steps.filter((s) => s.type === "pair").length;
          return pairCount === plan.totalPairs;
        }
      ),
      { numRuns: 200 }
    );
  });

  // PBT 5: totalPairs equals buildTierGroups(min(pos,neg)) chip count
  // Validates: Requirements 5.3
  test("PBT 5: totalPairs matches buildTierGroups(min(pos,neg)) chip count", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 9999 }),
        fc.integer({ min: 1, max: 9999 }),
        (pos, neg) => {
          const plan = buildBattlePlan(pos, -neg);
          const legacyCount = buildTierGroups(Math.min(pos, neg)).reduce(
            (s, g) => s + g.count,
            0
          );
          return plan.totalPairs === legacyCount;
        }
      ),
      { numRuns: 200 }
    );
  });

  // PBT 6: determinism — two calls with same input produce identical JSON
  // Validates: Requirements 5.1
  test("PBT 6: deterministic — same inputs always produce identical output", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -9999, max: 9999 }),
        fc.integer({ min: -9999, max: 9999 }),
        (a, b) => {
          const plan1 = buildBattlePlan(a, b);
          const plan2 = buildBattlePlan(a, b);
          return JSON.stringify(plan1) === JSON.stringify(plan2);
        }
      ),
      { numRuns: 200 }
    );
  });

  // PBT 7: same-sign inputs (a>=0, b>=0) produce { steps: [], totalPairs: 0 }
  // Validates: Requirements 5.4
  test("PBT 7: same-sign inputs produce empty plan", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 9999 }),
        fc.integer({ min: 0, max: 9999 }),
        (a, b) => {
          const plan = buildBattlePlan(a, b);
          return plan.steps.length === 0 && plan.totalPairs === 0;
        }
      ),
      { numRuns: 200 }
    );
  });
});
