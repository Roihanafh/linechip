# Implementation Plan: chip-tier-decompose-animation

## Overview

Menambahkan fase **decompose** ke flow animasi model-chip agar bilangan direpresentasikan dengan chip tier tertinggi yang tepat. Implementasi mengikuti 4 fase migrasi berurutan: (1) Types + BattlePlan, (2) DecomposeStage, (3) Orchestrators, (4) UI.

## Tasks

- [x] 1. Fase 1 — Types dan BattlePlanner
  - [x] 1.1 Perbarui `lib/model-chip/types.ts` — tambah `"decompose"` ke `StepPhase`
    - Ubah `export type StepPhase = "approach" | "clash" | "clear"` menjadi `"approach" | "clash" | "clear" | "decompose"`
    - Tidak ada perubahan lain pada file ini
    - _Requirements: 3.1_

  - [x] 1.2 Buat `lib/model-chip/battlePlan.ts` — fungsi `buildBattlePlan` dan tipe `BattleStep`/`BattlePlan`
    - Definisikan interface `BattleStep { type: "decompose" | "pair"; tier: 1|10|100|1000; side: "pos"|"neg" }`
    - Definisikan interface `BattlePlan { steps: BattleStep[]; totalPairs: number }`
    - Implementasikan helper `decomposeToTierGroups(value: number): TierGroup[]`
    - Implementasikan `buildBattlePlan(bil1: number, bil2: number): BattlePlan` sesuai algoritma greedy dari desain
    - Return `{ steps: [], totalPairs: 0 }` jika totalPos=0 atau totalNeg=0
    - Ekspor semua tipe dan fungsi
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 1.3 Tulis property test untuk `buildBattlePlan` di `__tests__/model-chip/battlePlan.property.test.ts`
    - **Property 1: Dekomposisi mempertahankan nilai** — `fc.integer({ min: 0, max: 9999 })`, verifikasi `Σ tier×count === n`
    - **Validates: Requirements 1.1**
    - **Property 2: Tier groups terurut menurun** — `fc.integer({ min: 1, max: 9999 })`, verifikasi urutan descending dan count > 0
    - **Validates: Requirements 1.2**
    - **Property 3: Sama-tanda → steps kosong** — dua integer ≥ 0, verifikasi `steps.length === 0`
    - **Validates: Requirements 2.3**
    - **Property 4: Jumlah pair steps = min(totalPos, totalNeg)** — dua integer positif, salah satu dinegasikan
    - **Validates: Requirements 2.4, 2.8**
    - **Property 5: BattlePlan deterministik** — panggil dua kali, bandingkan JSON.stringify
    - **Validates: Requirements 2.7, 7.3**
    - **Property 7: Backward compat dengan buildTierGroups** — verifikasi jumlah pair steps sama dengan total count dari `buildTierGroups(Math.min(pos,neg))`
    - **Validates: Requirements 7.4**
    - Gunakan `numRuns: 200` untuk setiap property
    - Tag setiap test: `// Feature: chip-tier-decompose-animation, Property N: ...`
    - _Requirements: 2.1–2.8, 7.4_

  - [x] 1.4 Tulis unit test example-based untuk `buildBattlePlan` di file yang sama
    - Test case: `bil1=+10, bil2=-1` → satu decompose(10,"pos") + satu pair(1,"pos")
    - Test case: `bil1=+11, bil2=-1` → decompose(10,"pos") + pair(1,"pos")
    - Test case: `bil1=+100, bil2=-10` → decompose(100,"pos") + 10×pair(10,"pos")
    - Test case: `bil1=+10, bil2=-10` (tier match) → satu pair(10,"pos"), tanpa decompose
    - Test case: kedua nol → steps kosong
    - Test case: sama tanda → steps kosong
    - _Requirements: 2.1–2.8_

- [x] 2. Checkpoint — Phase 1
  - Jalankan `npx jest __tests__/model-chip/battlePlan.property.test.ts --no-coverage` dan pastikan semua tes lulus. Tanyakan pada user jika ada pertanyaan.

- [x] 3. Fase 2 — Komponen DecomposeStage
  - [x] 3.1 Buat `components/game/DecomposeStage.tsx` — animasi luruh chip tunggal
    - Definisikan dan ekspor interface `DecomposeStageProps { chipTier: 1|10|100|1000; chipFaction: "ab"|"ku"; speed: number; onDone: () => void; runKey: number }`
    - Ekspor fungsi helper `decomposeDuration(speed: number): number` → `Math.round(600 / speed)`
    - Implementasikan state machine 2 fase: fase1 40% (chip induk scale→0, opacity→0), fase2 60% (10 chip bawah muncul stagger)
    - Gunakan CSS transition (`transition: all {phase1Duration}ms ease-out`) untuk fase1
    - Render 10 chip tier bawah dalam grid 5×2 dengan stagger delay `i * (phase2Duration / 10)`
    - Tampilkan label `"×{tier} → 10×{tier/10}"` di area stage
    - Jika `chipTier === 1`, panggil `onDone()` dalam `useEffect` pada mount segera
    - Cleanup semua timer di return function `useEffect` — `runKey` sebagai dependency
    - Gunakan `AntibodyCharacter` / `VirusCharacter` dari `@/components/game/CharacterSVGs`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 11.1, 11.3_

  - [x] 3.2 Tulis property test untuk `DecomposeStage` di `__tests__/game/DecomposeStage.property.test.tsx`
    - **Property 8: Durasi terskala dengan speed** — `fc.float({ min: 0.1, max: 10, noNaN: true })`, verifikasi `decomposeDuration(speed) === Math.round(600 / speed)`
    - **Validates: Requirements 4.5, 11.3**
    - Tag: `// Feature: chip-tier-decompose-animation, Property 8: durasi terskala dengan speed`
    - Gunakan `numRuns: 200`
    - _Requirements: 4.5, 11.3_

  - [x] 3.3 Tulis unit test untuk `DecomposeStage` dengan mock timer di file yang sama
    - Test: `chipTier === 1` → `onDone` dipanggil segera (mock `useEffect`)
    - Test: render tanpa crash untuk setiap nilai `chipTier` (1, 10, 100, 1000) dan `chipFaction` ("ab", "ku")
    - Test: label yang ditampilkan sesuai tier (misal tier=10 → "×10 → 10×1")
    - _Requirements: 4.6, 4.7_

- [x] 4. Checkpoint — Phase 2
  - Jalankan `npx jest __tests__/game/DecomposeStage.property.test.tsx --no-coverage` dan pastikan semua tes lulus. Tanyakan pada user jika ada pertanyaan.

- [x] 5. Fase 3 — Orchestrator Updates
  - [x] 5.1 Perbarui `hooks/model-chip/useAnimationOrchestrator.ts` — konsumsi `BattlePlan`
    - Tambah state: `battlePlan: BattlePlan | null` dan `stepIdx: number`
    - Ganti `buildTierGroups(Math.min(tp, tn))` dengan `buildBattlePlan(snapshot.bil1, snapshot.bil2)` (atau `bil1, bil2` aktif)
    - Implementasikan `runCurrentStep(plan, idx)`: jika `step.type === "decompose"` → set `stepPhase = "decompose"`, jika `"pair"` → set `stepPhase = "approach"` dan update `tierIdx`/`pairInTier` dari step
    - Tambah `handleDecomposeDone()`: jika `animMode === "auto"` → `stepIdx += 1`, panggil `runCurrentStep`; jika `"click"` → set `waitingForClick = true`, simpan pending step ke ref
    - Perbarui `handlePairDone`: gunakan `stepIdx + 1` (bukan `computeNextStep`) untuk menentukan step berikutnya
    - Perbarui `handleNextClick`: tangani pending dari decompose maupun pair
    - Tambah field ke return: `stepIdx: number`, `currentDecomposeStep: BattleStep | null`, `handleDecomposeDone: () => void`
    - Pertahankan signature semua field yang sudah ada: `tierGroups`, `tierIdx`, `pairInTier`, `stepPhase`, `neutralised`, `animSpeed`, `animMode`, `waitingForClick`, `centerExiting`, `handlePair`, `replayAnimation`, `handleNextClick`, `handlePairDone`, `handleReset`
    - `TierProgressDots` tetap dapat dihitung dari pair steps dalam BattlePlan (extract TierGroup dari pair steps)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 5.2 Perbarui `hooks/model-chip/useSubtractionOrchestrator.ts` — teruskan field baru
    - Perbarui tipe `SubtractionOrchestratorReturn` — tambah `stepIdx: number`, `currentDecomposeStep: BattleStep | null`, `handleDecomposeDone: () => void`
    - Pastikan `adaptedState.bil2` meneruskan `bil2_converted` (sudah benar via `snapshot.bil2_converted`)
    - Teruskan `innerOrch.stepIdx`, `innerOrch.currentDecomposeStep`, `innerOrch.handleDecomposeDone` di return object
    - `combinedWaitingForClick` sudah mencakup semua waiting state — verifikasi masih benar
    - Pertahankan semua field return yang sudah ada
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 6. Checkpoint — Phase 3
  - Jalankan `npx tsc --noEmit` untuk verifikasi tipe TypeScript. Tanyakan pada user jika ada pertanyaan.

- [x] 7. Fase 4 — UI Updates
  - [x] 7.1 Perbarui `components/model-chip/CharacterColumn.tsx` — tambah prop `activeDecomposeTier`
    - Tambah prop `activeDecomposeTier: 1|10|100|1000|null` ke `CharacterColumnProps` (default `null`)
    - Perbarui logika opacity per chip: jika `stepPhase === "decompose"` AND `tier === activeDecomposeTier` → `opacity-25`
    - Pastikan chip yang tidak terlibat decompose tidak terpengaruh opacitynya
    - Pertahankan semua logika opacity yang sudah ada (isGone, isDimmed, isWaiting)
    - _Requirements: 3.4, 3.5, 8.1, 8.2, 8.3, 8.4_

  - [x] 7.2 Perbarui `components/model-chip/ArenaBattle.tsx` — render kondisional DecomposeStage/PairReactionStage
    - Tambah props ke `ArenaBattleProps`: `stepIdx: number`, `currentDecomposeStep: BattleStep | null`, `onDecomposeDone: () => void`
    - Import `DecomposeStage` dari `@/components/game/DecomposeStage`
    - Ganti render `PairReactionStage` menjadi kondisional: jika `stepPhase === "decompose"` render `DecomposeStage`, selainnya render `PairReactionStage`
    - `DecomposeStage` key: `dc-${stepIdx}`, props: `chipTier={currentDecomposeStep.tier}`, `chipFaction` (dari sisi yang decompose), `speed={animSpeed}`, `runKey={stepIdx}`, `onDone={onDecomposeDone}`
    - Teruskan `activeDecomposeTier={currentDecomposeStep?.tier ?? null}` ke kedua `CharacterColumn`
    - `TierProgressDots` tetap diteruskan (hitung tierGroups dari pair steps BattlePlan jika diperlukan)
    - _Requirements: 3.2, 3.3, 9.1, 9.2, 9.3_

  - [x] 7.3 Perbarui `components/model-chip/ArenaPanel.tsx` — teruskan props baru ke ArenaBattle
    - Tambah ke `ArenaPanelProps`: `stepIdx: number`, `currentDecomposeStep: BattleStep | null`, `onDecomposeDone: () => void`
    - Teruskan props baru ini ke `<ArenaBattle />`
    - Perbarui `headerText` dan `statusText`: saat `stepPhase === "decompose"`, tampilkan label yang sesuai (misal `"🌀 Luruh..."`)
    - _Requirements: 3.2, 10.1, 10.2_

  - [x] 7.4 Perbarui `app/model-chip/page.tsx` — teruskan field baru dari orchestrator
    - Ekstrak `stepIdx`, `currentDecomposeStep`, `handleDecomposeDone` dari `anim`
    - Teruskan ke `<ArenaPanel>`
    - _Requirements: 10.1, 10.3, 10.4_

  - [x] 7.5 Perbarui `app/model-chip/pengurangan/page.tsx` — teruskan field baru dari orchestrator
    - Ekstrak `stepIdx`, `currentDecomposeStep`, `handleDecomposeDone` dari `orch`
    - Teruskan ke `<ArenaPanel>`
    - Tombol "Next" (via `onNextClick`) sudah aktif saat `waitingForClick === true` — verifikasi ini juga benar saat `stepPhase === "decompose"`
    - _Requirements: 10.2, 10.3, 10.4_

- [x] 8. Checkpoint — Phase 4 (Final)
  - Jalankan `npx tsc --noEmit` untuk verifikasi tipe. Jalankan `npx jest --no-coverage` untuk semua tes. Tanyakan pada user jika ada pertanyaan.

## Notes

- Task bertanda `*` adalah opsional dan dapat dilewati untuk MVP yang lebih cepat
- Setiap task merujuk ke requirements spesifik untuk keterlacakan
- `PairReactionStage` tidak dimodifikasi sama sekali sesuai Requirement 9
- `lib/model-chip/tierUtils.ts` dan `lib/model-chip/stepMachine.ts` tetap ada untuk backward compat
- `adaptedState` di `useSubtractionOrchestrator` meneruskan `bil2_converted` sebagai `bil2` ke inner orchestrator — perilaku ini sudah benar
- Property 6 dan Property 9 (onDone tepat sekali per runKey) divalidasi melalui unit test, bukan PBT, karena melibatkan React lifecycle

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "1.4"] },
    { "id": 2, "tasks": ["3.1"] },
    { "id": 3, "tasks": ["3.2", "3.3"] },
    { "id": 4, "tasks": ["5.1"] },
    { "id": 5, "tasks": ["5.2"] },
    { "id": 6, "tasks": ["7.1", "7.2"] },
    { "id": 7, "tasks": ["7.3"] },
    { "id": 8, "tasks": ["7.4", "7.5"] }
  ]
}
```
