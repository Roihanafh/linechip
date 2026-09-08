# Implementation Plan: add-sub-game-integration

## Overview

Mengintegrasikan tiga modul dari `add-sub-int` ke dalam `linechip` secara native: komponen `NumberLineCanvas` reusable untuk animasi dua fase garis bilangan, upgrade halaman `/garis-bilangan`, dan implementasi penuh Game Line di `/intline-run`. Semua kode ditulis ulang mengikuti arsitektur, token warna, font, dan konvensi `linechip` (TypeScript + Next.js 16 + React 19). Tidak ada dependency baru kecuali `fast-check` di devDependencies untuk pengujian.

## Tasks

- [x] 1. Persiapan aset dan fondasi lib canvas
  - [x] 1.1 Copy `car.svg` ke linechip dan buat `lib/canvas/carImage.ts`
    - Copy `c:\d\Erly\lomba\add-sub-int\public\car.svg` → `c:\d\Erly\lomba\linechip\public\car.svg`
    - Buat `lib/canvas/carImage.ts` dengan fungsi `loadCarImage(): Promise<HTMLImageElement>` dan `getCarImageSync(): HTMLImageElement | null`; gunakan module-level cache agar hanya satu fetch per session
    - `loadCarImage` me-load `/car.svg` via `new Image()`, set `src`, resolve di `onload`, reject di `onerror`; `getCarImageSync` memulai loading di background jika belum dimulai dan langsung mengembalikan gambar yang sudah di-cache atau `null`
    - _Requirements: 2.3, 2.5, 2.6_

  - [x] 1.2 Buat `lib/canvas/numberLineRenderer.ts`
    - Definisikan konstanta `COLORS` (intblue `#2F6FED`, intblueDark `#1E4FC4`, intblueLight `#EAF1FF`, intpink `#EC4899`, success `#22C55E`, tick `#CBD5E1`, tickZero `#0f172a`) dan `LAYOUT` (padding 60, lineY 100, carY 65, canvasHeight 280)
    - Ekspor fungsi `computeTickLayout(canvas, num1, num2, result)` — saat idle (semua nol): kembalikan ticks −5..+5; saat aktif: sertakan selalu 0, num1, dan result dalam uniqueTicks beserta posisi pixel-nya
    - Ekspor `drawNumberLineGrid(ctx, canvas, tickPositions, uniqueTicks, num1, result, isIdle)` — garis horizontal, arrowhead ujung kanan, ticks dengan label (intblue positif, intpink negatif, slate-900 nol), tanda nol lebih panjang
    - Ekspor `drawCarTrail(ctx, startX, endX, y, color)` — jalur berwarna (rounded line dengan gradient ringan)
    - Ekspor `drawCar(ctx, x, y, direction, isSilhouette?)` — gambar `car.svg` via `getCarImageSync()`; jika `null` gambar fallback lingkaran intblue; flip horizontal jika `direction === 'left'`; jika `isSilhouette` gambar dengan opacity 0.4
    - Ekspor `drawSegmentPill(ctx, centerX, y, text, color)` — rounded rect + teks label di atas trail
    - Ekspor `drawDustParticles(ctx, x, y, direction, progress)` — beberapa lingkaran kecil memudar di belakang car
    - Ekspor `drawResultDot(ctx, x, y)` — dot intblue-dark dengan glow/shadow sebagai penanda hasil
    - Ekspor helper `derivePhase2Color(num2: number, op: '+' | '-'): string` — op `+` & num2 >= 0 → intblue; op `+` & num2 < 0 → intpink; op `−` & num2 >= 0 → intpink; op `−` & num2 < 0 → intblue
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.6, 1.7, 1.9, 2.6_

  - [x] 1.3 Buat `lib/canvas/gameLineRenderer.ts`
    - Ekspor `drawGameGrid(ctx, canvas, spacing, offsetX)` — garis bilangan game: gradient intblue, ticks dengan label angka, arrowhead kiri dan kanan
    - Ekspor interface `ArrowDrawData { start, length, color, carY, target? }`
    - Ekspor `drawGameArrow(ctx, canvas, spacing, offsetX, arrow, carY, operation, arrowIndex)` — trail gradient + car SVG + label pill; gunakan `getCarImageSync()` untuk car; arah car ditentukan dari kombinasi arrowIndex, operation, length
    - Ekspor `drawGameArrowhead(ctx, x, y, direction, color)` — arrowhead segitiga berwarna di ujung garis
    - Ekspor helper `deriveArrowColor(arrowNum: 1|2, length: number, operation: '+' | '-'): string` — Arrow 1 selalu intblue; Arrow 2: op `+` length >= 0 → intblue, op `+` length < 0 → intpink, op `−` length >= 0 → intpink, op `−` length < 0 → intblue
    - Ekspor helper `clampSpacing(current: number, delta: number): number` — `Math.max(20, Math.min(80, current + delta))`
    - _Requirements: 7.1, 7.3, 7.7, 2.6_

- [x] 2. Komponen NumberLineCanvas
  - [x] 2.1 Buat `components/NumberLineCanvas/index.tsx`
    - Beri direktif `"use client"` di baris pertama
    - Terima props: `num1: number`, `num2: number`, `operation: '+' | '-'`, `runKey?: number`, `onResult?: (result: number) => void`
    - Gunakan `useRef` untuk canvas element dan `prevRunKeyRef` untuk mendeteksi perubahan `runKey`
    - Implementasi state machine animasi: IDLE → PHASE_1 → PHASE_2 → DONE menggunakan `requestAnimationFrame`
    - IDLE: tampilkan garis statis (idle) bila `num1 === 0 && num2 === 0`, atau tunggu runKey berubah
    - PHASE_1 (1200 ms, easeOutCubic): gambar trail fase 1 (0 → currentX), `drawCar`, `drawDustParticles` setiap frame
    - PHASE_2 (1200 ms, easeOutCubic): gambar trail fase 1 full (silhouette car di num1), trail fase 2 (num1 → currentX), car aktif, `drawSegmentPill` untuk tiap fase
    - DONE: `drawResultDot`, panggil `onResult(result)` sekali, render kondisi akhir statis
    - Guard di `useEffect`: jika `runKey` tidak berubah (`runKey === prevRunKeyRef.current`), TIDAK restart animasi
    - Resize handler: `window.addEventListener('resize', resizeCanvas)` — bila animasi berjalan, cancel dan restart dari awal fase yang sama; bila DONE, gambar ulang kondisi akhir
    - Cleanup di return `useEffect`: `cancelAnimationFrame`, `window.removeEventListener`
    - Render: `<div ref={containerRef}><canvas ref={canvasRef} style={{ height: '280px' }} /></div>`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 2.2 Tulis property test untuk `computeTickLayout` (Property 1)
    - **Property 1: Skala Garis Bilangan Mencakup Semua Titik Kunci**
    - Gunakan `fast-check`: untuk sembarang `num1 ∈ [-99,99]`, `num2 ∈ [-99,99]`, `op ∈ {'+','-'}`, bila bukan idle state maka `uniqueTicks` harus mengandung 0, num1, dan result
    - Tag komentar: `// Feature: add-sub-game-integration, Property 1: computeTickLayout mencakup 0, num1, result`
    - **Validates: Requirements 1.7**
    - _File: `__tests__/canvas/numberLineRenderer.property.test.ts`_

  - [x] 2.3 Tulis property test untuk `derivePhase2Color` (Property 2)
    - **Property 2: Aturan Warna Trail Mengikuti Arah Pergerakan**
    - Gunakan `fast-check`: untuk sembarang `num2 ∈ [-99,99]` dan `op ∈ {'+','-'}`, verifikasi aturan warna sesuai tabel di design document
    - Tag komentar: `// Feature: add-sub-game-integration, Property 2: warna trail sesuai arah gerak`
    - **Validates: Requirements 1.3, 4.2, 7.7**
    - _File: `__tests__/canvas/numberLineRenderer.property.test.ts`_

- [x] 3. Hook `useGameLineState` dan fungsi bantu game
  - [x] 3.1 Buat `components/game-line/useGameLineState.ts`
    - Ekspor interface `GameQuestion { a, b, op, answer }` dan `GameArrow { start, length, target?, visualLength? }`
    - Implementasi fungsi pure yang diekspor secara terpisah (untuk testability):
      - `generateQuestion(): GameQuestion` — a dan b integer random [-99,99], op random `+` atau `-`, `answer = op === '+' ? a+b : a-b`
      - `simulateCheckAnswer(question, userAnswerStr)` — untuk PBT (tidak ada side effect)
      - `clampSpacing` sudah di `gameLineRenderer.ts`; impor dari sana
    - State yang dikelola hook: `currentQuestion`, `arrows` (Record<1|2, GameArrow>), `userAnswer: string`, `feedback`, `isAnimating`, `spacing`, `offsetX`
    - `newQuestion()`: generate soal baru, reset userAnswer ke `''`, feedback ke `null`, arrows ke `{ 1: {start:0, length:0}, 2: {start:0, length:0} }`
    - `addDigit(digit)`: menambah karakter `'0'-'9'`, `'-'` (hanya boleh di posisi 0, satu kali), `'←'` (backspace satu karakter)
    - `checkAnswer()`: jika `isAnimating`, return false; jika kosong atau hanya `'-'`, set feedback error "Jawaban tidak boleh kosong"; jika NaN sama dengan kosong; hitung `parseInt(userAnswer)`; jika benar set feedback success, return true; jika salah set feedback error dengan jawaban benar, return false
    - `changeArrow(num, property, delta)` dan `setArrowValue(num, property, value)`: memperbarui arrows state
    - `resetArrows()`: reset semua arrow ke start 0, length 0
    - `playArrows()`: set `isAnimating = true`; animasi sekuensial Arrow 1 → selesai → Arrow 2 → selesai → `isAnimating = false` menggunakan visualLength transient
    - `changeSpacing(delta)`: gunakan `clampSpacing`
    - `handleCanvasDrag(deltaX)`: update `offsetX` (raw pixel delta dari GameLineCanvas)
    - Init: panggil `generateQuestion()` saat inisialisasi
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 7.3, 7.4, 7.5, 7.6_

  - [x] 3.2 Tulis property test untuk `generateQuestion` (Property 3)
    - **Property 3: generateQuestion Menghasilkan Soal Valid**
    - Gunakan `fast-check`: `fc.constant(null)` sebagai input, verifikasi `a ∈ [-99,99]`, `b ∈ [-99,99]`, `op ∈ {'+','-'}`, `answer === (op==='+'?a+b:a-b)`, minimum 100 iterasi
    - Tag komentar: `// Feature: add-sub-game-integration, Property 3: generateQuestion invariant`
    - **Validates: Requirements 6.1, 6.2**
    - _File: `__tests__/game-line/useGameLineState.property.test.ts`_

  - [x] 3.3 Tulis property test untuk `checkAnswer` (Property 4)
    - **Property 4: checkAnswer Menentukan Benar/Salah Secara Konsisten**
    - Gunakan `fast-check`: untuk sembarang `a`, `b ∈ [-99,99]`, `op`, dan `isCorrect: boolean`, verifikasi bahwa `checkAnswer` mengembalikan `true`+`feedback.success` bila benar, `false`+`feedback.error` bila salah
    - Tag komentar: `// Feature: add-sub-game-integration, Property 4: checkAnswer correctness`
    - **Validates: Requirements 6.4, 6.5**
    - _File: `__tests__/game-line/useGameLineState.property.test.ts`_

  - [x] 3.4 Tulis property test untuk `newQuestion` (Property 5)
    - **Property 5: newQuestion Mereset Seluruh State Game**
    - Gunakan `fast-check`: untuk sembarang state awal (arrow starts acak, userAnswer acak), setelah `newQuestion()` verifikasi `userAnswer === ''`, `feedback === null`, semua arrow start/length = 0
    - Tag komentar: `// Feature: add-sub-game-integration, Property 5: newQuestion reset state`
    - **Validates: Requirements 6.7**
    - _File: `__tests__/game-line/useGameLineState.property.test.ts`_

  - [x] 3.5 Tulis property test untuk `clampSpacing` (Property 6)
    - **Property 6: changeSpacing Selalu Menghasilkan Nilai dalam Rentang Valid**
    - Gunakan `fast-check`: untuk sembarang `spacing ∈ [20,80]` dan `delta ∈ [-200,200]`, verifikasi `clampSpacing(spacing, delta) ∈ [20,80]`
    - Tag komentar: `// Feature: add-sub-game-integration, Property 6: changeSpacing clamp [20,80]`
    - **Validates: Requirements 7.6**
    - _File: `__tests__/game-line/useGameLineState.property.test.ts`_

- [x] 4. Checkpoint — Fondasi lib dan state siap
  - Pastikan semua file di `lib/canvas/` dan `useGameLineState.ts` tidak ada error TypeScript
  - Pastikan semua property test (jika dijalankan) lulus
  - Tanyakan ke user jika ada pertanyaan sebelum lanjut ke komponen UI

- [x] 5. Komponen UI Game Line
  - [x] 5.1 Buat `components/game-line/GameLineCanvas.tsx`
    - Beri direktif `"use client"`
    - Terima props: `arrows: Record<1|2, GameArrow>`, `spacing: number`, `offsetX: number`, `operation: '+' | '-'`, `onDrag: (deltaX: number) => void`
    - Canvas: tinggi 300px, lebar `container.offsetWidth - 40`; layout Arrow 1 di `height/2 - 50`, garis di `height/2`, Arrow 2 di `height/2 + 50`
    - `useEffect` menjalankan `requestAnimationFrame` loop: `clearRect` → `drawGameGrid` → untuk tiap arrow dengan length ≠ 0: `deriveArrowColor` → `drawGameArrow`
    - Pointer events untuk pan horizontal: `onPointerDown` catat `startX`, `setPointerCapture`; `onPointerMove` hitung delta dan panggil `onDrag(deltaX)`; `onPointerUp`/`onPointerCancel` reset drag state
    - Resize handler: `window.addEventListener('resize', resizeCanvas)` perbarui `canvas.width` dan `canvas.height`
    - Cleanup: `cancelAnimationFrame`, `removeEventListener`
    - _Requirements: 7.1, 7.2, 7.5_

  - [x] 5.2 Buat `components/game-line/GameLineArrowControls.tsx`
    - Beri direktif `"use client"`
    - Terima props: `arrows: Record<1|2, GameArrow>`, `onChangeArrow`, `onSetArrowValue`
    - Local state string untuk setiap field input (`a1Start`, `a1Length`, `a2Start`, `a2Length`) dengan flag `editingXxx` untuk mencegah override eksternal saat user mengetik
    - `commit(num, property, value)`: parse integer, panggil `onSetArrowValue`; dipanggil saat `onBlur` atau tekan Enter
    - Validasi keyboard `onKeyDown`: blok huruf, `e`, `E`; izinkan satu tanda `−`/`+` hanya di posisi 0; izinkan angka dan navigasi (Backspace, Delete, Arrow keys)
    - Setiap Arrow punya tombol `−1` dan `+1` yang memanggil `onChangeArrow(num, property, -1/+1)`
    - Styling Arrow 1: `bg-intblue-light border-intblue/20 text-intblue`; Arrow 2: `bg-intpink-light border-intpink/20 text-intpink`
    - _Requirements: 5.5, 7.2_

  - [x] 5.3 Buat `components/game-line/GameLineKeypad.tsx`
    - Beri direktif `"use client"`
    - Terima props: `onAddDigit: (digit: string) => void`
    - Render grid 4-kolom sesuai layout di design: baris 1 [7,8,9,←], baris 2 [4,5,6,−], baris 3 [1,2,3], baris 4 [0 full-width]
    - Tombol digit: `bg-white border border-border rounded-xl font-mono font-bold hover:bg-surface`
    - Tombol `←`: `bg-error/10 text-error border border-error/20 rounded-xl`
    - Tombol `−`: `bg-intpink-light text-intpink border border-intpink/20 rounded-xl`
    - _Requirements: 5.6_

- [x] 6. Halaman `/intline-run` (Game Line penuh)
  - [x] 6.1 Rewrite `app/intline-run/page.tsx` menjadi client component Game Line
    - Tambahkan `"use client"` dan hapus `export const metadata` (tidak boleh ada metadata di client component)
    - Gunakan `useGameLineState()` untuk semua state dan actions
    - Layout `max-w-5xl mx-auto px-4 py-8`; di mobile 1-kolom, di `md:` 2-kolom (canvas + controls kanan)
    - Header: breadcrumb "← Kembali ke Materi", judul dengan font Baloo 2, deskripsi singkat cara bermain (Req 5.2)
    - Kartu soal: tampilkan `currentQuestion` dalam format `a op b = ?` dengan font JetBrains Mono (Req 5.3)
    - `GameLineCanvas` menerima `arrows`, `spacing`, `offsetX`, `operation`, `onDrag={handleCanvasDrag}`
    - Tombol zoom `+`/`−` di bawah canvas memanggil `changeSpacing(±5)` (Req 7.6)
    - `GameLineArrowControls` menerima arrows dan callbacks
    - `GameLineKeypad` menerima `onAddDigit={addDigit}`
    - Panel jawaban: tampilkan `userAnswer` dengan font JetBrains Mono; bila kosong tampilkan placeholder `—`
    - Tombol "Cek Posisi": `disabled={isAnimating}`, memanggil `playArrows()` (Req 7.3, 7.4)
    - Tombol "Periksa": `disabled={isAnimating}`, memanggil `checkAnswer()`; setelah success trigger `newQuestion` setelah 2000 ms (Req 6.3–6.6, 6.8)
    - Tombol "Soal Baru": memanggil `newQuestion()` (Req 6.7)
    - Panel feedback: tampilkan `feedback` dengan `bg-success/10 text-success` atau `bg-error/10 text-error` sesuai type (Req 6.4, 6.5)
    - Semua styling menggunakan token Tailwind linechip; font Baloo 2 untuk heading/soal, JetBrains Mono untuk angka (Req 9.1, 10.2, 10.3)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 6.1, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 10.2, 10.3, 10.5_

- [x] 7. Komponen NumberLineCanvas dan upgrade halaman `/garis-bilangan`
  - [x] 7.1 Selesaikan integrasi `components/NumberLineCanvas/index.tsx` ke halaman (komponen sudah dibuat di task 2.1)
    - Buat `components/NumberLineCanvas/` directory jika belum ada; pastikan export default dari `index.tsx` bisa diimpor oleh halaman
    - Tidak ada kode tambahan di sini — task ini hanya memastikan komponen siap digunakan
    - _Requirements: 2.1_

  - [x] 7.2 Rewrite `app/garis-bilangan/page.tsx` dengan integrasi NumberLineCanvas
    - Pertahankan `"use client"` dan struktur state: `a`, `b`, `op`, `runKey`, `result`, `isDone`
    - Perluas rentang input dari `[-10, 10]` ke `[-99, 99]` (Req 1.10)
    - Tombol "Hitung": increment `runKey`, hitung `result = op === '+' ? a + b : a - b`, set `isDone = false` (reset menunggu `onResult`)
    - Tombol "Reset": TIDAK increment `runKey`, set `result = null`, `isDone = false`
    - Saat `a` atau `b` berubah: reset `result` ke `null`, `isDone = false` (Req 3.5)
    - Ganti SVG renderer dengan `<NumberLineCanvas num1={a} num2={b} operation={op} runKey={runKey} onResult={(r) => { setResult(r); setIsDone(true); }} />`
    - Panel hasil setelah animasi selesai (`isDone`): tampilkan `a op b = result` dengan warna result: positif → `text-intblue`, negatif → `text-intpink`, nol → `text-success` (Req 3.2, 4.3)
    - Indikator "kembali ke titik asal" bila result === 0 (Req 3.3, 4.4)
    - Panel penjelasan teks naratif: fase 1, fase 2, kesimpulan; teks berbeda untuk `+` vs `−` (Req 1.12, 4.5)
    - Gunakan `max-w-3xl mx-auto px-4`, `bg-white rounded-2xl border border-border shadow-sm p-6` untuk card (Req 10.4, 10.5)
    - Tambahkan tautan navigasi ke `/intline-run` di bagian bawah halaman (Req 8.1)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.7, 1.8, 1.9, 1.10, 1.11, 1.12, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.3, 4.4, 4.5, 8.1_

- [x] 8. Update halaman navigasi
  - [x] 8.1 Update `app/materi/page.tsx` — promo game section
    - Di bagian game promo, perbarui tombol "LineChip Run" yang sudah ada agar labelnya menjadi "Game Garis Bilangan" dengan href `/intline-run`; perbarui deskripsi menjadi "Jawab soal bilangan bulat dengan mengatur panah pada garis bilangan!"
    - Tidak mengubah apapun di luar blok game promo (Req 8.3, 9.1–9.5)
    - _Requirements: 8.3_

  - [x] 8.2 Update `app/page.tsx` — feature card Game Garis Bilangan
    - Di array `FEATURE_CARDS`, cari entri dengan `href: '/intline-run'`; update `title` menjadi `"Game Garis Bilangan"`, `desc` menjadi `"Atur dua panah pada garis bilangan dan jawab soal operasi bilangan bulat."`, `cta` menjadi `"Main Sekarang"`
    - Icon dan token warna tetap sama (tidak ada perubahan lain) (Req 8.4, 9.1–9.5)
    - _Requirements: 8.4_

- [x] 9. Tambahkan `fast-check` ke devDependencies
  - [x] 9.1 Pasang `fast-check` sebagai devDependency
    - Jalankan `npm install --save-dev fast-check` di `c:\d\Erly\lomba\linechip`
    - Verifikasi entri masuk ke `devDependencies` di `package.json`, bukan `dependencies`
    - _Requirements: (testing infrastructure)_

- [x] 10. Checkpoint akhir — Pastikan semua tests pass
  - Jalankan `npm run build --webpack` di linechip; tidak boleh ada error TypeScript atau lint
  - Verifikasi `/car.svg` ada di `linechip/public/car.svg`
  - Pastikan tidak ada perubahan pada `/game-virus`, `/model-chip`, dan `/leaderboard` (Req 9.1–9.3)
  - Tanyakan ke user jika ada pertanyaan sebelum dianggap selesai

## Notes

- Task bertanda `*` adalah opsional dan dapat dilewati untuk MVP yang lebih cepat
- Setiap task mereferensikan requirements spesifik untuk traceability
- `fast-check` hanya masuk `devDependencies` — tidak mempengaruhi production bundle
- Property tests ditulis di `__tests__/` directory di root linechip; naming convention: `*.property.test.ts`
- Semua komponen client (`"use client"`) tidak boleh ada `export const metadata` — metadata hanya untuk Server Components
- Komponen baru menggunakan nama direktori unik (`NumberLineCanvas`, `game-line`) — tidak menimpa komponen existing
- `add-sub-int` hanya referensi logika dan flow; tidak ada impor langsung dari project tersebut

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1", "3.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.2", "3.3", "3.4", "3.5", "5.1"] },
    { "id": 3, "tasks": ["5.2", "5.3", "7.1"] },
    { "id": 4, "tasks": ["6.1", "7.2"] },
    { "id": 5, "tasks": ["8.1", "8.2", "9.1"] }
  ]
}
```
