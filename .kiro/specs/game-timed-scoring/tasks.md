# Implementation Plan: Game Timed Scoring

## Overview

Implementasi timer berbasis soal dan sistem poin berdasarkan kecepatan jawaban untuk Game Virus (`/game-virus`) dan Game Garis Bilangan (`/intline-run`). Tiga artefak baru dibuat (`computeTimedScore`, `useTimedScoring`, `TimerDisplay`) dan satu artefak yang ada dimodifikasi (`awardPoints`).

## Tasks

- [x] 1. Buat pure function `computeTimedScore` di `lib/game/timedScore.ts`
  - [x] 1.1 Buat file `lib/game/timedScore.ts` dengan konstanta dan implementasi `computeTimedScore`
    - Definisikan dan ekspor `MIN_POINTS = 5`, `BASE_POINTS = 10`, `MAX_POINTS = 50`, `BONUS_WINDOW = 90`, `GRACE_PERIOD = 5`
    - Implementasi formula interpolasi linear: `t ≤ 5 → MAX_POINTS (50)` (grace period), `t ∈ (5, 89] → Math.max(MIN_POINTS + 1, Math.round(50 - ((t - 5) / 84) * 44))`, `t ≥ 90 → MIN_POINTS (5)`
    - Tangani edge case: input negatif, `NaN`, `Infinity` → kembalikan `MIN_POINTS`; float → `Math.floor` sebelum kalkulasi
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [x] 1.2 Tulis property-based test untuk `computeTimedScore`
    - Buat file `__tests__/game/timedScore.property.test.ts`
    - **Property 1: Monotone non-increasing** — generate `t1, t2` di `[0, 999]` dengan `t1 < t2`, assert `computeTimedScore(t1) >= computeTimedScore(t2)`; 200 runs
      - `// Feature: game-timed-scoring, Property 1: For any t1 < t2 >= 0, computeTimedScore(t1) >= computeTimedScore(t2)`
      - **Validates: Requirements 1.3, 1.7**
    - **Property 2: Output selalu integer ≥ MIN_POINTS** — generate `t` di `[0, 999]`, assert `Number.isInteger(score)` dan `score >= 5` dan `score <= 50`; 200 runs
      - `// Feature: game-timed-scoring, Property 2: For any t >= 0, computeTimedScore returns integer in [5, 50]`
      - **Validates: Requirements 1.1, 1.5, 1.6**
    - **Property 3: Plateau minimum di ≥ 90 detik** — generate `t` di `[90, 999]`, assert `computeTimedScore(t) === 5`; 200 runs
      - `// Feature: game-timed-scoring, Property 3: For any t >= 90, computeTimedScore(t) === 5`
      - **Validates: Requirements 1.4**
    - **Property 11: Grace period** — generate `t` di `[0, 5]`, assert `computeTimedScore(t) === 50`; 200 runs
      - `// Feature: game-timed-scoring, Property 11: For any t in [0, 5], computeTimedScore(t) === 50`
      - **Validates: Requirements 1.2**
    - Tambahkan example tests: `score(0) === 50`, `score(5) === 50` (grace period), `score(10) === 47`, `score(89) === 6`, `score(90) === 5`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

- [x] 2. Modifikasi `awardPoints` di `features/game/scoreService.ts`
  - [x] 2.1 Tambahkan parameter opsional `pts?: number` ke `awardPoints`
    - Ubah signature menjadi `awardPoints(uid: string | null | undefined, pts?: number): number`
    - Jika `pts` tidak diberikan, gunakan `POINTS_PER_CORRECT` (backward compatible)
    - Jika `pts <= 0`: jangan panggil Firestore, kembalikan `0`
    - Jika `pts` adalah float: gunakan `Math.floor(pts)` sebelum diteruskan ke `writeIncrement`
    - Pastikan `writeIncrement` menerima nilai `pts` hasil kalkulasi, bukan selalu `POINTS_PER_CORRECT`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 2.2 Tulis property-based test untuk `awardPoints` yang dimodifikasi
    - Buat file `__tests__/game/scoreService.timedScore.test.ts` (terpisah dari `scoreService.test.ts` yang sudah ada)
    - **Property 9: pts valid menulis nilai persis ke Firestore** — mock Firestore, generate `pts` integer `[1, 50]`, assert `increment(pts)` dipanggil dengan nilai persis; 200 runs
      - `// Feature: game-timed-scoring, Property 9: For any integer pts >= 1, awardPoints(uid, pts) calls increment(pts) exactly`
      - **Validates: Requirements 6.3**
    - **Property 10: pts ≤ 0 tidak menulis ke Firestore dan return 0** — generate `pts` di `[-100, 0]`, assert Firestore tidak dipanggil dan return `0`; 200 runs
      - `// Feature: game-timed-scoring, Property 10: For any pts <= 0, awardPoints does not write to Firestore and returns 0`
      - **Validates: Requirements 6.5**
    - Example test: backward compat — `awardPoints(uid)` tanpa `pts` → `increment(10)` dipanggil
    - Example test: `awardPoints(uid, 35)` → `increment(35)` dipanggil dan return `35`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 3. Buat hook `useTimedScoring` di `hooks/useTimedScoring.ts`
  - [x] 3.1 Buat file `hooks/useTimedScoring.ts` dengan implementasi hook
    - Ekspor interface `UseTimedScoringReturn` dengan `elapsedTime`, `startTimer`, `stopTimer`, `getScore`
    - Gunakan `useState` untuk `elapsedTime` (integer, ≥ 0) dan `useRef` untuk `intervalRef`
    - `startTimer()`: clear interval aktif jika ada, reset `elapsedTime` ke `0`, mulai `setInterval` 1000 ms yang menaikkan `elapsedTime` sebesar 1
    - `stopTimer()`: `clearInterval(intervalRef.current)`, set `intervalRef.current = null` — tidak reset `elapsedTime`
    - `getScore()`: kembalikan `computeTimedScore(elapsedTime)` — wrap dengan try/catch, fallback ke `0`
    - `useEffect` cleanup: `return () => { if (intervalRef.current) clearInterval(intervalRef.current); }`
    - Gunakan `"use client"` directive di bagian atas
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x] 3.2 Tulis unit test untuk `useTimedScoring`
    - Buat file `__tests__/game/useTimedScoring.test.ts`
    - Gunakan `@testing-library/react` `renderHook` + `act` + jest fake timers
    - Tambahkan `@jest-environment jsdom` di header
    - **Property 4: startTimer selalu mereset elapsedTime ke 0** — advance timer 5s, panggil `startTimer()`, assert `elapsedTime === 0`; 10 runs dengan variasi elapsed yang berbeda
      - `// Feature: game-timed-scoring, Property 4: After startTimer() is called, elapsedTime === 0 regardless of prior state`
      - **Validates: Requirements 2.1, 2.6**
    - **Property 5: getScore konsisten dengan computeTimedScore** — advance timer ke berbagai nilai, assert `getScore() === computeTimedScore(elapsedTime)`
      - `// Feature: game-timed-scoring, Property 5: getScore() always returns computeTimedScore(elapsedTime)`
      - **Validates: Requirements 2.4**
    - Example: start → advance 3s → assert `elapsedTime === 3`
    - Example: start → advance 2s → stop → advance 2s lagi → assert `elapsedTime === 2` (frozen)
    - Smoke: mount → start → unmount → tidak ada warning memory leak
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [x] 4. Buat komponen `TimerDisplay` di `components/game/TimerDisplay.tsx`
  - [x] 4.1 Buat file `components/game/TimerDisplay.tsx`
    - Ekspor interface `TimerDisplayProps` dengan `elapsedTime: number` dan `className?: string`
    - Format waktu dalam `MM:SS`: `minutes = Math.floor(elapsedTime / 60)`, `seconds = elapsedTime % 60`, pad dengan `String(n).padStart(2, '0')`
    - Tentukan SpeedTier berdasarkan rentang: `0–29 → "Sangat Cepat 🔥" text-success`, `30–59 → "Cepat ⚡" text-intblue`, `60–89 → "Masih Oke 👍" text-amber-500`, `≥90 → "Waktu Habis ⏰" text-error`
    - Tambahkan `aria-live="polite"` pada elemen waktu
    - Tambahkan `aria-label` pada elemen waktu: `"Waktu berlalu: X menit Y detik"`
    - Tambahkan `aria-label` pada elemen label kecepatan yang mencerminkan label aktif
    - Tangani edge case: `elapsedTime < 0` atau `NaN` → tampilkan `"00:00"` dan tier default "Sangat Cepat 🔥"; `aria-label` fallback `"Waktu tidak tersedia"`
    - Komponen ini stateless — tidak ada `useEffect` atau `useState`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 7.1, 7.2, 7.3_

  - [x] 4.2 Tulis property-based test untuk `TimerDisplay`
    - Buat file `__tests__/game/TimerDisplay.property.test.tsx`
    - Gunakan `@testing-library/react` + fast-check; tambahkan `@jest-environment jsdom`
    - **Property 6: MM:SS format benar** — generate `t` di `[0, 7200]`, render `<TimerDisplay elapsedTime={t} />`, assert teks waktu cocok regex `/^\d{2}:\d{2}$/` dan nilai menit/detik dihitung dari `t` dengan benar; 200 runs
      - `// Feature: game-timed-scoring, Property 6: TimerDisplay renders elapsedTime in correct MM:SS format`
      - **Validates: Requirements 5.1**
    - **Property 7: Label kecepatan sesuai rentang** — generate `t` di tiap range, assert label dan CSS class tepat; 200 runs
      - `// Feature: game-timed-scoring, Property 7: Speed label matches the correct range and color for any elapsedTime`
      - **Validates: Requirements 5.2, 5.3, 5.4, 5.5**
    - **Property 8: aria-label elapsedTime benar** — generate `t` di `[0, 7200]`, assert `aria-label` pada elemen waktu matches `"Waktu berlalu: X menit Y detik"` dengan X dan Y yang benar; 200 runs
      - `// Feature: game-timed-scoring, Property 8: aria-label on timer element matches "Waktu berlalu: X menit Y detik"`
      - **Validates: Requirements 7.1, 7.2**
    - Example: prop `className` diteruskan ke root element
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 7.1, 7.2, 7.3_

- [x] 5. Checkpoint — Pastikan semua unit test lolos
  - Jalankan `npx jest --testPathPattern="timedScore|useTimedScoring|TimerDisplay.property|scoreService.timedScore" --run` dan pastikan semua green.
  - Pastikan semua tests pass, tanyakan ke user jika ada masalah.

- [x] 6. Integrasi timer ke Game Virus (`app/game-virus/page.tsx`)
  - [x] 6.1 Tambahkan import dan inisialisasi `useTimedScoring` di `GameVirusPage`
    - Import `useTimedScoring` dari `@/hooks/useTimedScoring` dan `TimerDisplay` dari `@/components/game/TimerDisplay`
    - Tambahkan `const { elapsedTime, startTimer, stopTimer, getScore } = useTimedScoring();` di dalam komponen
    - Tambahkan `useEffect(() => { startTimer(); }, [])` untuk memulai timer saat soal pertama mount
    - _Requirements: 3.1, 3.5_

  - [x] 6.2 Modifikasi `handleNewChipQuestion` untuk mereset timer
    - Di akhir body `handleNewChipQuestion`, setelah semua state reset, panggil `startTimer()`
    - Ini memastikan timer direset untuk setiap soal baru
    - _Requirements: 3.1_

  - [x] 6.3 Modifikasi `handleCheckChipAnswer` untuk menghentikan timer dan menggunakan `getScore()`
    - Saat `result.correct` bernilai `true`, panggil `stopTimer()` sebelum `awardPoints`
    - Ganti `awardPoints(user?.uid ?? null)` menjadi `awardPoints(user?.uid ?? null, getScore())`
    - Timer tetap berjalan saat jawaban salah (tidak ada perubahan di branch wrong answer)
    - _Requirements: 3.2, 3.3, 3.4_

  - [x] 6.4 Tambahkan `TimerDisplay` ke banner soal di `GameVirusPage`
    - Render `<TimerDisplay elapsedTime={elapsedTime} className="mt-2" />` di dalam div banner soal (`currentQuestion && (...)`) tepat setelah baris soal ditampilkan
    - _Requirements: 3.5_

- [x] 7. Integrasi timer ke Game Garis Bilangan (`app/intline-run/page.tsx`)
  - [x] 7.1 Tambahkan import dan inisialisasi `useTimedScoring` di `IntLineRunPage`
    - Import `useTimedScoring` dari `@/hooks/useTimedScoring` dan `TimerDisplay` dari `@/components/game/TimerDisplay`
    - Tambahkan `const { elapsedTime, startTimer, stopTimer, getScore } = useTimedScoring();` di dalam komponen
    - Tambahkan `useEffect(() => { startTimer(); }, [])` untuk memulai timer saat soal pertama mount
    - _Requirements: 4.1, 4.5_

  - [x] 7.2 Bungkus `newQuestion` dengan wrapper `handleNewQuestion` yang memanggil `startTimer()`
    - Buat fungsi `handleNewQuestion` yang memanggil `newQuestion()`, `setArrowFeedback(null)`, dan `startTimer()`
    - Ganti semua referensi ke `newQuestion()` dan inline `setArrowFeedback(null)` di JSX dengan `handleNewQuestion()`
    - _Requirements: 4.1_

  - [x] 7.3 Modifikasi `handleCheckAnswer` untuk menghentikan timer dan menggunakan `getScore()`
    - Saat `correct === true`, panggil `stopTimer()` sebelum `awardPoints`
    - Ganti `awardPoints(user?.uid ?? null)` menjadi `awardPoints(user?.uid ?? null, getScore())`
    - Timer tetap berjalan saat validasi panah gagal atau jawaban salah
    - Pastikan `autoAdvanceRef` memanggil `handleNewQuestion()` bukan `newQuestion()` secara langsung
    - _Requirements: 4.2, 4.3, 4.4_

  - [x] 7.4 Tambahkan `TimerDisplay` ke kartu soal di `IntLineRunPage`
    - Render `<TimerDisplay elapsedTime={elapsedTime} className="mt-3" />` di dalam div kartu soal (`bg-white rounded-2xl ... p-5`) tepat setelah baris soal yang menampilkan operasi matematika
    - _Requirements: 4.5_

- [x] 8. Final checkpoint — Pastikan semua tests pass
  - Jalankan `npx jest --run` dan pastikan tidak ada regression di test suite yang ada.
  - Pastikan semua tests pass, tanyakan ke user jika ada masalah.

## Notes

- Task dengan postfix `*` bersifat opsional dan dapat dilewati untuk MVP yang lebih cepat
- Setiap task merujuk ke requirement spesifik untuk traceability
- `computeTimedScore` adalah pure function tanpa dependency eksternal — mudah diuji secara exhaustive
- `useTimedScoring` menggunakan `useRef` untuk `intervalRef` agar `clearInterval` tidak memicu re-render
- `TimerDisplay` adalah stateless presentational component — tidak ada `useEffect` atau `setInterval` di dalamnya
- Modifikasi `awardPoints` bersifat backward compatible — caller lama tanpa parameter `pts` tetap berfungsi normal
- Test file `scoreService.timedScore.test.ts` dibuat terpisah dari `scoreService.test.ts` yang ada untuk menghindari konflik mock setup
- Timer tetap berjalan selama animasi `InteractionAnimation` berlangsung di Game Virus (sesuai Requirement 3.6)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1"] },
    { "id": 1, "tasks": ["1.2", "2.2", "3.1"] },
    { "id": 2, "tasks": ["3.2", "4.1"] },
    { "id": 3, "tasks": ["4.2", "6.1", "7.1"] },
    { "id": 4, "tasks": ["6.2", "6.3", "7.2", "7.3"] },
    { "id": 5, "tasks": ["6.4", "7.4"] }
  ]
}
```
