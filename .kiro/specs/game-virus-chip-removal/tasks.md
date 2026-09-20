# Implementation Plan: game-virus-chip-removal

## Overview

All changes live inside `app/game-virus/page.tsx`. The implementation adds a `removeFromBilangan` callback, a `flashTier` state for rejection feedback, an optional `onChipRemove` prop on `BilanganZone`, and a `Chip_Overlay` wrapper that mirrors `CharacterChips`' own decomposition loop to intercept per-chip clicks without touching the shared component. Property-based tests target the extracted pure logic; unit tests cover UI state variants.

---

## Tasks

- [x] 1. Add `removeFromBilangan` useCallback to `GameVirusPage`
  - [x] 1.1 Implement `removeFromBilangan(bil: 1 | 2, tier: Tier): void` as a `useCallback` inside `GameVirusPage`, mirroring the structure of `addToBilangan`
    - Apply Phase_Guard: return early if `phase !== "idle"` or `resultValue !== null`
    - Apply Sign-change guard: compute `newAbs = Math.abs(currentValue) - tier`; if `newAbs < 0` call the flash setter and return without mutating state
    - Apply Tier-representability guard: if `Math.abs(currentValue) % tier !== 0` return silently
    - On success: update `bil1Value` or `bil2Value` by subtracting delta (`delta = tier` for ab zones, `delta = -tier` for ku zones); push inverse `HistoryEntry` so `undoLast` restores the original value with no further changes
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 3.1, 3.2, 3.4, 4.1_

- [x] 2. Add `flashTier` state and wire rejection flash
  - [x] 2.1 Add `flashTier: Tier | null` state inside `BilanganZone` (local state, not lifted)
    - Expose a setter so `removeFromBilangan` can trigger the flash by accepting an optional `onRejectFlash?: (tier: Tier) => void` prop, or lift the state to page level and pass it down — use whichever keeps `BilanganZone` self-contained per the design
    - Clear `flashTier` after 300 ms via `setTimeout` inside `BilanganZone`; cancel the timer in a cleanup to avoid state-update-on-unmounted-component
    - _Requirements: 3.1_

- [x] 3. Extend `BilanganZone` signature with `onChipRemove` prop
  - [x] 3.1 Add `onChipRemove?: (tier: Tier) => void` as an optional prop to `BilanganZone`
    - When `onChipRemove` is `undefined`, the component renders identically to today — no overlays, no event listeners
    - Derive `canRemove = onChipRemove !== undefined && phase === "idle" && resultValue === null` inside the component (read `phase` and `resultValue` from closure)
    - _Requirements: 4.2, 4.3, 4.4_

- [x] 4. Implement `Chip_Overlay` wrapper inside `BilanganZone`
  - [x] 4.1 Add local decomposition loop inside `BilanganZone` that mirrors `CharacterChips`' tier-breakdown logic
    - Decompose `absVal` into tiers `[1000, 100, 10, 1]`, cap each at `maxPerTier=6`, and render one `Chip_Overlay` div per chip — do NOT modify `CharacterChips`
    - Replace the bare `<CharacterChips … />` call when `onChipRemove` is defined; keep the bare call as the fallback when `onChipRemove` is undefined
    - `Chip_Overlay` attributes: `className`, `data-tier={tier}`, and `onClick`
    - Apply `cursor-pointer` and the `group` class when `canRemove`; apply `pointer-events-none` otherwise
    - Render the `×` span inside each overlay that is visible only on hover: `opacity-0 group-hover:opacity-100 transition-opacity duration-150`
    - Apply `group-hover:opacity-60 group-hover:scale-95 transition-all duration-150` to the inner chip wrapper div
    - Apply `ring-2 ring-red-500 animate-pulse` when `flashTier === tier`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 4.2, 4.4_

- [x] 5. Wire `removeFromBilangan` into `BilanganZone` usages at page level
  - [x] 5.1 Pass `onChipRemove` to both `<BilanganZone>` instances in the JSX
    - `bil={1}` zone receives `onChipRemove={(tier) => removeFromBilangan(1, tier)}`
    - `bil={2}` zone receives `onChipRemove={(tier) => removeFromBilangan(2, tier)}`
    - Verify `poolDisabled` logic is unchanged and the undo button behaviour is unaffected
    - _Requirements: 1.1, 4.1, 4.3_

- [x] 6. Checkpoint — manual smoke-test and build verification
  - Build the project (`next build` or equivalent); ensure no TypeScript errors
  - Verify clicking a chip in the zone removes it, undo restores it, and clicking during animation/result phase does nothing
  - Ask the user if anything looks off before proceeding to tests

- [x] 7. Write property-based tests (fast-check)
  - [x] 7.1 Write property test for Property 1: Removal reduces value by exactly one tier unit
    - **Property 1: Removal reduces value by exactly one tier unit**
    - **Validates: Requirements 1.1, 1.2, 1.3**
    - Extract the pure arithmetic of `removeFromBilangan` (guards + delta) into a testable function or test it by calling the callback in a controlled state snapshot
    - Generator: `fc.integer({ min: 1, max: 9999 })` for value; pick a valid tier `T` such that `value % T === 0`; assert new absolute value equals `Math.abs(value) - T`; run ≥ 100 iterations
    - File: `app/game-virus/__tests__/removeFromBilangan.property.test.ts`

  - [x] 7.2 Write property test for Property 2: Removal followed by undo restores original value
    - **Property 2: Removal followed by undo restores original value**
    - **Validates: Requirements 1.2, 1.3**
    - Simulate `removeFromBilangan(bil, T)` then `undoLast()` on the resulting state; assert final value equals original value and history length equals original history length
    - Generator: same as 7.1; run ≥ 100 iterations
    - File: `app/game-virus/__tests__/removeFromBilangan.property.test.ts`

  - [x] 7.3 Write property test for Property 3: Rejection preserves state atomically
    - **Property 3: Rejection preserves state atomically**
    - **Validates: Requirements 1.5, 3.1, 3.2, 3.4**
    - Two generator branches: (a) sign-flip case where tier > absValue; (b) non-representable tier case where `absValue % tier !== 0`
    - Assert `bil1Value`, `bil2Value`, and `history` are reference-equal (or deeply equal) before and after the rejected call
    - Run ≥ 100 iterations per branch
    - File: `app/game-virus/__tests__/removeFromBilangan.property.test.ts`

- [x] 8. Write unit / example-based tests
  - [x] 8.1 Write unit tests for `BilanganZone` rendering variants
    - `onChipRemove` absent → no `Chip_Overlay` in DOM (no `data-tier` attributes)
    - `value=0` → no chip elements rendered (CharacterChips returns null)
    - `phase="charging"` with `onChipRemove` present → `pointer-events-none` on all overlays
    - `phase="idle"` with `value=10` and `onChipRemove` present → hover classes (`group-hover:opacity-60`) and `×` span present
    - Simulate click on a chip overlay → `onChipRemove` callback invoked with correct tier value
    - Simulate invalid removal (sign-flip) → `ring-red-500` class appears on clicked chip within 300 ms, state unchanged
    - File: `app/game-virus/__tests__/BilanganZone.unit.test.tsx`

- [x] 9. Final checkpoint — Ensure all tests pass
  - Run `vitest --run` (or the project's test command); all tests must be green
  - Ask the user if any adjustments are needed

---

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The decomposition loop in task 4.1 must mirror `CharacterChips` exactly (same `[1000, 100, 10, 1]` order, same `maxPerTier=6` cap, same `Math.floor` logic) so chip counts are identical
- `undoLast` is not modified; a removal entry is structurally identical to an addition entry so undo already handles it
- `CharacterChips` in `CharacterSVGs.tsx` is never touched

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "3.1"] },
    { "id": 2, "tasks": ["4.1"] },
    { "id": 3, "tasks": ["5.1"] },
    { "id": 4, "tasks": ["7.1", "7.2", "7.3", "8.1"] }
  ]
}
```
