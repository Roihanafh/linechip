# Implementation Plan: Model Chip Pengurangan

## Overview

Implementasi halaman `/model-chip/pengurangan` sebagai ekstensi minimal dari modul penjumlahan yang sudah ada. Strategi utama adalah reuse seluruh infrastruktur arena, karakter, dan tier — hanya menambahkan lapisan tipis konversi pengurang, fase transformasi visual, dan komponen input/result yang disesuaikan.

Anti-cycle constraint: `lib/` ← `hooks/` ← `components/` ← `page.tsx` (satu arah).

## Tasks

- [x] 1. Buat foundation types
  - [x] 1.1 Buat `lib/model-chip/subtractionTypes.ts`
    - Definisikan `VizPhaseSub = "idle" | "transform" | "battle" | "center" | "done"`
    - Definisikan `SubtractionSnapshot { bil1: number; bil2_original: number; bil2_converted: number }`
    - File ini **tidak** mengimpor dari `hooks/` atau `components/` — hanya dari `lib/model-chip/types.ts` jika diperlukan
    - _Requirements: 2.5, 3.1_

- [x] 2. Buat state hook
  - [x] 2.1 Buat `hooks/model-chip/useSubtractionState.ts`
    - Kelola state: `bil1`, `bil2`, `vizPhase: VizPhaseSub`, `snapshot: SubtractionSnapshot | null`
    - Ekspos return API: `{ bil1, bil2, setBil1, setBil2, vizPhase, setVizPhase, snapshot, setSnapshot }`
    - SSR-safe: hanya gunakan `useState` — tidak ada akses ke `sessionStorage`, `Audio`, atau `window`
    - _Requirements: 1.1, 1.3, 2.5_

- [x] 3. Tambah CSS animations
  - [x] 3.1 Tambahkan keyframe `chip-flip-kf` dan `chip-flip-exit-kf` ke `app/animations.css`
    - Tambahkan keyframe `chip-flip-kf`: flip 3D di sumbu Y (0° → 90° → 180°) dengan `scale(0.9)` di titik tengah, durasi 0.8s
    - Tambahkan keyframe `chip-flip-exit-kf`: fade + slide-up keluar (`opacity: 1→0`, `translateY(0→-8px)`)
    - Tambahkan utility class `.chip-flip` dan `.chip-flip-exit` di dalam `@layer utilities`
    - Tambahkan di bawah section "Model Chip: Pair-meeting step animation", dengan komentar section baru `"Model Chip: Transform phase (subtraction)"`
    - _Requirements: 3.2, 10.3, 10.4_

- [x] 4. Buat `TransformPanel`
  - [x] 4.1 Buat `components/model-chip/TransformPanel.tsx`
    - Terima props: `bil2: number`, `b_konversi: number`, `isExiting: boolean`
    - Render container dengan `aria-label` format `"Ubah {abs(bil2)} chip {tipeSumber} menjadi {tipeTujuan}"`
    - Tampilkan judul `"↔ Konversi Pengurang"` dan penjelasan `"a − b = a + (−b)"`
    - Implementasikan efek flip dua-lapisan: div front (`bg-intblue` jika `bil2 > 0`, `bg-intpink` jika `bil2 < 0`) dengan class `chip-flip`, div back (warna kebalikan) muncul setelah 45% animasi
    - Tampilkan label teks `"+N → −N"` jika `bil2 > 0`, `"−N → +N"` jika `bil2 < 0`
    - Terapkan class `chip-flip-exit` pada container saat `isExiting === true`
    - _Requirements: 3.2, 3.3, 9.1, 9.3, 10.1, 10.3_

  - [x] 4.2 Tulis unit tests untuk `TransformPanel`
    - Test: label `"+3 → −3"` ditampilkan saat `bil2 = 3`
    - Test: label `"−5 → +5"` ditampilkan saat `bil2 = -5`
    - Test: `aria-label` pada container saat `bil2 > 0` berformat `"Ubah ... chip antibodi menjadi kuman"`
    - Test: class `chip-flip-exit` diterapkan saat `isExiting === true`
    - _Requirements: 3.3, 9.3_

- [x] 5. Buat `SubtractionInputPanel`
  - [x] 5.1 Buat `components/model-chip/SubtractionInputPanel.tsx`
    - Buat komponen berdiri sendiri (tidak berbagi kode dengan `InputPanel`) sesuai interface `SubtractionInputPanelProps` dari design
    - Tampilkan operator `−` di antara kedua input, label `"Pengurang"` pada bil2
    - Tombol aksi utama berteks `"Kurangkan ⚡"` (bukan `"Pasangkan"`)
    - `aria-label` bil1: `"Minuend: masukkan bilangan bulat antara -9999 dan 9999"`
    - `aria-label` bil2: `"Pengurang: masukkan bilangan bulat antara -9999 dan 9999"`
    - Tampilkan `aria-live="polite"` dengan teks `"Animasi berjalan..."` saat `isAnimating` (fase `"transform"`, `"battle"`, atau `"center"`)
    - Tombol `"Lanjut ▶"` tampil saat `animMode === "click" && (vizPhase === "transform" || vizPhase === "battle")`
    - Kontrol kecepatan hanya tampil saat `vizPhase === "battle"`
    - Gunakan `inputPanelProps` dari `lib/model-chip/inputPanelProps.ts` untuk derived label/color
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.7, 1.8, 3.5, 6.1, 6.3, 6.5, 9.4, 9.5, 9.6_

  - [x] 5.2 Tulis property tests untuk `SubtractionInputPanel`
    - **Property 4: Tombol aktif jika salah satu bukan nol** — untuk setiap `(bil1, bil2)` di mana salah satunya ≠ 0, tombol "Kurangkan" harus enabled
    - **Validates: Requirements 1.4, 1.5**
    - **Property 5: Input terkunci saat bukan idle** — untuk setiap `vizPhase` ∈ `{"transform","battle","center","done"}`, kedua input harus `readOnly`
    - **Validates: Requirements 1.3**
    - File: `__tests__/model-chip/SubtractionInputPanel.property.test.tsx`
    - Gunakan `fc.tuple(fc.integer({min:-9999,max:9999}), fc.integer({min:-9999,max:9999}))` dan `fc.constantFrom("transform","battle","center","done")`

- [x] 6. Buat `SubtractionResultPanel`
  - [x] 6.1 Buat `components/model-chip/SubtractionResultPanel.tsx`
    - Wrapper tipis di atas `ResultPanel` yang menampilkan operator `−` (bukan `+`) di baris persamaan
    - Terima props: `eqBil1: number`, `eqBil2Original: number`, `remaining: number`, `vizPhase: VizPhaseSub`, `pairs: number`
    - Render persamaan dalam format `bil1 − bil2 = hasil` (bukan `bil1 + bil2`)
    - Ubah operator pada equation string saja; semua logika warna, karakter, dan placeholder `?` diwarisi dari `ResultPanel`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 6.2 Tulis unit tests untuk `SubtractionResultPanel`
    - Test: persamaan menampilkan `−` (bukan `+`) antara bil1 dan bil2
    - Test: placeholder `?` ditampilkan saat `vizPhase !== "done"`
    - Test: hasil ditampilkan saat `vizPhase === "done"`
    - _Requirements: 5.1, 5.6_

- [x] 7. Buat `useSubtractionOrchestrator`
  - [x] 7.1 Buat `hooks/model-chip/useSubtractionOrchestrator.ts`
    - Instansiasi `useAnimationOrchestrator` dengan objek state yang kompatibel (narrowing `VizPhaseSub` → `VizPhase`)
    - Implementasikan `handleSubtract()`: hitung `b_konversi = -bil2`, simpan snapshot, set `vizPhase("transform")` jika `bil2 !== 0`, langsung battle/done jika `bil2 === 0`
    - Implementasikan auto-advance dari transform ke battle: `setTimeout(beginBattle, Math.min(1200 / animSpeed, 3000))`
    - Implementasikan click-mode untuk transform: `setWaitingForClick(true)` sampai pengguna klik "Lanjut ▶"
    - Implementasikan `handleNextClick()` yang menangani transform dan battle (delegasi ke orchestrator lama untuk battle)
    - Implementasikan `replayAnimation()`: mulai dari fase `"transform"` jika `snapshot.bil2_original !== 0`, langsung battle jika `bil2_original === 0`
    - Baca/tulis `sessionStorage["subtractionChipAnimMode"]` (key terpisah dari modul penjumlahan); bungkus dalam `try/catch`
    - Kelola `transformExiting: boolean` untuk animasi keluar `TransformPanel`
    - Bersihkan semua `setTimeout` saat unmount
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.4, 3.5, 3.6, 3.7, 4.1, 4.2, 4.3, 6.2, 7.1, 7.2, 7.3, 7.4_

  - [x] 7.2 Tulis property tests untuk `useSubtractionOrchestrator`
    - **Property 1: Konversi pengurang adalah negasi** — untuk setiap `bil2` ∈ `[-9999, 9999]`, `b_konversi` harus `= -bil2`
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
    - **Property 2: Round-trip matematika pengurangan** — `bil1 + b_konversi === bil1 - bil2` untuk semua `(bil1, bil2)` valid
    - **Validates: Requirements 2.6, 5.2**
    - **Property 6: Fase transform mendahului battle** — untuk setiap `bil2 !== 0`, fase pertama setelah `handleSubtract()` harus `"transform"`
    - **Validates: Requirements 3.1**
    - **Property 8: Snapshot menyimpan semua nilai relevan** — `snapshot.bil2_original === bil2` dan `snapshot.bil2_converted === -bil2`
    - **Validates: Requirements 2.5**
    - File: `__tests__/model-chip/subtractionOrchestrator.property.test.ts`
    - Gunakan `fc.integer({min:-9999,max:9999})` dan `fc.integer({min:-9999,max:9999}).filter(n => n !== 0)` per property

- [x] 8. Buat routing files
  - [x] 8.1 Buat `app/model-chip/pengurangan/layout.tsx`
    - Export `metadata` dengan `title: "Model Chip Pengurangan"` dan `description` yang memuat teks `"a − b = a + (−b)"`
    - Komponen layout hanya merender `{children}`
    - _Requirements: 8.2_

  - [x] 8.2 Buat `app/model-chip/pengurangan/page.tsx`
    - Gunakan `useSubtractionState` dan `useSubtractionOrchestrator`
    - Hitung derived values: `bConverted`, `snapTotalPos`, `snapTotalNeg`, `pairs`, `remaining`
    - Lakukan narrowing `VizPhaseSub → VizPhase` untuk ArenaPanel: `vizPhase === "transform" || vizPhase === "idle" ? "idle" : vizPhase as VizPhase`
    - Buat `arenaSnapshot = snapshot ? { bil1: snapshot.bil1, bil2: snapshot.bil2_converted } : null`
    - Input callbacks: `parseInt` + clamp `[-9999, 9999]`, hanya aktif saat `vizPhase === "idle"`
    - Tampilkan `TransformPanel` hanya saat `vizPhase === "transform" && snapshot !== null`
    - Tampilkan `ArenaPanel` hanya saat `arenaSnapshot !== null && vizPhase !== "idle" && vizPhase !== "transform"`
    - Heading `<h1>` dengan teks `"Model Chip Pengurangan"` dan `style={{ fontFamily: "var(--font-baloo2)..." }}`
    - Back button menuju `/materi`
    - Info banner menjelaskan: Antibodi 🔵 = positif, Kuman 🔴 = negatif, pengurang selalu dibalik
    - _Requirements: 1.1, 1.2, 1.6, 3.1, 4.2, 4.3, 5.1, 8.1, 8.3, 9.1, 9.2, 10.1, 10.2_

- [x] 9. Checkpoint — Verifikasi kompilasi dan behavior
  - Pastikan `tsc --noEmit` bersih tanpa error
  - Pastikan tidak ada import cycle antar layer
  - Pastikan `ArenaPanel` tidak pernah menerima nilai `vizPhase === "transform"`
  - Verifikasi SSR-safe: tidak ada akses ke `window` di luar `useEffect`

- [x] 10. Update routing `app/materi/page.tsx`
  - [x] 10.1 Update href link Model Chip di seksi Pengurangan
    - Ubah href `"/model-chip"` di link **kedua** (seksi Pengurangan → Model Chip) menjadi `"/model-chip/pengurangan"`
    - Pastikan seksi Penjumlahan → Model Chip tetap mengarah ke `"/model-chip"` (tidak berubah)
    - _Requirements: 8.4, 8.5_

- [x] 11. Tulis property-based tests
  - [x] 11.1 Tulis property tests untuk `inputPanelProps` (warna label)
    - **Property 9: Warna label mencerminkan tanda nilai** — `inputPanelProps(v).titleColor` harus `"text-intblue"` jika `v > 0`, `"text-intpink"` jika `v < 0`, `"text-slate-400"` jika `v === 0`
    - **Validates: Requirements 1.7, 1.8**
    - File: `__tests__/model-chip/inputPanelProps.property.test.ts` (tambahkan test baru ke file yang sudah ada)
    - Gunakan `fc.integer({min:-9999,max:9999})`

  - [x] 11.2 Tulis property tests untuk `TransformPanel` (label dan aria-label)
    - **Property 7: Label transform mencerminkan konversi** — untuk setiap `bil2 !== 0`, label harus `"+N → −N"` jika `bil2 > 0` atau `"−N → +N"` jika `bil2 < 0`
    - **Validates: Requirements 3.3**
    - **Property 10: Aria-label transform panel sesuai format** — `aria-label` harus mengikuti format `"Ubah {abs(bil2)} chip {tipeSumber} menjadi {tipeTujuan}"`
    - **Validates: Requirements 9.3**
    - File: `__tests__/model-chip/TransformPanel.property.test.tsx`
    - Gunakan `fc.integer({min:-9999,max:9999}).filter(n => n !== 0)`

  - [x] 11.3 Tulis property tests untuk clamping input
    - **Property 3: Clamping input ke rentang valid** — untuk setiap integer `x`, nilai yang tersimpan harus `max(-9999, min(9999, x))`
    - **Validates: Requirements 1.6**
    - File: `__tests__/model-chip/subtractionState.property.test.ts`
    - Gunakan `fc.integer({min:-100000,max:100000})`

- [x] 12. Checkpoint akhir — Pastikan semua tests lulus
  - Jalankan `jest --testPathPattern=__tests__/model-chip/` dan pastikan semua test hijau
  - Verifikasi route `/model-chip/pengurangan` dapat diakses
  - _Requirements: 8.1_

## Notes

- Sub-tasks bertanda `*` bersifat opsional dan dapat dilewati untuk implementasi MVP
- Setiap task mereferensikan requirement spesifik untuk traceabilitas
- Checkpoint memastikan validasi inkremental sebelum lanjut ke fase berikutnya
- Property tests menggunakan `fast-check` yang sudah ada di `devDependencies` proyek
- Anti-cycle constraint: `lib/` ← `hooks/` ← `components/` ← `page.tsx` (satu arah)
- `sessionStorage` key `"subtractionChipAnimMode"` terpisah dari `"modelChipAnimMode"` milik modul penjumlahan
- Semua komponen arena (`ArenaPanel`, `ArenaBattle`, `ArenaCenter`, `ArenaDone`, `CharacterColumn`, `TierLegend`) digunakan tanpa modifikasi

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "3.1"] },
    { "id": 2, "tasks": ["4.1", "5.1", "6.1"] },
    { "id": 3, "tasks": ["4.2", "5.2", "6.2", "7.1"] },
    { "id": 4, "tasks": ["7.2", "8.1", "8.2"] },
    { "id": 5, "tasks": ["10.1"] },
    { "id": 6, "tasks": ["11.1", "11.2", "11.3"] }
  ]
}
```
