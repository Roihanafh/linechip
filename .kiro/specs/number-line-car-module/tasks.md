# Implementation Plan: Number Line Car Module

## Overview

Implementasi modul garis bilangan baru di linechip yang menggantikan halaman `/garis-bilangan` monolitik dengan dua halaman terpisah (`/penjumlahan` dan `/pengurangan`), mengupgrade `NumberLineCanvas` menjadi scrollable, dan memperkenalkan logika arah hadap/gerak yang benar melalui pure-function library di `lib/number-line/`.

Urutan implementasi: types & pure logic → property tests → UI components → scrollable canvas → halaman baru → routing & navigation updates → integration tests.

---

## Tasks

- [x] 1. Buat `lib/number-line/` — types dan pure logic functions
  - [x] 1.1 Buat `lib/number-line/types.ts`
    - Definisikan `Operation`, `CarDirection`, `AnimPhase`, `NumberLineCanvasProps`, `InputPanelProps`, `ResultPanelProps`, `InstructionModalProps`, `ScrollState`, `ScrollableTickLayout`
    - _Requirements: 3.1, 4.1–4.6, 5.1–5.5_

  - [x] 1.2 Buat `lib/number-line/directionLogic.ts`
    - Implementasikan `getPhase1Direction(num1)`: kembalikan `'right'` jika `num1 >= 0`, `'left'` jika `num1 < 0`
    - Implementasikan `getPhase2FacingDirection(num2, op)`: tabel kebenaran sesuai design § 5
    - Implementasikan `getPhase2MovementDirection(num1, num2, op)`: bandingkan result vs num1
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 1.3 Buat `lib/number-line/formatters.ts`
    - Implementasikan `clampInt(val, min, max)`
    - Implementasikan `formatIntInput(n)` dan `formatIntDisplay(n)`: format `(n)` untuk negatif
    - Implementasikan `getNumberColorClass(n)`: kembalikan `'text-intblue'` atau `'text-intpink'`
    - _Requirements: 3.4, 3.5, 3.9, 3.10, 6.2, 6.3_

  - [x] 1.4 Buat `lib/number-line/narrativeText.ts`
    - Implementasikan `buildNarrativeText(num1, num2, op)`: kembalikan `{ phase1, phase2 }` sesuai tabel aturan di design § 6
    - _Requirements: 6.4_

  - [x] 1.5 Buat `lib/number-line/scrollLogic.ts`
    - Implementasikan `computeVirtualWidth(uniqueTicks, tickSpacing)`: `(n + 2) × tickSpacing`
    - Implementasikan `computeAdaptiveSpacing(viewportWidth)`: clamp ke `[30, 60]`, menjamin minimal 10 tick visible
    - Implementasikan `computeAutoScroll(carX, scrollOffset, viewportWidth, maxScroll)`: kembalikan offset baru sehingga mobil berada di dalam margin 60px
    - _Requirements: 5.1, 5.2, 5.4, 5.5_

  - [x] 1.6 Buat `lib/number-line/index.ts`
    - Re-export semua public functions dari `directionLogic`, `formatters`, `narrativeText`, `scrollLogic`, dan `types`
    - _Requirements: (all)_

- [x] 2. Property-based tests untuk `lib/number-line/`
  - [x] 2.1 Buat `__tests__/number-line/directionLogic.property.test.ts`
    - **Property 5: Phase 1 direction matches num1 sign** — `getPhase1Direction(num1)` === `'right'` ↔ `num1 > 0`
    - **Property 6: Phase 2 facing direction per tabel operasi** — semua 4 kombinasi `(op, sign(num2))`
    - **Property 7: Phase 2 movement direction sesuai arah perubahan** — `result > num1` → `'right'`, `result < num1` → `'left'`
    - Gunakan `fast-check`, minimal 100 runs per property
    - _Requirements: 4.1–4.6_

  - [x] 2.2 Buat `__tests__/number-line/formatters.property.test.ts`
    - **Property 3: Format tanda kurung untuk negatif** — `formatIntDisplay(n)` === `"(n)"` ↔ `n < 0`
    - **Property 4: Warna input sesuai tanda** — `getNumberColorClass(n)` === `'text-intpink'` ↔ `n < 0`
    - _Requirements: 3.5, 3.9, 3.10, 6.3_

  - [x] 2.3 Buat `__tests__/number-line/scrollLogic.property.test.ts`
    - **Property 11: Tick spacing tetap 60px** — untuk semua pasangan tick berurutan, jarak piksel = `tickSpacing`
    - **Property 12: Virtual width sesuai rumus** — `(n + 2) × tickSpacing`
    - **Property 13: Auto-scroll membawa mobil ke dalam viewport** — setelah `computeAutoScroll`, `carX` dalam `[offset + 60, offset + viewportWidth - 60]`
    - **Property 14: Adaptive spacing menjamin minimal 10 tick visible** — `viewportWidth / s >= 10` dan `s >= 30`
    - **Property 15: Keyboard scroll bergerak tepat 40px** — `ArrowLeft` = `max(0, offset - 40)`, `ArrowRight` = `min(maxScroll, offset + 40)`
    - _Requirements: 5.1, 5.2, 5.4, 5.5, 9.6_

- [x] 3. Checkpoint — Pastikan semua property tests lulus
  - Jalankan `npx jest --testPathPattern="__tests__/number-line" --run` dan pastikan tidak ada kegagalan. Tanyakan kepada user jika ada pertanyaan.

- [x] 4. Implementasikan `components/number-line/` — UI components
  - [x] 4.1 Buat `components/number-line/InputPanel.tsx`
    - Dua input angka dengan stepper +/− (`clampInt` ke `[-99, 99]`)
    - Tombol stepper disabled di batas (Property 1)
    - Format `(n)` untuk negatif dengan overlay parenthesis (Property 3)
    - Warna border/bg: `intblue` jika `>= 0`, `intpink` jika `< 0` (Property 4)
    - Operator fixed (prop `operation`)
    - Tombol "Hitung" selalu aktif, Enter pada input memanggil `onCalculate`
    - Tombol 💡 memanggil `onShowInstructions`
    - `aria-label` pada setiap elemen interaktif (Property 18)
    - _Requirements: 3.1–3.11, 9.1, 9.7_

  - [x] 4.2 Tulis unit tests untuk `InputPanel.tsx` di `__tests__/number-line/inputPanel.property.test.ts`
    - **Property 1: Stepper disable di batas** — tombol `+` disabled ↔ `n === 99`, tombol `−` disabled ↔ `n === -99`
    - **Property 2: Clamp saat onBlur** — nilai tersimpan = `Math.max(-99, Math.min(99, x))`
    - **Property 18: aria-label non-empty untuk semua elemen interaktif**
    - _Requirements: 3.2, 3.3, 3.4, 9.1_

  - [x] 4.3 Buat `components/number-line/ResultPanel.tsx`
    - Placeholder saat `result === null`
    - Persamaan `num1 op num2 = result` dengan warna per-angka (Property 16)
    - Format `formatIntDisplay(n)` untuk semua angka
    - Penjelasan naratif dua-fase dari `buildNarrativeText()` (Property 17)
    - Pesan "🔄 Kembali ke titik asal!" saat `result === 0`
    - _Requirements: 6.1–6.6_

  - [x] 4.4 Tulis unit tests untuk `ResultPanel.tsx` di `__tests__/number-line/resultPanel.property.test.ts`
    - **Property 16: ResultPanel menampilkan persamaan yang benar** — format dan nilai numerik
    - **Property 17: Penjelasan naratif menyebutkan arah yang benar**
    - Test placeholder saat `result === null`
    - Test pesan "Kembali ke titik asal!" saat `result === 0`
    - _Requirements: 6.1–6.5_

  - [x] 4.5 Buat `components/number-line/InstructionModal.tsx`
    - `role="dialog"`, `aria-modal="true"`, `aria-labelledby` mengarah ke heading modal
    - Konten berbeda untuk `addition` vs `subtraction` (4 aturan masing-masing)
    - Focus trap: Tab/Shift+Tab terjebak di dalam modal (Property 19)
    - Tutup dengan tombol ×, klik backdrop, tekan Escape
    - `onClose` mengembalikan fokus ke trigger element
    - _Requirements: 7.1–7.7, 9.2, 9.3, 9.4_

  - [x] 4.6 Tulis unit tests untuk `InstructionModal.tsx` di `__tests__/number-line/instructionModal.test.tsx`
    - **Property 19: Focus trap di InstructionModal** — Tab dari elemen terakhir kembali ke pertama
    - Test konten berbeda untuk addition vs subtraction
    - Test tutup dengan Escape, backdrop, tombol ×
    - _Requirements: 7.1–7.7, 9.2, 9.3, 9.4_

  - [x] 4.7 Buat `components/number-line/index.ts`
    - Re-export `InputPanel`, `ResultPanel`, `InstructionModal`
    - _Requirements: (all components)_

- [x] 5. Upgrade `components/NumberLineCanvas/index.tsx` → Scrollable
  - [x] 5.1 Tambahkan internal hook `useScrollableCanvas` di dalam file
    - State: `scrollOffset`, `maxScroll`, `scrollTo(x)`, `scrollBy(delta)`
    - Hitung `maxScroll = Math.max(0, virtualWidth - viewportWidth)`
    - Clamp `scrollOffset` ke `[0, maxScroll]` setiap kali ditetapkan
    - _Requirements: 5.1, 5.3, 5.7_

  - [x] 5.2 Ubah tick layout dari distribusi merata ke fixed spacing 60px
    - Hitung `tickSpacing` menggunakan `computeAdaptiveSpacing(viewportWidth)`
    - Hitung `virtualWidth` menggunakan `computeVirtualWidth(uniqueTicks, tickSpacing)`
    - Hitung `tickPositions` dengan rumus: `padding + (v - minTick) * tickSpacing`
    - Set `canvas.width = virtualWidth` dan `canvas.height = CANVAS_HEIGHT`
    - _Requirements: 5.1, 5.2_

  - [x] 5.3 Implementasikan scroll container dan CSS transform
    - Bungkus canvas dalam `containerRef` (overflow: hidden) dan `innerRef` (transform translateX)
    - Perbarui `transform: translateX(-scrollOffset)` setiap kali `scrollOffset` berubah
    - Tambahkan shadow gradient kiri/kanan yang tampil sesuai kondisi overflow
    - _Requirements: 5.3, 5.6_

  - [x] 5.4 Implementasikan drag-to-scroll (pointer events)
    - `onPointerDown`: capture pointer, simpan `startX` dan `startOffset`
    - `onPointerMove`: `setScrollOffset(clamp(startOffset - (e.clientX - startX), 0, maxScroll))`
    - `onPointerUp`: release pointer
    - _Requirements: 5.3_

  - [x] 5.5 Implementasikan auto-scroll saat mobil di luar viewport
    - Panggil `computeAutoScroll(carX, scrollOffset, viewportWidth, maxScroll)` di setiap frame animasi
    - Jika hasilnya berbeda dari `scrollOffset` saat ini, perbarui offset dalam ≤ 300ms
    - _Requirements: 5.4_

  - [x] 5.6 Integrasikan `getPhase2FacingDirection` ke dalam fase 2 animasi
    - Ganti `dir2 = currentX >= num1X ? "right" : "left"` dengan `getPhase2FacingDirection(n2, op)`
    - Pastikan `getPhase2MovementDirection` digunakan untuk warna trail dan pill text
    - _Requirements: 4.3, 4.4, 4.5, 4.6_

  - [x] 5.7 Tambahkan keyboard scroll dan `aria-label` pada canvas
    - `tabIndex={0}` pada container
    - `onKeyDown`: ArrowLeft → `scrollBy(-40)`, ArrowRight → `scrollBy(40)`
    - `aria-label` diperbarui setelah animasi DONE: `"Animasi garis bilangan: {num1} {op} {num2} = {result}"`
    - _Requirements: 9.5, 9.6_

- [x] 6. Checkpoint — Pastikan NumberLineCanvas scrollable berfungsi
  - Pastikan semua tests lulus dengan `npx jest --testPathPattern="NumberLineCanvas|number-line" --run`. Tanyakan kepada user jika ada pertanyaan.

- [x] 7. Buat halaman penjumlahan dan pengurangan
  - [x] 7.1 Buat `app/garis-bilangan/penjumlahan/layout.tsx`
    - Metadata: `title: "Penjumlahan Bilangan Bulat"`, `description` sesuai
    - _Requirements: 1.1, 1.4_

  - [x] 7.2 Buat `app/garis-bilangan/penjumlahan/page.tsx`
    - State: `num1Input`, `num2Input`, `num1`, `num2`, `runKey`, `result`, `isModalOpen`
    - `handleCalculate`: commit inputs, increment `runKey`, reset `result`
    - Render: BackLink, h1 "Penjumlahan Bilangan Bulat", `InputPanel` (operation="+"), `NumberLineCanvas`, `ResultPanel`, `InstructionModal` (operationType="addition")
    - Operator `+` ditampilkan fixed — tidak ada kontrol untuk mengubahnya
    - _Requirements: 1.1, 1.4, 1.6_

  - [x] 7.3 Buat `app/garis-bilangan/pengurangan/layout.tsx`
    - Metadata: `title: "Pengurangan Bilangan Bulat"`, `description` sesuai
    - _Requirements: 1.2, 1.5_

  - [x] 7.4 Buat `app/garis-bilangan/pengurangan/page.tsx`
    - Struktur identik dengan penjumlahan, tetapi: h1 "Pengurangan Bilangan Bulat", `operation="-"`, `operationType="subtraction"`
    - Operator `−` ditampilkan fixed
    - _Requirements: 1.2, 1.5, 1.7_

- [x] 8. Routing dan navigation updates
  - [x] 8.1 Ubah `app/garis-bilangan/page.tsx` → server-side redirect
    - Ganti seluruh implementasi client dengan: `import { redirect } from "next/navigation"; export default function GarisBilanganPage() { redirect("/garis-bilangan/penjumlahan"); }`
    - _Requirements: 1.3_

  - [x] 8.2 Update `app/garis-bilangan/layout.tsx`
    - Perbarui metadata `title` dan `description` agar lebih generik (judul parent)
    - _Requirements: 1.1, 1.2_

  - [x] 8.3 Update `components/AppShell.tsx`
    - Tambahkan `"/garis-bilangan/penjumlahan"` dan `"/garis-bilangan/pengurangan"` ke `MAIN_ROUTES`
    - _Requirements: 8.3 (layout linechip)_

  - [x] 8.4 Update `app/materi/page.tsx`
    - Ubah href Garis Bilangan Penjumlahan: `/garis-bilangan` → `/garis-bilangan/penjumlahan`
    - Ubah href Garis Bilangan Pengurangan: `/garis-bilangan` → `/garis-bilangan/pengurangan`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 9. Integration tests
  - [x] 9.1 Buat `__tests__/number-line/routing.test.tsx`
    - Test bahwa `/garis-bilangan` me-redirect ke `/garis-bilangan/penjumlahan`
    - Test bahwa halaman penjumlahan merender heading "Penjumlahan Bilangan Bulat"
    - Test bahwa halaman pengurangan merender heading "Pengurangan Bilangan Bulat"
    - _Requirements: 1.3, 1.4, 1.5_

  - [x] 9.2 Buat `__tests__/number-line/materi.test.tsx`
    - Test bahwa link Garis Bilangan Penjumlahan di `/materi` mengarah ke `/garis-bilangan/penjumlahan`
    - Test bahwa link Garis Bilangan Pengurangan di `/materi` mengarah ke `/garis-bilangan/pengurangan`
    - Test bahwa link Model Chip dan game lainnya tidak berubah
    - **Property 10: onResult dipanggil tepat sekali per siklus animasi** — verifikasi callback hanya dipanggil satu kali per `runKey` increment
    - _Requirements: 2.1–2.5, 4.12_

- [x] 10. Final checkpoint — Pastikan semua tests lulus
  - Jalankan `npx jest --run` dan pastikan tidak ada regresi. Tanyakan kepada user jika ada pertanyaan.

---

## Notes

- Tasks bertanda `*` adalah opsional dan dapat dilewati untuk MVP yang lebih cepat
- Setiap task mereferensikan requirement spesifik untuk traceability
- `lib/canvas/numberLineRenderer.ts` **tidak diubah** — komponen baru membangun di atas library ini
- `getPhase2FacingDirection` dan `getPhase2MovementDirection` harus menggantikan `dir2 = currentX >= num1X ? "right" : "left"` yang ada di `NumberLineCanvas/index.tsx`
- Property tests menggunakan `fast-check` yang sudah tersedia di project (`__tests__/model-chip/subtractionState.property.test.ts` sebagai contoh pola)
- Checkpoint tasks tidak diikutsertakan dalam dependency graph

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4", "1.5"] },
    { "id": 2, "tasks": ["1.6", "2.1", "2.2", "2.3"] },
    { "id": 3, "tasks": ["4.1", "4.3", "4.5", "5.1", "5.2"] },
    { "id": 4, "tasks": ["4.2", "4.4", "4.6", "4.7", "5.3", "5.4"] },
    { "id": 5, "tasks": ["5.5", "5.6", "5.7"] },
    { "id": 6, "tasks": ["7.1", "7.2", "7.3", "7.4"] },
    { "id": 7, "tasks": ["8.1", "8.2", "8.3", "8.4"] },
    { "id": 8, "tasks": ["9.1", "9.2"] }
  ]
}
```
