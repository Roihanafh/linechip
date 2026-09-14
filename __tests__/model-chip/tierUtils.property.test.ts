import * as fc from "fast-check";
import { buildTierGroups } from "@/lib/model-chip/tierUtils";

// Feature: model-chip-refactor, Property 1: buildTierGroups returns [] for n <= 0
// Validates: Requirements 2.5, 5.8
test("buildTierGroups: returns empty array for n <= 0", () => {
  fc.assert(
    fc.property(fc.integer({ max: 0 }), (n) => {
      return buildTierGroups(n).length === 0;
    }),
    { numRuns: 200 }
  );
});

// Feature: model-chip-refactor, Property 2: buildTierGroups reconstructs value
// Validates: Requirements 2.1, 5.1
test("buildTierGroups: sum tier*count equals totalPairs", () => {
  fc.assert(
    fc.property(fc.integer({ min: 1, max: 9999 }), (n) => {
      const groups = buildTierGroups(n);
      const sum = groups.reduce((acc, g) => acc + g.tier * g.count, 0);
      return sum === n;
    }),
    { numRuns: 200 }
  );
});

// Feature: model-chip-refactor, Property 3: buildTierGroups order descending
// Validates: Requirements 5.1
test("buildTierGroups: groups ordered by tier descending", () => {
  fc.assert(
    fc.property(fc.integer({ min: 1, max: 9999 }), (n) => {
      const groups = buildTierGroups(n);
      for (let i = 0; i < groups.length - 1; i++) {
        if (groups[i].tier <= groups[i + 1].tier) return false;
      }
      return true;
    }),
    { numRuns: 200 }
  );
});
