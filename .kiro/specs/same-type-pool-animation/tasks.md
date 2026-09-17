# Implementation Plan: same-type-pool-animation

## Overview

Implementasi dua perubahan terkait: (1) memperluas `VizPhaseSub` dengan fase `"alliance"` dan menambahkan jalur animasi alliance di `useSubtractionOrchestrator`, dan (2) menambahkan sub-komponen `AlliancePoolPanel` inline di `ArenaPanel.tsx` yang menampilkan `AllianceStage` di atas dan pool gabungan chip SVG di bawah saat `vizPhase === "alliance"`. Semua perubahan bersifat additive — komponen `AllianceStage`, `ArenaBattle`, dan `PairReactionStage` tidak disentuh.

## Tasks

- [x] 1. Extend `VizPhaseSub` dan export `isAllianceCase`
  - [x] 1.1 Tambahkan literal `"alliance"` ke tipe `VizPhaseSub` di `lib/model-chip/subtractionTypes.ts`
    - Edit baris `export type VizPhaseSub = ...` menjadi `"idle" | "transform" | "alliance" | "battle" | "center" | "done"`
    - Jangan ubah interface `SubtractionSnapshot`
    - _Requirements: 1.1, 1.3_
  - [x] 1.2 Re-export `isAllianceCase` dari `hooks/model-chip/useAnimationOrchestrator.ts` agar dapat di-import oleh `useSubtractionOrchestrator`
    - Fungsi sudah ada dan sudah di-export — verifikasi bahwa named export-nya dapat di-import langsung; tidak perlu perubahan jika sudah ada
    - _Requirements: 8.7_

- [x] 2. Implementasi alliance path di `useSubtractionOrchestrator`
  - [x] 2.1 Import `isAllianceCase` dari `useAnimationOrchestrator` dan tambahkan `beginAlliance()` callback
    - Tambahkan import `isAllianceCase` di bagian atas file
    - Implementasikan `beginAlliance(snap)`: set `transformExiting(false)`, `waitingForTransform(false)`, `stateRef.current.setVizPhase("alliance")`
    - _Requirements: 2.1, 8.7_
  - [x] 2.2 Modifikasi `handleSubtract()` untuk mendeteksi dan merutekan alliance case
    - Setelah membuat `snap`, cek `isAllianceCase(bil1, b_konversi)`
    - Jika `true` dan `bil2 !== 0`: set phase ke `"transform"`, kemudian auto-delay atau `waitingForTransform` ke `beginAlliance(snap)` (bukan `beginBattle`)
    - Jika `true` dan `bil2 === 0`: tidak akan terjadi (isAllianceCase(x,0) = false) — pertahankan branch safety `setVizPhase("done")`
    - Return early agar tidak masuk ke existing battle path
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - [x] 2.3 Modifikasi `handleNextClick()` untuk mendukung alliance case di mode click
    - Saat `vizPhase === "transform"` dan `waitingForTransform`, tentukan apakah snap adalah alliance atau battle via `isAllianceCase`
    - Panggil `beginAlliance(snap)` atau `beginBattle(snap)` sesuai hasil deteksi
    - _Requirements: 2.2_
  - [x] 2.4 Implementasikan `handleAllianceSub()` sebagai alliance completion handler
    - Set `vizPhase` ke `"center"`, kemudian schedule `vizPhase → "done"` dengan delay `Math.round(2000 / animSpeed)` ms + `Math.round(500 / animSpeed)` ms
    - Push kedua timer ke `transformTimers.current` agar dibersihkan saat reset
    - Export dari return value dengan nama `handleAllianceSub`
    - _Requirements: 3.1, 3.2, 3.3_
  - [x] 2.5 Modifikasi `replayAnimation()` untuk menangani alliance snapshot
    - Setelah mengambil `snap`, cek `isAllianceCase(snap.bil1, snap.bil2_converted)`
    - Jika alliance: set `"transform"` dan auto-delay/click ke `beginAlliance`, atau langsung `beginAlliance` jika `bil2_original === 0`
    - Return early sebelum existing battle replay path
    - _Requirements: 4.1, 4.2, 4.3_
  - [x] 2.6 Tambahkan `handleAllianceSub` ke `SubtractionOrchestratorReturn` interface dan return value
    - Tambahkan field `handleAllianceSub: () => void` ke interface
    - Sertakan `handleAllianceSub` dalam object yang di-return
    - _Requirements: 3.1_
  - [x] 2.7 Tulis property test untuk alliance path di `useSubtractionOrchestrator`
    - **Property 1: Alliance path terpicu untuk semua kasus tipe-sama di pengurangan**
    - **Validates: Requirements 2.1, 2.2**
    - **Property 2: Guard — tidak ada perubahan state saat vizPhase bukan "idle"**
    - **Validates: Requirements 2.4**
    - **Property 5: Replay alliance — semua snapshot yang memenuhi isAllianceCase**
    - **Validates: Requirements 4.1, 4.2**
    - File: `__tests__/model-chip/subtractionOrchestrator.property.test.ts` (append ke file yang sudah ada)
    - Tag format: `// Feature: same-type-pool-animation, Property {N}: {text}`
  - [x] 2.8 Tulis property test untuk `handleAllianceSub` timing scaling
    - **Property 4: Delay animSpeed scaling — alliance completion**
    - **Validates: Requirements 3.3**
    - Tambahkan ke file yang sama dengan 2.7

- [x] 3. Checkpoint — Verifikasi TypeScript compile dan logika orchestrator
  - Pastikan `tsc --noEmit` tidak menghasilkan error baru setelah task 1–2
  - Pastikan tes existing di `subtractionOrchestrator.property.test.ts` dan `subtractionState.property.test.ts` masih lulus
  - Tanyakan kepada user jika ada pertanyaan sebelum lanjut.

- [x] 4. Implementasi `AlliancePoolPanel` inline di `ArenaPanel.tsx`
  - [x] 4.1 Tambahkan import `CharacterChips` dari `@/components/game/CharacterSVGs` di `ArenaPanel.tsx`
    - Verifikasi bahwa `CharacterChips` sudah di-export dari `CharacterSVGs.tsx` sebelum menambahkan import
    - _Requirements: 5.2, 5.3_
  - [x] 4.2 Definisikan interface `AlliancePoolPanelProps` dan fungsi `AlliancePoolPanel` sebagai fungsi lokal di atas `ArenaPanel`
    - Interface: `{ snapshot: { bil1: number; bil2: number }; animSpeed: number; onAllianceDone: () => void; }`
    - Hitung `faction = snapshot.bil1 > 0 ? "ab" : "ku"` dan `totalValue = Math.abs(snapshot.bil1) + Math.abs(snapshot.bil2)`
    - Render `<AllianceStage>` di atas dengan `autoStart hideControls speed={animSpeed} onComplete={onAllianceDone}`
    - Render container `data-testid="alliance-pool"` `aria-hidden="true"` `data-total={String(totalValue)}` di bawah
    - Render header `"Total: +N"` atau `"Total: −N"` dengan warna `text-intblue` / `text-intpink`
    - Jika `totalValue === 0`: render pesan `"tidak ada chip"` bukan `<CharacterChips>`
    - Jika `totalValue > 0`: render `<CharacterChips value={totalValue} type={faction} maxPerTier={12} uidPrefix="alliance-pool" phase="idle" />`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.7, 5.8, 9.1, 9.2, 9.3_
  - [x] 4.3 Ganti blok `vizPhase === "alliance"` di `ArenaPanel` JSX dengan `<AlliancePoolPanel>`
    - Hapus `<AllianceStage ...>` yang berdiri sendiri di dalam branch `vizPhase === "alliance"`
    - Ganti dengan `<AlliancePoolPanel snapshot={snapshot} animSpeed={animSpeed} onAllianceDone={onAllianceDone} />`
    - _Requirements: 5.1, 6.3, 6.4, 6.5_
  - [x] 4.4 Tulis property test untuk `AlliancePoolPanel`
    - **Property 6: AlliancePoolPanel selalu hadir saat vizPhase === "alliance"**
    - **Validates: Requirements 5.1, 9.2**
    - **Property 7: data-total selalu akurat**
    - **Validates: Requirements 5.2, 7.4, 9.3**
    - **Property 8: Header faction-aware selalu benar**
    - **Validates: Requirements 5.8**
    - **Property 9: aria-hidden pada Pool_Gabungan**
    - **Validates: Requirements 9.1**
    - **Property 10: Header dan status ArenaPanel saat alliance**
    - **Validates: Requirements 6.3**
    - **Property 11: Accent bar tidak animate-pulse saat alliance**
    - **Validates: Requirements 6.4**
    - File: `__tests__/model-chip/ArenaPanel.alliance.test.tsx` (append ke file yang sudah ada atau buat baru)
    - Tag format: `// Feature: same-type-pool-animation, Property {N}: {text}`

- [x] 5. Perbaiki halaman pengurangan `app/model-chip/pengurangan/page.tsx`
  - [x] 5.1 Perbaiki mapping `arenaPhase` agar `"alliance"` tidak difilter ke `"idle"`
    - Tambahkan cabang `vizPhase === "alliance" ? "alliance" :` sebelum cast fallback
    - _Requirements: 6.1_
  - [x] 5.2 Ganti `onAllianceDone={() => {}}` dengan `orch.handleAllianceSub`
    - Pastikan `handleAllianceSub` sudah tersedia dari return `useSubtractionOrchestrator`
    - _Requirements: 6.2, 8.6_

- [ ] 6. Checkpoint — Verifikasi akhir
  - Pastikan `tsc --noEmit` bersih tanpa error baru
  - Jalankan `jest --testPathPattern="model-chip|game"` dan pastikan nol kegagalan baru
  - Pastikan tes regresi `AllianceStage.test.ts`, `BattleStage.test.ts`, `AnimationEffects.property.test.tsx`, `InteractionAnimation.reduced-motion.test.ts` masih lulus
  - Tanyakan kepada user jika ada pertanyaan sebelum menyelesaikan.

## Notes

- Tasks bertanda `*` bersifat opsional dan dapat dilewati untuk MVP yang lebih cepat
- `isAllianceCase` sudah ada dan di-export dari `useAnimationOrchestrator.ts` — import langsung, jangan mendefinisikan ulang (Req 8.7)
- `AlliancePoolPanel` didefinisikan sebagai fungsi lokal di `ArenaPanel.tsx`, bukan file terpisah, karena ukuran kecil dan tidak di-reuse
- `CharacterChips` menggunakan `phase="idle"` sepanjang durasi alliance — ini menyederhanakan implementasi dan menghindari prop drilling sinkronisasi fase AllianceStage
- `handleAllianceSub` menggunakan `transformTimers.current` yang sudah ada sehingga semua timer dibersihkan otomatis saat `handleReset()`
- Halaman penjumlahan (`app/model-chip/page.tsx`) tidak perlu disentuh — sudah menggunakan alliance path dengan benar

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "4.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "4.2"] },
    { "id": 3, "tasks": ["2.5", "2.6", "4.3"] },
    { "id": 4, "tasks": ["2.7", "2.8", "5.1", "5.2"] },
    { "id": 5, "tasks": ["4.4"] }
  ]
}
```
