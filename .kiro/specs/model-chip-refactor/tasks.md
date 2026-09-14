# Implementation Plan: model-chip-refactor

## Overview

Refactor `app/model-chip/page.tsx` (~550 baris monolitik) menjadi lapisan-lapisan yang terdefinisi: helper modules pure TypeScript di `lib/model-chip/`, custom hooks di `hooks/model-chip/`, sub-komponen di `components/model-chip/`, dan `page.tsx` sebagai thin orchestrator ≤150 baris. Tidak ada perubahan behavior yang terlihat pengguna.

## Tasks

- [x] 1. Buat shared types dan helper modules
  - [x] 1.1 Buat `lib/model-chip/types.ts` dengan semua shared types
    - Definisikan `VizPhase`, `AnimMode`, `StepPhase`, `TierGroup`, `BattleProgress`
    - Pastikan file ini **tidak** mengimpor dari `hooks/` atau `components/`
    - _Requirements: 2.4, 4.3_

  - [x] 1.2 Buat `lib/model-chip/tierUtils.ts` dengan fungsi `buildTierGroups`
    - Pindahkan logika `buildTierGroups` dari `page.tsx` (baris `function buildTierGroups`)
    - Return `[]` jika `totalPairs <= 0`
    - Ekspor fungsi agar dapat diimpor oleh hook dan komponen lain
    - _Requirements: 2.1, 2.5_

  - [x] 1.3 Buat `lib/model-chip/inputPanelProps.ts` dengan fungsi `inputPanelProps`
    - Pindahkan logika `inputPanelProps` dari `page.tsx` (fungsi `inputPanelProps(val)`)
    - Fungsi menerima `val: number` saja — tanpa state React
    - Definisikan dan ekspor interface `InputPanelDerived` dengan semua key yang diperlukan
    - _Requirements: 2.2, 2.4_

- [x] 2. Buat custom hooks
  - [x] 2.1 Buat `hooks/model-chip/useModelChipState.ts`
    - Kelola state: `bil1`, `bil2`, `vizPhase`, `snapshot`
    - Ekspos return API: `{ bil1, bil2, setBil1, setBil2, vizPhase, setVizPhase, snapshot, setSnapshot }`
    - Tidak mengakses `sessionStorage` atau `Audio` — hanya `useState`/`useEffect` standar
    - _Requirements: 1.1, 1.6_

  - [x] 2.2 Buat `hooks/model-chip/useAnimationOrchestrator.ts`
    - Kelola state animasi: `tierGroups`, `tierIdx`, `pairInTier`, `stepPhase`, `neutralised`, `animSpeed`, `animMode`, `waitingForClick`, `centerExiting`
    - Implementasikan `handlePair`, `replayAnimation`, `handleNextClick` — logika dipindah dari `page.tsx`
    - Implementasikan fungsi internal `runPair` (tidak diekspos) beserta ref `animModeRef`, `animSpeedRef`, `pendingNextRef`
    - Baca `sessionStorage["modelChipAnimMode"]` di dalam `useEffect` setelah mount; default `"auto"` untuk SSR
    - Batalkan semua `setTimeout` via `clearTimers()` saat unmount
    - Terima `opts: { state: ModelChipState }` — gunakan `state.setVizPhase` dan `state.setSnapshot` untuk reset
    - _Requirements: 1.2, 1.3, 1.4, 1.6, 5.1–5.10_

  - [x] 2.3 Buat `hooks/model-chip/index.ts` barrel exports
    - Ekspor `useModelChipState` dan `useAnimationOrchestrator`
    - _Requirements: 4.5_

- [x] 3. Buat sub-komponen UI
  - [x] 3.1 Buat `components/model-chip/TierLegend.tsx`
    - Render grid 4 tier × 2 faction (Antibodi dan Kuman) menggunakan `TIERS`, `CHAR_NAMES`, `TIER_TO_PLACE` dari file yang ada
    - Tidak membutuhkan props — semua data dari konstanta
    - _Requirements: 3.1_

  - [x] 3.2 Buat `components/model-chip/CharacterColumn.tsx`
    - Konversi fungsi `renderColumn` dari `page.tsx` menjadi komponen React dengan props eksplisit: `sAbs`, `sPaired`, `sRemaining`, `sType`, `sColor`, `sSign`, `prefix`, `vizPhase`, `tierGroups`, `tierIdx`, `pairInTier`, `neutralised`, `stepPhase`
    - Pertahankan logika `isGone`, `isDimmed`, `isWaiting` identik dengan implementasi saat ini
    - _Requirements: 2.3, 3.6, 3.9_

  - [x] 3.3 Buat `components/model-chip/InputPanel.tsx`
    - Render dua input bilangan, selector AnimMode, tombol Pasangkan/Input Kembali/Putar ulang, speed control, dan tombol Lanjut
    - Terima props: `bil1`, `bil2`, `animMode`, `animSpeed`, `vizPhase`, `snapshot`, `waitingForClick`, `onBil1Change`, `onBil2Change`, `onPair`, `onReset`, `onReplay`, `onAnimModeChange`, `onSpeedChange`, `onNextClick`
    - Nonaktifkan input, selector AnimMode, dan tombol Pasangkan ketika `vizPhase !== "idle"`
    - Gunakan `inputPanelProps` dari `lib/model-chip/inputPanelProps.ts` untuk derived values
    - _Requirements: 3.2, 3.5_

  - [x] 3.4 Buat `components/model-chip/ArenaPanel.tsx`
    - Render tiga fase berdasarkan `vizPhase`: `"battle"` → `PairReactionStage` + dua `CharacterColumn`; `"center"` → ringkasan zero-pair; `"done"` → `CharacterColumn` per sisi + summary baris bawah
    - Terima props sesuai design: `snapshot`, `vizPhase`, `centerExiting`, `snapTotalPos`, `snapTotalNeg`, `pairs`, `remaining`, `tierGroups`, `tierIdx`, `pairInTier`, `stepPhase`, `neutralised`, `animSpeed`, `onPairDone`
    - Jika `snapshot === null`, jangan dirender (dikelola oleh parent)
    - _Requirements: 3.3, 3.6, 3.7, 3.8, 3.9_

  - [x] 3.5 Buat `components/model-chip/ResultPanel.tsx`
    - Render panel ringkasan hasil `eqBil1 + eqBil2 = remaining` beserta equation display dan karakter hasil
    - Terima props: `eqBil1`, `eqBil2`, `remaining`, `vizPhase`, `pairs`
    - _Requirements: 3.4_

  - [x] 3.6 Buat `components/model-chip/index.ts` barrel exports
    - Ekspor `TierLegend`, `InputPanel`, `CharacterColumn`, `ArenaPanel`, `ResultPanel`
    - _Requirements: 4.4_

- [x] 4. Checkpoint — Pastikan semua file baru terkompilasi tanpa TypeScript error
  - Jalankan `tsc --noEmit` atau build check; perbaiki error tipe yang ditemukan
  - Pastikan tidak ada import cycle antara `lib/`, `hooks/model-chip/`, dan `components/model-chip/`

- [x] 5. Refactor `app/model-chip/page.tsx`
  - [x] 5.1 Ganti seluruh isi `page.tsx` dengan thin orchestrator ≤150 baris
    - Impor `useModelChipState` dan `useAnimationOrchestrator` dari `hooks/model-chip`
    - Impor `TierLegend`, `InputPanel`, `ArenaPanel`, `ResultPanel` dari `components/model-chip`
    - Hitung derived values: `snapTotalPos`, `snapTotalNeg`, `pairs`, `remaining`, `eqBil1`, `eqBil2` di dalam komponen
    - Buat callback `onBil1Change`/`onBil2Change` yang memanggil `setBil1`/`setBil2` dengan clamping `[-9999, 9999]`
    - Buat `onPairDone` callback yang meneruskan ke `useAnimationOrchestrator`
    - JSX `return` hanya berisi sub-komponen tanpa ternary expression lebih dari satu level
    - _Requirements: 1.5, 5.1–5.10, 6.1, 6.5_

- [x] 6. Checkpoint — Verifikasi behavior identik dengan sebelum refactor
  - Cek manual: input nilai, tekan Pasangkan, mode auto dan klik, Putar ulang, Input Kembali, speed control
  - Pastikan tidak ada hydration mismatch (SSR-safe)
  - Verifikasi `page.tsx` ≤150 baris

- [ ] 7. Tulis property-based tests untuk `lib/model-chip/`
  - [x] 7.1 Buat `__tests__/model-chip/tierUtils.property.test.ts`
    - **Property 1:** `buildTierGroups(n)` mengembalikan `[]` untuk setiap `n ≤ 0`
    - **Validates: Requirements 2.5, 5.8**
    - _Requirements: 2.1, 2.5_

  - [-] 7.2 Tulis property test untuk Property 2: rekonstruksi nilai
    - **Property 2:** `sum(tier × count) === totalPairs` untuk setiap `totalPairs` dalam `[1, 9999]`
    - **Validates: Requirements 2.1, 5.1**

  - [-] 7.3 Tulis property test untuk Property 3: urutan tier besar ke kecil
    - **Property 3:** Setiap consecutive pair `groups[i].tier > groups[i+1].tier`
    - **Validates: Requirements 5.1**

  - [x] 7.4 Buat `__tests__/model-chip/inputPanelProps.property.test.ts`
    - **Property 4:** `inputPanelProps(val)` memiliki semua required keys dengan tipe yang benar untuk setiap `val` dalam `[-9999, 9999]`
    - **Validates: Requirements 2.2**

  - [-] 7.5 Tulis property test untuk Property 5: konsistensi tanda bilangan
    - **Property 5:** `val > 0 → isPos === true, type === "ab"`; `val < 0 → isNeg === true, type === "ku"`; `absVal === Math.abs(val)` selalu berlaku
    - **Validates: Requirements 2.2, 5.1**

  - [x] 7.6 Buat `__tests__/model-chip/sessionStorage.property.test.ts`
    - **Property 6:** Round-trip `sessionStorage["modelChipAnimMode"]` — tulis dan baca kembali menghasilkan nilai yang sama untuk setiap `AnimMode` yang valid
    - **Validates: Requirements 1.4, 5.7**

  - [-] 7.7 Buat `__tests__/model-chip/InputPanel.property.test.tsx`
    - **Property 7:** Untuk setiap `vizPhase !== "idle"`, kedua input dan tombol Pasangkan harus `disabled`; untuk `vizPhase === "idle"`, input dapat diinteraksi
    - Gunakan `@testing-library/react` untuk render `InputPanel` dengan berbagai props
    - **Validates: Requirements 3.5, 5.9**

- [ ] 8. Tulis unit tests example-based untuk hooks
  - [-] 8.1 Buat `__tests__/model-chip/useAnimationOrchestrator.test.ts`
    - Test: unmount hook → semua timer terbatalkan
    - Test: `handlePair` dengan dua bilangan positif (no battle) → langsung `vizPhase === "done"`
    - Test: `reset` → semua state kembali ke nilai awal
    - Test: `replayAnimation` → state animasi di-reset, `vizPhase` kembali ke `"battle"`
    - Test: `sessionStorage` dibaca hanya di dalam `useEffect` (SSR-safe: tidak error di lingkungan tanpa `window`)
    - _Requirements: 1.3, 5.4, 5.5, 5.10_

- [x] 9. Checkpoint akhir — Pastikan semua tests lulus
  - Jalankan `jest --testPathPattern=__tests__/model-chip/` dan pastikan semua test hijau
  - Verifikasi ukuran file: `page.tsx` ≤150 baris, sub-komponen ≤200 baris, hook files ≤150 baris
  - _Requirements: 6.1, 6.2, 6.3_

## Notes

- Tasks bertanda `*` bersifat opsional dan dapat dilewati untuk implementasi MVP
- Setiap task mereferensikan requirement spesifik untuk traceabilitas
- Checkpoint memastikan validasi inkremental sebelum lanjut ke fase berikutnya
- Property tests menggunakan `fast-check` yang sudah ada di `devDependencies`
- Anti-cycle constraint: `lib/` ← `hooks/` ← `components/` ← `page.tsx` (satu arah)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["2.1"] },
    { "id": 3, "tasks": ["2.2", "3.1"] },
    { "id": 4, "tasks": ["2.3", "3.2", "3.3", "3.4", "3.5"] },
    { "id": 5, "tasks": ["3.6"] },
    { "id": 6, "tasks": ["5.1"] },
    { "id": 7, "tasks": ["7.1", "7.4", "7.6"] },
    { "id": 8, "tasks": ["7.2", "7.3", "7.5", "7.7", "8.1"] }
  ]
}
```
