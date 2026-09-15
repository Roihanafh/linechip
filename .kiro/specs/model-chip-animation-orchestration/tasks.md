# Implementation Plan

## Overview

These tasks implement the formal test suite for `buildBattlePlan` in
`lib/model-chip/battlePlan.ts`. The production code is already fixed - the goal is to lock
correct behavior through regression tests and PBT properties so it cannot regress.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1", "2", "5"] },
    { "id": 1, "tasks": ["3.1", "3.2", "3.3"] },
    { "id": 2, "tasks": ["3.4", "3.5"] },
    { "id": 3, "tasks": ["4"] }
  ]
}
```

## Tasks

- [x] 1. Write bug condition exploration test
  - Confirm that tests in the `"bug condition cases (UNFIXED: expected to fail)"` describe block
    in `__tests__/model-chip/battlePlan.property.test.ts` encode expected correct behavior
  - These four cases validate: urutan ascending (1.1-1.4), sisi decay benar (2.1-2.5),
    chain decompose bertahap (3.1-3.5), tidak ada decompose berlebihan (4.1-4.5)
  - Run the existing tests; they should PASS since implementation is already fixed
  - EXPECTED OUTCOME: All 4 bug condition cases PASS
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - Confirm preservation cases in `"preservation baseline"` describe block pass
  - Cases: `(10,-10)` direct tier match, `(1,-1)` direct match, `(5,3)` same-sign, `(-5,-3)` same-sign
  - EXPECTED OUTCOME: All preservation baseline tests PASS
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 5.1, 5.2, 5.3, 5.4_

- [x] 3. Fix misleading test label and create regression test suite

  - [x] 3.1 Update describe block label in `battlePlan.property.test.ts`
    - File: `__tests__/model-chip/battlePlan.property.test.ts`
    - Change `"buildBattlePlan - bug condition cases (UNFIXED: expected to fail)"`
      to `"buildBattlePlan - regression prevention (FIXED: expected to pass)"`
    - No other changes to this file
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 3.2 Create `battlePlanRegression.test.ts` with 11 regression cases
    - File: `__tests__/model-chip/battlePlanRegression.test.ts`
    - Import `buildBattlePlan` from `@/lib/model-chip/battlePlan`; `buildTierGroups` from
      `@/lib/model-chip/tierUtils`; `* as fc` from `fast-check`
    - Implement all 11 regression cases from Requirements 6.1 table:
      - `buildBattlePlan(11, -1)` => totalPairs=1, steps [pair tier-1], no decompose
      - `buildBattlePlan(11, -2)` => totalPairs=2, steps [decompose pos-10, pair x2]
      - `buildBattlePlan(15, -3)` => totalPairs=3, steps [decompose pos-10, pair x3]
      - `buildBattlePlan(43, -28)` => totalPairs=10, [decompose pos-10, pair-1 x8, pair-10 x2]
      - `buildBattlePlan(352, -178)` => totalPairs=16, pair tiers non-decreasing
      - `buildBattlePlan(4002, -1587)` => totalPairs=21, chain decompose 1000->100->10 then pairs
      - `buildBattlePlan(-11, 1)` => totalPairs=1, steps [pair tier-1], no decompose
      - `buildBattlePlan(-11, 2)` => totalPairs=2, steps [decompose neg-10, pair x2]
      - `buildBattlePlan(1, -10)` => totalPairs=1, steps [decompose neg-10, pair x1]
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [x] 3.3 Add 7 PBT properties to `battlePlanRegression.test.ts`
    - Add to the same file created in 3.2; use `fc.integer({ min: 1, max: 9999 })`, `numRuns: 200`
    - PBT 1: pair tiers are non-decreasing (ascending order)
    - PBT 2: all decompose steps have `side === largerSide` (never smallerSide)
    - PBT 3: consecutive same-side decompose steps have `s1.tier / s2.tier === 10`
    - PBT 4: `plan.steps.filter(s => s.type === "pair").length === plan.totalPairs`
    - PBT 5: `plan.totalPairs === buildTierGroups(Math.min(pos,neg)).reduce((s,g)=>s+g.count,0)`
    - PBT 6: determinism - two calls with same input produce identical JSON
    - PBT 7: same-sign inputs (a>=0, b>=0) produce `{ steps: [], totalPairs: 0 }`
    - _Requirements: 1.1, 2.1, 3.1, 5.1, 5.2, 5.3, 5.4_

  - [x] 3.4 Verify bug condition exploration test now passes
    - Run `jest __tests__/model-chip/battlePlan.property.test.ts`
    - EXPECTED OUTCOME: All 22 tests PASS
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 3.5 Verify preservation tests still pass
    - Run `jest __tests__/model-chip/battlePlanRegression.test.ts`
    - EXPECTED OUTCOME: All regression and PBT tests PASS
    - Confirm all 11 regression cases and 7 PBT properties pass
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 5.1, 5.2, 5.3, 5.4_

- [x] 5. Fix urutan render chip di CharacterColumn (Satuan di atas)
  - File: `components/model-chip/CharacterColumn.tsx`
  - Ubah: `const allTiersOrder: (1 | 10 | 100 | 1000)[] = [1000, 100, 10, 1];`
         menjadi: `const allTiersOrder: (1 | 10 | 100 | 1000)[] = [1, 10, 100, 1000];`
  - Verifikasi: buka /model-chip atau /model-chip/pengurangan, jalankan animasi dengan
    input multi-tier (misal 43-28), pastikan chip Satuan muncul di atas chip Puluhan
  - Pastikan jumlah chip per tier tidak berubah (hanya urutan vertikal)
  - Tidak ada perubahan lain pada file ini atau file lain
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 4. Checkpoint - Ensure all tests pass
  - Run `jest __tests__/model-chip/` to execute the full model-chip test suite
  - All tests should pass: `battlePlan.property.test.ts`, `battlePlanRegression.test.ts`,
    `useAnimationOrchestrator.test.ts`, and any other files in the directory
  - No failures expected since `lib/model-chip/battlePlan.ts` is already correct
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

## Notes

- **Production code is already correct**: `lib/model-chip/battlePlan.ts` does NOT need to be
  modified. All changes are in test files only.
- **Test label update**: The only change to `battlePlan.property.test.ts` is renaming the
  describe block from "UNFIXED: expected to fail" to "FIXED: expected to pass".
- **Two test files in scope**: `battlePlan.property.test.ts` (label update only) and
  `battlePlanRegression.test.ts` (new file, 11 regression cases + 7 PBT properties).
- **Orchestrator files unchanged**: `useAnimationOrchestrator.ts` and
  `useSubtractionOrchestrator.ts` are out of scope.
- **fast-check already installed**: Use `fc.integer({ min: 1, max: 9999 })` with
  `{ numRuns: 200 }` to match existing test conventions.