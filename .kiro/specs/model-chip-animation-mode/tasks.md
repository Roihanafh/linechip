# Implementation Plan: model-chip-animation-mode

## Overview

Modifikasi `app/model-chip/page.tsx` agar mendukung dua mode animasi (Otomatis dan Klik) beserta Speed_Control yang tampil di kedua mode saat `VizPhase === "battle"`. Seluruh perubahan terlokalisasi di satu file. Tidak ada komponen baru yang dibuat; `PairReactionStage` tidak diubah.

## Tasks

- [x] 1. Tambah state dan ref baru ke `page.tsx`
  - Tambah state `animMode: "auto" | "click"` dengan lazy initializer yang membaca `sessionStorage["modelChipAnimMode"]`; fallback ke `"auto"` jika gagal
  - Tambah state `waitingForClick: boolean` dengan nilai awal `false`
  - Tambah `animModeRef = useRef<"auto" | "click">("auto")` dan pastikan selalu sinkron dengan `animMode` (pola yang sama dengan `animSpeedRef`)
  - Tambah `pendingNextRef = useRef<{ groups, tIdx, pIdx, neu } | null>(null)`
  - Tambah `useEffect` untuk write `sessionStorage["modelChipAnimMode"]` setiap kali `animMode` berubah (dibungkus `try/catch`)
  - _Requirements: 1.3, 1.6_

- [x] 2. Tambah `AnimationMode_Selector` dan `handleNextClick`
  - [x] 2.1 Render `AnimationMode_Selector` — elemen `<div role="group" aria-label="Pilih mode animasi">` berisi dua tombol: "Otomatis 🤖" dan "Klik ▶"
    - Penanda visual aktif: latar `bg-intblue`, teks putih, border 2px
    - Non-aktif: latar transparan, teks `slate-400`
    - Disabled (pointer-events-none) jika `vizPhase !== "idle"` — klik tidak mengubah mode
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 5.1, 5.5_
  - [x] 2.2 Tulis unit test untuk `AnimationMode_Selector`
    - Render dua pilihan saat `vizPhase === "idle"` (Req 1.1)
    - Pilihan aktif memiliki penanda visual berbeda (Req 1.2)
    - Selector non-aktif saat `vizPhase !== "idle"` — klik tidak mengubah mode (Req 1.5)
    - Label teks bahasa Indonesia 1–3 kata (Req 5.1)
    - Memiliki `role="group"` dan `aria-label="Pilih mode animasi"` (Req 5.5)
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 5.1, 5.5_
  - [x] 2.3 Implementasi `handleNextClick`
    - Guard: jika `!waitingForClick || !pendingNextRef.current` → return
    - Set `waitingForClick(false)`, ambil `pendingNextRef.current`, set null, panggil `runPair`
    - _Requirements: 3.4_

- [x] 3. Refactor `runPair` untuk mendukung kedua mode
  - [x] 3.1 Ubah mekanisme `onDone` di dalam `runPair`
    - Di awal `runPair`: panggil `setWaitingForClick(false)` agar tombol terkunci saat animasi berjalan
    - Ganti pola lama (setTimeout cycleDur → setStepPhase → runPair) dengan callback `onDone` yang diteruskan ke `PairReactionStage`
    - Di dalam `onDone`: update `neutralised`, lalu dispatch berdasarkan `animModeRef.current`:
      - `"auto"` → `setTimeout(100ms, () => runPair(next))`
      - `"click"` → simpan ke `pendingNextRef`, `setWaitingForClick(true)` (jika masih ada pasangan); jika pasangan terakhir → langsung jalankan transisi ke `center`/`done`
    - _Requirements: 2.1, 2.3, 3.2, 3.3, 3.4, 3.5_
  - [x] 3.2 Tulis property test untuk `onDone` di Mode_Klik (Property 6 & 7)
    - **Property 6: onDone di Mode_Klik mengaktifkan Tombol_Lanjut**
    - **Validates: Requirements 3.3**
    - **Property 7: runPair di Mode_Klik menonaktifkan Tombol_Lanjut saat dimulai**
    - **Validates: Requirements 3.2, 3.4**

- [x] 4. Tambah `Tombol_Lanjut` ke render
  - [x] 4.1 Render `Tombol_Lanjut` kondisional
    - Tampilkan hanya jika `animMode === "click" && vizPhase === "battle"`; sembunyikan sepenuhnya jika tidak (tidak ada elemen di DOM)
    - Teks: "Lanjut ▶", `aria-label="Mulai animasi pasangan berikutnya"`
    - `disabled={!waitingForClick}`, opacity 40% saat disabled (`disabled:opacity-40`)
    - `onClick={handleNextClick}`
    - _Requirements: 3.1, 3.2, 3.3, 5.2, 5.3, 5.4, 5.6_
  - [x] 4.2 Tulis unit test untuk `Tombol_Lanjut`
    - Tampil saat `animMode === "click" && vizPhase === "battle"` (Req 5.2)
    - Memiliki atribut `aria-label` yang benar (Req 5.4)
    - `disabled` saat `!waitingForClick`, opacity ≤ 40% (Req 3.2, 5.6)
    - Aktif (tidak disabled) setelah `onDone` diterima dan masih ada pasangan (Req 3.3)
    - Tersembunyi sepenuhnya di luar (click ∩ battle) (Req 5.3)
    - _Requirements: 3.1, 3.2, 3.3, 5.2, 5.3, 5.4, 5.6_
  - [x] 4.3 Tulis property test untuk `Tombol_Lanjut` (Property 2)
    - **Property 2: Tombol_Lanjut tersembunyi di luar (Mode_Klik ∩ battle)**
    - **Validates: Requirements 5.3**

- [x] 5. Refactor `Speed_Control` dan tambah property test
  - [x] 5.1 Ubah kondisi tampil `Speed_Control`
    - Sekarang tampil hanya saat `vizPhase === "battle"` (bukan hanya saat `isAnimating` lama), berlaku untuk kedua mode
    - Posisikan di dekat `Tombol_Lanjut` saat Mode_Klik aktif
    - _Requirements: 2.2, 2.6, 3.6, 4.1, 4.2, 4.3, 4.6_
  - [x] 5.2 Tulis unit test untuk `Speed_Control`
    - Tampil saat `vizPhase === "battle"` di kedua mode (Req 4.1)
    - Tidak tampil saat `vizPhase === "idle"` atau `"done"` (Req 4.6)
    - Tiga tombol: 0.5×, 1×, 2× (Req 4.2)
    - Pilihan aktif bergaya intblue/putih (Req 4.3)
    - _Requirements: 4.1, 4.2, 4.3, 4.6_
  - [x] 5.3 Tulis property test untuk `Speed_Control` (Property 3, 4, 5)
    - **Property 3: Speed_Control tidak tampil di luar battle**
    - **Validates: Requirements 4.6, 2.6**
    - **Property 4: animSpeed update konsisten ke state dan ref**
    - **Validates: Requirements 4.4**
    - **Property 5: PairReactionStage key berubah saat animSpeed berubah**
    - **Validates: Requirements 4.5**

- [x] 6. Update `reset()` dan tambah property test sessionStorage
  - [x] 6.1 Update fungsi `reset`
    - Tambah `setWaitingForClick(false)` dan `pendingNextRef.current = null` di dalam `reset()`
    - _Requirements: 1.3 (edge case reset saat waitingForClick)_
  - [x] 6.2 Tulis property test untuk sessionStorage round-trip (Property 1)
    - **Property 1: sessionStorage round-trip**
    - **Validates: Requirements 1.3**

- [x] 7. Checkpoint — Pastikan semua test lulus
  - Jalankan `npx jest --testPathPattern="model-chip" --run` dan verifikasi tidak ada kegagalan.
  - Pastikan semua tests pass, tanyakan ke user jika ada pertanyaan.

- [x] 8. Verifikasi state machine transitions
  - [x] 8.1 Tulis unit test state machine transitions
    - Mode Otomatis: setelah last pair `onDone`, state bergerak ke `center` lalu `done` (Req 2.5)
    - Mode Klik: setelah last pair `onDone`, state bergerak ke `center` lalu `done` tanpa klik (Req 3.5)
    - Mode Klik: `handleNextClick` memulai pair berikutnya dan disable tombol (Req 3.4)
    - _Requirements: 2.5, 3.4, 3.5_

- [x] 9. Final checkpoint — Pastikan semua test lulus
  - Jalankan `npx jest --run` (seluruh suite) dan verifikasi tidak ada regresi.
  - Pastikan semua tests pass, tanyakan ke user jika ada pertanyaan.

## Notes

- Tasks bertanda `*` bersifat opsional dan dapat dilewati untuk MVP yang lebih cepat
- Setiap task mereferensikan requirement spesifik untuk keterlacakan
- Seluruh perubahan terlokalisasi di `app/model-chip/page.tsx` — tidak ada file lain yang perlu dimodifikasi
- Property tests menggunakan `fast-check` (sudah ada di `devDependencies`) dengan minimum `{ numRuns: 100 }`
- Unit tests menggunakan Jest + ts-jest (sudah tersedia di proyek)
- `PairReactionStage` TIDAK diubah — hanya `onDone`, `speed`, dan `runKey` yang dipakai dari luar

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "2.3"] },
    { "id": 2, "tasks": ["2.2", "3.1"] },
    { "id": 3, "tasks": ["3.2", "4.1"] },
    { "id": 4, "tasks": ["4.2", "4.3", "5.1", "6.1"] },
    { "id": 5, "tasks": ["5.2", "5.3", "6.2", "8.1"] }
  ]
}
```
