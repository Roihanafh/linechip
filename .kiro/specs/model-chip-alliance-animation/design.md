# Design Document: model-chip-alliance-animation

## Overview

The `model-chip-alliance-animation` feature adds a **same-sign ("alliance") animation path** to the Model Zero-Pair page (`app/model-chip/page.tsx`).

Currently, `handlePair()` in `useAnimationOrchestrator` treats any input pair that lacks opposing signs as a "done-immediately" case — it calls `state.setVizPhase("done")` with no visual feedback. This means students who enter, say, `+3` and `+5` see the result appear instantly with no reinforcement of the combining concept.

The fix is to detect the same-sign case and route it through a new `"alliance"` viz-phase, which renders the already-built `AllianceStage` component. When the animation completes it feeds into the existing `"center"` → `"done"` transition, so the result panel appears naturally with the familiar brief flash.

No existing components are modified. The changes touch only:
1. `lib/model-chip/types.ts` — add `"alliance"` to `VizPhase`
2. `hooks/model-chip/useAnimationOrchestrator.ts` — detect alliance case, handle completion + replay
3. `components/model-chip/ArenaPanel.tsx` — render `AllianceStage` when `vizPhase === "alliance"`
4. `app/model-chip/page.tsx` — pass `onAllianceDone` through to `ArenaPanel`

---

## Architecture

The page already uses a two-hook architecture:

- **`useModelChipState`** — owns raw input (`bil1`, `bil2`), `vizPhase`, and `snapshot`. Purely reactive state, no side-effects.
- **`useAnimationOrchestrator`** — owns all timer scheduling, animation sub-state (tierGroups, battlePlan, etc.), and the action handlers (`handlePair`, `handleReset`, `replayAnimation`).

`ArenaPanel` is a pure render component — it maps `vizPhase` to one of three sub-components (`ArenaBattle`, `ArenaCenter`, `ArenaDone`) and will now map `"alliance"` to `AllianceStage`.

```
User clicks "Pasangkan"
       │
       ▼
handlePair() in useAnimationOrchestrator
       │
       ├── same sign & neither zero → setSnapshot → setVizPhase("alliance")
       │
       ├── opposite signs          → setSnapshot → startBattle() (existing)
       │
       └── either is zero          → setVizPhase("done") (existing)

vizPhase "alliance"
       │
       ▼
ArenaPanel renders AllianceStage (autoStart, hideControls, speed, onComplete=onAllianceDone)
       │
       └── AllianceStage.onComplete fires
              │
              ▼
       onAllianceDone() in orchestrator
              │
              ├── setVizPhase("center")
              ├── after Math.round(2000/animSpeed) ms → setCenterExiting(true)
              └── after Math.round(500/animSpeed)  ms → setVizPhase("done")
```

This reuses the existing `finishAll()` logic path so the center-flash + done transition stays identical regardless of whether the pair came from battle or alliance.

---

## Components and Interfaces

### `VizPhase` type (`lib/model-chip/types.ts`)

```ts
export type VizPhase = "idle" | "battle" | "center" | "done" | "alliance";
```

The single-character addition. Every switch/conditional on `VizPhase` already has a catch-all or `"done"` default, so no other file gains new TypeScript errors. `useModelChipState` and `ArenaPanel` both import this type; both compile clean with the new literal.

---

### `useAnimationOrchestrator` changes

**`handlePair()`** — replace the current `if (!(tp > 0 && tn > 0)) { state.setVizPhase("done"); return; }` guard with a three-way branch:

```
isAllianceCase = (bil1 > 0 && bil2 > 0) || (bil1 < 0 && bil2 < 0)
isZeroCase     = bil1 === 0 || bil2 === 0
isBattleCase   = otherwise
```

| Case | Action |
|------|--------|
| zero | `setVizPhase("done")` synchronously, no snapshot |
| alliance | `setSnapshot({ bil1, bil2 })` then `setVizPhase("alliance")` |
| battle | `setSnapshot({ bil1, bil2 })` then `startBattle(...)` (unchanged) |

Note: the pre-existing call `state.setSnapshot({ bil1, bil2 })` already happens before `startBattle` in the current code; the zero-case deliberately skips it (requirement 2.4). The alliance case must set the snapshot first so `ArenaPanel` has data to pass to `AllianceStage`.

**`handleAllianceDone()`** — new handler, mirrors `finishAll()` but uses speed-aware delays:

```ts
const handleAllianceDone = () => {
  state.setVizPhase("center");
  setCenterExiting(false);
  const t1 = setTimeout(
    () => setCenterExiting(true),
    Math.round(2000 / animSpeedRef.current)
  );
  const t2 = setTimeout(
    () => state.setVizPhase("done"),
    Math.round(2000 / animSpeedRef.current) + Math.round(500 / animSpeedRef.current)
  );
  timers.current.push(t1, t2);
};
```

The existing `finishAll()` uses hardcoded `2000` and `2500` ms. The alliance path uses speed-aware values to honour requirement 3.3.

**`replayAnimation()`** — add a same-sign check mirroring `handlePair`'s alliance branch:

```ts
const replayAnimation = () => {
  const { snapshot } = state;
  if (!snapshot) return;
  resetAnimState();
  const { bil1, bil2 } = snapshot;
  const isAlliance = (bil1 > 0 && bil2 > 0) || (bil1 < 0 && bil2 < 0);
  if (isAlliance) { state.setVizPhase("alliance"); return; }
  // ... existing battle replay path
};
```

**`handleReset()`** — unchanged; it already calls `clearTimers()` unconditionally, so it correctly cancels any pending alliance timers (requirement 3.4).

**Return shape** — add `handleAllianceDone` to the return object:

```ts
export interface AnimationOrchestratorReturn {
  // ... existing fields
  handleAllianceDone: () => void;
}
```

---

### `ArenaPanel` changes (`components/model-chip/ArenaPanel.tsx`)

**New props:**

```ts
export interface ArenaPanelProps {
  // ... existing props
  onAllianceDone: () => void;  // NEW
}
```

**Alliance branch** — added inside the render after the existing `vizPhase === "center"` block:

```tsx
{vizPhase === "alliance" && snapshot && (
  <AllianceStage
    bil1Value={snapshot.bil1}
    bil2Value={snapshot.bil2}
    faction={snapshot.bil1 > 0 ? "ab" : "ku"}
    autoStart={true}
    hideControls={true}
    speed={animSpeed}
    onComplete={onAllianceDone}
  />
)}
```

**Header / status text** — extend the existing `headerText` / `statusText` derivations:

```ts
const headerText =
  vizPhase === "alliance" ? "🤝 Persekutuan!"
  : vizPhase === "battle"  ? "⚔️ Pertarungan!"
  : vizPhase === "center"  ? "⚡ Reaksi Netralisasi"
  : isDone                 ? "✓ Selesai"
  : "Arena";

const statusText =
  vizPhase === "alliance" ? "Bergabung"
  : vizPhase === "battle" && curGroup ? `${TIER_TO_PLACE[curGroup.tier]} ${pairInTier + 1}/${curGroup.count}`
  : vizPhase === "center" ? "Bereaksi"
  : isDone                ? "Selesai"
  : "Standby";
```

**Top accent bar** — add the alliance case:

```ts
const accentBarClass =
  isDone           ? "bg-emerald-400"
  : vizPhase === "center"   ? "bg-gradient-to-r from-intblue to-intpink"
  : vizPhase === "alliance" ? (snapshot?.bil1 > 0 ? "bg-intblue" : "bg-intpink")
  : "bg-gradient-to-r from-intblue via-amber-400 to-intpink animate-pulse";
```

No `animate-pulse` for alliance — requirement 5.3.

---

### `app/model-chip/page.tsx` changes

Pass `onAllianceDone` to `ArenaPanel`:

```tsx
<ArenaPanel
  {/* ... existing props */}
  onAllianceDone={anim.handleAllianceDone}
/>
```

The reset button visibility condition `vizPhase !== "idle" && vizPhase !== "done"` already covers `"alliance"` without any change, since `"alliance"` is neither `"idle"` nor `"done"`.

---

## Data Models

No new data structures are introduced. The alliance path is purely a control-flow addition:

- `VizPhase` gains one new string literal.
- `snapshot` (already `{ bil1: number; bil2: number } | null`) serves as the data source for `AllianceStage` props.
- Timer management uses the existing `timers` ref pattern.

**Alliance_Case predicate** (used in two places — `handlePair` and `replayAnimation`):

```ts
function isAllianceCase(bil1: number, bil2: number): boolean {
  return (bil1 > 0 && bil2 > 0) || (bil1 < 0 && bil2 < 0);
}
```

Extracting this into a small pure helper makes it testable independently and avoids repeating the logic.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Alliance case detection is exhaustive and correct

*For any* pair of non-zero integers `(bil1, bil2)` where both have the same sign, `isAllianceCase(bil1, bil2)` returns `true`; for any pair with opposite signs, it returns `false`; for any pair where at least one is zero, it returns `false`.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

---

### Property 2: AnimSpeed delay scaling

*For any* positive `animSpeed` value, the display delay applied in the alliance completion path equals `Math.round(2000 / animSpeed)` milliseconds and the exit delay equals `Math.round(500 / animSpeed)` milliseconds; both are independent and neither is zero for any finite positive speed.

**Validates: Requirements 3.2, 3.3**

---

### Property 3: Snapshot prop forwarding is identity

*For any* snapshot `{ bil1, bil2 }` satisfying Alliance_Case, `ArenaPanel` passes `bil1Value === snapshot.bil1` and `bil2Value === snapshot.bil2` to `AllianceStage` without transformation.

**Validates: Requirements 4.2**

---

### Property 4: Faction derivation is total and correct for Alliance_Case

*For any* snapshot where `bil1 > 0`, the derived `faction` prop passed to `AllianceStage` is `"ab"`; for any snapshot where `bil1 < 0`, the derived `faction` is `"ku"`. Since Alliance_Case excludes zero, these two branches are exhaustive.

**Validates: Requirements 4.3**

---

### Property 5: Speed prop forwarding is identity

*For any* `animSpeed` value, `ArenaPanel` passes it unchanged as the `speed` prop to `AllianceStage` when `vizPhase === "alliance"`.

**Validates: Requirements 4.5**

---

### Property 6: replayAnimation routes alliance snapshots correctly

*For any* snapshot `(bil1, bil2)` satisfying Alliance_Case, calling `replayAnimation()` sets `vizPhase` to `"alliance"` and does not call `buildBattlePlan`.

**Validates: Requirements 6.1**

---

## Error Handling

### Timer cleanup on unmount / reset

`AllianceStage` manages its own internal timers via `useEffect` cleanup (`return () => clearAllTimers()`). When `ArenaPanel` unmounts the component (because `vizPhase` changes away from `"alliance"` before `onComplete` fires), `AllianceStage`'s cleanup fires and cancels its internal timers — `onComplete` is never called. The orchestrator's `handleAllianceDone` is therefore never invoked, so no state is set on an unmounted tree (requirement 3.5).

The orchestrator's own `timers` ref is cleared by `handleReset()` → `resetAnimState()` → `clearTimers()`. This covers the case where the user clicks "Kembali ke Input" while `"alliance"` is active, which unmounts `AllianceStage` and clears any orchestrator-level pending timers (requirement 3.4).

### Zero-input guard

`handlePair` checks `bil1 === 0 || bil2 === 0` before the alliance/battle branches. `state.setSnapshot` is not called in this path, so `ArenaPanel` (which is only rendered when `snapshot !== null`) stays hidden. This prevents `AllianceStage` from receiving `bil1Value = 0` which would cause the wrong tier character to be shown.

### Non-idle guard

`handlePair` returns immediately if `vizPhase !== "idle"`. Because `resetAnimState` is called at the top of `handlePair` before the guard in the current implementation, the existing reset-before-guard ordering should be preserved to avoid clearing state mid-animation. The alliance path must preserve the guard: if `vizPhase === "battle"` and the user somehow triggers `handlePair` again, nothing happens.

---

## Testing Strategy

### Unit tests (example-based)

Target: `useAnimationOrchestrator` logic, `isAllianceCase` helper, `ArenaPanel` rendering.

Key scenarios:
- `handlePair(3, 5)` → snapshot set, `vizPhase === "alliance"` (req 2.1)
- `handlePair(-2, -4)` → snapshot set, `vizPhase === "alliance"` (req 2.2)
- `handlePair(3, -5)` → `vizPhase === "battle"` (req 2.3, regression)
- `handlePair(0, 5)` and `handlePair(3, 0)` → `vizPhase === "done"`, no snapshot (req 2.4)
- `handlePair` while `vizPhase !== "idle"` → no state change (req 2.5)
- `handleAllianceDone()` → `vizPhase === "center"` immediately (req 3.1)
- `handleReset()` while in alliance → `vizPhase === "idle"`, no timer fires (req 3.4)
- `replayAnimation()` with alliance snapshot → `vizPhase === "alliance"` (req 6.1)
- `ArenaPanel` with `vizPhase="alliance"` renders `AllianceStage` with `autoStart`, `hideControls`, correct `onComplete` wiring (req 4.1, 4.4, 4.6)
- Header text `"🤝 Persekutuan!"` and status `"Bergabung"` for alliance phase (req 5.1, 5.2)
- Accent bar class `bg-intblue` for positive faction, `bg-intpink` for negative (req 5.3)

### Property-based tests

Using **fast-check** (already in the project for existing property tests). Minimum 100 iterations per property.

**Tag format: `Feature: model-chip-alliance-animation, Property {N}: {property_text}`**

| Property | Generator | Assertion |
|----------|-----------|-----------|
| P1: isAllianceCase correctness | `fc.integer({min:1,max:9999})` for same-sign pairs, `fc.integer({min:-9999,max:-1})` for negative, mixed-sign pairs, zero-inclusive pairs | verify return value matches expected |
| P2: AnimSpeed delay scaling | `fc.float({min:0.1,max:10,noNaN:true,noDefaultInfinity:true})` | `Math.round(2000/s)` and `Math.round(500/s)` never zero, match formula |
| P3: Snapshot prop forwarding | `fc.integer({min:-9999,max:9999})` pairs (exclude same-zero) | rendered `bil1Value`/`bil2Value` props equal input |
| P4: Faction derivation | `fc.integer({min:1,max:9999})` for positive bil1, `fc.integer({min:-9999,max:-1})` for negative | faction === "ab" or "ku" respectively |
| P5: Speed prop forwarding | `fc.oneof(fc.constant(0.5),fc.constant(1),fc.constant(2))` | `speed` prop equals input |
| P6: replay routes alliance | `fc.integer({min:1,max:9999})` pairs for same-sign | `replayAnimation()` leads to `vizPhase === "alliance"` |

### Smoke tests / regression

- Run `tsc --noEmit` after type change (req 1.1, 1.2)
- Run existing test suite and confirm zero new failures (req 1.3, 7.1–7.5)
- Verify `ArenaBattle.tsx`, `PairReactionStage.tsx`, and `AllianceStage.tsx` are unmodified in the commit diff (req 7.2–7.4)
