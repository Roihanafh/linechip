# Requirements Document

## Introduction

The **model-chip-alliance-animation** feature adds an alliance (penggabungan) animation path to the Model Zero-Pair materi page (`app/model-chip/page.tsx`). Currently the page only animates the neutralisation (battle) case — when bil1 and bil2 have opposite signs. When both inputs have the **same sign** (both positive = antibodi, both negative = kuman), the orchestrator skips directly to `vizPhase = "done"` with no visual feedback. This feature detects that same-sign case and plays the already-built `AllianceStage` animation so students see a celebratory "join forces" moment that reinforces the concept of same-sign integers combining to form a larger value.

## Glossary

- **Orchestrator**: `useAnimationOrchestrator` hook in `hooks/model-chip/useAnimationOrchestrator.ts`. Controls the step-by-step animation lifecycle.
- **VizPhase**: The top-level visualization phase stored in `ModelChipState`. Currently `"idle" | "battle" | "center" | "done"`.
- **AllianceStage**: The pre-built component `components/game/AllianceStage.tsx` (idle → approach → bounce → settled, ~1350 ms at speed 1×). Must not be modified.
- **ArenaPanel**: `components/model-chip/ArenaPanel.tsx`. Decides what to render inside the arena card based on `vizPhase`.
- **ArenaBattle**: `components/model-chip/ArenaBattle.tsx`. Renders battle-specific animation sub-components. Must not be modified.
- **PairReactionStage**: `components/game/PairReactionStage.tsx`. Battle animation. Must not be modified.
- **Snapshot**: Frozen copy of `{ bil1, bil2 }` taken at the moment "Pasangkan" is clicked, used throughout the animation.
- **Faction**: `"ab"` (antibodi, positive values) or `"ku"` (kuman/virus, negative values).
- **Alliance_Case**: The condition where both `bil1` and `bil2` carry the same sign (both ≥ 0 or both < 0) and neither is zero.
- **Battle_Case**: The condition where `bil1` and `bil2` have opposite signs so neutralisation occurs.
- **Center_Phase**: `vizPhase = "center"` — the brief neutralisation flash shown after battle completes, before `"done"`.
- **AnimSpeed**: The speed multiplier (0.5×, 1×, 2×) currently used for battle; must also be forwarded to `AllianceStage`.

## Requirements

---

### Requirement 1: VizPhase Type Extension

**User Story:** As a developer maintaining the model-chip page, I want the `VizPhase` type to include an `"alliance"` value, so that the rest of the system can branch on it without TypeScript errors.

#### Acceptance Criteria

1. THE `VizPhase` type in `lib/model-chip/types.ts` SHALL be extended to include the literal `"alliance"` alongside the existing values `"idle"`, `"battle"`, `"center"`, and `"done"`.
2. WHEN the TypeScript compiler processes `ArenaPanel`, `useModelChipState`, or `useAnimationOrchestrator` after adding `"alliance"` to `VizPhase`, THE build SHALL produce zero new type errors as verified by running `tsc --noEmit`.
3. WHEN the existing test suite is executed after adding `"alliance"` to `VizPhase`, THE test suite SHALL report no new failures, confirming that battle, center, and done paths produce identical rendered output and state transitions as before the type change.

---

### Requirement 2: Alliance Case Detection in the Orchestrator

**User Story:** As a student, I want to see an animation when I enter two numbers with the same sign and click "Pasangkan", so that I understand what happens when two positive (or two negative) integers combine.

#### Acceptance Criteria

1. WHEN `handlePair()` is called AND both `bil1` and `bil2` are positive (both > 0) AND `vizPhase` is `"idle"`, THE Orchestrator SHALL call `state.setSnapshot({ bil1, bil2 })` first, then set `vizPhase` to `"alliance"`.
2. WHEN `handlePair()` is called AND both `bil1` and `bil2` are negative (both < 0) AND `vizPhase` is `"idle"`, THE Orchestrator SHALL call `state.setSnapshot({ bil1, bil2 })` first, then set `vizPhase` to `"alliance"`.
3. WHEN `handlePair()` is called AND `bil1` and `bil2` have opposite signs (Battle_Case), THE Orchestrator SHALL set `vizPhase` to `"battle"` and execute the `buildBattlePlan` path.
4. WHEN `handlePair()` is called AND either `bil1 === 0` or `bil2 === 0`, THE Orchestrator SHALL set `vizPhase` to `"done"` synchronously within the same call, without calling `state.setSnapshot`.
5. IF `handlePair()` is called while `vizPhase` is not `"idle"`, THEN THE Orchestrator SHALL ignore the call and make no state changes.

---

### Requirement 3: Orchestrator Alliance Completion

**User Story:** As a student, I want the result panel to appear after the alliance animation finishes, so that I see the combined total.

#### Acceptance Criteria

1. WHEN `AllianceStage.onComplete` fires, THE Orchestrator SHALL set `vizPhase` to `"center"` to trigger the same brief reaction flash used after battle.
2. WHEN the center phase display delay elapses (2000 ms divided by `AnimSpeed`), THE Orchestrator SHALL set `centerExiting` to `true`; WHEN the subsequent exit delay elapses (500 ms divided by `AnimSpeed`), THE Orchestrator SHALL set `vizPhase` to `"done"`.
3. THE Orchestrator SHALL apply the `AnimSpeed` multiplier independently to each scheduled delay (display delay = `Math.round(2000 / AnimSpeed)` ms; exit delay = `Math.round(500 / AnimSpeed)` ms) during the alliance completion path.
4. WHEN `handleReset()` is called while `vizPhase === "alliance"` OR `vizPhase === "center"` reached via the alliance path, THE Orchestrator SHALL cancel all pending timers via `clearTimeout` and set `vizPhase` to `"idle"`, clearing the snapshot.
5. IF `AllianceStage` is unmounted before `onComplete` fires (e.g. user clicks "Kembali ke Input"), THEN THE Orchestrator SHALL not call `onComplete` after unmount and SHALL not throw any errors, verified by the absence of React "setState on unmounted component" warnings in the test environment.

---

### Requirement 4: ArenaPanel Alliance Branch

**User Story:** As a student, I want to see the AllianceStage animation inside the arena card when two same-sign numbers are entered, so that the visual experience matches the educational concept.

#### Acceptance Criteria

1. WHEN `vizPhase === "alliance"`, THE ArenaPanel SHALL render `AllianceStage` inside the arena card instead of `ArenaBattle` or `ArenaCenter`.
2. WHILE `vizPhase === "alliance"`, THE ArenaPanel SHALL pass `bil1Value` equal to `snapshot.bil1` and `bil2Value` equal to `snapshot.bil2` to `AllianceStage`.
3. WHILE `vizPhase === "alliance"`, THE ArenaPanel SHALL derive `faction` as `"ab"` when `snapshot.bil1 > 0`, and `"ku"` when `snapshot.bil1 < 0`; since Alliance_Case guarantees neither value is zero, these two branches are exhaustive.
4. WHILE `vizPhase === "alliance"`, THE ArenaPanel SHALL pass `autoStart={true}` and `hideControls={true}` to `AllianceStage`.
5. WHILE `vizPhase === "alliance"`, THE ArenaPanel SHALL pass the current `animSpeed` value as the `speed` prop to `AllianceStage`.
6. WHILE `vizPhase === "alliance"`, THE ArenaPanel SHALL accept an `onAllianceDone` callback prop and wire it to `AllianceStage.onComplete`, so that when `AllianceStage` completes, the Orchestrator is notified via `onAllianceDone`.
7. THE existing battle (`vizPhase === "battle"`) and center (`vizPhase === "center"`) branches in ArenaPanel SHALL remain unchanged.

---

### Requirement 5: Arena Header Text for Alliance Phase

**User Story:** As a student, I want to see a clear label inside the arena when the alliance animation is playing, so that I know what is happening.

#### Acceptance Criteria

1. WHEN `vizPhase === "alliance"`, THE ArenaPanel header element with `data-testid="arena-header"` SHALL contain the text `"🤝 Persekutuan!"`.
2. WHEN `vizPhase === "alliance"`, THE ArenaPanel status badge element SHALL contain the text `"Bergabung"`.
3. WHEN `vizPhase === "alliance"` AND `faction === "ab"`, THE top accent bar in ArenaPanel SHALL have a solid blue background (Tailwind class `bg-intblue` or equivalent) without the pulsing animation class; WHEN `vizPhase === "alliance"` AND `faction === "ku"`, THE top accent bar SHALL have a solid red/pink background (Tailwind class `bg-intpink` or equivalent) without the pulsing animation class.

---

### Requirement 6: Replay Support for Alliance

**User Story:** As a student, I want to be able to replay the alliance animation after it finishes, so that I can watch it again.

#### Acceptance Criteria

1. WHEN `replayAnimation()` is called AND the stored snapshot satisfies Alliance_Case (both `snapshot.bil1` and `snapshot.bil2` have the same sign and neither is zero), THE Orchestrator SHALL set `vizPhase` to `"alliance"` without invoking `buildBattlePlan`.
2. WHEN `replayAnimation()` is called for an Alliance_Case, THE ArenaPanel SHALL receive `vizPhase === "alliance"` and SHALL render `AllianceStage` with `autoStart={true}`, causing the full alliance animation cycle to play from the beginning.

---

### Requirement 7: Existing Battle Flow Unaffected

**User Story:** As a developer, I want the existing battle animation to continue working exactly as before, so that introducing the alliance path causes no regressions.

#### Acceptance Criteria

1. WHEN `handlePair()` is called with `bil1` and `bil2` having opposite signs, THE Orchestrator SHALL set `vizPhase` to `"battle"`, call `buildBattlePlan(bil1, bil2)`, and produce the same `BattlePlan` steps, `tierGroups`, and `chipMap` values as before this feature was introduced.
2. THE source file `components/model-chip/ArenaBattle.tsx` SHALL not be modified as part of this feature.
3. THE source file `components/game/PairReactionStage.tsx` SHALL not be modified as part of this feature.
4. THE source file `components/game/AllianceStage.tsx` SHALL not be modified as part of this feature.
5. WHEN `handleReset()` is called or `AllianceStage` is unmounted during an active alliance animation, THE Orchestrator SHALL clear all pending timers such that no subsequent `setState` call executes and no unhandled promise rejection or console error appears in the test environment.
