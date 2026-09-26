# Implementation Plan: game-intro-popup

## Overview

Menambahkan modal intro (`GameIntroModal`) ke dua halaman game (`/game-virus` dan `/intline-run`). Modal memblokir interaksi game dan mencegah timer dimulai sampai pengguna menekan "Mulai". Satu komponen baru, modifikasi ringan pada dua halaman, dan animasi CSS baru di `animations.css`.

## Tasks

- [x] 1. Tambahkan keyframe animasi modal ke `app/animations.css`
  - [x] 1.1 Tambahkan keyframe `modal-enter-kf` dan `modal-exit-kf` beserta utility class `.modal-enter` dan `.modal-exit`
    - Keyframe masuk: `opacity 0 + scale(0.95) translateY(8px)` → `opacity 1 + scale(1) translateY(0)`
    - Keyframe keluar: `opacity 1 + scale(1)` → `opacity 0 + scale(0.95)`
    - Override `@media (prefers-reduced-motion: reduce)` di dalam `@layer utilities`: hanya `opacity`, tanpa `scale`/`translate`
    - _Requirements: 5.6_

- [x] 2. Buat komponen `GameIntroModal`
  - [x] 2.1 Buat file `components/game/GameIntroModal.tsx` dengan interface dan struktur dasar
    - Implementasi `GameIntroModalProps`: `isOpen`, `title`, `instructions`, `onStart`
    - SSR guard: `if (typeof document === "undefined") return null`
    - Gunakan `useId()` dari React 18 untuk stable `aria-labelledby` ID
    - `return null` langsung saat `isOpen={false}`
    - Gunakan `ReactDOM.createPortal` ke `document.body`
    - _Requirements: 1.1, 1.4, 1.5, 1.6_

  - [x] 2.2 Implementasi struktur DOM dan styling modal
    - Overlay wrapper: `fixed inset-0 z-50`
    - Backdrop: `fixed inset-0 bg-black/60 aria-hidden`
    - Dialog panel: `role="dialog" aria-modal="true" aria-labelledby={uid}`
    - Judul (`<h2 id={uid}>`), `Instructions_Section` wrapper (`<div>`), `{instructions}` dari props
    - Start_Button: `<button autoFocus onClick={onStart}>Mulai</button>` dengan styling intblue
    - Terapkan class `.modal-enter` pada dialog panel
    - _Requirements: 1.4, 1.5, 1.6, 5.1, 5.2_

  - [x] 2.3 Implementasi focus trap dan focus restoration
    - `useRef` untuk `panelRef` yang dipasang ke dialog panel
    - `useEffect` focus restoration: simpan `document.activeElement` sebelum buka, kembalikan saat cleanup
    - `useEffect` focus trap: query semua elemen focusable di dalam panel, tangani `Tab` dan `Shift+Tab` dengan `addEventListener("keydown", handleKeyDown)` pada `document`
    - _Requirements: 5.3, 5.4, 5.5_

  - [x] 2.4 Tulis property test untuk `GameIntroModal` — Property 1: Title selalu tampil
    - **Property 1: Title selalu tampil di dalam modal**
    - **Validates: Requirements 1.4**
    - File: `__tests__/game/GameIntroModal.property.test.tsx`
    - Gunakan `fc.string({ minLength: 1 })`, render dengan `isOpen={true}`, assert `getByText(title)` ada di DOM

  - [x] 2.5 Tulis property test — Property 2: Instructions selalu mengandung `<ol>`
    - **Property 2: Instructions selalu mengandung elemen list terurut**
    - **Validates: Requirements 1.5**
    - File: `__tests__/game/GameIntroModal.property.test.tsx`
    - Gunakan `fc.string()`, render `instructions={<ol><li>{content}</li></ol>}`, assert `container.querySelector("ol")` ada

  - [x] 2.6 Tulis property test — Property 3: ARIA attributes selalu hadir
    - **Property 3: ARIA attributes selalu hadir**
    - **Validates: Requirements 5.1**
    - File: `__tests__/game/GameIntroModal.property.test.tsx`
    - Gunakan `fc.string({ minLength: 1 })` untuk title, assert `getByRole("dialog")` dan `aria-modal="true"` ada

  - [x] 2.7 Tulis property test — Property 4: `aria-labelledby` selalu menunjuk ke elemen judul
    - **Property 4: aria-labelledby selalu menunjuk ke elemen judul yang valid**
    - **Validates: Requirements 5.2**
    - File: `__tests__/game/GameIntroModal.property.test.tsx`
    - Assert bahwa `dialog.getAttribute("aria-labelledby") === titleEl.id`

- [x] 3. Checkpoint — Pastikan komponen `GameIntroModal` dapat dirender tanpa error
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Integrasi `GameIntroModal` ke `app/game-virus/page.tsx`
  - [x] 4.1 Tambahkan state `gameStarted`, handler `handleStart`, dan JSX `GameIntroModal`
    - Import `GameIntroModal` dari `@/components/game/GameIntroModal`
    - Tambah `const [gameStarted, setGameStarted] = useState(false)`
    - Tambah `handleStart`: `() => { setGameStarted(true); startTimer(); }`
    - Hapus `startTimer()` dari `useEffect([], ...)` (atau hapus `useEffect` tersebut jika isinya hanya `startTimer()`)
    - Tambahkan `<GameIntroModal isOpen={!gameStarted} title="Antibodi vs Kuman" instructions={<GameVirusInstructions />} onStart={handleStart} />` di dalam JSX return, sebelum elemen game lainnya
    - Definisikan komponen inline `GameVirusInstructions` (tidak diekspor) sesuai design: 5 langkah + satu `<li>` tentang poin kecepatan, gunakan styling `list-decimal list-inside`
    - _Requirements: 1.1, 1.2, 1.3, 1.7, 2.1, 2.2, 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 4.2 Blokir interaksi game saat modal terbuka
    - Bungkus seluruh konten game (di luar `GameIntroModal`) dengan `<div className={!gameStarted ? "pointer-events-none select-none" : ""}>`
    - _Requirements: 1.3_

  - [x] 4.3 Tulis unit test state `gameStarted` untuk game-virus
    - File: `__tests__/game-virus/gameStartedState.unit.test.tsx`
    - Sebelum klik "Mulai": `startTimer` belum dipanggil, modal visible
    - Setelah klik "Mulai": `startTimer` dipanggil tepat sekali, modal tidak visible
    - _Requirements: 1.2, 4.2_

- [x] 5. Integrasi `GameIntroModal` ke `app/intline-run/page.tsx`
  - [x] 5.1 Tambahkan state `gameStarted`, handler `handleStart`, dan JSX `GameIntroModal`
    - Import `GameIntroModal` dari `@/components/game/GameIntroModal`
    - Tambah `const [gameStarted, setGameStarted] = useState(false)`
    - Tambah `handleStart`: `() => { setGameStarted(true); startTimer(); }`
    - Hapus `startTimer()` dari `useEffect([], ...)` yang sudah ada
    - Tambahkan `<GameIntroModal isOpen={!gameStarted} title="Game Garis Bilangan 🎯" instructions={<GameLineInstructions />} onStart={handleStart} />` di dalam JSX return
    - Definisikan komponen inline `GameLineInstructions` (tidak diekspor) sesuai design: 4 langkah + satu `<li>` tentang poin kecepatan
    - _Requirements: 1.1, 1.2, 1.3, 1.7, 3.1, 3.2, 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 5.2 Blokir interaksi game saat modal terbuka
    - Bungkus seluruh konten game dengan `<div className={!gameStarted ? "pointer-events-none select-none" : ""}>`
    - _Requirements: 1.3_

- [x] 6. Checkpoint — Pastikan kedua halaman game bekerja end-to-end
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Tulis unit tests untuk `GameIntroModal`
  - [x] 7.1 Tulis unit tests example-based untuk `GameIntroModal`
    - File: `__tests__/game/GameIntroModal.unit.test.tsx`
    - Saat `isOpen={false}` → komponen tidak merender ke DOM
    - Saat `isOpen={true}` → elemen `role="dialog"` ada di DOM
    - Start_Button memiliki label "Mulai"
    - Klik Start_Button memanggil `onStart` tepat satu kali
    - Focus dipindah ke Start_Button saat modal terbuka (assert `document.activeElement`)
    - Fokus dikembalikan ke elemen sebelumnya saat modal ditutup
    - Enter pada Start_Button memanggil `onStart`
    - Mock `window.matchMedia` untuk `prefers-reduced-motion: reduce`, assert tidak ada class `.modal-enter` yang mengandung `scale`/`translate` pada elemen modal (Property 6)
    - Simulasi Tab berulang dengan `userEvent.tab()`, assert `document.activeElement` tetap di dalam modal (Property 5)
    - _Requirements: 1.6, 4.1, 4.3, 4.5, 5.3, 5.4, 5.5, 5.6_

- [x] 8. Final checkpoint — Pastikan semua test lulus
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks bertanda `*` bersifat opsional dan dapat dilewati untuk implementasi lebih cepat
- Setiap task mereferensikan requirement spesifik untuk traceability
- Property tests (2.4–2.7) menggunakan **fast-check** sesuai ekosistem proyek yang sudah ada
- Unit tests (7.1) mencakup Property 5 (focus trap) dan Property 6 (reduced-motion) sebagai example-based tests, bukan property-based
- `GameVirusInstructions` dan `GameLineInstructions` adalah komponen inline tidak diekspor — definisikan di file page masing-masing
- Animasi exit modal dapat diimplementasikan dengan conditional class sebelum unmount jika diperlukan; untuk MVP cukup dengan unmount langsung (`isOpen={false}` → `return null`)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2"] },
    { "id": 3, "tasks": ["2.3"] },
    { "id": 4, "tasks": ["2.4", "2.5", "2.6", "2.7", "4.1", "5.1"] },
    { "id": 5, "tasks": ["4.2", "5.2"] },
    { "id": 6, "tasks": ["4.3", "7.1"] }
  ]
}
```
