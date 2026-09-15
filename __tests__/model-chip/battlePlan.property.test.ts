import * as fc from "fast-check";
import {
  buildBattlePlan,
  decomposeToTierGroups,
} from "@/lib/model-chip/battlePlan";
import { buildTierGroups } from "@/lib/model-chip/tierUtils";

// ─── Property Tests ───────────────────────────────────────────────────────────

// Feature: chip-tier-decompose-animation, Property 1: Dekomposisi mempertahankan nilai
// Validates: Requirements 1.1
test("decomposeToTierGroups: sum tier*count equals value", () => {
  fc.assert(
    fc.property(fc.integer({ min: 0, max: 9999 }), (n) => {
      const groups = decomposeToTierGroups(n);
      const sum = groups.reduce((acc, g) => acc + g.tier * g.count, 0);
      return sum === n;
    }),
    { numRuns: 200 }
  );
});

// Feature: chip-tier-decompose-animation, Property 2: Tier groups terurut menurun
// Validates: Requirements 1.2
test("decomposeToTierGroups: groups ordered descending and all counts > 0", () => {
  fc.assert(
    fc.property(fc.integer({ min: 1, max: 9999 }), (n) => {
      const groups = decomposeToTierGroups(n);
      for (let i = 0; i < groups.length - 1; i++) {
        if (groups[i].tier <= groups[i + 1].tier) return false;
      }
      return groups.every((g) => g.count > 0);
    }),
    { numRuns: 200 }
  );
});

// Feature: chip-tier-decompose-animation, Property 3: Sama-tanda → steps kosong
// Validates: Requirements 2.3
test("buildBattlePlan: same-sign inputs produce empty steps", () => {
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

// Feature: chip-tier-decompose-animation, Property 4: Jumlah pair steps = totalPairs dari plan
// Validates: Requirements 2.4, 2.8
test("buildBattlePlan: number of pair steps equals totalPairs", () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 1, max: 9999 }),
      fc.integer({ min: 1, max: 9999 }),
      (pos, neg) => {
        const plan = buildBattlePlan(pos, -neg);
        const pairStepCount = plan.steps.filter((s) => s.type === "pair").length;
        return pairStepCount === plan.totalPairs;
      }
    ),
    { numRuns: 200 }
  );
});

// Feature: chip-tier-decompose-animation, Property 5: BattlePlan deterministik
// Validates: Requirements 2.7, 7.3
test("buildBattlePlan: deterministic for same inputs", () => {
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

// Feature: chip-tier-decompose-animation, Property 7: Backward compat dengan buildTierGroups
// Validates: Requirements 7.4
test("buildBattlePlan: totalPairs equals chip-count of buildTierGroups(min(pos,neg))", () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 1, max: 9999 }),
      fc.integer({ min: 1, max: 9999 }),
      (pos, neg) => {
        const plan = buildBattlePlan(pos, -neg);
        const legacyCount = buildTierGroups(Math.min(pos, neg)).reduce(
          (sum, g) => sum + g.count,
          0
        );
        return plan.totalPairs === legacyCount;
      }
    ),
    { numRuns: 200 }
  );
});

// ─── Preservation Baseline ───────────────────────────────────────────────────

// Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
// EXPECTED OUTCOME: All tests in this block PASS on unfixed code (baseline confirmation)
describe("buildBattlePlan — preservation baseline", () => {
  // Observation: buildBattlePlan(10, -10) → [{ type: "pair", tier: 10, side: "pos" }]
  // Direct tier-match should produce exactly 1 pair step, no decompose
  test("(10, -10): direct tier match → 1 pair step, no decompose", () => {
    const plan = buildBattlePlan(10, -10);
    expect(plan.totalPairs).toBe(1);
    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0]).toEqual({ type: "pair", tier: 10, side: "pos" });
    expect(plan.steps.some((s) => s.type === "decompose")).toBe(false);
  });

  // Observation: buildBattlePlan(1, -1) → [{ type: "pair", tier: 1, side: "pos" }]
  // Direct tier-match at unit level should produce exactly 1 pair step, no decompose
  test("(1, -1): direct tier match → 1 pair step, no decompose", () => {
    const plan = buildBattlePlan(1, -1);
    expect(plan.totalPairs).toBe(1);
    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0]).toEqual({ type: "pair", tier: 1, side: "pos" });
    expect(plan.steps.some((s) => s.type === "decompose")).toBe(false);
  });

  // Observation: buildBattlePlan(5, 3) → { steps: [], totalPairs: 0 }
  // Same-sign inputs must produce empty plan (Requirement 3.1)
  test("(5, 3): same sign (both positive) → empty plan", () => {
    const plan = buildBattlePlan(5, 3);
    expect(plan.steps).toHaveLength(0);
    expect(plan.totalPairs).toBe(0);
  });

  test("(-5, -3): same sign (both negative) → empty plan", () => {
    const plan = buildBattlePlan(-5, -3);
    expect(plan.steps).toHaveLength(0);
    expect(plan.totalPairs).toBe(0);
  });
});

// ─── Unit Tests (example-based) ──────────────────────────────────────────────

describe("buildBattlePlan — example-based unit tests", () => {
  // Test case: bil1=+10, bil2=-1
  // totalPos=10, totalNeg=1, smallerValue=1 → totalPairs=1
  // posAvail:{10:1} negAvail:{1:1}
  // Iter1: pos(10) > neg(1) → decompose(10,"pos"), posAvail→{1:10}
  // Iter2: pos(1) == neg(1) → pair(1,"pos"), done
  test("bil1=+10, bil2=-1: decompose tens then pair ones", () => {
    const plan = buildBattlePlan(10, -1);
    expect(plan.totalPairs).toBe(1);
    expect(plan.steps).toHaveLength(2);
    expect(plan.steps[0]).toEqual({ type: "decompose", tier: 10, side: "pos" });
    expect(plan.steps[1]).toEqual({ type: "pair", tier: 1, side: "pos" });
  });

  // Test case: bil1=+11, bil2=-1
  // totalPos=11, totalNeg=1, smallerValue=1 → totalPairs=1
  // largerAvail from decomposeToTierGroups(11) = {10:1, 1:1}
  // anchorGroups = [{tier:1, count:1}]
  // largerAvail[1]=1 ≥ need=1 → no decompose needed, direct pair
  // chip pos-10 ekstra tidak disentuh karena tidak ada kebutuhan di tier 10
  test("bil1=+11, bil2=-1: larger side has tier-1 chip available → direct pair, no decompose", () => {
    const plan = buildBattlePlan(11, -1);
    expect(plan.totalPairs).toBe(1);
    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0]).toEqual({ type: "pair", tier: 1, side: "pos" });
  });

  // Test case: bil1=+100, bil2=-10
  // totalPos=100, totalNeg=10, smallerValue=10 → totalPairs=1
  // posAvail:{100:1} negAvail:{10:1}
  // Iter1: pos(100) > neg(10) → decompose(100,"pos"), posAvail→{10:10}
  // Iter2: pos(10) == neg(10) → pair(10,"pos"), done
  test("bil1=+100, bil2=-10: decompose hundreds then pair tens", () => {
    const plan = buildBattlePlan(100, -10);
    expect(plan.totalPairs).toBe(1);
    expect(plan.steps).toHaveLength(2);
    expect(plan.steps[0]).toEqual({ type: "decompose", tier: 100, side: "pos" });
    expect(plan.steps[1]).toEqual({ type: "pair", tier: 10, side: "pos" });
  });

  // Test case: bil1=+10, bil2=-10 (tier match — no decompose needed)
  // totalPos=10, totalNeg=10, smallerValue=10 → totalPairs=1
  // posAvail:{10:1} negAvail:{10:1}
  // Iter1: pos(10) == neg(10) → pair(10,"pos"), done
  test("bil1=+10, bil2=-10: direct tier match, single pair step", () => {
    const plan = buildBattlePlan(10, -10);
    expect(plan.totalPairs).toBe(1);
    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0]).toEqual({ type: "pair", tier: 10, side: "pos" });
  });

  // Test case: both zero
  test("bil1=0, bil2=0: both zero → empty plan", () => {
    const plan = buildBattlePlan(0, 0);
    expect(plan.steps).toHaveLength(0);
    expect(plan.totalPairs).toBe(0);
  });

  // Test case: same sign (both positive)
  test("bil1=+5, bil2=+3: same sign → empty plan", () => {
    const plan = buildBattlePlan(5, 3);
    expect(plan.steps).toHaveLength(0);
    expect(plan.totalPairs).toBe(0);
  });

  // Additional: both negative (same sign)
  test("bil1=-5, bil2=-3: both negative → empty plan", () => {
    const plan = buildBattlePlan(-5, -3);
    expect(plan.steps).toHaveLength(0);
    expect(plan.totalPairs).toBe(0);
  });

  // Additional: one zero, one non-zero
  test("bil1=+5, bil2=0: one side zero → empty plan", () => {
    const plan = buildBattlePlan(5, 0);
    expect(plan.steps).toHaveLength(0);
    expect(plan.totalPairs).toBe(0);
  });
});

// ─── Bug Condition Cases (UNFIXED: expected to fail) ─────────────────────────
// Feature: battle-plan-decompose-order, Property 1: Bug Condition
// Validates: Requirements 1.1, 1.2, 1.3, 1.4
// CRITICAL: These tests encode the EXPECTED (correct) behavior.
// They MUST FAIL on the unfixed code — failure confirms the bug exists.

describe("buildBattlePlan — bug condition cases (UNFIXED: expected to fail)", () => {
  // (123, -24): totalPos=123, totalNeg=24, smallerValue=24 → totalPairs=6 (2 tens + 4 ones)
  // Expected order: satuan lebih dahulu, puluhan setelahnya
  // [decompose pos-10, pair×1, pair×1, pair×1, pair×1, decompose pos-100, pair×10, pair×10]
  test("(123, -24): correct step sequence — ones first then tens, minimal decompose", () => {
    const plan = buildBattlePlan(123, -24);
    expect(plan.totalPairs).toBe(6);
    expect(plan.steps).toEqual([
      { type: "decompose", tier: 10, side: "pos" },
      { type: "pair", tier: 1, side: "pos" },
      { type: "pair", tier: 1, side: "pos" },
      { type: "pair", tier: 1, side: "pos" },
      { type: "pair", tier: 1, side: "pos" },
      { type: "decompose", tier: 100, side: "pos" },
      { type: "pair", tier: 10, side: "pos" },
      { type: "pair", tier: 10, side: "pos" },
    ]);
  });

  // (100, -1): totalPos=100, totalNeg=1, smallerValue=1 → totalPairs=1
  // [decompose pos-100, decompose pos-10, pair×1]
  test("(100, -1): two decompose steps then one pair, no excess decompose", () => {
    const plan = buildBattlePlan(100, -1);
    expect(plan.totalPairs).toBe(1);
    expect(plan.steps).toEqual([
      { type: "decompose", tier: 100, side: "pos" },
      { type: "decompose", tier: 10, side: "pos" },
      { type: "pair", tier: 1, side: "pos" },
    ]);
  });

  // (11, -1): totalPos=11, totalNeg=1, smallerValue=1 → totalPairs=1
  // largerAvail from decomposeToTierGroups(11) = {10:1, 1:1}
  // anchorGroups = [{tier:1, count:1}]
  // Tier 1, need 1: largerAvail[1]=1 ≥ 1 → no decompose needed, direct pair
  // chip pos-10 ekstra tidak disentuh karena tidak ada kebutuhan di tier 10
  // [pair×1]
  test("(11, -1): larger side already has tier-1 chip → direct pair, no decompose", () => {
    const plan = buildBattlePlan(11, -1);
    expect(plan.totalPairs).toBe(1);
    expect(plan.steps).toEqual([
      { type: "pair", tier: 1, side: "pos" },
    ]);
  });

  // (100, -10): totalPos=100, totalNeg=10, smallerValue=10 → totalPairs=1
  // [decompose pos-100, pair×10]
  test("(100, -10): one decompose then one pair, no excess decompose", () => {
    const plan = buildBattlePlan(100, -10);
    expect(plan.totalPairs).toBe(1);
    expect(plan.steps).toEqual([
      { type: "decompose", tier: 100, side: "pos" },
      { type: "pair", tier: 10, side: "pos" },
    ]);
  });
});
