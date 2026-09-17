# Implementation Plan: alliance-animation-upgrade

## Overview

Meningkatkan kualitas visual `AllianceStage.tsx` agar setara dengan referensi `AllianceAnimation`, mencakup idle hover pop, star particles, aura dinamis, tampilan nama karakter, WaitingLine antrian, dan SparkTrail berbasis bintang. Hanya dua file yang dimodifikasi: `AnimationEffects.tsx` (tambah `star` option) dan `AllianceStage.tsx` (semua fitur visual baru). Timing_Contract (750 ms + 600 ms) tidak berubah.

## Tasks

- [x] 1. Tambah `star` option ke `AnimationEffects.tsx`
  - [x] 1.1 Tambah field `star?: boolean` ke interface `ParticleOptions` di `AnimationEffects.tsx`
    - Letakkan setelah field `upward?: boolean`
    - Bersifat opsional untuk backward-compatibility (test yang ada tidak perlu berubah)
    - _Requirements: 2.1_

  - [x] 1.2 Verifikasi test `AnimationEffects.property.test.tsx` tetap lulus setelah perubahan interface
    - Jalankan `npx jest --testPathPattern=AnimationEffects.property --run` dan pastikan 0 failures
    - _Requirements: 7.4_

- [x] 2. Tambah `idleInner()` helper, state `hover`, dan update `play()` di `AllianceStage.tsx`
  - [x] 2.1 Tambah state `const [hover, setHover] = useState<null | "l" | "r">(null)` di dalam `AllianceStage`
    - Letakkan setelah state `showTrail`
    - _Requirements: 1.1_

  - [x] 2.2 Definisikan pure function `idleInner(isIdle: boolean, hovered: boolean, delayMs: number): React.CSSProperties` di atas komponen `SparkTrail` (setelah konstanta file-level)
    - Jika `hovered = true`: kembalikan `{ animation: "idle-hover-pop 220ms ease-out forwards" }`
    - Jika `isIdle = true` dan `hovered = false`: kembalikan `{ animation: \`idle-float 3200ms ease-in-out ${delayMs}ms infinite\` }`
    - Jika keduanya false: kembalikan `{}`
    - _Requirements: 1.2, 1.3, 1.4_

  - [x] 2.3 Update fungsi `play()`: tambah `setHover(null)` sebagai baris pertama setelah `clearAllTimers()`
    - Ini mereset state hover sebelum animasi approach dimulai
    - _Requirements: 1.5_

- [x] 3. Upgrade konfigurasi `useParticles` di `AllianceStage` ke star particles
  - [x] 3.1 Update `useParticles` untuk menggunakan `star: true` dan palette faction-aware
    - Untuk `"ab"`: `colors: ["#93c5fd", "#60a5fa", "#bfdbfe", "#38bdf8"]`
    - Untuk `"ku"`: `colors: ["#fca5a5", "#f87171", "#fecaca", "#fb7185"]`
    - Fallback faction tidak dikenal: `colors: ["#ffffff", "#d1d5db"]`
    - Naikkan `spread` dari 100 ke 110
    - _Requirements: 2.1, 2.2_

  - [x] 3.2 Update `useParticles` di `AnimationEffects.tsx` untuk menggunakan opsi `star`: setiap partikel `star = !!star` (gantikan `Math.random() < 0.4`)
    - Saat `star` option tidak diberikan (undefined/false), default ke behavior lama: `star: Math.random() < 0.4`
    - _Requirements: 2.1_

- [x] 4. Upgrade `SparkTrail` ke star particles `✦`
  - [x] 4.1 Rewrite komponen `SparkTrail` di `AllianceStage.tsx` agar merender 6 partikel teks `✦` (bukan lingkaran)
    - Ganti `borderRadius: "50%"` dan `background` dengan `background: "transparent"`, `color: accentHex`
    - Offset horizontal: `side === "left" ? i * 12 : -(i * 12)` px (0-indexed, default offset=0 jika side tidak valid)
    - Delay: `i * 80ms` (0-indexed, sehingga partikel pertama delay=0)
    - Diameter: `8 + Math.random() * 2` px range 8-10 (gunakan nilai deterministik `8 + (i % 3)` untuk konsistensi)
    - Tambah `aria-hidden="true"` dan `pointerEvents: "none"` pada setiap span
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.7_

- [x] 5. Pasang hover events pada inner-div karakter
  - [x] 5.1 Update inner-div karakter kiri: pasang `onMouseEnter` dan `onMouseLeave`, gunakan `idleInner()` untuk menentukan animasi
    - `onMouseEnter`: hanya set `setHover("l")` jika `phase === "idle"`, abaikan jika bukan idle
    - `onMouseLeave`: selalu `setHover(null)` (reset aman di semua phase)
    - Ganti logika animasi lama dengan: `(phase === "bounce" || phase === "settled") ? allianceInnerAnim(...) : idleInner(phase === "idle", hover === "l", 0)`
    - _Requirements: 1.1, 1.2, 1.5, 1.6_

  - [x] 5.2 Update inner-div karakter kanan: pasang `onMouseEnter` dan `onMouseLeave`, gunakan `idleInner()` dengan `delayMs=700`
    - `onMouseEnter`: hanya set `setHover("r")` jika `phase === "idle"`
    - `onMouseLeave`: selalu `setHover(null)`
    - Ganti logika animasi: `(phase === "bounce" || phase === "settled") ? allianceInnerAnim(...) : idleInner(phase === "idle", hover === "r", 700)`
    - _Requirements: 1.1, 1.3, 1.5, 1.6_

- [x] 6. Checkpoint — Pastikan semua test yang ada tetap lulus
  - Jalankan `npx jest --testPathPattern=game --run` dan pastikan 0 failures
  - `AllianceStage.test.ts` harus lulus tanpa modifikasi pada file tes
  - `BattleStage.test.ts` tidak terpengaruh
  - `AnimationEffects.property.test.tsx` tetap lulus

- [x] 7. Definisikan sub-komponen `WaitingLine` (inline di `AllianceStage.tsx`)
  - [x] 7.1 Tulis function component `WaitingLine` di atas komponen `AllianceStage`, dengan props `types: PlaceValue[], kind: "ab" | "ku", side: "left" | "right", uidp: string`
    - Return `null` jika `types.length === 0`
    - Tampilkan maksimal 6 karakter (`shown = types.slice(0, 6)`)
    - Opasitas indeks ke-i (0-based): `Math.max(0.28, 0.75 - i * 0.09)`
    - Animation delay: `i * 120ms` (gunakan property `animationDelay` dalam style)
    - Animasi setiap karakter: `idle-float 2600ms ease-in-out ${i * 120}ms infinite` (konsisten dengan referensi)
    - `side="left"`: posisi `bottom:6, left:10`, `flexDirection:"row"`
    - `side="right"`: posisi `bottom:6, right:10`, `flexDirection:"row-reverse"`
    - Render label `+{types.length - 6}` setelah karakter ke-6 jika overflow
    - Tambah `aria-hidden="true"` dan `pointerEvents:"none"` pada container
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

- [x] 8. Tambah prop `queueAhead`, render `WaitingLine`, dan char name bar
  - [x] 8.1 Tambah `queueAhead?: PlaceValue[]` ke interface `AllianceStageProps` (default `[]`), dan tambah ke destructuring props
    - Import `CHAR_NAMES` dari `./CharacterSVGs`
    - _Requirements: 5.1, 7.1_

  - [x] 8.2 Render dua `WaitingLine` di dalam stage div saat `queueAhead && queueAhead.length > 0`
    - Kiri: `<WaitingLine types={queueAhead} kind={faction} side="left" uidp={`wqa-l-${faction}-${runKey}`} />`
    - Kanan: `<WaitingLine types={queueAhead} kind={faction} side="right" uidp={`wqa-r-${faction}-${runKey}`} />`
    - _Requirements: 5.2, 7.2_

  - [x] 8.3 Tambah char name bar di bawah stage (sebelum click hint):
    - Posisi: `absolute`, `bottom:8, left:16, right:16`, `display:flex, justifyContent:"space-between"`
    - `opacity`: `phase === "idle" && !(queueAhead && queueAhead.length) ? 1 : 0`, `transition: "opacity 300ms"`
    - Teks kiri: `CHAR_NAMES[faction]?.[tier1] ?? ""`, warna `accentRgba`
    - Teks kanan: `CHAR_NAMES[faction]?.[tier2] ?? ""`, warna `accentRgba`
    - Tambah konstanta `accentRgba`: `faction === "ab" ? "rgba(96,165,250,0.8)" : faction === "ku" ? "rgba(248,113,113,0.8)" : "rgba(200,200,200,0.7)"`
    - Tambah `pointerEvents:"none"` dan `aria-hidden="true"`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 9. Tulis property-based tests untuk AllianceStage
  - [x] 9.1 Buat file `__tests__/game/AllianceStage.property.test.ts` dengan struktur dasar dan import `fast-check`
    - Ikuti pola dari `AnimationEffects.property.test.tsx`: inline re-implementation dari pure functions
    - Definisikan versi pure dari `idleInner()`, opacity formula, delay formula, dan offset formula
    - _Requirements: 7.2_

  - [x] 9.2 Tulis property test untuk `idleInner` — Property 1: determinisme
    - `fc.property(fc.boolean(), fc.boolean(), fc.nat())` → dua panggilan dengan input sama harus menghasilkan object yang sama (stringify comparison)
    - Tag: `// Feature: alliance-animation-upgrade, Property 1: idleInner returns consistent CSSProperties`
    - _Requirements: 1.2, 1.3, 1.4_

  - [x] 9.3 Tulis property test untuk `idleInner` — Property 2: prioritas `hovered`
    - `fc.property(fc.boolean(), fc.nat())` → saat `hovered=true`, animasi selalu mengandung `"idle-hover-pop"` tanpa memperhatikan `isIdle`
    - Tag: `// Feature: alliance-animation-upgrade, Property 2: idleInner hover priority`
    - _Requirements: 1.2, 1.3_

  - [x] 9.4 Tulis property test untuk WaitingLine opacity — Property 9
    - `fc.property(fc.integer({min:0, max:5}))` → `opacity[i] === Math.max(0.28, 0.75 - i * 0.09)`, nilai selalu dalam `[0.28, 0.75]`
    - Tag: `// Feature: alliance-animation-upgrade, Property 9: waiting line opacity formula`
    - _Requirements: 5.3_

  - [x] 9.5 Tulis property test untuk WaitingLine delay — Property 10
    - `fc.property(fc.integer({min:0, max:5}))` → `delay[i] === i * 120`
    - Tag: `// Feature: alliance-animation-upgrade, Property 10: waiting line animation delay`
    - _Requirements: 5.4_

  - [x] 9.6 Tulis property test untuk SparkTrail offset — Property 11
    - `fc.property(fc.integer({min:0, max:5}), fc.constantFrom("left","right"))` → `|offset[i]| === i * 12`, tanda sesuai side
    - Untuk side tidak valid: offset = 0
    - Tag: `// Feature: alliance-animation-upgrade, Property 11: sparktrail offset linear`
    - _Requirements: 6.2, 6.7_

  - [x] 9.7 Tulis property test untuk SparkTrail delay — Property 12
    - `fc.property(fc.integer({min:0, max:5}))` → `delay[i] === i * 80`
    - Tag: `// Feature: alliance-animation-upgrade, Property 12: sparktrail delay sequential`
    - _Requirements: 6.3_

  - [x] 9.8 Tulis property test untuk `CHAR_NAMES` lookup — Property 7
    - `fc.property(fc.constantFrom("ab","ku"), fc.integer())` → `CHAR_NAMES[f]?.[dominantPlace(Math.abs(v))] ?? ""` selalu mengembalikan string, tidak pernah throw
    - Tag: `// Feature: alliance-animation-upgrade, Property 7: char name lookup is safe`
    - _Requirements: 4.1, 4.5_

- [x] 10. Checkpoint akhir — Verifikasi regression dan TypeScript
  - Jalankan `npx jest --testPathPattern=game --run` — semua test lulus (0 failures)
  - Pastikan `AllianceStage.test.ts` lulus tanpa modifikasi pada file tes tersebut
  - Pastikan tidak ada TypeScript error dengan `npx tsc --noEmit`

## Notes

- Tasks bertanda `*` bersifat opsional dan dapat dilewati untuk implementasi MVP yang lebih cepat
- Setiap task mereferensikan requirement spesifik untuk keterlacakan
- Timing_Contract (750 ms approach + 600 ms bounce→settled) **tidak boleh diubah** — `AllianceStage.test.ts` memverifikasi ini
- Hanya dua file yang boleh dimodifikasi: `components/game/AllianceStage.tsx` dan `components/game/AnimationEffects.tsx`
- Tidak ada keyframe CSS baru, tidak ada file komponen baru
- Checkpoint di task 6 memastikan state baseline sebelum menambah sub-komponen baru
- Property tests (task 9) mengikuti pola inline re-implementation tanpa React hooks, sesuai `AnimationEffects.property.test.tsx`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "3.2"] },
    { "id": 2, "tasks": ["2.1", "2.2", "2.3"] },
    { "id": 3, "tasks": ["3.1", "4.1"] },
    { "id": 4, "tasks": ["5.1", "5.2"] },
    { "id": 5, "tasks": ["7.1"] },
    { "id": 6, "tasks": ["8.1"] },
    { "id": 7, "tasks": ["8.2", "8.3"] },
    { "id": 8, "tasks": ["9.1"] },
    { "id": 9, "tasks": ["9.2", "9.3", "9.4", "9.5", "9.6", "9.7", "9.8"] }
  ]
}
```
