# Design Document — `model-chip-refactor`

## Overview

`app/model-chip/page.tsx` saat ini adalah komponen monolitik ~550 baris yang menggabungkan state management, animation orchestration, business logic, dan rendering seluruh UI dalam satu file. Refactor ini memecahnya menjadi lapisan-lapisan yang terdefinisi jelas:

- **Helper modules** (`lib/model-chip/`) — fungsi pure TypeScript, zero React dependency
- **Custom hooks** (`hooks/model-chip/`) — React state dan side effects
- **Sub-components** (`components/model-chip/`) — unit rendering UI yang terfokus
- **Page** (`app/model-chip/page.tsx`) — thin orchestrator ≤150 baris

Tidak ada perubahan behavior yang terlihat pengguna. Semua state transitions, timing, dan animasi tetap identik.

---

## Architecture

### Layer Diagram

```
┌─────────────────────────────────────────────────────┐
│                app/model-chip/page.tsx               │
│       (thin orchestrator, ≤150 baris)                │
│                                                      │
│  useModelChipState()    useAnimationOrchestrator()   │
│       │                          │                   │
│  TierLegend  InputPanel  ArenaPanel  ResultPanel     │
└──────────────────────┬──────────────────────────────┘
                       │ imports
         ┌─────────────┼──────────────┐
         ▼             ▼              ▼
  hooks/model-chip/  components/    lib/model-chip/
  useModelChipState  model-chip/    tierUtils.ts
  useAnimOrchestrator TierLegend    inputPanelProps.ts
                     InputPanel     types.ts
                     ArenaPanel
                     CharacterColumn
                     ResultPanel
```

### Dependency Graph (no cycles)

```
page.tsx
  ├── hooks/model-chip/useModelChipState
  │     └── lib/model-chip/types
  ├── hooks/model-chip/useAnimationOrchestrator
  │     ├── lib/model-chip/types
  │     ├── lib/model-chip/tierUtils
  │     └── hooks/useSound          (existing)
  ├── components/model-chip/TierLegend
  │     └── components/game/CharacterSVGs
  ├── components/model-chip/InputPanel
  │     ├── lib/model-chip/types
  │     └── lib/model-chip/inputPanelProps
  ├── components/model-chip/ArenaPanel
  │     ├── lib/model-chip/types
  │     ├── components/model-chip/CharacterColumn
  │     │     ├── lib/model-chip/types
  │     │     └── components/game/CharacterSVGs
  │     └── components/game/PairReactionStage
  └── components/model-chip/ResultPanel
        ├── lib/model-chip/types
        └── components/game/CharacterSVGs
```

Aturan anti-cycle:
- `lib/model-chip/` tidak boleh mengimpor dari `hooks/` atau `components/`
- `hooks/model-chip/` tidak boleh mengimpor dari `components/model-chip/`
- `components/model-chip/` tidak boleh mengimpor dari `hooks/model-chip/` (props drilled dari page)

---

## Components and Interfaces

### File Structure

```
linechip/
├── app/model-chip/
│   └── page.tsx                    ← thin orchestrator (≤150 baris)
├── lib/model-chip/
│   ├── types.ts                    ← VizPhase, TierGroup, StepPhase, AnimMode
│   ├── tierUtils.ts                ← buildTierGroups()
│   └── inputPanelProps.ts          ← inputPanelProps()
├── hooks/model-chip/
│   ├── useModelChipState.ts        ← input + viz phase state
│   ├── useAnimationOrchestrator.ts ← animation step machine
│   └── index.ts                    ← barrel exports
└── components/model-chip/
    ├── TierLegend.tsx
    ├── InputPanel.tsx
    ├── CharacterColumn.tsx
    ├── ArenaPanel.tsx
    ├── ResultPanel.tsx
    └── index.ts                    ← barrel exports
```

---

## Data Models

### Shared Types (`lib/model-chip/types.ts`)

```typescript
/** Fase visualisasi utama halaman */
export type VizPhase = "idle" | "battle" | "center" | "done";

/** Mode animasi: otomatis atau klik per-pasangan */
export type AnimMode = "auto" | "click";

/** Satu fase dalam satu PairReactionStage */
export type StepPhase = "approach" | "clash" | "clear";

/** Satu tier group hasil dekomposisi pasangan netral */
export interface TierGroup {
  tier: 1 | 10 | 100 | 1000;
  count: number;
}

/** Props minimal yang dibagikan ke ArenaPanel dan CharacterColumn */
export interface BattleProgress {
  tierGroups: TierGroup[];
  tierIdx: number;
  pairInTier: number;
  stepPhase: StepPhase;
  neutralised: Map<1 | 10 | 100 | 1000, number>;
}
```

### `inputPanelProps` Return Type (`lib/model-chip/inputPanelProps.ts`)

```typescript
export interface InputPanelDerived {
  isPos: boolean;
  isNeg: boolean;
  absVal: number;
  type: "ab" | "ku";
  cardBorder: string;
  iconBg: string;
  iconLabel: string;
  titleColor: string;
  troopName: string | null;
  subtitle: string;
  inputColor: string;
  inputBorder: string;
  svgBg: string;
}

export function inputPanelProps(val: number): InputPanelDerived { ... }
```

### `buildTierGroups` (`lib/model-chip/tierUtils.ts`)

```typescript
/** Dekomposisi totalPairs ke TierGroup[] besar-ke-kecil. Kembalikan [] jika totalPairs <= 0. */
export function buildTierGroups(totalPairs: number): TierGroup[] { ... }
```

---

## Hook API Surfaces

### `useModelChipState` (`hooks/model-chip/useModelChipState.ts`)

```typescript
export interface ModelChipState {
  bil1: number;
  bil2: number;
  setBil1: (v: number) => void;
  setBil2: (v: number) => void;
  vizPhase: VizPhase;
  setVizPhase: (p: VizPhase) => void;
  snapshot: { bil1: number; bil2: number } | null;
  setSnapshot: (s: { bil1: number; bil2: number } | null) => void;
}

export function useModelChipState(): ModelChipState;
```

Catatan SSR-safety: hanya `useState` dan `useEffect` standar — tidak ada akses ke `window` atau `sessionStorage`.

### `useAnimationOrchestrator` (`hooks/model-chip/useAnimationOrchestrator.ts`)

```typescript
export interface AnimationOrchestratorOptions {
  state: ModelChipState;
}

export interface AnimationOrchestratorReturn {
  // State
  tierGroups: TierGroup[];
  setTierGroups: (g: TierGroup[]) => void;
  tierIdx: number;
  pairInTier: number;
  stepPhase: StepPhase;
  neutralised: Map<1 | 10 | 100 | 1000, number>;
  animSpeed: number;
  setAnimSpeed: (s: number) => void;
  animMode: AnimMode;
  setAnimMode: (m: AnimMode) => void;
  waitingForClick: boolean;
  centerExiting: boolean;
  setCenterExiting: (v: boolean) => void;
  // Actions
  handlePair: () => void;
  replayAnimation: () => void;
  handleNextClick: () => void;
}

export function useAnimationOrchestrator(
  opts: AnimationOrchestratorOptions
): AnimationOrchestratorReturn;
```

**SSR Safety:**
- `animMode` diinisialisasi ke `"auto"` secara synchronous (aman untuk SSR)
- `sessionStorage` dibaca hanya di dalam `useEffect(() => { ... }, [])` setelah mount
- Audio (`/wush.mp3`) diinisialisasi lewat `useSound` yang sudah SSR-safe
- Ref `animModeRef` dan `animSpeedRef` selalu up-to-date untuk closure di dalam `setTimeout`
- `useEffect(() => () => clearTimers(), [])` memastikan semua timer dibatalkan saat unmount

**Alur `runPair` (internal, tidak diekspos):**

```
runPair(groups, tIdx, pIdx, neu)
  ├─ tIdx >= groups.length  →  setVizPhase("center") + timers untuk "done"
  ├─ pIdx >= groups[tIdx].count  →  runPair(groups, tIdx+1, 0, neu)
  └─ normal: setTierIdx, setPairInTier, setStepPhase("approach"), setWaitingForClick(false)
       └─ onDone callback dari PairReactionStage:
             ├─ update neutralised
             ├─ animMode="auto": setTimeout(100ms) → runPair(next)
             └─ animMode="click": pendingNextRef ← {next}, setWaitingForClick(true)
```

---

## Sub-Component Props

### `TierLegend`

```typescript
// Tidak membutuhkan props — semua data berasal dari TIERS / CHAR_NAMES constant
export function TierLegend(): JSX.Element;
```

### `InputPanel`

```typescript
export interface InputPanelProps {
  bil1: number;
  bil2: number;
  animMode: AnimMode;
  animSpeed: number;
  vizPhase: VizPhase;
  snapshot: { bil1: number; bil2: number } | null;
  waitingForClick: boolean;
  onBil1Change: (val: string) => void;
  onBil2Change: (val: string) => void;
  onPair: () => void;
  onReset: () => void;
  onReplay: () => void;
  onAnimModeChange: (m: AnimMode) => void;
  onSpeedChange: (s: number) => void;
  onNextClick: () => void;
}
```

Disabled rules: ketika `vizPhase !== "idle"`, kedua `<input>`, selector AnimMode, dan tombol Pasangkan dinonaktifkan.

### `CharacterColumn`

```typescript
export interface CharacterColumnProps {
  sAbs: number;
  sPaired: number;
  sRemaining: number;
  sType: "ab" | "ku";
  sColor: string;           // Tailwind class e.g. "text-intblue"
  sSign: string;            // "" | "+"
  prefix: string;           // uid prefix untuk gradient deduplication
  vizPhase: VizPhase;
  tierGroups: TierGroup[];
  tierIdx: number;
  pairInTier: number;
  neutralised: Map<1 | 10 | 100 | 1000, number>;
  stepPhase: StepPhase;
}
```

Logika tampilan per-karakter identik dengan `renderColumn` saat ini: `isGone`, `isDimmed`, `isWaiting` dihitung berdasarkan posisi karakter relatif terhadap `pairInTier` dan `neutralised`.

### `ArenaPanel`

```typescript
export interface ArenaPanelProps {
  snapshot: { bil1: number; bil2: number };   // guaranteed non-null (parent guards)
  vizPhase: VizPhase;
  centerExiting: boolean;
  // Derived from snapshot (precomputed in page.tsx for simplicity)
  snapTotalPos: number;
  snapTotalNeg: number;
  pairs: number;
  remaining: number;
  // Battle state
  tierGroups: TierGroup[];
  tierIdx: number;
  pairInTier: number;
  stepPhase: StepPhase;
  neutralised: Map<1 | 10 | 100 | 1000, number>;
  animSpeed: number;
  onPairDone: (neu: Map<1 | 10 | 100 | 1000, number>) => void;
}
```

Phase rendering:
- `"battle"` → `PairReactionStage` + dua `CharacterColumn`
- `"center"` → ringkasan zero-pair + animasi react-center
- `"done"` → dua `CharacterColumn` (exploding pairs) + summary baris bawah

### `ResultPanel`

```typescript
export interface ResultPanelProps {
  eqBil1: number;
  eqBil2: number;
  remaining: number;
  vizPhase: VizPhase;
  pairs: number;
}
```

---

## Data Flow

```
page.tsx
│
├─ useModelChipState()
│    bil1, bil2, vizPhase, snapshot
│    setBil1, setBil2, setVizPhase, setSnapshot
│
├─ useAnimationOrchestrator({ state })
│    consumes: state.setBil1 (for reset), state.setVizPhase, state.setSnapshot
│    produces: tierGroups, tierIdx, pairInTier, stepPhase, neutralised,
│              animSpeed, animMode, waitingForClick, centerExiting,
│              handlePair, replayAnimation, handleNextClick
│
├─ InputPanel ← {bil1, bil2, animMode, animSpeed, vizPhase, snapshot,
│                waitingForClick, onBil1Change, onBil2Change, onPair,
│                onReset, onReplay, onAnimModeChange, onSpeedChange, onNextClick}
│
├─ ArenaPanel ← {snapshot, vizPhase, centerExiting, snapTotalPos, snapTotalNeg,
│                pairs, remaining, tierGroups, tierIdx, pairInTier, stepPhase,
│                neutralised, animSpeed, onPairDone}
│     └─ CharacterColumn ← slices of above
│     └─ PairReactionStage ← leftType, rightType, leftFaction, onDone, runKey, speed
│
└─ ResultPanel ← {eqBil1, eqBil2, remaining, vizPhase, pairs}
```

`onPairDone` yang diterima `ArenaPanel` adalah callback di `page.tsx` yang meneruskan ke `useAnimationOrchestrator`. Ini mencegah `ArenaPanel` bergantung langsung ke hook.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Fitur ini menggunakan `fast-check` (sudah terdaftar di `devDependencies`) untuk property-based testing. Fungsi-fungsi pure di `lib/model-chip/` menjadi target utama karena memiliki input space yang berarti dan logika yang non-trivial.

### Property 1: `buildTierGroups` — nilai nol atau negatif selalu menghasilkan array kosong

*For any* integer `n ≤ 0`, `buildTierGroups(n)` SHALL return an empty array `[]`.

**Validates: Requirements 2.5, 5.8**

---

### Property 2: `buildTierGroups` — dekomposisi merekonstruksi nilai asli

*For any* positive integer `totalPairs` in `[1, 9999]`, the sum of `tier × count` over all groups returned by `buildTierGroups(totalPairs)` SHALL equal `totalPairs`.

**Validates: Requirements 2.1, 5.1**

---

### Property 3: `buildTierGroups` — urutan tier besar ke kecil

*For any* `totalPairs > 0`, setiap consecutive pair `(groups[i], groups[i+1])` in the result SHALL satisfy `groups[i].tier > groups[i+1].tier`.

Ini memastikan animasi selalu memulai dari tier terbesar (requirement battle ordering).

**Validates: Requirements 5.1**

---

### Property 4: `inputPanelProps` — output selalu memiliki shape yang lengkap

*For any* integer `val` in `[-9999, 9999]`, `inputPanelProps(val)` SHALL return an object where every required key (`isPos`, `isNeg`, `absVal`, `type`, `cardBorder`, `iconBg`, `iconLabel`, `titleColor`, `troopName`, `subtitle`, `inputColor`, `inputBorder`, `svgBg`) is present and has the correct type.

**Validates: Requirements 2.2**

---

### Property 5: `inputPanelProps` — tanda bilangan konsisten

*For any* integer `val` in `[-9999, 9999]`:
- `val > 0` implies `isPos === true`, `isNeg === false`, `type === "ab"`
- `val < 0` implies `isPos === false`, `isNeg === true`, `type === "ku"`
- `val === 0` implies `isPos === false`, `isNeg === false`
- `absVal === Math.abs(val)` selalu berlaku

**Validates: Requirements 2.2, 5.1**

---

### Property 6: `animMode` — round-trip ke sessionStorage

*For any* valid `AnimMode` value (`"auto"` | `"click"`), menulis nilai tersebut ke `sessionStorage["modelChipAnimMode"]` dan kemudian membacanya kembali SHALL menghasilkan nilai yang sama.

Ini memvalidasi kontrak persistensi yang digunakan `useAnimationOrchestrator`.

**Validates: Requirements 1.4, 5.7**

---

### Property 7: `InputPanel` — disabled state konsisten dengan `vizPhase`

*For any* `vizPhase` yang bukan `"idle"` (`"battle"`, `"center"`, `"done"`), kedua `<input>` bilangan dan tombol Pasangkan HARUS dalam keadaan `disabled`. Sebaliknya, ketika `vizPhase === "idle"`, inputs HARUS dapat diinteraksi.

**Validates: Requirements 3.5, 5.9**

---

## Error Handling

Karena ini adalah refactor (zero new behavior), strategi error handling identik dengan implementasi saat ini:

- **Input validation**: `parseInt` dengan fallback `0`; nilai di-clamp ke `[-9999, 9999]`
- **Audio playback**: `audio.play().catch(() => {})` — autoplay policy diabaikan secara silent
- **sessionStorage access**: dibungkus dalam `try/catch` — jika gagal (private browsing, kuota penuh), default ke `"auto"`
- **Timer cleanup**: semua `setTimeout` disimpan dalam `timers.current[]` dan dibatalkan via `clearTimers()` saat unmount atau reset

Tidak ada error boundary baru yang dibutuhkan — komponen baru tidak menambahkan I/O atau async operations baru.

---

## Testing Strategy

### Dual Testing Approach

**Unit tests** (example-based) untuk:
- Behavior spesifik per fase: battle → center → done transitions
- Conditional rendering: `snapshot === null` → tidak ada ArenaPanel
- Button disabled states di setiap phase
- Cleanup: unmount hook → semua timer terbatalkan
- SSR safety: instantiasi hook tanpa `window`
- Replay dan reset state transitions

**Property tests** (fast-check) untuk Properties 1–7 di atas, masing-masing minimal 100 iterasi.

### Konfigurasi Property Tests

```typescript
// Contoh untuk Property 2 — rekonstruksi nilai
import * as fc from "fast-check";
import { buildTierGroups } from "@/lib/model-chip/tierUtils";

test(
  // Feature: model-chip-refactor, Property 2: buildTierGroups reconstructs value
  "buildTierGroups: sum tier*count equals totalPairs",
  () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 9999 }), (n) => {
        const groups = buildTierGroups(n);
        const sum = groups.reduce((acc, g) => acc + g.tier * g.count, 0);
        return sum === n;
      }),
      { numRuns: 200 }
    );
  }
);
```

Tag format untuk setiap property test:
`// Feature: model-chip-refactor, Property {N}: {property_text}`

### Placement

Test files mengikuti konvensi `__tests__/` yang sudah ada:
- `__tests__/model-chip/tierUtils.property.test.ts` — Properties 1, 2, 3
- `__tests__/model-chip/inputPanelProps.property.test.ts` — Properties 4, 5
- `__tests__/model-chip/sessionStorage.property.test.ts` — Property 6
- `__tests__/model-chip/InputPanel.property.test.tsx` — Property 7
- `__tests__/model-chip/useAnimationOrchestrator.test.ts` — example-based unit tests
