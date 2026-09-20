# Design Document — game-virus-chip-removal

## Overview

This feature adds direct chip removal on the game-virus page. Currently a player can only add chips or undo the most-recent action globally. After this change, clicking any chip already placed in a BilanganZone removes exactly one unit of that chip's tier from the zone, giving fine-grained control without a full reset.

All changes are confined to `app/game-virus/page.tsx`. No shared components (`CharacterSVGs.tsx`, `TieredChips.tsx`, model-chip pages, number-line pages) are touched.

---

## Architecture

The feature follows the existing in-page component pattern of `game-virus/page.tsx`:

- A new pure function `removeFromBilangan` is added as a `useCallback` inside the page component, symmetrical to the existing `addToBilangan`.
- `BilanganZone` (the page-internal component) gains an optional `onChipRemove?: (tier: Tier) => void` prop. When the prop is absent the component renders identically to today.
- A new `Chip_Overlay` wrapper is introduced **inside `BilanganZone`** to intercept clicks and render hover feedback. It wraps each rendered chip produced by `CharacterChips` by re-implementing the iteration logic locally (mirroring `CharacterChips`' decomposition), so `CharacterChips` itself is not modified.

```
GameVirusPage
├── removeFromBilangan(bil, tier)   ← new
├── BilanganZone (bil=1, onChipRemove)
│   └── Chip_Overlay × N           ← new, wraps each chip
│       └── CharacterChips chip (unchanged)
└── BilanganZone (bil=2, onChipRemove)
    └── Chip_Overlay × N
        └── CharacterChips chip (unchanged)
```

### Data flow

```
User click on Chip_Overlay
  → reads data-tier from event.currentTarget.dataset.tier
  → calls onChipRemove(tier)
  → BilanganZone calls removeFromBilangan(bil, tier)
  → removeFromBilangan validates → updates bil1Value/bil2Value + history
  → React re-render → BilanganZone reflects new value
```

---

## Components and Interfaces

### `removeFromBilangan(bil: 1 | 2, tier: Tier): void`

New `useCallback` inside `GameVirusPage`. Guards and logic:

1. **Phase guard** — return early if `phase !== "idle"` or `resultValue !== null`.
2. **Sign-change guard** — compute `newAbs = Math.abs(currentValue) - tier`; if `newAbs < 0` trigger rejection flash and return.
3. **Tier-representability guard** — if `Math.abs(currentValue) % tier !== 0` return silently (tier not present in current decomposition).
4. On success: update `bilNValue` by subtracting `delta` (where `delta = tier` for ab zones, `delta = -tier` for ku zones), and push an **inverse** history entry so `undoLast` restores the original value.

History entry for a removal mirrors the format of an addition entry but records the inverse operation:

| Removal scenario | History entry pushed | Undo effect |
|---|---|---|
| Remove Ab chip (tier T) from bil B | `{ type: "ab", tier: T, bil: B }` reversed by subtracting T (same as an add-ab undo) | restores +T to bilB |
| Remove Ku chip (tier T) from bil B | `{ type: "ku", tier: T, bil: B }` reversed by adding T (same as an add-ku undo) | restores −T to bilB |

> Because `undoLast` subtracts the delta that was applied during the original action, and a removal applies the inverse delta of an addition, a removal's history entry is structurally identical to an addition entry — `undoLast` already handles it correctly with no modification.

### `Chip_Overlay` (JSX element inside `BilanganZone`)

A `div` wrapper rendered around each character chip in `BilanganZone`. Attributes and classes:

```tsx
<div
  className={`relative group ${canRemove ? "cursor-pointer" : "pointer-events-none"}`}
  data-tier={tier}
  onClick={canRemove ? () => onChipRemove(tier) : undefined}
>
  {/* original chip content */}
  {canRemove && (
    <span className="absolute inset-0 flex items-center justify-center
                     text-white text-[10px] font-bold
                     opacity-0 group-hover:opacity-100
                     transition-opacity duration-150 pointer-events-none">
      ×
    </span>
  )}
  {/* rejection flash: applied via state-driven class, not CSS-only */}
</div>
```

`canRemove = onChipRemove !== undefined && phase === "idle" && resultValue === null`

Hover treatment on the chip itself (passed down via a wrapper class applied to the chip div):

```
group-hover:opacity-60 group-hover:scale-95 transition-all duration-150
```

### Updated `BilanganZone` signature

```tsx
interface BilanganZoneProps {
  bil: 1 | 2;
  value: number;
  onChipRemove?: (tier: Tier) => void;   // ← new, optional
}
```

When `onChipRemove` is undefined the component renders without any `Chip_Overlay`, maintaining full backward compatibility for any future callers.

### Rejection flash state

A small piece of state `flashTier: Tier | null` lives inside `BilanganZone` (or can be lifted to the page). When `removeFromBilangan` detects an invalid removal it calls a setter that sets `flashTier = tier`; a `useEffect` or `setTimeout` clears it after 300 ms. The `Chip_Overlay` for that tier gets the class `ring-2 ring-red-500 animate-pulse` for the duration.

---

## Data Models

No new persistent data models. All state is in-memory React state within `GameVirusPage`.

### Existing state (relevant subset)

| State | Type | Role |
|---|---|---|
| `bil1Value` | `number` | Integer value of Bilangan 1 |
| `bil2Value` | `number` | Integer value of Bilangan 2 |
| `history` | `HistoryEntry[]` | Undo log — one entry per chip add/remove |
| `phase` | `AnimPhase` | Current animation phase gate |
| `resultValue` | `number \| null` | Computed result; non-null disables editing |

### `HistoryEntry` (unchanged)

```ts
interface HistoryEntry {
  type: "ab" | "ku";
  tier: Tier;
  bil: 1 | 2;
}
```

A removal pushes the same structure as an addition. `undoLast` reverses any entry uniformly, so no structural changes to `HistoryEntry` are needed.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Removal reduces value by exactly one tier unit

*For any* bilangan value `v` and tier `T` where `T` is present in the decomposition of `|v|` (i.e., `|v| mod T === 0` and `|v| - T >= 0`), calling `removeFromBilangan` SHALL produce a new absolute value of `|v| - T`, preserving the sign.

**Validates: Requirements 1.1, 1.2, 1.3**

---

### Property 2: Removal followed by undo restores original value

*For any* bilangan value `v` and valid tier `T` (present in decomposition of `|v|`), calling `removeFromBilangan(bil, T)` and then `undoLast()` SHALL restore `bilNValue` to exactly `v`.

**Validates: Requirements 1.2, 1.3**

---

### Property 3: Rejection preserves state atomically

*For any* call to `removeFromBilangan(bil, T)` where the removal would change the sign of the bilangan (i.e., `|v| - T < 0`), or where `|v| mod T !== 0`, the values of `bil1Value`, `bil2Value`, and `history` SHALL remain identical to their values before the call.

**Validates: Requirements 1.5, 3.1, 3.2, 3.4**

---

## Error Handling

| Scenario | Guard | Outcome |
|---|---|---|
| Click during animation (`phase !== "idle"`) | Phase guard in `removeFromBilangan` | No-op; `Chip_Overlay` is `pointer-events-none` so click is unreachable in normal use |
| Click after result computed (`resultValue !== null`) | Same phase guard | No-op |
| Removal would flip sign (`newAbs < 0`) | Sign-change guard | State unchanged; 300 ms red flash on the clicked chip via `flashTier` state |
| Tier not in decomposition (`|v| mod T !== 0`) | Tier-representability guard | Silent no-op (this chip shouldn't visually exist, but guard is defensive) |
| `onChipRemove` absent | Prop undefined check in `BilanganZone` | No overlays rendered, no listeners attached |
| `value === 0` | `CharacterChips` returns `null` | No chips rendered, no `Chip_Overlay` targets exist |

All guards are evaluated in `removeFromBilangan` **before** any state mutation. No partial state updates are possible (atomicity).

---

## Testing Strategy

This feature is suited for a mix of property-based tests (for the pure logic of `removeFromBilangan`) and example-based tests (for UI rendering and integration).

### Property-Based Tests (fast-check)

Use [fast-check](https://fast-check.io/) — already the project's PBT library (used in `BattleStage.speed.property.test.ts`).

Target: the extracted pure logic of `removeFromBilangan` (tier validation + value arithmetic), tested without React rendering overhead.

Each property test runs a minimum of **100 iterations**.

**Property 1 test** — `Feature: game-virus-chip-removal, Property 1: Removal reduces value by exactly one tier unit`
- Generators: `fc.integer({ min: 1, max: 9999 })` for value; derive a valid tier by picking a tier that divides the value.
- Assert: `result === value - tier` (for positive zones) or `result === value + tier` (for negative zones).

**Property 2 test** — `Feature: game-virus-chip-removal, Property 2: Removal followed by undo restores original value`
- Generators: same as Property 1; simulate `removeFromBilangan` then `undoLast`.
- Assert: final value === original value.

**Property 3 test** — `Feature: game-virus-chip-removal, Property 3: Rejection preserves state atomically`
- Generators:
  - Sign-flip case: `fc.integer({ min: 1, max: 999 })` for value; tier chosen > value.
  - Non-representable tier case: value and tier where `value % tier !== 0`.
- Assert: value and history are identical before and after the call.

### Unit / Example-Based Tests

- Render `BilanganZone` with `onChipRemove` absent → assert no `Chip_Overlay` in DOM.
- Render `BilanganZone` with `value=0` → assert no chip elements rendered.
- Render `BilanganZone` with `phase="charging"` → assert `pointer-events-none` present on all overlays.
- Render `BilanganZone` with `phase="idle"` and `value=10` → assert hover classes and `×` icon present.
- Simulate click on a chip → assert `onChipRemove` callback invoked with correct tier.
- Simulate invalid removal → assert `flashTier` class applied, state unchanged.

### Integration Notes

- `undoLast` is not modified; its correctness with removal entries is covered by Property 2.
- `CharacterChips` is not modified; its own rendering is not re-tested here.
- No new stylesheets; all visual states use existing Tailwind utility classes (`ring-2 ring-red-500 animate-pulse`, `group-hover:opacity-60`, etc.).
