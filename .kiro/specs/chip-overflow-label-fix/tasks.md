# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Overflow Label Text and Phase Bug
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: For deterministic bugs, scope the property to the concrete failing cases:
    - `value=12, maxPerTier=9, phase="idle"` → label contains "lagi" (Bug 1)
    - `value=12, maxPerTier=9, phase="exploding"` → label span exists in DOM (Bug 3)
    - `value=12, maxPerTier=9, phase="settled"` → label span exists in DOM (Bug 4)
  - Test file: `__tests__/game/CharacterChips.bugcondition.test.tsx`
  - For phase `"idle"` or `"charging"` with overflow: assert label text does NOT contain "lagi" (will FAIL — bug exists)
  - For phase `"exploding"` or `"settled"` with overflow: assert no `<span>` overflow label in DOM (will FAIL — bug exists)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct — it proves the bug exists)
  - Document counterexamples found (e.g., `"+3 lagi"` rendered when `"+3"` expected; span present during `"exploding"` phase)
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Overflow and Non-Buggy Input Behavior
  - **IMPORTANT**: Follow observation-first methodology
  - Test file: `__tests__/game/CharacterChips.preservation.test.tsx`
  - Observe on UNFIXED code:
    - `value=7, maxPerTier=9, phase="idle"` → no overflow span, all 7 chips rendered
    - `value=9, maxPerTier=9, phase="exploding"` → dissolve animation classes present (`scale-0 opacity-0`), no overflow span
    - `value=5, maxPerTier=9, phase="idle", dimmed=true` → `opacity-30 grayscale` classes present
    - `value=123, maxPerTier=9, phase="idle"` → three tiers rendered (ratusan, puluhan, satuan), no overflow
  - Write property-based test: for all `value` and `maxPerTier` where every tier has `count <= maxPerTier`, no overflow span appears in any phase
  - Write property-based test: for `dimmed=true`, all rendered chip divs have `opacity-30 grayscale` class
  - Verify tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3. Fix for overflow label — hapus "lagi", sembunyikan di phase selesai

  - [x] 3.1 Implement the fix
    - File: `components/game/CharacterSVGs.tsx`, component `CharacterChips`
    - Tambah variabel `isSettled` setelah baris `const isExploding = phase === "exploding"`:
      ```ts
      const isSettled = phase === "settled";
      ```
    - Ganti kondisi render label dari `{count > maxPerTier && (` menjadi
      `{count > maxPerTier && !isExploding && !isSettled && (`
    - Hapus kata ` lagi` dari string template label — ubah dari:
      `+{(count - maxPerTier).toLocaleString("id-ID")} lagi`
      menjadi:
      `+{(count - maxPerTier).toLocaleString("id-ID")}`
    - _Bug_Condition: `isBugCondition(count, maxPerTier, phase)` — `count > maxPerTier` AND (`phase IN ["exploding","settled"]` OR labelText CONTAINS "lagi")_
    - _Expected_Behavior: phase `"idle"/"charging"` → label `"+N"` tanpa "lagi"; phase `"exploding"/"settled"` → tidak ada label span_
    - _Preservation: `count <= maxPerTier` — tidak ada perubahan output; chip rendering, dissolve animation, dimmed state tetap identik_
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.3, 3.4_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Overflow Label Text and Phase Bug
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms label shows `"+N"` without "lagi" for active phases, and no label renders for `"exploding"`/`"settled"` phases
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Overflow and Non-Buggy Input Behavior
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm chip rendering, dissolve animation, dimmed state, and multi-tier rendering all unchanged

- [x] 4. Checkpoint — Ensure all tests pass
  - Run full test suite: `npx jest --testPathPattern="CharacterChips"`
  - All tests from tasks 1, 2, 3.2, and 3.3 must pass
  - Ensure no regressions in existing tests (`__tests__/game/CharacterChips.test.ts`, `__tests__/game/CharacterSVGs.uid.test.tsx`)
  - Ensure all tests pass; ask the user if questions arise.
