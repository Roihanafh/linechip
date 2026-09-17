# Implementation Plan: model-chip-alliance-animation

## Overview

Menambahkan jalur animasi persekutuan (sama-tanda) ke halaman Model Zero-Pair. Perubahan menyentuh tepat 4 file secara berurutan: tipe `VizPhase` diperluas, orchestrator direfaktor untuk mendeteksi dan menangani kasus alliance, `ArenaPanel` ditambahkan cabang render baru, dan `page.tsx` meneruskan callback baru. Tidak ada komponen yang dibuat atau dihapus; `AllianceStage`, `ArenaBattle`, dan `PairReactionStage` tidak diubah.

## Tasks

- [x] 1. Perluas `VizPhase` di `lib/model-chip/types.ts`
  - Tambahkan literal `"alliance"` ke union `VizPhase`: `"idle" | "battle" | "center" | "done" | "alliance"`
  - Tidak ada perubahan lain di file ini
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Refaktor `useAnimationOrchestrator` untuk mendukung alliance
  - [x] 2.1 Tambah helper `isAllianceCase` dan perbarui `handlePair`
    - Tambahkan fungsi pure `isAllianceCase(bil1: number, bil2: number): boolean` yang mengembalikan `true` jika `(bil1 > 0 && bil2 > 0) || (bil1 < 0 && bil2 < 0)`
    - Ganti guard satu-cabang `if (!(tp > 0 && tn > 0)) { state.setVizPhase("done"); return; }` dengan tiga cabang: zero-case (setVizPhase "done", tanpa snapshot), alliance-case (setSnapshot lalu setVizPhase "alliance"), battle-case (setSnapshot lalu startBattle — tidak berubah)
    - Guard `vizPhase !== "idle"` dan panggilan `resetAnimState()` di awal tetap tidak berubah
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 7.1_

  - [x] 2.2 Tulis property test untuk `isAllianceCase` (Property 1)
    - **Property 1: Alliance case detection is exhaustive and correct**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
    - File: `__tests__/model-chip/allianceCase.property.test.ts`
    - Generator sama-tanda positif: `fc.integer({min:1,max:9999})` dua kali
    - Generator sama-tanda negatif: `fc.integer({min:-9999,max:-1})` dua kali
    - Generator beda-tanda: pasangan satu positif satu negatif
    - Generator zero: `fc.integer({min:-9999,max:9999})` dipasangkan dengan `fc.constant(0)`
    - Verifikasi `isAllianceCase` mengembalikan nilai yang tepat untuk setiap kasus

  - [x] 2.3 Implementasi `handleAllianceDone` dan perbarui `replayAnimation`
    - Tambahkan handler `handleAllianceDone()`: panggil `state.setVizPhase("center")`, `setCenterExiting(false)`, lalu jadwalkan dua timer menggunakan `animSpeedRef.current`: `t1 = setTimeout(() => setCenterExiting(true), Math.round(2000 / animSpeedRef.current))` dan `t2 = setTimeout(() => state.setVizPhase("done"), Math.round(2000 / animSpeedRef.current) + Math.round(500 / animSpeedRef.current))`, keduanya di-push ke `timers.current`
    - Perbarui `replayAnimation()`: tambahkan pengecekan `isAllianceCase(bil1, bil2)` setelah `resetAnimState()`; jika alliance → `state.setVizPhase("alliance"); return;`, selain itu teruskan ke path battle yang ada
    - Tambahkan `handleAllianceDone` ke antarmuka return `AnimationOrchestratorReturn` dan nilai return hook
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 6.1, 6.2_

  - [x] 2.4 Tulis property test untuk delay AnimSpeed (Property 2)
    - **Property 2: AnimSpeed delay scaling**
    - **Validates: Requirements 3.2, 3.3**
    - File: `__tests__/model-chip/allianceCase.property.test.ts` (ditambahkan ke file yang sama)
    - Generator: `fc.float({min:0.1,max:10,noNaN:true,noDefaultInfinity:true})`
    - Verifikasi `Math.round(2000/speed)` dan `Math.round(500/speed)` keduanya tidak pernah nol untuk semua speed positif terbatas

- [x] 3. Perbarui `ArenaPanel` dengan cabang alliance
  - [x] 3.1 Tambah prop `onAllianceDone` dan cabang render `AllianceStage`
    - Tambahkan `onAllianceDone: () => void` ke antarmuka `ArenaPanelProps`
    - Destrukturisasi `onAllianceDone` di parameter fungsi
    - Tambahkan blok `{vizPhase === "alliance" && snapshot && (<AllianceStage bil1Value={snapshot.bil1} bil2Value={snapshot.bil2} faction={snapshot.bil1 > 0 ? "ab" : "ku"} autoStart={true} hideControls={true} speed={animSpeed} onComplete={onAllianceDone} />)}` setelah blok `vizPhase === "center"`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 3.2 Perbarui teks header, status badge, dan accent bar untuk fase alliance
    - Perbarui derivasi `headerText`: tambahkan `vizPhase === "alliance" ? "🤝 Persekutuan!"` sebagai kondisi pertama
    - Perbarui derivasi `statusText`: tambahkan `vizPhase === "alliance" ? "Bergabung"` sebagai kondisi pertama
    - Ubah kelas accent bar dari ekspresi inline menjadi variabel `accentBarClass` dengan cabang: `isDone → "bg-emerald-400"`, `center → "bg-gradient-to-r from-intblue to-intpink"`, `alliance → snapshot?.bil1 > 0 ? "bg-intblue" : "bg-intpink"` (tanpa `animate-pulse`), fallback → `"bg-gradient-to-r from-intblue via-amber-400 to-intpink animate-pulse"`
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 3.3 Tulis unit test untuk ArenaPanel cabang alliance
    - File: `__tests__/model-chip/ArenaPanel.alliance.test.tsx`
    - Test: saat `vizPhase="alliance"` merender `AllianceStage` bukan `ArenaBattle` (Req 4.1)
    - Test: prop `bil1Value` dan `bil2Value` sama persis dengan `snapshot.bil1` dan `snapshot.bil2` (Req 4.2)
    - Test: `faction="ab"` untuk bil1 positif, `faction="ku"` untuk bil1 negatif (Req 4.3)
    - Test: `autoStart={true}` dan `hideControls={true}` diteruskan ke `AllianceStage` (Req 4.4)
    - Test: `speed` prop sama dengan `animSpeed` yang diterima (Req 4.5)
    - Test: `onComplete` di-wire ke `onAllianceDone` callback (Req 4.6)
    - Test: header `data-testid="arena-header"` mengandung `"🤝 Persekutuan!"` saat alliance (Req 5.1)
    - Test: status badge mengandung `"Bergabung"` saat alliance (Req 5.2)
    - Test: accent bar memiliki kelas `bg-intblue` untuk bil1 positif, `bg-intpink` untuk bil1 negatif, tanpa `animate-pulse` (Req 5.3)
    - Test: cabang battle dan center tetap tidak berubah setelah penambahan ini (Req 7.7)

  - [x] 3.4 Tulis property test untuk penerusan prop snapshot (Property 3 & 4 & 5)
    - **Property 3: Snapshot prop forwarding is identity**
    - **Validates: Requirements 4.2**
    - **Property 4: Faction derivation is total and correct for Alliance_Case**
    - **Validates: Requirements 4.3**
    - **Property 5: Speed prop forwarding is identity**
    - **Validates: Requirements 4.5**
    - File: `__tests__/model-chip/allianceCase.property.test.ts` (ditambahkan)
    - Generator untuk Property 3 & 4: `fc.integer({min:1,max:9999})` untuk bil1 positif, `fc.integer({min:-9999,max:-1})` untuk bil1 negatif; verifikasi nilai prop sama dengan nilai snapshot tanpa transformasi, dan faction sesuai
    - Generator untuk Property 5: `fc.oneof(fc.constant(0.5), fc.constant(1), fc.constant(2))`; verifikasi nilai `speed` prop sama dengan `animSpeed` input

- [x] 4. Teruskan `onAllianceDone` di `app/model-chip/page.tsx`
  - Tambahkan `onAllianceDone={anim.handleAllianceDone}` sebagai prop ke komponen `<ArenaPanel>` yang sudah ada
  - Tidak ada perubahan lain yang diperlukan di file ini
  - _Requirements: 3.1, 3.4, 3.5_

- [x] 5. Checkpoint — Pastikan semua test lulus
  - Jalankan `npx jest --testPathPattern="model-chip" --runInBand` dan verifikasi tidak ada kegagalan baru.
  - Jalankan `npx tsc --noEmit` dan konfirmasi tidak ada error tipe baru.
  - Pastikan semua tests pass, tanyakan ke user jika ada pertanyaan.

- [x] 6. Tulis test orchestrator dan property replay
  - [x] 6.1 Tulis unit test untuk `useAnimationOrchestrator` kasus alliance
    - File: `__tests__/model-chip/allianceOrchestrator.test.ts`
    - Test: `handlePair(3, 5)` → snapshot di-set, `vizPhase === "alliance"` (Req 2.1)
    - Test: `handlePair(-2, -4)` → snapshot di-set, `vizPhase === "alliance"` (Req 2.2)
    - Test: `handlePair(3, -5)` → `vizPhase === "battle"`, `buildBattlePlan` dipanggil (Req 2.3, 7.1 regresi)
    - Test: `handlePair(0, 5)` dan `handlePair(3, 0)` → `vizPhase === "done"`, tidak ada snapshot (Req 2.4)
    - Test: `handlePair` saat `vizPhase !== "idle"` → tidak ada perubahan state (Req 2.5)
    - Test: `handleAllianceDone()` → `vizPhase === "center"` segera (Req 3.1)
    - Test: setelah delay (dengan fake timers), `centerExiting` menjadi `true` lalu `vizPhase === "done"` (Req 3.2)
    - Test: `handleReset()` saat dalam alliance → `vizPhase === "idle"`, tidak ada timer yang terpicu (Req 3.4)
    - Test: `replayAnimation()` dengan snapshot alliance → `vizPhase === "alliance"`, `buildBattlePlan` tidak dipanggil (Req 6.1)

  - [x] 6.2 Tulis property test untuk `replayAnimation` kasus alliance (Property 6)
    - **Property 6: replayAnimation routes alliance snapshots correctly**
    - **Validates: Requirements 6.1**
    - File: `__tests__/model-chip/allianceCase.property.test.ts` (ditambahkan)
    - Generator: `fc.integer({min:1,max:9999})` untuk pasangan sama-tanda positif; `fc.integer({min:-9999,max:-1})` untuk pasangan sama-tanda negatif
    - Verifikasi bahwa untuk snapshot yang memenuhi `isAllianceCase`, `replayAnimation()` menyebabkan `vizPhase === "alliance"` dan tidak memanggil `buildBattlePlan`

- [x] 7. Final checkpoint — Pastikan semua test lulus
  - Jalankan `npx jest --runInBand` (seluruh suite) dan verifikasi tidak ada regresi.
  - Jalankan `npx tsc --noEmit` untuk konfirmasi akhir tipe.
  - Verifikasi bahwa `ArenaBattle.tsx`, `PairReactionStage.tsx`, dan `AllianceStage.tsx` tidak dimodifikasi.
  - Pastikan semua tests pass, tanyakan ke user jika ada pertanyaan.

## Notes

- Sub-task bertanda `*` bersifat opsional dan dapat dilewati untuk MVP yang lebih cepat
- Urutan implementasi penting: types.ts → orchestrator → ArenaPanel → page.tsx, karena setiap langkah bergantung pada definisi dari langkah sebelumnya
- `AllianceStage`, `ArenaBattle`, dan `PairReactionStage` TIDAK boleh dimodifikasi
- Property tests menggunakan `fast-check` (sudah ada di `devDependencies`) dengan minimum `{ numRuns: 100 }`
- Unit tests menggunakan Jest + ts-jest (sudah tersedia)
- `handleAllianceDone` menggunakan nilai `animSpeedRef.current` (bukan state `animSpeed`) untuk menghindari closure stale — pola yang sama dengan timer lain di orchestrator
- Cabang zero-case di `handlePair` dengan sengaja tidak memanggil `setSnapshot` (Req 2.4)
- `handleReset()` sudah memanggil `clearTimers()` via `resetAnimState()` — tidak ada perubahan yang diperlukan untuk Req 3.4 dan 7.5

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3"] },
    { "id": 3, "tasks": ["2.4", "3.1"] },
    { "id": 4, "tasks": ["3.2", "4"] },
    { "id": 5, "tasks": ["3.3", "3.4", "6.1"] },
    { "id": 6, "tasks": ["6.2"] }
  ]
}
```
