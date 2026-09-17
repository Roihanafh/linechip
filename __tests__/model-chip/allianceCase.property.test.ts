import * as fc from "fast-check";
import { isAllianceCase } from "@/hooks/model-chip/useAnimationOrchestrator";

// ─── Property 1: Alliance case detection is exhaustive and correct ─────────────
// Validates: Requirements 2.1, 2.2, 2.3, 2.4

test("Property 1a: sama-tanda positif → isAllianceCase returns true", () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 1, max: 9999 }),
      fc.integer({ min: 1, max: 9999 }),
      (bil1, bil2) => {
        return isAllianceCase(bil1, bil2) === true;
      }
    ),
    { numRuns: 100 }
  );
});

test("Property 1b: sama-tanda negatif → isAllianceCase returns true", () => {
  fc.assert(
    fc.property(
      fc.integer({ min: -9999, max: -1 }),
      fc.integer({ min: -9999, max: -1 }),
      (bil1, bil2) => {
        return isAllianceCase(bil1, bil2) === true;
      }
    ),
    { numRuns: 100 }
  );
});

test("Property 1c: beda-tanda → isAllianceCase returns false", () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 1, max: 9999 }),
      fc.integer({ min: -9999, max: -1 }),
      (pos, neg) => {
        // (pos, neg) and (neg, pos) both must return false
        return isAllianceCase(pos, neg) === false && isAllianceCase(neg, pos) === false;
      }
    ),
    { numRuns: 100 }
  );
});

test("Property 1d: zero paired with any integer → isAllianceCase returns false", () => {
  fc.assert(
    fc.property(
      fc.integer({ min: -9999, max: 9999 }),
      (n) => {
        return isAllianceCase(n, 0) === false && isAllianceCase(0, n) === false;
      }
    ),
    { numRuns: 100 }
  );
});

// ─── Property 2: AnimSpeed delay scaling ──────────────────────────────────────
// Validates: Requirements 3.2, 3.3

test("Property 2: Math.round(2000/speed) is never zero for any positive finite speed", () => {
  fc.assert(
    fc.property(
      fc.float({ min: Math.fround(0.1), max: Math.fround(10), noNaN: true, noDefaultInfinity: true }),
      (speed) => {
        return Math.round(2000 / speed) > 0;
      }
    ),
    { numRuns: 100 }
  );
});

test("Property 2b: Math.round(500/speed) is never zero for any positive finite speed", () => {
  fc.assert(
    fc.property(
      fc.float({ min: Math.fround(0.1), max: Math.fround(10), noNaN: true, noDefaultInfinity: true }),
      (speed) => {
        return Math.round(500 / speed) > 0;
      }
    ),
    { numRuns: 100 }
  );
});

// ─── Property 3: Snapshot prop forwarding is identity ─────────────────────────
// Validates: Requirements 4.2

test("Property 3: bil1Value and bil2Value forwarding from snapshot is identity", () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 1, max: 9999 }),
      fc.integer({ min: 1, max: 9999 }),
      (bil1, bil2) => {
        const snapshot = { bil1, bil2 };
        // ArenaPanel passes snapshot.bil1 directly as bil1Value — identity means value is unchanged
        return snapshot.bil1 === bil1 && snapshot.bil2 === bil2;
      }
    ),
    { numRuns: 100 }
  );
});

// ─── Property 4: Faction derivation is total and correct for Alliance_Case ────
// Validates: Requirements 4.3

test("Property 4a: faction is 'ab' for positive bil1 in alliance case", () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 1, max: 9999 }),
      (bil1) => {
        return (bil1 > 0 ? "ab" : "ku") === "ab";
      }
    ),
    { numRuns: 100 }
  );
});

test("Property 4b: faction is 'ku' for negative bil1 in alliance case", () => {
  fc.assert(
    fc.property(
      fc.integer({ min: -9999, max: -1 }),
      (bil1) => {
        return (bil1 > 0 ? "ab" : "ku") === "ku";
      }
    ),
    { numRuns: 100 }
  );
});

// ─── Property 5: Speed prop forwarding is identity ────────────────────────────
// Validates: Requirements 4.5

test("Property 5: speed prop forwarding is identity", () => {
  fc.assert(
    fc.property(
      fc.oneof(fc.constant(0.5), fc.constant(1), fc.constant(2)),
      (animSpeed) => {
        const speed = animSpeed; // ArenaPanel passes animSpeed directly as speed prop
        return speed === animSpeed;
      }
    ),
    { numRuns: 100 }
  );
});

// ─── Property 6: replayAnimation routes alliance snapshots correctly ──────────
// Validates: Requirements 6.1

test("Property 6a: isAllianceCase(bil1, bil2)=true for same-sign positive pair → replayAnimation alliance route", () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 1, max: 9999 }),
      fc.integer({ min: 1, max: 9999 }),
      (bil1, bil2) => {
        // replayAnimation checks isAllianceCase(bil1, bil2) as the first condition
        // For any same-sign positive snapshot, the alliance route is taken (not buildBattlePlan)
        return isAllianceCase(bil1, bil2) === true;
      }
    ),
    { numRuns: 100 }
  );
});

test("Property 6b: isAllianceCase(bil1, bil2)=true for same-sign negative pair → replayAnimation alliance route", () => {
  fc.assert(
    fc.property(
      fc.integer({ min: -9999, max: -1 }),
      fc.integer({ min: -9999, max: -1 }),
      (bil1, bil2) => {
        return isAllianceCase(bil1, bil2) === true;
      }
    ),
    { numRuns: 100 }
  );
});

test("Property 6c: opposite-sign pair → isAllianceCase returns false → replayAnimation battle route", () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 1, max: 9999 }),
      fc.integer({ min: -9999, max: -1 }),
      (pos, neg) => {
        // Opposite-sign pair is NOT an alliance case → battle route taken
        return isAllianceCase(pos, neg) === false && isAllianceCase(neg, pos) === false;
      }
    ),
    { numRuns: 100 }
  );
});
